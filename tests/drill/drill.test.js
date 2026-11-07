import { expect, it } from 'vitest';

// Exercise 4. A real, repeatable test failure to compare with an
// infrastructure failure. Run with DRILL_MODE=test-failure to make it fail.
it('drill: passes unless asked to fail', () => {
  expect(process.env.DRILL_MODE, 'DRILL_MODE=test-failure was set').not.toBe('test-failure');
});
