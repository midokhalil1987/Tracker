"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { DataSync } from "@/components/data-sync";

const AUTH_PATHS = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.has(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <DataSync />
      <div className="flex h-svh overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}
