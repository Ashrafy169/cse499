from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.dependencies import get_staff_user, require_roles
from database import get_db
from models.customer import Customer
from models.plan import Plan
from models.user import UserRole
from schemas.customer import CustomerCreate, CustomerListResponse, CustomerOut, CustomerUpdate

router = APIRouter()

_admin_only = require_roles(UserRole.super_admin)


def _get_customer_or_404(db: Session, customer_id: UUID) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def _ensure_plan_exists(db: Session, plan_id: UUID | None) -> None:
    if plan_id is None:
        return
    if not db.get(Plan, plan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")


@router.get("", response_model=CustomerListResponse, dependencies=[Depends(get_staff_user)])
def list_customers(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str | None = Query(default=None),
):
    query = db.query(Customer).order_by(Customer.created_at.desc())
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(Customer.full_name.ilike(term) | Customer.email.ilike(term))
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return CustomerListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/{customer_id}", response_model=CustomerOut, dependencies=[Depends(get_staff_user)])
def get_customer(customer_id: UUID, db: Session = Depends(get_db)):
    return _get_customer_or_404(db, customer_id)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_staff_user)])
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    _ensure_plan_exists(db, payload.plan_id)
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerOut, dependencies=[Depends(get_staff_user)])
def update_customer(customer_id: UUID, payload: CustomerUpdate, db: Session = Depends(get_db)):
    customer = _get_customer_or_404(db, customer_id)
    data = payload.model_dump(exclude_unset=True)
    if "plan_id" in data:
        _ensure_plan_exists(db, data["plan_id"])
    for field, value in data.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", dependencies=[Depends(_admin_only)])
def delete_customer(customer_id: UUID, db: Session = Depends(get_db)):
    customer = _get_customer_or_404(db, customer_id)
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}


@router.patch("/{customer_id}/status", response_model=CustomerOut, dependencies=[Depends(get_staff_user)])
def update_customer_status(customer_id: UUID, payload: dict, db: Session = Depends(get_db)):
    customer = _get_customer_or_404(db, customer_id)
    status_value = payload.get("status")
    if status_value not in {"active", "inactive", "suspended"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    customer.status = status_value
    db.commit()
    db.refresh(customer)
    return customer
