describe('Mark a to-do done', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.loginAs('tester1');
    cy.addTodoViaApi('Post letter');
    cy.addTodoViaApi('Book dentist');
    cy.visit('/');
  });

  it('updates the DONE readout and survives a reload', () => {
    cy.contains('[data-cy=todo-item]', 'Post letter').find('[data-cy=todo-toggle]').check();
    cy.get('[data-cy=lcd-count]').should('have.text', '01/02');
    cy.reload();
    cy.contains('[data-cy=todo-item]', 'Post letter')
      .find('[data-cy=todo-toggle]')
      .should('be.checked');
  });
});
