import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuration Vitest — tests unitaires de la logique métier pure
 * (domaine, TOTP, user-agent, libellés d'audit). Aucun accès base ou
 * navigateur : environnement Node, alias `@/` aligné sur le tsconfig.
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
