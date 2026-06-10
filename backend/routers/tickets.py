from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session, selectinload

from core.dependencies import get_current_user, get_staff_user
from database import get_db
from models.notification import NotificationType
from models.ticket import Ticket, TicketCategory, TicketStatus
from models.user import User, UserRole
from schemas.ticket import TicketCreate, TicketListResponse, TicketOut, TicketStatusUpdate
from services.notification_service import create_notification, notify_all_staff

router = APIRouter()


# ── Customer: own tickets ────────────────────────────────────────────────────

@router.get("/my", response_model=TicketListResponse)
def get_my_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Ticket).filter(Ticket.user_id == current_user.id)
    total = base.with_entities(sqlfunc.count(Ticket.id)).scalar()
    items = (
        base.options(selectinload(Ticket.user))
        .order_by(Ticket.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return TicketListResponse(items=items, total=total, page=page, limit=limit)


# ── Staff: all tickets ───────────────────────────────────────────────────────

@router.get("", response_model=TicketListResponse)
def list_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    ticket_status: TicketStatus | None = Query(default=None, alias="status"),
    category: TicketCategory | None = Query(default=None),
    user_search: str | None = Query(default=None),
    _: User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    from models.user import User as UserModel

    base = db.query(Ticket)

    if user_search:
        term = f"%{user_search.strip()}%"
        base = base.join(Ticket.user).filter(
            UserModel.full_name.ilike(term) | UserModel.email.ilike(term)
        )
    if ticket_status:
        base = base.filter(Ticket.status == ticket_status)
    if category:
        base = base.filter(Ticket.category == category)

    total = base.with_entities(sqlfunc.count(Ticket.id)).scalar()
    items = (
        base.options(selectinload(Ticket.user))
        .order_by(Ticket.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return TicketListResponse(items=items, total=total, page=page, limit=limit)


# ── Create (any authenticated user) ─────────────────────────────────────────

@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = Ticket(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        status=TicketStatus.open,
    )
    db.add(ticket)
    db.flush()

    notify_all_staff(
        db,
        NotificationType.new_ticket,
        "New Support Ticket",
        f"{current_user.full_name} opened a ticket: \"{payload.title}\" [{payload.category}].",
    )

    db.commit()
    db.refresh(ticket)
    db.refresh(ticket, attribute_names=["user"])
    return ticket


# ── Parameterised routes ─────────────────────────────────────────────────────

@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(Ticket)
        .options(selectinload(Ticket.user))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if current_user.role == UserRole.customer and str(ticket.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return ticket


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: UUID,
    payload: TicketStatusUpdate,
    _: User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(Ticket)
        .options(selectinload(Ticket.user))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    ticket.status = payload.status

    # Notify ticket owner
    create_notification(
        db,
        str(ticket.user_id),
        NotificationType.ticket_updated,
        "Ticket Status Updated",
        f"Your ticket \"{ticket.title}\" is now {payload.status.value.replace('_', ' ')}.",
    )

    db.commit()
    db.refresh(ticket)
    return ticket
