import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_roles
from database import get_db
from models.invoice import Invoice, InvoiceStatus
from models.payment import Payment
from models.user import User, UserRole
from schemas.payment import PaymentCreate, PaymentOut

router = APIRouter()


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def submit_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.customer or not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")

    invoice = db.get(Invoice, payload.invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if str(invoice.customer_id) != str(current_user.customer_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your invoice")
    if invoice.status == InvoiceStatus.paid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice already paid")

    payment = Payment(
        invoice_id=invoice.id,
        customer_id=current_user.customer_id,
        amount=invoice.amount,
        method=payload.method,
        transaction_ref=payload.transaction_ref or str(uuid.uuid4()).replace("-", "").upper()[:12],
    )
    db.add(payment)

    invoice.status = InvoiceStatus.paid
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/my", response_model=list[PaymentOut])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.customer or not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")

    payments = (
        db.query(Payment)
        .filter(Payment.customer_id == current_user.customer_id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return payments


@router.get("", response_model=list[PaymentOut])
def list_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.super_admin, UserRole.billing_staff)),
):
    return db.query(Payment).order_by(Payment.created_at.desc()).all()
