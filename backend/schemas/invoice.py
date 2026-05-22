from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from models.invoice import InvoiceStatus


def _uuid_str(v: object) -> object:
    return str(v) if isinstance(v, UUID) else v


class InvoiceCustomerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    phone: str

    @field_validator("id", mode="before")
    @classmethod
    def _id(cls, v: object) -> object:
        return _uuid_str(v)


class InvoicePlanInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    speed_mbps: int

    @field_validator("id", mode="before")
    @classmethod
    def _id(cls, v: object) -> object:
        return _uuid_str(v)


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str
    plan_id: str | None = None
    amount: Decimal
    due_date: date
    status: InvoiceStatus
    billing_month: str
    created_at: datetime
    customer: InvoiceCustomerInfo | None = None
    plan: InvoicePlanInfo | None = None

    @field_validator("id", "customer_id", "plan_id", mode="before")
    @classmethod
    def _uuids(cls, v: object) -> object:
        return _uuid_str(v)


class InvoiceStatusUpdate(BaseModel):
    status: InvoiceStatus


class InvoiceListResponse(BaseModel):
    items: list[InvoiceOut]
    total: int
    page: int
    limit: int


class GenerateResponse(BaseModel):
    generated: int
    billing_month: str
    message: str
