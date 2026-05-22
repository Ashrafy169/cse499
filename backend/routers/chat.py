from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from database import get_db
from models.customer import Customer
from models.invoice import Invoice
from models.plan import Plan
from models.user import User
from schemas.chat import ChatRequest, ChatResponse
from services.groq_service import ask_groq

router = APIRouter()


def _build_user_context(user: User, db: Session) -> str:
    if not user.customer_id:
        return ""

    customer = db.get(Customer, user.customer_id)
    if not customer:
        return ""

    plan = db.get(Plan, customer.plan_id) if customer.plan_id else None

    latest_invoice = (
        db.query(Invoice)
        .filter(Invoice.customer_id == customer.id)
        .order_by(Invoice.due_date.desc())
        .first()
    )

    unpaid_count = (
        db.query(Invoice)
        .filter(Invoice.customer_id == customer.id, Invoice.status != "paid")
        .count()
    )

    lines = [
        f"Name: {customer.full_name}",
        f"Connection Status: {customer.status}",
        f"Plan: {plan.name} ({plan.speed_mbps} Mbps, ৳{plan.price_monthly}/month)" if plan else "Plan: None",
        f"Connection Type: {customer.connection_type or 'N/A'}",
        f"Router: {customer.router_model or 'N/A'}",
        f"Unpaid Invoices: {unpaid_count}",
    ]

    if latest_invoice:
        lines.append(
            f"Latest Invoice: {latest_invoice.billing_month} — ৳{latest_invoice.amount} — "
            f"Due {latest_invoice.due_date} — Status: {latest_invoice.status}"
        )

    return "\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    context = _build_user_context(current_user, db)

    try:
        reply = ask_groq(req.message.strip(), user_context=context)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service is temporarily unavailable. Please try again later.",
        )

    return ChatResponse(reply=reply)
