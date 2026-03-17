"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import UserCard from "@/app/components/organisms/userCard";
import { usePathname, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const selectedOrganizationId = searchParams.get("organizationId");
  const selectedOrganizationName = searchParams.get("organizationName");
  const [resolvedOrganizationName, setResolvedOrganizationName] = useState<string | null>(
    selectedOrganizationName
  );
  const isConsultantDiagnosticsMode =
    pathname.startsWith("/dashboard/consultant") && Boolean(selectedOrganizationId);

  useEffect(() => {
    setResolvedOrganizationName(selectedOrganizationName);
  }, [selectedOrganizationName]);

  useEffect(() => {
    if (!selectedOrganizationId || selectedOrganizationName) {
      return;
    }

    let isMounted = true;

    const resolveOrganizationName = async () => {
      try {
        const response = await fetch("/api/consultant/organizations", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const organizations = Array.isArray(data?.organizations) ? data.organizations : [];
        const selectedOrganization = organizations.find(
          (organization: { id: number; name: string }) =>
            String(organization.id) === selectedOrganizationId
        );

        if (isMounted && selectedOrganization?.name) {
          setResolvedOrganizationName(selectedOrganization.name);
        }
      } catch {
        // Ignore lookup failures and keep the ID fallback in the UI.
      }
    };

    resolveOrganizationName();

    return () => {
      isMounted = false;
    };
  }, [selectedOrganizationId, selectedOrganizationName]);

  // Definir los enlaces comunes para todos los roles
  const links = [
    { href: "/dashboard", label: "Inicio", icon: <HomeIcon /> },
  ];

  // Define el menú para cada rol
  const roleBasedLinks = {
    admin: [
      { href: "/dashboard/admin/zoom-in", label: "Zoom-in", icon: <ZoomInIcon /> },
      { href: "/dashboard/admin/zoom-out", label: "Zoom-out", icon: <ZoomOutIcon /> },
      { href: "/dashboard/admin/categorization", label: "Categorización", icon: <LayoutIcon /> },
      { href: "/dashboard/admin/prioritization", label: "Priorización", icon: <ListBulletIcon /> },
      { href: "/dashboard/admin/reports", label: "Reportes", icon: <ZoomOutIcon /> },
      { href: "/dashboard/admin/users", label: "Usuarios", icon: <PersonIcon /> },
    ],
    consultant: [
      { href: "/dashboard", label: "Inicio", icon: <HomeIcon /> },
      { href: "/dashboard/consultant/organizations", label: "Organizaciones", icon: <LayoutIcon /> },
      { href: "/dashboard/consultant/reports", label: "Reportes", icon: <ZoomOutIcon /> },
    ],
    organization: [
      { href: "/dashboard/organization/zoom-in", label: "Zoom-in", icon: <ZoomInIcon /> },
      { href: "/dashboard/organization/zoom-out", label: "Zoom-out", icon: <ZoomOutIcon /> },
      { href: "/dashboard/organization/categorization", label: "Categorización", icon: <LayoutIcon /> },
      { href: "/dashboard/organization/prioritization", label: "Priorización", icon: <ListBulletIcon /> },
      { href: "/dashboard/organization/reports", label: "Reportes", icon: <ZoomOutIcon /> },
    ],
  };

  // Filtra los enlaces según el rol del usuario
  const getLinksByRole = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return [...links, ...roleBasedLinks.admin];
      case "consultant":
        return [...roleBasedLinks.consultant];
      case "organization":
        return [...links, ...roleBasedLinks.organization];
      default:
        return links; // Por defecto, mostramos los enlaces comunes
    }
  };

  const rawUserRole =
    typeof session?.user?.role === "string"
      ? session.user.role
      : session?.user?.role?.name || session?.user?.role?.displayName || undefined;
  const userRole = rawUserRole?.toLowerCase();
  const userLinks = getLinksByRole(userRole);
  const diagnosticsOrganizationName = resolvedOrganizationName ?? selectedOrganizationName ?? "";

  const diagnosticsLinks = selectedOrganizationId
    ? [
        {
          href: `/dashboard/consultant/zoom-in?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          label: "Zoom-in",
          icon: <ZoomInIcon />,
        },
        {
          href: `/dashboard/consultant/zoom-out?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          label: "Zoom-out",
          icon: <ZoomOutIcon />,
        },
        {
          href: `/dashboard/consultant/categorization?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          label: "Categorización",
          icon: <LayoutIcon />,
        },
        {
          href: `/dashboard/consultant/prioritization?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          label: "Priorización",
          icon: <ListBulletIcon />,
        },
        {
          href: `/dashboard/consultant/reports?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          label: "Reportes",
          icon: <ZoomOutIcon />,
        },
      ]
    : [];

  const displayedLinks =
    userRole === "consultant" && isConsultantDiagnosticsMode
      ? diagnosticsLinks
      : userLinks;

  const getLinkPath = (href: string) => href.split("?")[0];

  const isLinkActive = (href: string) => {
    const linkPath = getLinkPath(href);

    if (linkPath === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
  };

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

        {userRole === "consultant" && isConsultantDiagnosticsMode ? (
          <div className="mb-4 p-3 rounded-md bg-white/60 border border-white/70">
            <p className="text-xs uppercase tracking-wide text-gray-700">Organización seleccionada</p>
            <p className="font-semibold text-primary truncate">
              {resolvedOrganizationName || `Organización #${selectedOrganizationId}`}
            </p>
            <Link
              href="/dashboard/consultant/organizations"
              className="mt-2 inline-block text-sm text-blue-700 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Volver a Organizaciones
            </Link>
          </div>
        ) : null}

        <nav className="flex flex-col gap-4 flex-1 overflow-y-auto">
          {displayedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-2 py-1 rounded transition ${
                isLinkActive(link.href)
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
