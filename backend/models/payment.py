import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class PaymentMethod(str, enum.Enum):
    bkash = "bkash"
    nagad = "nagad"
    card = "card"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(GUID(), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    transaction_ref = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice")
    customer = relationship("Customer")
