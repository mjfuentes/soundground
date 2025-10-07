import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.SOUNDCLOUD_CLIENT_ID = 'test_client_id'
process.env.CACHE_DB_PATH = ':memory:'

// Mock got module to avoid ESM issues
jest.mock('got', () => ({
  default: jest.fn(),
  got: jest.fn(),
}))

