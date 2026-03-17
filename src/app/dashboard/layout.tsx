"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/app/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex w-screen h-screen">
        {/* Nuevo div para el fondo */}
        <div className="absolute inset-0 background-in"></div>
        {/* Sidebar fijo */}
        <Suspense fallback={<div className="w-64" />}>
          <Sidebar />
        </Suspense>

        {/* Contenido con scroll */}
        <div className="flex flex-col flex-1 overflow-y-auto md:pt-1 pt-8">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
