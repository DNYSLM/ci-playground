import { existsSync } from 'node:fs';
import { defineConfig } from 'cypress';

// Locally, read SEED_PASSWORD from .env so `npm run e2e` just works.
// In CI there is no .env: the workflow sets SEED_PASSWORD itself.
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // Only cypress/e2e runs by default. cypress/flaky (exercise 3) and
    // exercises/10-test-first are parked outside it on purpose.
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    // Secret: read in specs with cy.env(). Never put it under `expose`.
    env: {
      SEED_PASSWORD: process.env.SEED_PASSWORD,
    },
    // Not secret: read in specs with Cypress.expose().
    expose: {
      REPEAT: Number(process.env.REPEAT ?? 1),
    },
  },
  // No retries: a retry turns a flaky test green and hides it (exercise 3).
  retries: { runMode: 0, openMode: 0 },
});
