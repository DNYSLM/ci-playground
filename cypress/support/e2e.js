// Shared commands. The test API (/api/test/reset) only exists when the
// server runs with ENABLE_TEST_API=1: locally, in CI and on previews.

Cypress.Commands.add('resetApp', () => {
  cy.request('POST', '/api/test/reset');
});

// Cypress 16: secrets are read with cy.env(), never baked into the spec
// bundle. Plain values (like REPEAT) use Cypress.expose().
Cypress.Commands.add('seedPassword', () => {
  return cy.env(['SEED_PASSWORD'], { log: false }).then(({ SEED_PASSWORD }) => {
    if (!SEED_PASSWORD) throw new Error('SEED_PASSWORD is not set. Copy .env.example to .env.');
    return SEED_PASSWORD;
  });
});

Cypress.Commands.add('loginAs', (username) => {
  cy.seedPassword().then((password) => {
    cy.request({ method: 'POST', url: '/api/login', body: { username, password }, log: false });
  });
});

Cypress.Commands.add('addTodoViaApi', (title) => {
  cy.request('POST', '/api/todos', { title });
});
