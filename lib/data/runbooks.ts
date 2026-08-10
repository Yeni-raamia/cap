/* ==================================================================
 *  lib/data/runbooks.ts — Bibliothèque de runbooks de départ (SOC).
 *  Données pures (sans DB) : réutilisées pour l'amorçage de la base
 *  (ensureRunbooks) et le jeu de démonstration (seedRunbooks).
 *  Méthode : NIST SP 800-61 r2 · guides ANSSI · CERT-FR.
 * ================================================================== */
import type { RunbookStep } from "@/lib/domain";

export interface StarterRunbook {
  key: string;
  title: string;
  category: string;
  severity: string;
  trigger: string;
  objective: string;
  attackTechniques: string[];
  escalation: string;
  references: string;
  steps: Omit<RunbookStep, "id">[];
}

const S = (phase: string, title: string, detail: string, decision = false): Omit<RunbookStep, "id"> => ({ phase, title, detail, decision });
const D = "Détection & qualification", C = "Confinement", E = "Éradication", R = "Rétablissement", P = "Post-incident (REX)";

export const STARTER_RUNBOOKS: StarterRunbook[] = [
  {
    key: "phishing",
    title: "Signalement d'hameçonnage (phishing)",
    category: "Hameçonnage (phishing)",
    severity: "Modéré",
    trigger: "Un utilisateur signale un e-mail suspect, ou la passerelle/EDR détecte un message d'hameçonnage.",
    objective: "Confirmer l'hameçonnage, limiter l'exposition et déterminer si des utilisateurs ont cliqué ou saisi des identifiants.",
    attackTechniques: ["T1566", "T1566.001", "T1566.002"],
    escalation: "Ouvrir un incident (registre GRC) si des identifiants ont été saisis, si le message a été distribué largement, ou en cas de pièce jointe/lien malveillant confirmé. Prévenir le RSSI.",
    references: "NIST SP 800-61 r2 · ANSSI — Attaques par hameçonnage · CERT-FR",
    steps: [
      S(D, "Recueillir le message", "Récupérer l'e-mail original (en-têtes complets), l'expéditeur réel, l'objet, les URL et pièces jointes — sans cliquer."),
      S(D, "Analyser les indicateurs", "Vérifier l'expéditeur (usurpation ?), les URL (redirections, domaines proches), les pièces jointes (bac à sable). Rechercher les mêmes IOC dans Wazuh."),
      S(D, "Confirmer et coter", "Hameçonnage avéré ? Générique ou ciblé (spear-phishing) ? Des identifiants ont-ils pu être saisis ?", true),
      S(C, "Bloquer et purger", "Bloquer l'expéditeur/les URL sur la passerelle et le proxy ; rechercher et supprimer le message des autres boîtes."),
      S(C, "Identifier les destinataires ayant cliqué", "Croiser les journaux proxy/messagerie : qui a reçu, ouvert, cliqué, saisi des identifiants."),
      S(E, "Réinitialiser les comptes exposés", "Pour tout utilisateur ayant saisi ses identifiants : réinitialiser le mot de passe, invalider les sessions, vérifier le MFA."),
      S(R, "Rétablir et confirmer", "Confirmer l'absence d'activité anormale sur les comptes concernés ; débloquer si nécessaire."),
      S(P, "Sensibiliser & capitaliser", "Retour aux utilisateurs concernés ; ajouter les IOC à la veille ; envisager une piste de détection Wazuh."),
    ],
  },
  {
    key: "ransomware",
    title: "Suspicion de rançongiciel",
    category: "Rançongiciel",
    severity: "Critique",
    trigger: "Fichiers chiffrés / note de rançon, extinction anormale de services, pic de modifications de fichiers ou alerte EDR/Wazuh de comportement rançongiciel.",
    objective: "Stopper la propagation au plus vite, préserver les preuves et enclencher la reprise à partir de sauvegardes saines.",
    attackTechniques: ["T1486", "T1490", "T1489", "T1021"],
    escalation: "Ouvrir IMMÉDIATEMENT un incident critique (registre GRC). Alerter RSSI + direction ; évaluer la notification RGPD (violation de données) et le dépôt de plainte. Activer la cellule de crise si périmètre étendu.",
    references: "NIST SP 800-61 r2 · ANSSI — Attaques par rançongiciel (guide) · CERT-FR",
    steps: [
      S(D, "Qualifier l'alerte", "Confirmer le chiffrement (extensions, note de rançon). Identifier le patient zéro, l'heure de départ et la souche si possible."),
      S(D, "Évaluer l'ampleur", "Combien de postes/serveurs touchés ? Les partages et les sauvegardes sont-ils atteints ?", true),
      S(C, "Isoler sans éteindre", "Isoler les machines du réseau (déconnexion réseau/VLAN quarantaine) SANS les éteindre (préserver la RAM/preuves). Couper les partages atteints."),
      S(C, "Protéger les sauvegardes", "Vérifier et déconnecter/immuabiliser les sauvegardes ; interdire tout accès du domaine compromis aux sauvegardes."),
      S(C, "Préserver les preuves", "Isoler les journaux, faire des copies (images disque si possible) avant toute remédiation — utile en cas de plainte."),
      S(E, "Éradiquer", "Réinstaller les systèmes touchés à neuf (pas de simple désinfection). Réinitialiser les identifiants (dont comptes à privilèges/Kerberos)."),
      S(R, "Restaurer depuis une sauvegarde saine", "Restaurer à partir d'une sauvegarde antérieure vérifiée ; remettre en service progressivement en surveillant."),
      S(R, "Surveillance renforcée", "Surveiller la réapparition d'IOC pendant la reprise ; valider l'assainissement avant retour à la normale."),
      S(P, "REX & durcissement", "Analyse de la cause racine (vecteur initial), plan d'actions correctives (CAPA), mise à jour des sauvegardes et de la détection."),
    ],
  },
  {
    key: "account",
    title: "Compte compromis",
    category: "Compte compromis",
    severity: "Majeur",
    trigger: "Connexion impossible (voyage), authentifications inhabituelles, alerte de connexion à risque (accès conditionnel), ou signalement utilisateur.",
    objective: "Reprendre le contrôle du compte, mesurer ce qui a été fait avec, et couper les accès de l'attaquant.",
    attackTechniques: ["T1078", "T1110", "T1556"],
    escalation: "Ouvrir un incident (registre GRC) si compte à privilèges, accès à des données sensibles, ou pivot vers d'autres systèmes. Prévenir le RSSI.",
    references: "NIST SP 800-61 r2 · ANSSI — Recommandations relatives à l'authentification",
    steps: [
      S(D, "Confirmer la compromission", "Analyser les connexions (géolocalisation, IP, appareils, horaires). Distinguer d'un simple faux positif (VPN, voyage)."),
      S(D, "Évaluer les privilèges", "Le compte a-t-il des droits élevés ? À quoi donne-t-il accès (données, autres systèmes) ?", true),
      S(C, "Couper l'accès", "Réinitialiser le mot de passe, invalider toutes les sessions/jetons, révoquer les jetons OAuth/app passwords, réenrôler le MFA."),
      S(C, "Rechercher les persistances", "Vérifier règles de transfert de courrier, délégations, inscriptions MFA ajoutées, clés/API créées par l'attaquant."),
      S(E, "Nettoyer les persistances", "Supprimer les règles/inscriptions/délégations malveillantes ; réinitialiser les secrets créés."),
      S(E, "Rechercher le pivot", "Chercher dans Wazuh les traces d'utilisation du compte vers d'autres ressources ; traiter en conséquence."),
      S(R, "Rendre l'accès à l'utilisateur", "Réactiver le compte avec de nouveaux facteurs ; accompagner l'utilisateur."),
      S(P, "REX", "Cause d'entrée (hameçonnage ? mot de passe faible ?), renforcement (MFA, politique), IOC ajoutés à la veille."),
    ],
  },
  {
    key: "exfil",
    title: "Suspicion d'exfiltration de données",
    category: "Exfiltration de données",
    severity: "Critique",
    trigger: "Volume de sortie anormal, transferts vers un stockage externe/cloud non maîtrisé, alerte DLP ou détection Wazuh de flux inhabituels.",
    objective: "Confirmer l'exfiltration, en délimiter le périmètre (quelles données) et couper le canal.",
    attackTechniques: ["T1041", "T1567", "T1048"],
    escalation: "Ouvrir un incident (registre GRC). Si données personnelles → évaluer la notification RGPD (72 h) avec le DPO. Prévenir RSSI + direction.",
    references: "NIST SP 800-61 r2 · RGPD (violation de données) · CERT-FR",
    steps: [
      S(D, "Caractériser le flux", "Identifier la source, la destination, le volume, le protocole et la période. Écarter un usage légitime.", true),
      S(D, "Identifier les données concernées", "Déterminer la nature et la sensibilité des données potentiellement sorties (personnelles ? secrètes ?)."),
      S(C, "Couper le canal", "Bloquer la destination (pare-feu/proxy), isoler la machine ou le compte à l'origine du flux."),
      S(C, "Geler les preuves", "Conserver les journaux réseau/proxy/DLP et l'état de la machine source."),
      S(E, "Traiter la source", "Selon l'origine (compte compromis, malware, interne malveillant) : appliquer le runbook adapté et supprimer l'accès."),
      S(R, "Vérifier l'arrêt", "Confirmer l'absence de nouveau flux ; surveiller les destinations connues."),
      S(P, "Notification & REX", "Statuer sur la notification RGPD/CNIL avec le DPO ; cause racine ; renforcer DLP/segmentation et la détection."),
    ],
  },
  {
    key: "malware",
    title: "Poste infecté (malware)",
    category: "Malware / poste infecté",
    severity: "Majeur",
    trigger: "Alerte EDR/antivirus, comportement anormal d'un poste (lenteur, connexions sortantes suspectes), détection Wazuh.",
    objective: "Contenir l'infection sur le poste, éradiquer le malware et rétablir un poste sain.",
    attackTechniques: ["T1204", "T1059", "T1105"],
    escalation: "Ouvrir un incident (registre GRC) si le malware est un point d'entrée (RAT, dropper), s'il y a propagation, ou accès à des données sensibles. Prévenir le RSSI.",
    references: "NIST SP 800-61 r2 · ANSSI — Guide d'hygiène informatique",
    steps: [
      S(D, "Confirmer et identifier", "Vérifier l'alerte EDR, identifier le malware (hash, famille), le processus et l'origine (pièce jointe, téléchargement, USB)."),
      S(D, "Évaluer la portée", "Le malware communique-t-il vers l'extérieur (C2) ? Y a-t-il un risque de propagation ?", true),
      S(C, "Isoler le poste", "Isoler la machine du réseau (EDR/quarantaine) sans l'éteindre si une analyse est nécessaire."),
      S(C, "Rechercher la propagation", "Chercher le même IOC (hash, C2) sur le parc via Wazuh/EDR."),
      S(E, "Éradiquer", "Privilégier une réinstallation propre du poste ; réinitialiser les identifiants saisis sur la machine."),
      S(R, "Restituer le poste", "Rendre un poste sain à l'utilisateur ; restaurer les données depuis une source fiable."),
      S(P, "REX", "Vecteur d'entrée, correctifs/durcissement, ajout des IOC à la veille et à la détection."),
    ],
  },
];

/** Développe un runbook de départ en étapes avec ids stables (`<key>-sN`). */
export const starterRunbookSteps = (g: StarterRunbook): RunbookStep[] =>
  g.steps.map((s, i) => ({ ...s, id: `${g.key}-s${i + 1}` }));
