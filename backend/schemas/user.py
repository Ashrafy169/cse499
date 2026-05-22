from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole
    customer_id: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    customer_id: str | None = None
    created_at: datetime

    @field_validator("id", "customer_id", mode="before")
    @classmethod
    def uuid_to_str(cls, v: object) -> object:
        if isinstance(v, UUID):
            return str(v)
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str
    user_id: str
    customer_id: str | None = None


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str | None = None
    password: str
