from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_roles
from database import get_db
from models.notification import NotificationType
from models.plan import Plan
from models.plan_change import PlanChangeRequest, PlanChangeStatus
from models.user import User, UserRole
from schemas.plan_change import (
    PlanChangeListResponse,
    PlanChangeRequestCreate,
    PlanChangeRequestOut,
    PlanChangeReview,
)
from services.notification_service import create_notification, notify_all_staff

router = APIRouter()


@router.post("", response_model=PlanChangeRequestOut, status_code=status.HTTP_201_CREATED)
def submit_plan_change(
    payload: PlanChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.customer or not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")

    from models.customer import Customer

    customer = db.get(Customer, current_user.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    requested_plan = db.get(Plan, payload.requested_plan_id)
    if not requested_plan or not requested_plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found or inactive")

    if customer.plan_id and str(customer.plan_id) == str(payload.requested_plan_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already on this plan")

    pending_exists = (
        db.query(PlanChangeRequest)
        .filter(
            PlanChangeRequest.customer_id == current_user.customer_id,
            PlanChangeRequest.status == PlanChangeStatus.pending,
        )
        .first()
    )
    if pending_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending plan change request",
        )

    req = PlanChangeRequest(
        customer_id=current_user.customer_id,
        current_plan_id=customer.plan_id,
        requested_plan_id=payload.requested_plan_id,
        note=payload.note,
        status=PlanChangeStatus.pending,
    )
    db.add(req)
    db.flush()

    notify_all_staff(
        db,
        NotificationType.plan_change_requested,
        "Plan Change Request",
        f"{current_user.full_name} requested to change to plan \"{requested_plan.name}\".",
    )

    db.commit()
    db.refresh(req)
    return req


@router.get("/my", response_model=list[PlanChangeRequestOut])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.customer or not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")

    return (
        db.query(PlanChangeRequest)
        .filter(PlanChangeRequest.customer_id == current_user.customer_id)
        .order_by(PlanChangeRequest.created_at.desc())
        .all()
    )


@router.get("", response_model=PlanChangeListResponse)
def list_requests(
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.super_admin, UserRole.billing_staff, UserRole.support_staff)),
):
    q = db.query(PlanChangeRequest)
    if status_filter:
        q = q.filter(PlanChangeRequest.status == status_filter)
    total = q.count()
    items = q.order_by(PlanChangeRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return PlanChangeListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/{request_id}/review", response_model=PlanChangeRequestOut)
def review_request(
    request_id: str,
    payload: PlanChangeReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.super_admin, UserRole.billing_staff)),
):
    req = db.get(PlanChangeRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != PlanChangeStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already reviewed")

    req.status = payload.status
    req.staff_note = payload.staff_note
    req.reviewed_by = current_user.id

    if payload.status == PlanChangeStatus.approved:
        from models.customer import Customer

        customer = db.get(Customer, req.customer_id)
        if customer:
            customer.plan_id = req.requested_plan_id

    # Notify the customer's user account
    from models.user import User as UserModel
    customer_user = db.query(UserModel).filter(UserModel.customer_id == req.customer_id).first()
    if customer_user:
        action = "approved" if payload.status == PlanChangeStatus.approved else "rejected"
        create_notification(
            db,
            str(customer_user.id),
            NotificationType.plan_change_reviewed,
            f"Plan Change {action.capitalize()}",
            f"Your plan change request has been {action}."
            + (f" Note: {payload.staff_note}" if payload.staff_note else ""),
        )

    db.commit()
    db.refresh(req)
    return req
