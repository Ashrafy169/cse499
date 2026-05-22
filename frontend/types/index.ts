export type PlanStatus = "active" | "inactive";
export type CustomerStatus = "active" | "inactive" | "suspended";
export type UserRole = "super_admin" | "billing_staff" | "support_staff" | "customer";
export type InvoiceStatus = "paid" | "unpaid" | "overdue";
export type TicketCategory = "connection" | "billing" | "general";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type PaymentMethod = "bkash" | "nagad" | "card";
export type PlanChangeStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  customer_id: string | null;
  created_at: string;
}

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
  ip_address?: string;
  router_model?: string;
  connection_type?: string;
  billing_start?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface Invoice {
  id: string;
  customer_id: string;
  plan_id: string | null;
  amount: string;
  due_date: string;
  status: InvoiceStatus;
  billing_month: string;
  created_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  plan?: {
    id: string;
    name: string;
    speed_mbps: number;
  };
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface Ticket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: string;
  method: PaymentMethod;
  transaction_ref: string;
  created_at: string;
}

export interface PlanChangeRequest {
  id: string;
  customer_id: string;
  current_plan_id?: string;
  requested_plan_id?: string;
  status: PlanChangeStatus;
  note?: string;
  staff_note?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  current_plan?: Plan;
  requested_plan?: Plan;
}

export interface PlanChangeListResponse {
  items: PlanChangeRequest[];
  total: number;
  page: number;
  limit: number;
}

// ── Reports / Dashboard ──────────────────────────────────────────────────────

export interface DashboardSummary {
  total_customers: number;
  active_customers: number;
  revenue_this_month: number;
  overdue_count: number;
  total_dues: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
}

export interface CustomerGrowthPoint {
  month: string;
  new_customers: number;
}

export interface PlanDistributionPoint {
  plan: string;
  count: number;
}

export interface PaymentMethodPoint {
  method: PaymentMethod;
  count: number;
  total: number;
}

export interface ActivityEvent {
  type: "new_customer" | "payment_received" | "invoice_generated";
  label: string;
  timestamp: string;
  meta: Record<string, unknown>;
}
