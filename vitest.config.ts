import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuration Vitest — pour l'essentiel, des tests unitaires de logique
 * métier pure (domaine, TOTP, user-agent, libellés d'audit, calendrier des
 * récurrences), sans base ni navigateur. Quelques tests d'intégration
 * ouvrent une base SQLite jetable via `DATABASE_PATH` (moteur de
 * récurrence) : environnement Node, alias `@/` aligné sur le tsconfig.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
