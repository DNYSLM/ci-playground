import { defineConfig } from 'vitest/config';

// `npm run test:unit` runs tests/unit. `npm run test:drill` runs only the
// exercise 4 drill test, which fails on purpose when DRILL_MODE=test-failure.
export default defineConfig({
  test: {
    include: [
      process.env.VITEST_DRILL ? 'tests/drill/**/*.test.js' : 'tests/unit/**/*.test.js',
    ],
  },
});
