"use client";

import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/plans": "Subscription Plans",
  "/invoices": "Invoices",
  "/tickets": "Support Tickets",
  "/users": "User Management",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  billing_staff: "Billing Staff",
  support_staff: "Support Staff",
  customer: "Customer",
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/customers/")) return "Customer Details";
  if (pathname.startsWith("/plans/")) return "Plan Details";
  return "AmberIT";
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = getTitle(pathname);

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-700 leading-none">
            {user?.full_name ?? "Admin"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {user ? roleLabels[user.role] : ""}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <User size={16} className="text-[#C41230]" />
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
