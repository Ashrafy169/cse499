"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCog,
  FileText,
  TicketCheck,
  Wifi,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const staffNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["super_admin", "billing_staff", "support_staff"] },
  { label: "Customers", href: "/customers", icon: Users, roles: ["super_admin", "billing_staff", "support_staff"] },
  { label: "Plans", href: "/plans", icon: Wifi, roles: ["super_admin", "billing_staff", "support_staff"] },
  { label: "Invoices", href: "/invoices", icon: FileText, roles: ["super_admin", "billing_staff"] },
  { label: "Plan Changes", href: "/plan-changes", icon: ArrowRightLeft, roles: ["super_admin", "billing_staff", "support_staff"] },
  { label: "Tickets", href: "/tickets", icon: TicketCheck, roles: ["super_admin", "billing_staff", "support_staff"] },
  { label: "Users", href: "/users", icon: UserCog, roles: ["super_admin"] },
];

const customerNavItems = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Pay Invoice", href: "/portal/payment", icon: CreditCard },
  { label: "Change Plan", href: "/portal/plan-change", icon: ArrowRightLeft },
  { label: "Invoices", href: "/portal/invoices", icon: FileText },
  { label: "Support", href: "/portal/tickets", icon: TicketCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCustomer = user?.role === "customer";

  const navItems = isCustomer
    ? customerNavItems
    : staffNavItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen bg-black text-white">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-white/10">
        <div className="bg-white rounded-lg px-3 py-2">
          <Image src="/logo.png" alt="AmberIT" width={110} height={36} priority />
        </div>
      </div>

      {/* Role label */}
      {isCustomer && (
        <div className="px-5 py-2 border-b border-white/5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Customer Portal
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" || href === "/portal"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[#C41230] text-white"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-xs text-slate-500">
        AmberIT Billing v1.0
      </div>
    </aside>
  );
}
