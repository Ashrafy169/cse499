import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class InvoiceStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    overdue = "overdue"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(GUID(), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.unpaid, nullable=False)
    billing_month = Column(String(7), nullable=False)  # "YYYY-MM"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="invoices")
    plan = relationship("Plan")

    __table_args__ = (
        UniqueConstraint("customer_id", "billing_month", name="uq_invoice_customer_month"),
    )
