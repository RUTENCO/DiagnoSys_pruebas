"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import UserCard from "@/app/components/organisms/userCard";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { TbReport } from "react-icons/tb";
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
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname(); //Detecta la ruta actual
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const selectedOrganizationId = searchParams.get("organizationId");
  const selectedOrganizationName = searchParams.get("organizationName");
  const rawSidebarRole = typeof session?.user?.role === "string"
    ? session.user.role
    : session?.user?.role?.name;
  const normalizedSidebarRole = rawSidebarRole?.toLowerCase();
  const [resolvedOrganizationName, setResolvedOrganizationName] = useState<string | null>(
    selectedOrganizationName
  );
  const isConsultantDiagnosticsMode =
    normalizedSidebarRole === "consultant" &&
    pathname.startsWith("/dashboard/organization") &&
    Boolean(selectedOrganizationId);

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

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    const loadAvatar = async () => {
      try {
        const response = await fetch("/api/auth/users?me=true", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const user = await response.json();

        if (isMounted) {
          setAvatarUrl(user.avatarUrl ?? undefined);
        }
      } catch {
        // Ignore avatar loading failures.
      }
    };

    void loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [session]);

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
      { href: "/dashboard/consultant/reports/configuration", label: "Configurar reporte", icon: <TbReport /> },
    ],
    organization: [
      { href: "/dashboard/organization/report", label: "Reporte", icon: <TbReport /> },
      { href: "/dashboard/organization/report/configuration", label: "Configurar reporte", icon: <TbReport /> },
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
    ? [...roleBasedLinks.organization].map((link) => {
        if (link.href === "/dashboard/organization/report") {
          return {
            ...link,
            href: `${link.href}?organizationId=${selectedOrganizationId}&organizationName=${encodeURIComponent(diagnosticsOrganizationName)}`,
          };
        }

        return link;
      })
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

    if (linkPath === "/dashboard/organization/report") {
      return pathname === linkPath || (pathname.startsWith(`${linkPath}/`) && !pathname.startsWith(`${linkPath}/configuration`));
    }

    if (linkPath.endsWith("/reports")) {
      return pathname === linkPath;
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

      {/* Botón para reabrir el menú en escritorio */}
      {!isDesktopSidebarOpen && (
        <button
          type="button"
          className="cursor-pointer hidden md:flex fixed top-4 left-4 z-50 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-[#24533b]"
          onClick={() => setIsDesktopSidebarOpen(true)}
        >
          <HamburgerMenuIcon className="h-4 w-4" />
          Mostrar menú
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`pb-20 md:pb-5 fixed top-0 left-0 h-screen w-64 shadow-lg p-4 z-40 pt-16 md:pt-3 transform transition-all duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:static md:translate-x-0 md:overflow-hidden flex flex-col ${isDesktopSidebarOpen ? "md:w-64 md:p-4" : "md:w-0 md:p-0 md:border-0"}`}
      >
        <div className="absolute inset-0 green"></div>
        <div className="relative z-10 flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Menu</h2>
          <button
            type="button"
            className="cursor-pointer hidden md:inline-flex items-center rounded-md border border-primary/20 bg-white/80 px-2 py-1 text-xs font-medium text-primary hover:bg-white"
            onClick={() => setIsDesktopSidebarOpen(false)}
          >
            Ocultar
          </button>
        </div>

        {userRole === "consultant" && isConsultantDiagnosticsMode ? (
          <div className="relative z-10 mb-4 rounded-md border-2 border-white green-interactive p-3">
            <p className="text-xs uppercase tracking-wide text-gray-900">Organización seleccionada</p>
            <p className="mt-1 font-bold text-primary truncate">
              {resolvedOrganizationName || `Organización #${selectedOrganizationId}`}
            </p>
            <button
              type="button"
              className="mt-2 inline-block text-sm text-green-800 underline cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/consultant/organizations");
              }}
            >
              Volver a mi perfil de consultor
            </button>
          </div>
        ) : null}

        <nav className="relative z-10 flex flex-col gap-4 flex-1 overflow-y-auto">
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
        <div className="relative z-10">
          <UserCard
            name={session?.user?.name || "Invitado"}
            role={
              typeof session?.user?.role === "string"
                ? session.user.role
                : session?.user?.role?.displayName || session?.user?.role?.name || "Invitado"
            }
            gmail={session?.user?.email || ""}
            avatar={avatarUrl}
          />
        </div>
      </aside>

      {/* Fondo oscuro al abrir en móvil */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
