import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class Customer(Base):
    __tablename__ = "customers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    address = Column(Text)
    status = Column(String(20), nullable=False, default="active")
    plan_id = Column(GUID(), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    router_model = Column(String(100), nullable=True)
    connection_type = Column(String(50), nullable=True, default="Fiber Optic")
    billing_start = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    plan = relationship("Plan", backref="customers")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
