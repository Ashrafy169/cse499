"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ChatBot from "@/components/ChatBot";

const portalNavItems = [
  { label: "My Account", href: "/portal" },
  { label: "Invoices", href: "/portal/invoices" },
  { label: "Support", href: "/portal/tickets" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup";
  const isPublic = isLogin || isSignup;
  const isPortal = pathname.startsWith("/portal");

  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace(user.role === "customer" ? "/portal" : "/");
      return;
    }
    if (user && user.role === "customer" && !isPortal) {
      router.replace("/portal");
      return;
    }
    if (user && user.role !== "customer" && isPortal) {
      router.replace("/");
      return;
    }
  }, [user, isLoading, isPublic, isPortal, router]);

  if (isPublic) return <>{children}</>;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPortal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Portal header */}
        <header className="bg-black text-white px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-3 py-1.5">
              <Image src="/logo.png" alt="AmberIT" width={90} height={28} />
            </div>
            <span className="text-sm text-slate-400 hidden sm:block">Customer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300 hidden sm:block">{user.full_name}</span>
            <button
              onClick={logout}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Portal sub-nav */}
        <nav className="bg-black border-t border-white/10">
          <div className="max-w-4xl mx-auto px-6 flex gap-1">
            {portalNavItems.map(({ label, href }) => {
              const active = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    active
                      ? "border-[#C41230] text-white"
                      : "border-transparent text-slate-400 hover:text-white"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 max-w-4xl mx-auto w-full p-6">{children}</main>
        <ChatBot />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
