module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src/screens',
    '<rootDir>/src/lib',
    '<rootDir>/src/api',
    '<rootDir>/src/app',
  ],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
