describe('Build readout', () => {
  it('shows the env and commit the server reports', () => {
    cy.request('/api/version').then(({ body }) => {
      cy.visit('/');
      cy.get('[data-cy=lcd-env]').should('have.text', body.env.toUpperCase());
      cy.get('[data-cy=lcd-commit]').should('have.text', body.commit);
      cy.get('[data-cy=lcd-version]').should('have.text', body.version);
    });
  });
});
