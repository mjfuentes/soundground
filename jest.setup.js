import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.SOUNDCLOUD_CLIENT_ID = 'test_client_id'
process.env.CACHE_DB_PATH = ':memory:'

// Mock got module to avoid ESM issues
jest.mock('got', () => ({
  default: jest.fn(),
  got: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

