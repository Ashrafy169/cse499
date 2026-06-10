from fastapi import APIRouter, Depends, Query
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from database import get_db
from models.notification import Notification
from models.user import User
from schemas.notification import NotificationListResponse, NotificationOut

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Notification).filter(Notification.user_id == current_user.id)
    total = base.with_entities(sqlfunc.count(Notification.id)).scalar()
    unread = base.filter(Notification.is_read == False).with_entities(sqlfunc.count(Notification.id)).scalar()
    items = (
        base.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return NotificationListResponse(items=items, total=total, unread_count=unread)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n:
        n.is_read = True
        db.commit()
        db.refresh(n)
    return n


@router.patch("/read-all", response_model=dict)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return {"updated": updated}
