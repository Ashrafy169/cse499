from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_staff_user, require_roles
from database import get_db
from models.plan import Plan
from models.user import UserRole
from schemas.plan import PlanCreate, PlanOut, PlanUpdate

router = APIRouter()

_write_access = require_roles(UserRole.super_admin, UserRole.billing_staff)
_admin_only = require_roles(UserRole.super_admin)


def _get_plan_or_404(db: Session, plan_id: UUID) -> Plan:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.get("", response_model=list[PlanOut], dependencies=[Depends(get_current_user)])
def list_plans(db: Session = Depends(get_db)):
    return db.query(Plan).order_by(Plan.created_at.desc()).all()


@router.get("/{plan_id}", response_model=PlanOut, dependencies=[Depends(get_current_user)])
def get_plan(plan_id: UUID, db: Session = Depends(get_db)):
    return _get_plan_or_404(db, plan_id)


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db), _=Depends(_write_access)):
    plan = Plan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(plan_id: UUID, payload: PlanUpdate, db: Session = Depends(get_db), _=Depends(_write_access)):
    plan = _get_plan_or_404(db, plan_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", dependencies=[Depends(_admin_only)])
def delete_plan(plan_id: UUID, db: Session = Depends(get_db)):
    plan = _get_plan_or_404(db, plan_id)
    plan.is_active = False
    db.commit()
    db.refresh(plan)
    return {"message": "Plan deactivated", "plan": plan}
