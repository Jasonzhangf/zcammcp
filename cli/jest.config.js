module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/modules/*/index.js', // Skip command files for now
    '!**/node_modules/**'
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
    '/coverage/',
    '/dist/',
    '/lib/'
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
  testTimeout: 30000, // 增加超时时间用于真实相机测试
  detectOpenHandles: true,
  forceExit: true,
  // 不使用Babel转换
  transform: {}
};