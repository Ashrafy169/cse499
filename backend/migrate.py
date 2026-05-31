"""
One-time migration script to add new columns and tables.
Run once: python migrate.py
"""
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Parse psycopg2 connection params from DATABASE_URL
# Expected format: postgresql://user:password@host:port/dbname
import urllib.parse

parsed = urllib.parse.urlparse(DATABASE_URL)
conn_params = {
    "host": parsed.hostname,
    "port": parsed.port or 5432,
    "dbname": parsed.path.lstrip("/"),
    "user": parsed.username,
    "password": parsed.password,
}

migrations = [
    # New columns on customers table
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS router_model VARCHAR(100)",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'Fiber Optic'",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_start DATE",

    # payments table
    """
    CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        method VARCHAR NOT NULL,
        transaction_ref VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,

    # plan_change_requests table
    """
    CREATE TABLE IF NOT EXISTS plan_change_requests (
        id UUID PRIMARY KEY,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        current_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
        requested_plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        note TEXT,
        staff_note TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,

    # FR-06: partial payment tracking columns on invoices
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description VARCHAR(500)",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE",

    # FR-09: notifications table
    """
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
]

def run():
    print(f"Connecting to: {parsed.hostname}/{parsed.path.lstrip('/')}")
    conn = psycopg2.connect(**conn_params)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    for sql in migrations:
        sql = sql.strip()
        preview = sql.split("\n")[0][:80]
        print(f"Running: {preview}...")
        try:
            cur.execute(sql)
            print("  OK")
        except Exception as e:
            print(f"  ERROR: {e}")

    cur.close()
    conn.close()
    print("\nMigration complete.")

if __name__ == "__main__":
    run()
