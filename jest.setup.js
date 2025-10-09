import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, TransformStream } from 'stream/web'

// Mock environment variables for tests
process.env.SOUNDCLOUD_CLIENT_ID = 'test_client_id'
process.env.CACHE_DB_PATH = ':memory:'

// Polyfill Web APIs for Next.js API routes (must be set before any imports that use them)
Object.assign(global, {
  TextDecoder,
  TextEncoder,
  ReadableStream,
  TransformStream,
})

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
