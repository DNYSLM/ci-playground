#!/usr/bin/env node
// Exercise 1. Prints the Cypress specs for one shard as a comma-separated list.
// Usage: node scripts/shard-specs.mjs <zero-based index> <total shards>
// Specs are sorted by path and dealt out like cards: 0, total, 2*total, ...
// Prints nothing if the shard gets no specs (more shards than spec files).
import { readdirSync } from 'node:fs';

const [index, total] = process.argv.slice(2).map(Number);
if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
  console.error('Usage: shard-specs.mjs <index 0..total-1> <total>');
  process.exit(2);
}

const specs = readdirSync('cypress/e2e', { recursive: true })
  .filter((file) => file.endsWith('.cy.js'))
  .map((file) => `cypress/e2e/${file}`)
  .sort();

process.stdout.write(specs.filter((_, i) => i % total === index).join(','));
