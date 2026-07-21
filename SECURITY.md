# Politique de sécurité · Security Policy

## 🇫🇷 Signaler une vulnérabilité

La sécurité de Cap est une priorité. **N'ouvrez pas d'issue publique** pour une faille.

- Utilisez de préférence l'onglet **GitHub → Security → Report a vulnerability** (avis de sécurité privé).
- À défaut, contactez le mainteneur en privé.

Merci d'inclure : une description, les étapes de reproduction, l'impact potentiel et, si possible, une
suggestion de correctif. Nous accusons réception sous **72 h** et visons un correctif selon la gravité.
Merci de laisser un délai raisonnable de divulgation avant toute publication.

### Bonnes pratiques de déploiement
- Servir l'application en **HTTPS** et lancer avec `COOKIE_SECURE=1` ; activer **HSTS** dans *Administration → Sécurité*.
- Garder l'**approbation des inscriptions** activée ; n'accorder les rôles élevés qu'au besoin.
- Sauvegarder régulièrement le fichier `data/cap.sqlite` (jamais versionné).
- Restreindre l'accès réseau à l'application au **LAN** de l'organisation.
- Définir un `CRON_SECRET` pour protéger la route du moteur de relance.

## Versions supportées

Le projet est en développement actif ; seule la branche par défaut (`main`) reçoit les correctifs de sécurité.

---

## 🇬🇧 Reporting a vulnerability

Security matters. **Do not open a public issue** for a vulnerability.

- Preferably use **GitHub → Security → Report a vulnerability** (private advisory).
- Otherwise, contact the maintainer privately.

Please include a description, reproduction steps, potential impact and, if possible, a suggested fix.
We aim to acknowledge within **72 hours** and to patch according to severity. Please allow reasonable time
for a fix before public disclosure.

Only the default branch (`main`) receives security fixes.
