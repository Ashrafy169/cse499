from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from models.customer import Customer
from models.invoice import Invoice, InvoiceStatus
from models.plan import Plan


def generate_monthly_invoices(db: Session, billing_month: str | None = None) -> int:
    if not billing_month:
        billing_month = datetime.now(timezone.utc).strftime("%Y-%m")

    year, month = int(billing_month[:4]), int(billing_month[5:])
    due_date = date(year, month, 15)

    active_customers = (
        db.query(Customer)
        .filter(Customer.status == "active", Customer.plan_id.isnot(None))
        .all()
    )
    if not active_customers:
        return 0

    customer_ids = [c.id for c in active_customers]

    existing_ids = {
        row[0]
        for row in db.query(Invoice.customer_id).filter(
            Invoice.billing_month == billing_month,
            Invoice.customer_id.in_(customer_ids),
        )
    }

    plan_ids = {c.plan_id for c in active_customers if c.plan_id}
    plans = {p.id: p for p in db.query(Plan).filter(Plan.id.in_(plan_ids))}

    new_invoices = []
    for customer in active_customers:
        if customer.id in existing_ids:
            continue
        plan = plans.get(customer.plan_id)
        if not plan:
            continue
        new_invoices.append(
            Invoice(
                customer_id=customer.id,
                plan_id=plan.id,
                amount=plan.price_monthly,
                due_date=due_date,
                billing_month=billing_month,
                status=InvoiceStatus.unpaid,
            )
        )

    if new_invoices:
        db.add_all(new_invoices)
        db.commit()

    return len(new_invoices)


def mark_overdue_invoices(db: Session) -> int:
    updated = (
        db.query(Invoice)
        .filter(Invoice.status == InvoiceStatus.unpaid, Invoice.due_date < date.today())
        .update({"status": InvoiceStatus.overdue}, synchronize_session=False)
    )
    db.commit()
    return updated
