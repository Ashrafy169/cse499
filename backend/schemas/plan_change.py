from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from models.plan_change import PlanChangeStatus
from schemas.plan import PlanOut


def _uuid_str(v: object) -> object:
    return str(v) if isinstance(v, UUID) else v


class PlanChangeRequestCreate(BaseModel):
    requested_plan_id: str
    note: Optional[str] = None


class PlanChangeReview(BaseModel):
    status: PlanChangeStatus
    staff_note: Optional[str] = None


class PlanChangeRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    current_plan_id: Optional[str] = None
    requested_plan_id: Optional[str] = None
    status: PlanChangeStatus
    note: Optional[str] = None
    staff_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    current_plan: Optional[PlanOut] = None
    requested_plan: Optional[PlanOut] = None

    @field_validator("id", "customer_id", "current_plan_id", "requested_plan_id", "reviewed_by", mode="before")
    @classmethod
    def _uuids(cls, v: object) -> object:
        return _uuid_str(v)


class PlanChangeListResponse(BaseModel):
    items: list[PlanChangeRequestOut]
    total: int
    page: int
    limit: int
