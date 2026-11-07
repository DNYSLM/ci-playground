// Exercise 10. Acceptance tests for a feature that does not exist yet.
// Copy into cypress/e2e/, watch it go red, then build the feature.

describe('Clear completed', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.loginAs('tester1');
    cy.addTodoViaApi('Water plants');
    cy.addTodoViaApi('Post letter');
    cy.addTodoViaApi('Book dentist');
    cy.visit('/');
  });

  it('is disabled while nothing is done', () => {
    cy.get('[data-cy=clear-completed]').should('be.disabled');
  });

  it('removes only the done to-dos, and they stay gone', () => {
    cy.contains('[data-cy=todo-item]', 'Post letter').find('[data-cy=todo-toggle]').check();
    cy.get('[data-cy=clear-completed]').should('be.enabled').click();
    cy.get('[data-cy=todo-item]').should('have.length', 2);
    cy.contains('[data-cy=todo-item]', 'Post letter').should('not.exist');
    cy.get('[data-cy=lcd-count]').should('have.text', '00/02');
    cy.reload();
    cy.get('[data-cy=todo-item]').should('have.length', 2);
  });
});
