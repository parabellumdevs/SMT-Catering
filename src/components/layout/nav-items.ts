import type { ComponentType } from "react";
import {
  CalendarDays,
  ChefHat,
  Calculator,
  Percent,
  Users,
} from "lucide-react";
import type { UserRole } from "@shared/types/roles";

import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  {
    to: "/",
    label: "Cotizador",
    icon: Calculator,
    end: true,
    roles: ["superadmin", "admin", "cliente"],
  },
  {
    to: "/dashboard",
    label: "Eventos",
    icon: CalendarDays,
    roles: ["superadmin", "admin", "cocina"],
  },
  {
    to: "/comandas",
    label: "Comandas",
    icon: ChefHat,
    roles: ["superadmin", "admin", "cocina"],
  },
  {
    to: "/tarifas",
    label: "Tarifas",
    icon: Percent,
    roles: ["superadmin", "admin"],
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["superadmin", "admin"],
  },
];

export function useNavLinkClass(): (args: { isActive: boolean }) => string {
  return ({ isActive }) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
      isActive
        ? "bg-canvas-cream text-brand font-medium" // Activo: fondo blanco hueso y texto borravino
        : "text-white/80 hover:bg-white/10 hover:text-white", // Inactivo: texto claro sobre fondo borravino con hover sutil
    );
}
