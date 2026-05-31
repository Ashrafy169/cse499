from sqlalchemy.orm import Session

from models.notification import Notification, NotificationType
from models.user import User, UserRole


def create_notification(
    db: Session,
    user_id: str,
    ntype: NotificationType,
    title: str,
    message: str,
) -> Notification:
    n = Notification(user_id=user_id, type=ntype, title=title, message=message)
    db.add(n)
    db.flush()
    return n


def notify_all_staff(
    db: Session,
    ntype: NotificationType,
    title: str,
    message: str,
) -> None:
    staff = db.query(User).filter(
        User.role.in_([UserRole.super_admin, UserRole.billing_staff, UserRole.support_staff]),
        User.is_active == True,
    ).all()
    for u in staff:
        create_notification(db, str(u.id), ntype, title, message)
