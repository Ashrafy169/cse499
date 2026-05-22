from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from schemas.plan import PlanOut


class CustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    status: str = "active"
    plan_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    router_model: Optional[str] = None
    connection_type: Optional[str] = None
    billing_start: Optional[date] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"active", "inactive", "suspended"}
        if value not in allowed:
            raise ValueError("status must be active, inactive, or suspended")
        return value


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    plan_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    router_model: Optional[str] = None
    connection_type: Optional[str] = None
    billing_start: Optional[date] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"active", "inactive", "suspended"}
        if value not in allowed:
            raise ValueError("status must be active, inactive, or suspended")
        return value


class CustomerOut(CustomerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanOut] = None

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    limit: int


class CustomerStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"active", "inactive", "suspended"}
        if value not in allowed:
            raise ValueError("status must be active, inactive, or suspended")
        return value
