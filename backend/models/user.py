import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.sql import func

from database import Base
from models.types import GUID


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    billing_staff = "billing_staff"
    support_staff = "support_staff"
    customer = "customer"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    customer_id = Column(GUID(), ForeignKey("customers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
