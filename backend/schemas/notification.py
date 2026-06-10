from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from models.notification import NotificationType


def _uuid_str(v: object) -> object:
    return str(v) if isinstance(v, UUID) else v


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    is_read: bool
    created_at: datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _uuids(cls, v: object) -> object:
        return _uuid_str(v)


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    total: int
    unread_count: int
