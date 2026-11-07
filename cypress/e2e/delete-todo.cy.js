describe('Delete a to-do', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.loginAs('tester1');
    cy.addTodoViaApi('Throw away');
    cy.addTodoViaApi('Keep');
    cy.visit('/');
  });

  it('removes only that to-do', () => {
    cy.contains('[data-cy=todo-item]', 'Throw away').find('[data-cy=todo-delete]').click();
    cy.get('[data-cy=todo-item]').should('have.length', 1).and('contain.text', 'Keep');
    cy.reload();
    cy.get('[data-cy=todo-item]').should('have.length', 1);
  });
});
