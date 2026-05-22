from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from models.ticket import TicketCategory, TicketStatus


def _uuid_str(v: object) -> object:
    return str(v) if isinstance(v, UUID) else v


class TicketUserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    role: str

    @field_validator("id", mode="before")
    @classmethod
    def _id(cls, v: object) -> object:
        return _uuid_str(v)


class TicketCreate(BaseModel):
    title: str
    description: str
    category: TicketCategory


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    description: str
    category: TicketCategory
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    user: TicketUserInfo | None = None

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _uuids(cls, v: object) -> object:
        return _uuid_str(v)


class TicketListResponse(BaseModel):
    items: list[TicketOut]
    total: int
    page: int
    limit: int
