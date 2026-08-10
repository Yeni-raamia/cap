/* ==================================================================
 *  lib/data/attack.ts — Référentiel MITRE ATT&CK (Enterprise, extrait).
 *  Données de référence (catalogue) versionnées en code : tactiques et
 *  techniques courantes. Seule la « couverture » de l'organisation
 *  (auto-évaluation de détection) est stockée en base (attack_coverage).
 *  Source : MITRE ATT&CK for Enterprise. Extrait pédagogique, non exhaustif.
 * ================================================================== */

export interface AttackTactic {
  id: string; // TA####
  name: string;
  description: string;
}
export interface AttackTechnique {
  id: string; // T####
  name: string;
  tacticIds: string[];
  description: string;
}

/** Les 14 tactiques ATT&CK Enterprise (le « pourquoi » d'une action). */
export const ATTACK_TACTICS: AttackTactic[] = [
  { id: "TA0043", name: "Reconnaissance", description: "Collecter des informations sur la cible avant l'attaque." },
  { id: "TA0042", name: "Développement de ressources", description: "Mettre en place l'infrastructure et les moyens de l'attaque." },
  { id: "TA0001", name: "Accès initial", description: "Obtenir un premier pied dans le système d'information." },
  { id: "TA0002", name: "Exécution", description: "Exécuter du code malveillant sur un système." },
  { id: "TA0003", name: "Persistance", description: "Maintenir l'accès malgré redémarrages et changements." },
  { id: "TA0004", name: "Élévation de privilèges", description: "Obtenir des droits plus élevés." },
  { id: "TA0005", name: "Évasion des défenses", description: "Échapper à la détection et aux protections." },
  { id: "TA0006", name: "Accès aux identifiants", description: "Voler des comptes et des mots de passe." },
  { id: "TA0007", name: "Découverte", description: "Explorer l'environnement compromis." },
  { id: "TA0008", name: "Déplacement latéral", description: "Se propager d'un système à un autre." },
  { id: "TA0009", name: "Collecte", description: "Rassembler les données d'intérêt." },
  { id: "TA0011", name: "Commande & contrôle (C2)", description: "Communiquer avec les systèmes compromis." },
  { id: "TA0010", name: "Exfiltration", description: "Sortir les données de l'organisation." },
  { id: "TA0040", name: "Impact", description: "Détruire, altérer ou perturber les systèmes et données." },
];

const T = (id: string, name: string, tacticIds: string[], description: string): AttackTechnique => ({ id, name, tacticIds, description });

/** Extrait des techniques les plus courantes (reliables aux runbooks). */
export const ATTACK_TECHNIQUES: AttackTechnique[] = [
  T("T1595", "Analyse active (scan)", ["TA0043"], "Balayage réseau/ports de la cible pour identifier les services exposés."),
  T("T1592", "Collecte d'informations sur les hôtes", ["TA0043"], "Rassembler des informations techniques sur les systèmes cibles."),
  T("T1589", "Collecte d'informations sur les identités", ["TA0043"], "Collecter e-mails, noms, identifiants (OSINT)."),
  T("T1583", "Acquisition d'infrastructure", ["TA0042"], "Louer/créer domaines, serveurs, comptes pour l'attaque."),
  T("T1566", "Hameçonnage (phishing)", ["TA0001"], "E-mail piégé (lien ou pièce jointe) pour tromper l'utilisateur."),
  T("T1566.001", "Hameçonnage — pièce jointe", ["TA0001"], "Pièce jointe malveillante jointe à un e-mail."),
  T("T1566.002", "Hameçonnage — lien", ["TA0001"], "Lien vers un site piégé (identifiants, drive-by)."),
  T("T1190", "Exploitation d'une application exposée", ["TA0001"], "Exploiter une vulnérabilité d'un service exposé sur Internet."),
  T("T1078", "Comptes valides", ["TA0001", "TA0003", "TA0004", "TA0005"], "Utiliser des identifiants légitimes volés."),
  T("T1133", "Services distants externes", ["TA0001", "TA0003"], "Abuser d'un accès distant (VPN, RDP) exposé."),
  T("T1204", "Exécution par l'utilisateur", ["TA0002"], "Amener l'utilisateur à ouvrir un fichier/lien malveillant."),
  T("T1059", "Interpréteur de commandes et scripts", ["TA0002"], "Exécution via PowerShell, cmd, bash, scripts."),
  T("T1053", "Tâche/travail planifié", ["TA0002", "TA0003", "TA0004"], "Planifier l'exécution de code (tâches, cron)."),
  T("T1547", "Démarrage automatique (boot/logon)", ["TA0003", "TA0004"], "Persistance via clés de démarrage/ouverture de session."),
  T("T1136", "Création de compte", ["TA0003"], "Créer un compte pour conserver l'accès."),
  T("T1098", "Manipulation de compte", ["TA0003"], "Modifier un compte (droits, MFA, clés) pour persister."),
  T("T1068", "Exploitation pour élévation de privilèges", ["TA0004"], "Exploiter une faille pour obtenir des droits élevés."),
  T("T1055", "Injection de processus", ["TA0004", "TA0005"], "Injecter du code dans un processus légitime."),
  T("T1562", "Affaiblir les défenses", ["TA0005"], "Désactiver l'antivirus/EDR, la journalisation, le pare-feu."),
  T("T1070", "Effacement de traces", ["TA0005"], "Supprimer journaux et artefacts pour masquer l'activité."),
  T("T1027", "Fichiers/informations obfusqués", ["TA0005"], "Chiffrer/encoder les charges pour échapper à l'analyse."),
  T("T1110", "Force brute", ["TA0006"], "Deviner des mots de passe (bruteforce, password spraying)."),
  T("T1003", "Vol d'identifiants du système d'exploitation", ["TA0006"], "Extraire des secrets (LSASS, SAM, /etc/shadow)."),
  T("T1556", "Contournement de l'authentification", ["TA0006", "TA0003", "TA0005"], "Altérer le processus d'authentification (MFA, LSA)."),
  T("T1557", "Interception (AiTM)", ["TA0006", "TA0009"], "Se placer entre deux parties (relais NTLM, ARP)."),
  T("T1087", "Découverte de comptes", ["TA0007"], "Énumérer les comptes locaux et de domaine."),
  T("T1082", "Découverte d'informations système", ["TA0007"], "Collecter les informations de configuration des hôtes."),
  T("T1018", "Découverte de systèmes distants", ["TA0007"], "Cartographier les autres machines du réseau."),
  T("T1021", "Services distants (latéral)", ["TA0008"], "Se déplacer via RDP, SMB, WinRM, SSH."),
  T("T1570", "Transfert d'outils latéral", ["TA0008"], "Copier des outils d'une machine à l'autre."),
  T("T1560", "Archivage des données collectées", ["TA0009"], "Compresser/chiffrer les données avant exfiltration."),
  T("T1005", "Données du système local", ["TA0009"], "Collecter des fichiers sensibles sur l'hôte."),
  T("T1071", "Protocole de couche applicative (C2)", ["TA0011"], "C2 dissimulé dans HTTP(S), DNS, e-mail."),
  T("T1105", "Transfert d'outil entrant", ["TA0011"], "Télécharger des charges/outils depuis l'extérieur."),
  T("T1041", "Exfiltration via le canal C2", ["TA0010"], "Sortir les données par le même canal que le C2."),
  T("T1567", "Exfiltration vers un service web", ["TA0010"], "Exfiltrer vers un stockage/cloud externe (ex. drive)."),
  T("T1048", "Exfiltration sur un protocole alternatif", ["TA0010"], "Sortir les données via DNS, FTP, protocole non standard."),
  T("T1486", "Chiffrement des données (rançongiciel)", ["TA0040"], "Chiffrer les données pour extorsion."),
  T("T1490", "Inhibition de la restauration", ["TA0040"], "Supprimer sauvegardes/clichés (Shadow Copies)."),
  T("T1489", "Arrêt de service", ["TA0040"], "Stopper des services pour maximiser l'impact."),
  T("T1498", "Déni de service réseau", ["TA0040"], "Saturer la bande passante/les ressources réseau."),
  T("T1499", "Déni de service d'un point de terminaison", ["TA0040"], "Épuiser les ressources d'une application/d'un service."),
];

export const attackTacticById = (id: string): AttackTactic | undefined => ATTACK_TACTICS.find((t) => t.id === id);
export const attackTechniqueById = (id: string): AttackTechnique | undefined =>
  ATTACK_TECHNIQUES.find((t) => t.id === id) ?? ATTACK_TECHNIQUES.find((t) => t.id === id.split(".")[0]);
