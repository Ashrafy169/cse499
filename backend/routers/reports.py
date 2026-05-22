import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func as sqlfunc, extract, case
from sqlalchemy.orm import Session

from core.dependencies import get_staff_user
from database import get_db
from models.customer import Customer
from models.invoice import Invoice, InvoiceStatus
from models.payment import Payment, PaymentMethod
from models.plan import Plan

router = APIRouter()


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


# ── Summary cards ────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    total_customers = db.query(sqlfunc.count(Customer.id)).scalar() or 0
    active_customers = (
        db.query(sqlfunc.count(Customer.id))
        .filter(Customer.status == "active")
        .scalar() or 0
    )

    bm = _current_month()
    revenue_this_month = (
        db.query(sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0))
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.billing_month == bm)
        .scalar()
    )

    overdue_count = (
        db.query(sqlfunc.count(Invoice.id))
        .filter(Invoice.status == InvoiceStatus.overdue)
        .scalar() or 0
    )

    total_dues = (
        db.query(sqlfunc.coalesce(sqlfunc.sum(Invoice.amount), 0))
        .filter(Invoice.status.in_([InvoiceStatus.unpaid, InvoiceStatus.overdue]))
        .scalar()
    )

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "revenue_this_month": float(revenue_this_month),
        "overdue_count": overdue_count,
        "total_dues": float(total_dues),
    }


# ── Monthly revenue trend (last 6 months) ────────────────────────────────────

@router.get("/revenue-trend")
def get_revenue_trend(
    months: int = Query(6, ge=1, le=24),
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Invoice.billing_month,
            sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0).label("revenue"),
        )
        .outerjoin(Payment, Payment.invoice_id == Invoice.id)
        .group_by(Invoice.billing_month)
        .order_by(Invoice.billing_month.desc())
        .limit(months)
        .all()
    )
    # Return chronological order
    return [{"month": r.billing_month, "revenue": float(r.revenue)} for r in reversed(rows)]


# ── Customer growth (new customers per month, last 6 months) ─────────────────

@router.get("/customer-growth")
def get_customer_growth(
    months: int = Query(6, ge=1, le=24),
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            sqlfunc.to_char(Customer.created_at, "YYYY-MM").label("month"),
            sqlfunc.count(Customer.id).label("new_customers"),
        )
        .group_by(sqlfunc.to_char(Customer.created_at, "YYYY-MM"))
        .order_by(sqlfunc.to_char(Customer.created_at, "YYYY-MM").desc())
        .limit(months)
        .all()
    )
    return [{"month": r.month, "new_customers": r.new_customers} for r in reversed(rows)]


# ── Plan distribution (pie chart) ────────────────────────────────────────────

@router.get("/plan-distribution")
def get_plan_distribution(
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Plan.name, sqlfunc.count(Customer.id).label("count"))
        .outerjoin(Customer, Customer.plan_id == Plan.id)
        .filter(Plan.is_active.is_(True))
        .group_by(Plan.id, Plan.name)
        .all()
    )
    return [{"plan": r.name, "count": r.count} for r in rows]


# ── Payment method breakdown (donut chart) ───────────────────────────────────

@router.get("/payment-methods")
def get_payment_methods(
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Payment.method,
            sqlfunc.count(Payment.id).label("count"),
            sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0).label("total"),
        )
        .group_by(Payment.method)
        .all()
    )
    return [
        {"method": r.method.value if hasattr(r.method, "value") else r.method,
         "count": r.count,
         "total": float(r.total)}
        for r in rows
    ]


# ── Recent activity feed (last 10 events) ────────────────────────────────────

@router.get("/activity")
def get_activity(
    limit: int = Query(10, ge=1, le=50),
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    events = []

    # New customers
    new_customers = (
        db.query(Customer.id, Customer.full_name, Customer.created_at)
        .order_by(Customer.created_at.desc())
        .limit(limit)
        .all()
    )
    for c in new_customers:
        events.append({
            "type": "new_customer",
            "label": f"New customer: {c.full_name}",
            "timestamp": c.created_at.isoformat(),
            "meta": {"customer_id": str(c.id)},
        })

    # Payments received
    payments = (
        db.query(Payment.id, Payment.amount, Payment.method, Payment.created_at, Customer.full_name)
        .join(Customer, Payment.customer_id == Customer.id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    for p in payments:
        method = p.method.value if hasattr(p.method, "value") else p.method
        events.append({
            "type": "payment_received",
            "label": f"Payment received: ৳{float(p.amount):,.0f} via {method} from {p.full_name}",
            "timestamp": p.created_at.isoformat(),
            "meta": {"payment_id": str(p.id), "amount": float(p.amount)},
        })

    # Invoices generated
    invoices = (
        db.query(Invoice.id, Invoice.amount, Invoice.billing_month, Invoice.created_at, Customer.full_name)
        .join(Customer, Invoice.customer_id == Customer.id)
        .order_by(Invoice.created_at.desc())
        .limit(limit)
        .all()
    )
    for i in invoices:
        events.append({
            "type": "invoice_generated",
            "label": f"Invoice generated for {i.full_name} — {i.billing_month} (৳{float(i.amount):,.0f})",
            "timestamp": i.created_at.isoformat(),
            "meta": {"invoice_id": str(i.id)},
        })

    # Sort all events by timestamp descending and return top N
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:limit]


# ── CSV Export ────────────────────────────────────────────────────────────────

@router.get("/export/csv")
def export_csv(
    _: object = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    invoices = (
        db.query(Invoice, Customer.full_name, Customer.email, Plan.name.label("plan_name"))
        .join(Customer, Invoice.customer_id == Customer.id)
        .outerjoin(Plan, Invoice.plan_id == Plan.id)
        .order_by(Invoice.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice ID", "Customer", "Email", "Plan", "Amount (BDT)", "Status", "Billing Month", "Due Date", "Created At"])

    for inv, full_name, email, plan_name in invoices:
        writer.writerow([
            str(inv.id),
            full_name,
            email,
            plan_name or "—",
            float(inv.amount),
            inv.status.value,
            inv.billing_month,
            inv.due_date.isoformat() if inv.due_date else "",
            inv.created_at.strftime("%Y-%m-%d %H:%M") if inv.created_at else "",
        ])

    content = output.getvalue()
    filename = f"dashboard-export-{_current_month()}.csv"
    return Response(
        content=content.encode("utf-8-sig"),  # BOM for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
