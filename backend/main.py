import os
from contextlib import asynccontextmanager
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.security import get_password_hash
from database import Base, SessionLocal, engine
from models.customer import Customer
from models.invoice import Invoice
from models.notification import Notification  # noqa: F401
from models.payment import Payment  # noqa: F401
from models.plan import Plan
from models.plan_change import PlanChangeRequest  # noqa: F401
from models.ticket import Ticket  # noqa: F401
from models.user import User, UserRole
from routers import auth, chat, customers, invoices, plans, tickets, users
from routers import notifications as notifications_router
from routers import payments as payments_router
from routers import plan_changes as plan_changes_router
from routers import reports as reports_router
from services.invoice_service import generate_monthly_invoices, mark_overdue_invoices


def seed_data() -> None:
    db = SessionLocal()
    try:
        # --- Plans ---
        if db.query(Plan).count() == 0:
            home_10 = Plan(name="Home 10", description="Reliable entry-level home broadband.", speed_mbps=10, price_monthly=500, is_active=True)
            home_50 = Plan(name="Home 50", description="Best for streaming and remote work.", speed_mbps=50, price_monthly=800, is_active=True)
            business_100 = Plan(name="Business 100", description="High-speed connection for offices.", speed_mbps=100, price_monthly=1500, is_active=True)
            db.add_all([home_10, home_50, business_100])
            db.commit()
            db.refresh(home_10)
            db.refresh(home_50)
            db.refresh(business_100)
        else:
            plans_by_name = {p.name: p for p in db.query(Plan).all()}
            home_10 = plans_by_name.get("Home 10")
            home_50 = plans_by_name.get("Home 50")
            business_100 = plans_by_name.get("Business 100")

        # --- Customers ---
        if db.query(Customer).count() == 0 and home_10 and home_50 and business_100:
            ayesha = Customer(full_name="Ayesha Rahman", email="ayesha@example.com", phone="01711111111", address="Gulshan, Dhaka", status="active", plan_id=home_50.id, ip_address="192.168.1.101", router_model="TP-Link Archer C6", connection_type="Fiber Optic", billing_start=date(2024, 1, 15))
            tanvir = Customer(full_name="Tanvir Hasan", email="tanvir@example.com", phone="01722222222", address="Banani, Dhaka", status="active", plan_id=business_100.id, ip_address="192.168.1.102", router_model="MikroTik hEX S", connection_type="Fiber Optic", billing_start=date(2024, 3, 1))
            nusrat = Customer(full_name="Nusrat Jahan", email="nusrat@example.com", phone="01733333333", address="Mirpur, Dhaka", status="suspended", plan_id=home_10.id, ip_address="192.168.1.103", router_model="TP-Link TL-WR840N", connection_type="Cable", billing_start=date(2024, 2, 10))
            rakib = Customer(full_name="Rakib Hossain", email="rakib@example.com", phone="01744444444", address="Uttara, Dhaka", status="inactive", plan_id=home_10.id, ip_address="192.168.1.104", router_model="D-Link DIR-615", connection_type="Cable", billing_start=date(2023, 11, 5))
            mim = Customer(full_name="Mim Akter", email="mim@example.com", phone="01755555555", address="Mohammadpur, Dhaka", status="active", plan_id=home_50.id, ip_address="192.168.1.105", router_model="TP-Link Archer C6", connection_type="Fiber Optic", billing_start=date(2024, 4, 20))
            db.add_all([ayesha, tanvir, nusrat, rakib, mim])
            db.commit()
            for c in [ayesha, tanvir, nusrat, rakib, mim]:
                db.refresh(c)
        else:
            customers_by_email = {c.email: c for c in db.query(Customer).all()}
            ayesha = customers_by_email.get("ayesha@example.com")
            tanvir = customers_by_email.get("tanvir@example.com")

        # --- Users ---
        if db.query(User).count() == 0:
            seed_users = [
                User(email="admin@amberit.com", full_name="Super Admin", hashed_password=get_password_hash("admin123"), role=UserRole.super_admin),
                User(email="billing@amberit.com", full_name="Billing Staff", hashed_password=get_password_hash("billing123"), role=UserRole.billing_staff),
                User(email="support@amberit.com", full_name="Support Staff", hashed_password=get_password_hash("support123"), role=UserRole.support_staff),
            ]
            if ayesha:
                seed_users.append(User(email="ayesha@example.com", full_name="Ayesha Rahman", hashed_password=get_password_hash("customer123"), role=UserRole.customer, customer_id=ayesha.id))
            if tanvir:
                seed_users.append(User(email="tanvir@example.com", full_name="Tanvir Hasan", hashed_password=get_password_hash("customer123"), role=UserRole.customer, customer_id=tanvir.id))
            db.add_all(seed_users)
            db.commit()

        # --- Sample invoices (seed only) ---
        if db.query(Invoice).count() == 0:
            generate_monthly_invoices(db)
            mark_overdue_invoices(db)

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_data()

    scheduler = BackgroundScheduler(timezone="UTC")

    def _monthly_gen():
        db = SessionLocal()
        try:
            generate_monthly_invoices(db)
        finally:
            db.close()

    def _daily_overdue():
        db = SessionLocal()
        try:
            mark_overdue_invoices(db)
        finally:
            db.close()

    scheduler.add_job(_monthly_gen, CronTrigger(day=1, hour=0, minute=5))
    scheduler.add_job(_daily_overdue, CronTrigger(hour=0, minute=0))
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(title="AmberIT Billing API", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"message": "AmberIT Billing API"}


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(plans.router, prefix="/plans", tags=["Plans"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(payments_router.router, prefix="/payments", tags=["Payments"])
app.include_router(plan_changes_router.router, prefix="/plan-changes", tags=["Plan Changes"])
app.include_router(reports_router.router, prefix="/reports", tags=["Reports"])
app.include_router(chat.router, prefix="/ai", tags=["AI Chat"])
app.include_router(notifications_router.router, prefix="/notifications", tags=["Notifications"])
