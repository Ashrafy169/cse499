from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.security import create_access_token, get_password_hash, verify_password
from database import get_db
from models.user import User, UserRole
from schemas.user import LoginRequest, SignupRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        user_id=str(user.id),
        customer_id=str(user.customer_id) if user.customer_id else None,
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    from models.customer import Customer

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    customer = Customer(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        status="active",
    )
    db.add(customer)
    db.flush()

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.customer,
        customer_id=customer.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        user_id=str(user.id),
        customer_id=str(user.customer_id),
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "customer_id": str(current_user.customer_id) if current_user.customer_id else None,
    }


@router.get("/my-account")
def get_my_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from models.customer import Customer
    from schemas.customer import CustomerOut

    if current_user.role != UserRole.customer or not current_user.customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer account required")
    customer = db.get(Customer, current_user.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer record not found")
    return CustomerOut.model_validate(customer)
