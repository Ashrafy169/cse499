from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    speed_mbps: int
    price_monthly: float
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    speed_mbps: Optional[int] = None
    price_monthly: Optional[float] = None
    is_active: Optional[bool] = None


class PlanOut(PlanBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
