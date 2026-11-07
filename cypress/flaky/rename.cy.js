// Exercise 3. Parked outside cypress/e2e so the normal suite stays green.
// Move it into cypress/e2e to bring it into CI.
//
// Run it many times in one go: scripts/repeat-flaky.sh 20

const repeat = Number(Cypress.expose('REPEAT') ?? 1);

describe('Rename a to-do', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.loginAs('tester1');
    cy.addTodoViaApi('Buy milk');
    cy.visit('/');
  });

  Cypress._.times(repeat, (i) => {
    it(`saves the new title (run ${i + 1}/${repeat})`, () => {
      cy.get('[data-cy=todo-title]').dblclick();
      cy.get('[data-cy=edit-input]').clear().type('Pick up the dry cleaning on Friday{enter}');
      cy.get('[data-cy=todo-title]').should('have.text', 'Pick up the dry cleaning on Friday');
    });
  });
});
