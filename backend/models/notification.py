import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class NotificationType(str, enum.Enum):
    overdue_invoice = "overdue_invoice"
    payment_received = "payment_received"
    new_ticket = "new_ticket"
    ticket_updated = "ticket_updated"
    plan_change_requested = "plan_change_requested"
    plan_change_reviewed = "plan_change_reviewed"
    invoice_generated = "invoice_generated"
    custom_invoice = "custom_invoice"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
