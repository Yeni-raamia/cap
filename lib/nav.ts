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
  { id: "cockpit", href: "/cockpit", label: "Accueil", icon: "Sparkles", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "espace", href: "/espace", label: "Mon espace", icon: "LayoutDashboard", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "global", href: "/global", label: "Vue globale", icon: "Users", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "projets", href: "/projets", label: "Projets", icon: "FolderKanban", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "productivite", href: "/productivite", label: "Productivité", icon: "Activity", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "plan", href: "/plan", label: "Plan de l'année", icon: "CalendarRange", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "blocages", href: "/blocages", label: "Ce qui ne bouge pas", icon: "AlertTriangle", roles: ["manager", "directeur", "admin"] },
  { id: "negligences", href: "/negligences", label: "Négligences", icon: "AlertOctagon", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "nonconformites", href: "/non-conformites", label: "Non-conformités", icon: "FileWarning", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "grc", href: "/grc", label: "GRC", icon: "ShieldCheck", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "audit", href: "/audit", label: "Audit", icon: "ClipboardCheck", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "stats", href: "/stats", label: "Statistiques", icon: "BarChart3", roles: ["manager", "directeur", "admin", "dsi"] },
  { id: "classement", href: "/classement", label: "Classement", icon: "Trophy", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "rappels", href: "/rappels", label: "Rappels", icon: "Bell", roles: ["agent", "manager", "directeur", "admin"] },
  { id: "reunions", href: "/reunions", label: "Réunions", icon: "CalendarDays", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "relations", href: "/relations", label: "Relations", icon: "Share2", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "contacts", href: "/contacts", label: "Contacts", icon: "BookUser", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "messagerie", href: "/messagerie", label: "Messagerie", icon: "MessageSquare", roles: ["agent", "manager", "directeur", "admin", "dsi"] },
  { id: "admin", href: "/admin", label: "Administration", icon: "Settings", roles: ["admin"] },
];

/** Pages qu'un admin peut accorder individuellement (hors administration). */
export const GRANTABLE_PAGES = NAV.filter((n) => n.id !== "admin");
/** Toutes les vues configurables par l'admin (administration incluse). */
export const ALL_PAGES = NAV;

/** Accès effectif : (rôle OU accordé) ET non explicitement retiré. */
const allowed = (item: NavItem, role: Role, extraPages: string[], deniedPages: string[]) =>
  (item.roles.includes(role) || extraPages.includes(item.id)) && !deniedPages.includes(item.id);

/** L'accès d'un rôle à une page, avant surcharges par utilisateur. */
export const roleHasPage = (role: Role, pageId: string): boolean =>
  Boolean(NAV.find((n) => n.id === pageId)?.roles.includes(role));

/** L'utilisateur a-t-il accès à cette page, en tenant compte des surcharges ? */
export const hasPageAccess = (me: Profile, pageId: string): boolean => {
  const item = NAV.find((n) => n.id === pageId);
  if (!item) return false;
  return allowed(item, me.role, me.extraPages ?? [], me.deniedPages ?? []);
};

export const navForUser = (me: Profile): NavItem[] =>
  NAV.filter((n) => allowed(n, me.role, me.extraPages ?? [], me.deniedPages ?? []));

export const canAccess = (href: string, me: Profile): boolean => {
  const item = NAV.find((n) => href === n.href || href.startsWith(n.href + "/"));
  return item ? allowed(item, me.role, me.extraPages ?? [], me.deniedPages ?? []) : true;
};
