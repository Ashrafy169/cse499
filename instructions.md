# AmberIT Billing & Subscription Management System — Codex Prompt (Phase 1)

## Project Overview

Build a **Web-Based Billing and Subscription Management System** for **AmberIT**, an ISP company. This is Phase 1 — implement only **Feature 1 (Customer Management)** and **Feature 2 (Subscription Plans)**.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14 (App Router, TypeScript) |
| Backend   | FastAPI (Python 3.11+)              |
| Database  | PostgreSQL via SQLAlchemy (Neon DB) |
| Auth      | JWT (python-jose)                   |
| Styling   | Tailwind CSS + shadcn/ui            |

---

## Project Structure

```
amberit/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── plans/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── components/
│   │   ├── ui/         # shadcn components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── CustomerTable.tsx
│   │   ├── CustomerForm.tsx
│   │   ├── PlanCard.tsx
│   │   └── PlanForm.tsx
│   ├── lib/
│   │   └── api.ts      # Axios instance + API calls
│   └── types/
│       └── index.ts    # Shared TypeScript types
│
└── backend/           # FastAPI app
    ├── main.py
    ├── database.py
    ├── models/
    │   ├── __init__.py
    │   ├── customer.py
    │   └── plan.py
    ├── schemas/
    │   ├── __init__.py
    │   ├── customer.py
    │   └── plan.py
    ├── routers/
    │   ├── __init__.py
    │   ├── customers.py
    │   └── plans.py
    └── requirements.txt
```

---

## Database Schema

### Table: `customers`

```sql
CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   VARCHAR(150) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    phone       VARCHAR(20) NOT NULL,
    address     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | inactive | suspended
    plan_id     UUID REFERENCES plans(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### Table: `plans`

```sql
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    speed_mbps      INTEGER NOT NULL,          -- e.g. 10, 50, 100
    price_monthly   NUMERIC(10,2) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## SQLAlchemy Models

### `backend/models/plan.py`

```python
import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from database import Base

class Plan(Base):
    __tablename__ = "plans"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(100), nullable=False)
    description   = Column(Text)
    speed_mbps    = Column(Integer, nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())
```

### `backend/models/customer.py`

```python
import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Customer(Base):
    __tablename__ = "customers"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name  = Column(String(150), nullable=False)
    email      = Column(String(255), unique=True, nullable=False)
    phone      = Column(String(20), nullable=False)
    address    = Column(Text)
    status     = Column(String(20), default="active")  # active | inactive | suspended
    plan_id    = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    plan = relationship("Plan", backref="customers")
```

---

## Pydantic Schemas

### `backend/schemas/plan.py`

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    speed_mbps: int
    price_monthly: float
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanUpdate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
```

### `backend/schemas/customer.py`

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional
from schemas.plan import PlanOut

class CustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    status: str = "active"
    plan_id: Optional[UUID] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: UUID
    created_at: datetime
    plan: Optional[PlanOut] = None

    class Config:
        from_attributes = True
```

---

## Backend API Routes

### Plans — `backend/routers/plans.py`

| Method | Endpoint         | Description           |
|--------|------------------|-----------------------|
| GET    | `/plans`         | List all plans        |
| GET    | `/plans/{id}`    | Get single plan       |
| POST   | `/plans`         | Create a new plan     |
| PUT    | `/plans/{id}`    | Update a plan         |
| DELETE | `/plans/{id}`    | Delete (soft) a plan  |

### Customers — `backend/routers/customers.py`

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| GET    | `/customers`          | List all customers (paginated)  |
| GET    | `/customers/{id}`     | Get single customer             |
| POST   | `/customers`          | Create a new customer           |
| PUT    | `/customers/{id}`     | Update a customer               |
| DELETE | `/customers/{id}`     | Delete a customer               |
| PATCH  | `/customers/{id}/status` | Update status only           |

All routes return JSON. Use `status_code=404` with `HTTPException` when not found.

### `backend/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import customers, plans
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AmberIT Billing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plans.router, prefix="/plans", tags=["Plans"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
```

### `backend/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")  # Neon PostgreSQL connection string

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### `backend/requirements.txt`

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
python-dotenv
pydantic[email]
python-jose[cryptography]
```

---

## Frontend Pages & UI

### Design Guidelines

- Color scheme: Dark navy sidebar (`#0f172a`), white content area, accent blue (`#3b82f6`)
- Font: Inter
- Use **shadcn/ui** components: `Table`, `Button`, `Badge`, `Dialog`, `Input`, `Select`, `Card`
- Responsive layout with a fixed sidebar and topbar

---

### Page: `/customers` — Customer List

**Components used:** `CustomerTable`, `CustomerForm` (inside a Dialog)

**UI elements:**
- Page title: "Customers"
- Search bar (filter by name or email)
- "Add Customer" button (opens modal)
- Table columns: Name, Email, Phone, Plan, Status (badge), Actions (Edit / Delete)
- Status badge colors: `active` → green, `suspended` → yellow, `inactive` → gray
- Pagination at the bottom (10 per page)

**`CustomerForm` fields:**
- Full Name (text, required)
- Email (email, required)
- Phone (text, required)
- Address (textarea, optional)
- Plan (dropdown — fetched from `/plans`)
- Status (select: active / inactive / suspended)

---

### Page: `/customers/[id]` — Customer Detail

**UI elements:**
- Customer info card (name, email, phone, address, status badge)
- Current plan card with speed and price
- "Edit" button to open edit modal
- "Change Status" quick action buttons

---

### Page: `/plans` — Plans List

**UI elements:**
- Page title: "Subscription Plans"
- "Add Plan" button (opens modal)
- Grid of `PlanCard` components (3 columns on desktop, 1 on mobile)

**`PlanCard` shows:**
- Plan name
- Speed (e.g. "100 Mbps")
- Price (e.g. "৳ 800 / month")
- Description
- Active/Inactive badge
- Edit and Delete icon buttons

**`PlanForm` fields:**
- Name (text, required)
- Description (textarea)
- Speed in Mbps (number, required)
- Monthly Price (number, required)
- Is Active (toggle/switch)

---

### Page: `/plans/[id]` — Plan Detail

**UI elements:**
- Plan info card
- List of customers currently on this plan (table)
- Edit button

---

### Shared Components

#### `Sidebar.tsx`

Navigation links:
- Dashboard (link to `/`)
- Customers (link to `/customers`)
- Plans (link to `/plans`)

Show AmberIT logo at top. Highlight active route.

#### `Navbar.tsx`

- Page title on the left
- User avatar / name on the right (static for now)

---

## Frontend API Layer — `lib/api.ts`

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Plans
export const getPlans = () => api.get("/plans");
export const getPlan = (id: string) => api.get(`/plans/${id}`);
export const createPlan = (data: any) => api.post("/plans", data);
export const updatePlan = (id: string, data: any) => api.put(`/plans/${id}`, data);
export const deletePlan = (id: string) => api.delete(`/plans/${id}`);

// Customers
export const getCustomers = (params?: any) => api.get("/customers", { params });
export const getCustomer = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: any) => api.post("/customers", data);
export const updateCustomer = (id: string, data: any) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id: string) => api.delete(`/customers/${id}`);
export const updateCustomerStatus = (id: string, status: string) =>
  api.patch(`/customers/${id}/status`, { status });
```

---

## TypeScript Types — `types/index.ts`

```typescript
export type PlanStatus = "active" | "inactive";
export type CustomerStatus = "active" | "inactive" | "suspended";

export interface Plan {
  id: string;
  name: string;
  description?: string;
  speed_mbps: number;
  price_monthly: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  status: CustomerStatus;
  plan_id?: string;
  plan?: Plan;
  created_at: string;
}
```

---

## Environment Variables

### `backend/.env`

```
DATABASE_URL=postgresql://neondb_owner:npg_Pg2fV1ObaZkS@ep-plain-scene-a44srcm3-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
SECRET_KEY=your_secret_key


```

### `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Implementation Instructions for Codex

1. Set up the FastAPI backend first. Create `database.py`, models, schemas, and routers in order.
2. Run `alembic` or use `Base.metadata.create_all()` to create tables on startup.
3. Seed 3 sample plans and 5 sample customers for testing.
4. Set up the Next.js frontend with Tailwind and shadcn/ui installed.
5. Build the Sidebar and Navbar as layout-level components in `app/layout.tsx`.
6. Build `/plans` page first (simpler, no dependencies), then `/customers` (depends on plans for the dropdown).
7. All API calls should show a loading spinner while fetching and a toast notification on success/error.
8. Use React Query (`@tanstack/react-query`) for data fetching and caching on the frontend.
9. Forms should use `react-hook-form` with basic validation.
10. Do **not** implement authentication in Phase 1 — leave it for a later prompt.

---

## Notes

- Currency: Use BDT (৳) symbol for prices in the UI.
- Phone numbers: Accept Bangladeshi format (e.g. `01XXXXXXXXX`).
- Keep all text in English for now.
- The system will be extended in future phases with: Invoicing, Payments, Reports, and Auth.