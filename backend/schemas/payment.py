from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from models.payment import PaymentMethod


def _uuid_str(v: object) -> object:
    return str(v) if isinstance(v, UUID) else v


class PaymentCreate(BaseModel):
    invoice_id: str
    method: PaymentMethod
    transaction_ref: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    customer_id: str
    amount: Decimal
    method: PaymentMethod
    transaction_ref: str
    created_at: datetime

    @field_validator("id", "invoice_id", "customer_id", mode="before")
    @classmethod
    def _uuids(cls, v: object) -> object:
        return _uuid_str(v)
