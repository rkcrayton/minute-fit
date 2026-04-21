/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^twrnc$': '<rootDir>/__mocks__/twrnc.ts',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.tsx',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.tsx',
    '^react-native-health-connect$': '<rootDir>/__mocks__/react-native-health-connect.ts',
  },
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  // Ensure modules that use ESM syntax get transformed
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'jest-expo|' +
      'expo|' +
      '@expo|' +
      'react-native|' +
      '@react-native|' +
      '@react-navigation|' +
      'react-navigation|' +
      '@testing-library' +
    '))',
  ],
};
