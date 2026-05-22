import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class PlanChangeStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class PlanChangeRequest(Base):
    __tablename__ = "plan_change_requests"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    current_plan_id = Column(GUID(), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    requested_plan_id = Column(GUID(), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(PlanChangeStatus), default=PlanChangeStatus.pending, nullable=False)
    note = Column(Text, nullable=True)
    staff_note = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer")
    current_plan = relationship("Plan", foreign_keys=[current_plan_id])
    requested_plan = relationship("Plan", foreign_keys=[requested_plan_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
