"use client";

import React, { useState } from "react";
import Link from "next/link";
import UserCard from "@/app/components/organisms/userCard";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  HomeIcon,
  ZoomOutIcon,
  LayoutIcon,
  ListBulletIcon,
  ZoomInIcon,
  HamburgerMenuIcon,
  Cross1Icon,
  PersonIcon,
} from "@radix-ui/react-icons";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); //Detecta la ruta actual
  const { data: session } = useSession();

  // Definir los enlaces comunes para todos los roles
  const links = [
    { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
  ];

  // Define el menú para cada rol
  const roleBasedLinks = {
    admin: [
      { href: "/dashboard/admin/zoom-in", label: "Zoom-in", icon: <ZoomInIcon /> },
      { href: "/dashboard/admin/zoom-out", label: "Zoom-out", icon: <ZoomOutIcon /> },
      { href: "/dashboard/admin/categorization", label: "Categorization", icon: <LayoutIcon /> },
      { href: "/dashboard/admin/prioritization", label: "Prioritization", icon: <ListBulletIcon /> },
      { href: "/dashboard/admin/reports", label: "Reports", icon: <ZoomOutIcon /> },
      { href: "/dashboard/admin/users", label: "Users", icon: <PersonIcon /> },
    ],
    consultant: [
      { href: "/dashboard/consultant/zoom-in", label: "Zoom-in", icon: <ZoomInIcon /> },
      { href: "/dashboard/consultant/zoom-out", label: "Zoom-out", icon: <ZoomOutIcon /> },
      { href: "/dashboard/consultant/categorization", label: "Categorization", icon: <LayoutIcon /> },
      { href: "/dashboard/consultant/prioritization", label: "Prioritization", icon: <ListBulletIcon /> },
      //{ href: "/dashboard/consultant/organizations", label: "Organizations", icon: <LayoutIcon /> },
      { href: "/dashboard/consultant/reports", label: "Reports", icon: <ZoomOutIcon /> },
    ],
    organization: [
      { href: "/dashboard/organization/zoom-in", label: "Zoom-in", icon: <ZoomInIcon /> },
      { href: "/dashboard/organization/zoom-out", label: "Zoom-out", icon: <ZoomOutIcon /> },
      { href: "/dashboard/organization/categorization", label: "Categorization", icon: <LayoutIcon /> },
      { href: "/dashboard/organization/prioritization", label: "Prioritization", icon: <ListBulletIcon /> },
      { href: "/dashboard/organization/reports", label: "Reports", icon: <ZoomOutIcon /> },
    ],
  };

  // Filtra los enlaces según el rol del usuario
  const getLinksByRole = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return [...links, ...roleBasedLinks.admin];
      case "consultant":
        return [...links, ...roleBasedLinks.consultant];
      case "organization":
        return [...links, ...roleBasedLinks.organization];
      default:
        return links; // Por defecto, mostramos los enlaces comunes
    }
  };

  const userRole =
    typeof session?.user?.role === "string"
      ? session.user.role
      : session?.user?.role?.name || session?.user?.role?.displayName || undefined;
  const userLinks = getLinksByRole(userRole);

  return (
    <>
      {/* Botón hamburguesa visible solo en móvil */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <Cross1Icon className="w-6 h-6" /> : <HamburgerMenuIcon className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`pb-20 md:pb-5 fixed top-0 left-0 h-screen w-64  shadow-lg p-4 z-40 pt-16 md:pt-3 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static flex flex-col`}
      >
        <div className="absolute inset-0 green"></div>
        <h2 className="text-2xl font-bold text-primary mb-6">Menu</h2>

        <nav className="flex flex-col gap-4 flex-1 overflow-y-auto">
          {userLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                pathname === link.href
                  ? "text-white bg-primary font-semibold"
                  : "hover:text-blue-600"
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>

        {/* Card al final */}
        <UserCard
          name={session?.user?.name || "Invitado"}
          role={
            typeof session?.user?.role === "string"
              ? session.user.role
              : session?.user?.role?.displayName || session?.user?.role?.name || "Invitado"
          }
          gmail={session?.user?.email || ""}
          avatar=""
        />
      </aside>

      {/* Fondo oscuro al abrir en móvil */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
