import type { Role } from "./domain";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: string; // nom d'icône lucide (résolu dans Sidebar)
  roles: Role[];
}

/* Navigation filtrée par rôle (RBAC applicatif — cf. §4.7). */
export const NAV: NavItem[] = [
  { id: "espace", href: "/espace", label: "Mon espace", icon: "LayoutDashboard", roles: ["agent", "directeur", "admin"] },
  { id: "global", href: "/global", label: "Vue globale", icon: "Users", roles: ["agent", "directeur", "admin"] },
  { id: "projets", href: "/projets", label: "Projets", icon: "FolderKanban", roles: ["agent", "directeur", "admin"] },
  { id: "blocages", href: "/blocages", label: "Ce qui ne bouge pas", icon: "AlertTriangle", roles: ["directeur", "admin"] },
  { id: "stats", href: "/stats", label: "Statistiques", icon: "BarChart3", roles: ["directeur", "admin"] },
  { id: "classement", href: "/classement", label: "Classement", icon: "Trophy", roles: ["agent", "directeur", "admin"] },
  { id: "rappels", href: "/rappels", label: "Rappels", icon: "Bell", roles: ["agent", "directeur", "admin"] },
  { id: "admin", href: "/admin", label: "Administration", icon: "Settings", roles: ["admin"] },
];

export const navForRole = (role: Role): NavItem[] =>
  NAV.filter((n) => n.roles.includes(role));

export const canAccess = (href: string, role: Role): boolean => {
  const item = NAV.find((n) => href.startsWith(n.href));
  return item ? item.roles.includes(role) : true;
};
