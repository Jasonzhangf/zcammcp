module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/modules/*/index.js' // Skip command files for now
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  moduleFileExtensions: [
    'js',
    'json'
  ],
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  verbose: true,
  bail: false,
  maxWorkers: '50%',
  testTimeout: 10000
};