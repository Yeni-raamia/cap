/* ==================================================================
 *  lib/data/auditGrids.ts — Bibliothèque de grilles d'audit de départ.
 *  Données pures (sans DB) : réutilisées pour l'amorçage de la base
 *  (ensureAuditGrids) ET le jeu de démonstration (seedAuditGrids).
 *  Inspirées CIS Benchmarks / guides ANSSI. Éditables dans l'app.
 * ================================================================== */
import type { AuditQuestion } from "@/lib/domain";

export interface StarterGrid {
  key: string; // identifiant stable (préfixe des ids de questions)
  name: string;
  category: string;
  source: string;
  description: string;
  questions: Omit<AuditQuestion, "id">[];
}

const Q = (domain: string, text: string, guidance: string, weight = 1, critical = false): Omit<AuditQuestion, "id"> => ({ domain, text, guidance, weight, critical });

export const STARTER_AUDIT_GRIDS: StarterGrid[] = [
  {
    key: "backup",
    name: "Audit des sauvegardes",
    category: "Sauvegardes / Restauration",
    source: "ANSSI",
    description: "Vérifie la robustesse de la stratégie de sauvegarde/restauration (règle 3-2-1, tests, immuabilité).",
    questions: [
      Q("Stratégie", "La règle 3-2-1 est-elle respectée (3 copies, 2 supports, 1 hors site) ?", "Vérifier le plan de sauvegarde : nombre de copies, types de supports, externalisation.", 3, true),
      Q("Stratégie", "Les sauvegardes critiques sont-elles immuables / hors-ligne (protection anti-rançongiciel) ?", "Vérifier l'existence d'une copie immuable (WORM) ou déconnectée (air-gap).", 3, true),
      Q("Stratégie", "La rétention couvre-t-elle les besoins métier et réglementaires ?", "Comparer la durée de rétention configurée aux exigences (RPO, obligations légales).", 2, false),
      Q("Sécurité", "Les sauvegardes sont-elles chiffrées (au repos et en transit) ?", "Vérifier le chiffrement des jeux de sauvegarde et des flux de réplication.", 2, true),
      Q("Sécurité", "L'accès à la console de sauvegarde est-il restreint et tracé (MFA) ?", "Vérifier les comptes d'accès, le MFA, la journalisation des actions.", 2, true),
      Q("Exploitation", "Des tests de restauration sont-ils réalisés périodiquement et documentés ?", "Demander les PV de tests de restauration récents.", 3, true),
      Q("Exploitation", "Les échecs de sauvegarde sont-ils supervisés et alertés ?", "Vérifier la supervision (alertes mail/SIEM) et le suivi des échecs.", 2, false),
    ],
  },
  {
    key: "ad",
    name: "Durcissement Active Directory / GPO",
    category: "Active Directory / GPO",
    source: "CIS Benchmark",
    description: "Contrôle les bonnes pratiques de sécurisation de l'AD : comptes à privilèges, tiering, GPO, mots de passe.",
    questions: [
      Q("Comptes à privilèges", "Le modèle en tiers (tiering 0/1/2) est-il en place ?", "Vérifier la séparation administrateurs domaine / serveurs / postes.", 3, true),
      Q("Comptes à privilèges", "LAPS (mots de passe admin locaux) est-il déployé ?", "Vérifier le déploiement de LAPS/Windows LAPS sur les postes et serveurs.", 2, true),
      Q("Comptes à privilèges", "Le nombre d'Admins du domaine est-il réduit au strict minimum ?", "Lister les membres de Domain Admins / Enterprise Admins.", 2, true),
      Q("Comptes", "Les comptes inactifs sont-ils désactivés (>90 j) ?", "Requête sur lastLogonTimestamp ; vérifier le processus de revue.", 2, false),
      Q("Politique de mot de passe", "La politique de mot de passe respecte-t-elle les recommandations ANSSI ?", "Longueur, complexité, historique, verrouillage — via GPO/PSO.", 2, false),
      Q("GPO", "Les GPO de sécurité de référence sont-elles appliquées (SMBv1 off, NTLMv1 off) ?", "Vérifier l'application des baselines de sécurité.", 3, true),
      Q("GPO", "Les modifications de GPO sont-elles auditées ?", "Vérifier la journalisation des changements de GPO.", 1, false),
    ],
  },
  {
    key: "log",
    name: "Journalisation & centralisation des logs",
    category: "Journalisation / SIEM",
    source: "ANSSI",
    description: "Vérifie l'activation des journaux essentiels, leur centralisation, leur intégrité et l'alerting.",
    questions: [
      Q("Collecte", "Les Event IDs critiques sont-ils activés (4624/4625/4672/4688, 1102…) ?", "Vérifier la politique d'audit avancée sur les serveurs et DC.", 3, true),
      Q("Collecte", "La journalisation PowerShell (ScriptBlock/Module) est-elle activée ?", "Vérifier les GPO de journalisation PowerShell.", 2, false),
      Q("Centralisation", "Les journaux sont-ils centralisés (SIEM / puits de logs) ?", "Vérifier la remontée des sources critiques vers le collecteur central.", 3, true),
      Q("Intégrité", "L'horodatage est-il fiable (NTP synchronisé sur une source de confiance) ?", "Vérifier la configuration NTP des équipements.", 2, false),
      Q("Intégrité", "La rétention des journaux est-elle suffisante (≥ 6-12 mois) ?", "Vérifier la durée de conservation côté SIEM et sources.", 2, false),
      Q("Détection", "Des règles d'alerte couvrent-elles les événements de sécurité clés ?", "Vérifier l'existence de règles (échecs d'auth, effacement de logs…).", 2, true),
    ],
  },
  {
    key: "srv",
    name: "Durcissement serveur Windows",
    category: "Durcissement serveur",
    source: "CIS Benchmark",
    description: "Contrôle le durcissement d'un serveur Windows : surface d'attaque, protocoles, mises à jour, EDR.",
    questions: [
      Q("Surface d'attaque", "Les services et rôles inutiles sont-ils désactivés ?", "Lister les services actifs ; comparer au rôle du serveur.", 2, false),
      Q("Protocoles", "SMBv1 est-il désactivé ?", "Vérifier via Get-WindowsOptionalFeature / registre.", 3, true),
      Q("Protocoles", "RDP impose-t-il l'authentification NLA et est-il restreint ?", "Vérifier NLA, restriction par pare-feu/bastion.", 2, true),
      Q("Protection", "Un EDR/antivirus est-il installé, à jour et supervisé ?", "Vérifier l'agent, l'état de mise à jour et la remontée console.", 3, true),
      Q("Mises à jour", "Les correctifs de sécurité sont-ils appliqués dans les délais (SLA) ?", "Vérifier le niveau de patch et le processus WSUS/MECM.", 3, true),
      Q("Pare-feu", "Le pare-feu local est-il activé avec une politique restrictive ?", "Vérifier l'état du pare-feu Windows et les règles entrantes.", 2, false),
      Q("Comptes", "Le compte administrateur local intégré est-il renommé/désactivé ?", "Vérifier l'état du compte Administrateur intégré.", 1, false),
    ],
  },
];

/** Développe une grille de départ en questions avec ids stables (`<key>-qN`). */
export const starterQuestions = (g: StarterGrid): AuditQuestion[] =>
  g.questions.map((q, i) => ({ ...q, id: `${g.key}-q${i + 1}` }));
