describe('Login', () => {
  beforeEach(() => {
    cy.resetApp();
    cy.visit('/');
  });

  it('lets a seeded tester in', () => {
    cy.get('[data-cy=login-username]').type('tester1');
    cy.seedPassword().then((password) => {
      cy.get('[data-cy=login-password]').type(password, { log: false });
    });
    cy.get('[data-cy=login-submit]').click();
    cy.get('[data-cy=deck]').should('be.visible');
    cy.get('[data-cy=lcd-user]').should('have.text', 'TESTER1');
  });

  it('refuses a wrong password', () => {
    cy.get('[data-cy=login-username]').type('tester1');
    cy.get('[data-cy=login-password]').type('definitely-wrong');
    cy.get('[data-cy=login-submit]').click();
    cy.get('[data-cy=lcd-status]').should('have.text', 'LOGIN FAILED');
    cy.get('[data-cy=deck]').should('not.be.visible');
  });
});
