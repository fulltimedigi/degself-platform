"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";

const NAV = [
  { href: "/admin/quotes", label: "الطلبات" },
  { href: "/admin/reviews", label: "المراجعات" },
  { href: "/admin/audit", label: "التدقيق" },
  { href: "/admin/settings", label: "الإعدادات" },
] as const;

function logicalPath(pathname: string): string {
  const m = pathname.match(/^\/(en|hi|ur)(\/.*)?$/);
  return m ? m[2] ?? "/" : pathname;
}

/** Shared admin top bar (hidden on login). */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const logical = logicalPath(pathname);

  if (logical === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="me-2 text-sm font-extrabold text-[#FFD60A]">لوحة دق سلف</span>
            {NAV.map((item) => {
              const active =
                logical === item.href || logical.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                    active
                      ? "bg-[#FFD60A] text-[#0A0A0A]"
                      : "border border-border text-foreground hover:border-[#FFD60A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <AdminLogoutButton />
        </div>
      </header>
      {children}
    </>
  );
}
