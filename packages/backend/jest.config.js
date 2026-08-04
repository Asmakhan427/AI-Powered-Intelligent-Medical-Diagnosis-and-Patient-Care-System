/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts', '!src/__tests__/**'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // NOTE: the current suite covers auth.service, patient.controller, and
  // Patient.model only — most of src/ (routes, other controllers/services,
  // middleware) has no tests yet, so `npm run test:coverage` will fail this
  // gate today. That's intentional: it's the target for the suite to grow
  // into, not a number tuned to pass with what exists right now.
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // mongodb-memory-server downloads a MongoDB binary on first run and can
  // take a while on a cold cache.
  testTimeout: 30000,
};
