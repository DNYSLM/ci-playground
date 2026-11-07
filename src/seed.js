// Seeded test accounts. Usernames come from SEED_USERS; the shared password
// comes from SEED_PASSWORD, which is only ever set from a CI secret or a
// local .env file (gitignored). See exercises 7 and 8.

const USERNAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

export function parseSeedUsers(raw) {
  const names = String(raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const bad = names.filter((n) => !USERNAME.test(n));
  if (bad.length) throw new Error(`Invalid seed username(s): ${bad.join(', ')}`);
  return [...new Set(names)];
}
