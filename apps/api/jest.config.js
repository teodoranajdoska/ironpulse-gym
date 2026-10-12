module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@ironpulse/shared$': '<rootDir>/../../packages/shared/dist-cjs/index.js',
  },
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
};
