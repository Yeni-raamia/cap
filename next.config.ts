import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 est un module natif : ne pas le bundler côté serveur.
  serverExternalPackages: ["better-sqlite3"],
  // Les en-têtes de sécurité (CSP, HSTS configurable…) sont posés dans proxy.ts,
  // ce qui permet de lire les paramètres en base à chaud (runtime Node).
};

export default nextConfig;
