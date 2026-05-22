import axios from "axios";
import { clearAuth, getToken } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Plans
export const getPlans = () => api.get("/plans");
export const getPlan = (id: string) => api.get(`/plans/${id}`);
export const createPlan = (data: unknown) => api.post("/plans", data);
export const updatePlan = (id: string, data: unknown) => api.put(`/plans/${id}`, data);
export const deletePlan = (id: string) => api.delete(`/plans/${id}`);

// Customers
export const getCustomers = (params?: Record<string, unknown>) =>
  api.get("/customers", { params });
export const getCustomer = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: unknown) => api.post("/customers", data);
export const updateCustomer = (id: string, data: unknown) =>
  api.put(`/customers/${id}`, data);
export const deleteCustomer = (id: string) => api.delete(`/customers/${id}`);
export const updateCustomerStatus = (id: string, status: string) =>
  api.patch(`/customers/${id}/status`, { status });

// Auth / Portal
export const getMyAccount = () => api.get("/auth/my-account");
export const signup = (data: unknown) => api.post("/auth/signup", data);

// Users (super admin)
export const getUsers = () => api.get("/users");
export const createUser = (data: unknown) => api.post("/users", data);
export const updateUser = (id: string, data: unknown) => api.put(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);

// Invoices (admin)
export const getInvoices = (params?: Record<string, unknown>) =>
  api.get("/invoices", { params });
export const updateInvoiceStatus = (id: string, status: string) =>
  api.put(`/invoices/${id}/status`, { status });
export const generateInvoices = (billing_month?: string) =>
  api.post("/invoices/generate", null, { params: billing_month ? { billing_month } : {} });
export const markOverdueInvoices = () => api.post("/invoices/mark-overdue");

// Invoices (customer)
export const getMyInvoices = (params?: Record<string, unknown>) =>
  api.get("/invoices/my", { params });

// PDF download (works for both admin and customer — checks auth server-side)
export const downloadInvoicePdf = async (invoiceId: string, billingMonth: string) => {
  const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${billingMonth}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Tickets (admin)
export const getTickets = (params?: Record<string, unknown>) =>
  api.get("/tickets", { params });
export const updateTicketStatus = (id: string, status: string) =>
  api.put(`/tickets/${id}/status`, { status });

// Tickets (any user)
export const getMyTickets = (params?: Record<string, unknown>) =>
  api.get("/tickets/my", { params });
export const createTicket = (data: unknown) => api.post("/tickets", data);

// Payments (customer)
export const submitPayment = (data: unknown) => api.post("/payments", data);
export const getMyPayments = () => api.get("/payments/my");

// Payments (admin)
export const getAllPayments = () => api.get("/payments");

// Plan Change Requests (customer)
export const submitPlanChange = (data: unknown) => api.post("/plan-changes", data);
export const getMyPlanChanges = () => api.get("/plan-changes/my");

// Plan Change Requests (admin)
export const getPlanChanges = (params?: Record<string, unknown>) =>
  api.get("/plan-changes", { params });
export const reviewPlanChange = (id: string, data: unknown) =>
  api.put(`/plan-changes/${id}/review`, data);

// Reports / Dashboard
export const getReportSummary = () => api.get("/reports/summary");
export const getRevenueTrend = (months = 6) =>
  api.get("/reports/revenue-trend", { params: { months } });
export const getCustomerGrowth = (months = 6) =>
  api.get("/reports/customer-growth", { params: { months } });
export const getPlanDistribution = () => api.get("/reports/plan-distribution");
export const getPaymentMethods = () => api.get("/reports/payment-methods");
export const getActivity = (limit = 10) =>
  api.get("/reports/activity", { params: { limit } });

export const downloadReportCsv = async () => {
  const res = await api.get("/reports/export/csv", { responseType: "blob" });
  const month = new Date().toISOString().slice(0, 7);
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `dashboard-export-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// AI Chat
export const sendChatMessage = (message: string) =>
  api.post<{ reply: string }>("/ai/chat", { message });

export default api;
