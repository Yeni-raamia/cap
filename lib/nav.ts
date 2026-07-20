import type { Profile, Role } from "./domain";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: string; // nom d'icône lucide (résolu dans Sidebar)
  roles: Role[];
}

/* Navigation filtrée par rôle (RBAC applicatif — cf. §4.7). */
export const NAV: NavItem[] = [
  { id: "espace", href: "/espace", label: "Mon espace", icon: "LayoutDashboard", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "global", href: "/global", label: "Vue globale", icon: "Users", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "projets", href: "/projets", label: "Projets", icon: "FolderKanban", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "productivite", href: "/productivite", label: "Productivité", icon: "Activity", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "blocages", href: "/blocages", label: "Ce qui ne bouge pas", icon: "AlertTriangle", roles: ["manager", "directeur", "admin"] },
  { id: "negligences", href: "/negligences", label: "Négligences", icon: "AlertOctagon", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "stats", href: "/stats", label: "Statistiques", icon: "BarChart3", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "classement", href: "/classement", label: "Classement", icon: "Trophy", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "rappels", href: "/rappels", label: "Rappels", icon: "Bell", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "messagerie", href: "/messagerie", label: "Messagerie", icon: "MessageSquare", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "admin", href: "/admin", label: "Administration", icon: "Settings", roles: ["admin"] },
];

/** Pages qu'un admin peut accorder individuellement (hors administration). */
export const GRANTABLE_PAGES = NAV.filter((n) => n.id !== "admin");

const allowed = (item: NavItem, role: Role, extraPages: string[]) =>
  item.roles.includes(role) || extraPages.includes(item.id);

export const navForUser = (me: Profile): NavItem[] =>
  NAV.filter((n) => allowed(n, me.role, me.extraPages ?? []));

export const canAccess = (href: string, me: Profile): boolean => {
  const item = NAV.find((n) => href === n.href || href.startsWith(n.href + "/"));
  return item ? allowed(item, me.role, me.extraPages ?? []) : true;
};
