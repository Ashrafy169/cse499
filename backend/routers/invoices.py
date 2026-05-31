from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session, selectinload

from core.dependencies import get_current_user, get_staff_user, require_roles
from database import get_db
from models.customer import Customer
from models.invoice import Invoice, InvoiceStatus
from models.user import User, UserRole
from models.notification import NotificationType
from models.user import User as UserModel
from schemas.invoice import CustomInvoiceCreate, GenerateResponse, InvoiceListResponse, InvoiceOut, InvoiceStatusUpdate
from services.invoice_service import generate_monthly_invoices, mark_overdue_invoices
from services.notification_service import create_notification, notify_all_staff
from services.pdf_service import generate_invoice_pdf

router = APIRouter()

_billing_access = require_roles(UserRole.super_admin, UserRole.billing_staff)
_admin_only = require_roles(UserRole.super_admin)


def _get_invoice_or_404(db: Session, invoice_id: UUID) -> Invoice:
    inv = (
        db.query(Invoice)
        .options(selectinload(Invoice.customer), selectinload(Invoice.plan))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return inv


# ── Customer routes (must come before /{invoice_id}) ────────────────────────

@router.get("/my", response_model=InvoiceListResponse)
def get_my_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_roles(UserRole.customer)),
    db: Session = Depends(get_db),
):
    if not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No customer account linked")

    base = db.query(Invoice).filter(Invoice.customer_id == current_user.customer_id)
    total = base.with_entities(sqlfunc.count(Invoice.id)).scalar()
    items = (
        base.options(selectinload(Invoice.customer), selectinload(Invoice.plan))
        .order_by(Invoice.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return InvoiceListResponse(items=items, total=total, page=page, limit=limit)


# ── Admin action routes (must come before /{invoice_id}) ────────────────────

@router.post("/generate", response_model=GenerateResponse)
def trigger_generate(
    billing_month: str | None = Query(default=None, description="YYYY-MM, defaults to current month"),
    _: User = Depends(_admin_only),
    db: Session = Depends(get_db),
):
    count = generate_monthly_invoices(db, billing_month)
    bm = billing_month or __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m")
    return GenerateResponse(
        generated=count,
        billing_month=bm,
        message=f"{count} invoice(s) generated for {bm}.",
    )


@router.post("/mark-overdue", response_model=dict)
def trigger_mark_overdue(
    _: User = Depends(_billing_access),
    db: Session = Depends(get_db),
):
    count = mark_overdue_invoices(db)
    return {"updated": count, "message": f"{count} invoice(s) marked as overdue."}


@router.post("/custom", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_custom_invoice(
    payload: CustomInvoiceCreate,
    current_user: User = Depends(_billing_access),
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .options(selectinload(Customer.invoices))
        .filter(Customer.id == payload.customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    inv = Invoice(
        customer_id=payload.customer_id,
        plan_id=customer.plan_id,
        amount=payload.amount,
        amount_paid=0,
        due_date=payload.due_date,
        status=InvoiceStatus.unpaid,
        billing_month=payload.billing_month,
        description=payload.description,
        is_custom=True,
    )
    db.add(inv)
    db.flush()
    db.refresh(inv, attribute_names=["customer", "plan"])

    # Notify the customer's linked user account
    customer_user = (
        db.query(UserModel)
        .filter(UserModel.customer_id == payload.customer_id)
        .first()
    )
    if customer_user:
        create_notification(
            db,
            str(customer_user.id),
            NotificationType.custom_invoice,
            "New Invoice",
            f"A custom invoice of BDT {float(payload.amount):,.0f} has been created for {payload.billing_month}."
            + (f" Note: {payload.description}" if payload.description else ""),
        )

    notify_all_staff(
        db,
        NotificationType.custom_invoice,
        "Custom Invoice Created",
        f"{current_user.full_name} created a custom invoice of BDT {float(payload.amount):,.0f} "
        f"for {customer.full_name} ({payload.billing_month}).",
    )

    db.commit()
    db.refresh(inv)
    return inv


# ── Admin list ───────────────────────────────────────────────────────────────

@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    inv_status: InvoiceStatus | None = Query(default=None, alias="status"),
    billing_month: str | None = Query(default=None),
    customer_search: str | None = Query(default=None),
    _: User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    base = db.query(Invoice)

    if customer_search:
        term = f"%{customer_search.strip()}%"
        base = base.join(Invoice.customer).filter(
            Customer.full_name.ilike(term) | Customer.email.ilike(term)
        )
    if inv_status:
        base = base.filter(Invoice.status == inv_status)
    if billing_month:
        base = base.filter(Invoice.billing_month == billing_month)

    total = base.with_entities(sqlfunc.count(Invoice.id)).scalar()
    items = (
        base.options(selectinload(Invoice.customer), selectinload(Invoice.plan))
        .order_by(Invoice.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return InvoiceListResponse(items=items, total=total, page=page, limit=limit)


# ── Parameterised routes ─────────────────────────────────────────────────────

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = _get_invoice_or_404(db, invoice_id)

    if current_user.role == UserRole.customer:
        if str(inv.customer_id) != str(current_user.customer_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    pdf_bytes = generate_invoice_pdf(inv, inv.customer, inv.plan)
    filename = f"invoice-{inv.billing_month}-{str(inv.id)[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.put("/{invoice_id}/status", response_model=InvoiceOut)
def update_invoice_status(
    invoice_id: UUID,
    payload: InvoiceStatusUpdate,
    _: User = Depends(_billing_access),
    db: Session = Depends(get_db),
):
    inv = _get_invoice_or_404(db, invoice_id)
    inv.status = payload.status
    db.commit()
    db.refresh(inv)
    return inv
