describe('Each tester sees only their own list', () => {
  beforeEach(() => {
    cy.resetApp();
  });

  it('hides tester1’s to-dos from tester2', () => {
    cy.loginAs('tester1');
    cy.addTodoViaApi('Private to tester1');
    cy.loginAs('tester2');
    cy.visit('/');
    cy.get('[data-cy=lcd-user]').should('have.text', 'TESTER2');
    cy.get('[data-cy=empty]').should('be.visible');
    cy.contains('Private to tester1').should('not.exist');
  });
});
