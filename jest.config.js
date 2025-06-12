const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will match tsconfig.json paths)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    // Handle CSS modules
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  testEnvironment: 'jest-environment-jsdom',
  projects: [
    // API route tests (Node environment)
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/app/api/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      moduleNameMapper: {
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1',
        '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
    },
    // Unit and integration tests
    {
      displayName: 'unit',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      testPathIgnorePatterns: [
        '<rootDir>/src/__tests__/e2e',
        '\\.e2e\\.',
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/src/app/api/',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1',
        '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
      },
    },
    // E2E tests with Puppeteer MCP
    {
      displayName: 'e2e',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/e2e/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.e2e.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
      globalSetup: '<rootDir>/jest.e2e.globalSetup.js',
      globalTeardown: '<rootDir>/jest.e2e.globalTeardown.js',
      testTimeout: 30000, // 30 seconds for E2E tests
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      transformIgnorePatterns: [
        '/node_modules/(?!(node-fetch)/)',
      ],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/**/__tests__/**',
    '!src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '!src/**/*.e2e.{test,spec}.{js,jsx,ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)