describe('Add a to-do', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.loginAs('tester1');
    cy.visit('/');
  });

  it('shows the new to-do in the list', () => {
    cy.get('[data-cy=new-title]').type('Water plants{enter}');
    cy.get('[data-cy=todo-title]').should('have.text', 'Water plants');
    cy.get('[data-cy=lcd-count]').should('have.text', '00/01');
    cy.get('[data-cy=new-title]').should('have.value', '');
  });

  it('refuses an empty title', () => {
    cy.get('[data-cy=add-submit]').click();
    cy.get('[data-cy=lcd-status]').should('have.text', 'ERR TITLE IS EMPTY');
    cy.get('[data-cy=todo-item]').should('not.exist');
  });
});
