import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  runner: 'tsc',
  testPathIgnorePatterns: ['.js']
};

export default config;