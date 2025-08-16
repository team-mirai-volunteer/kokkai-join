// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
  notFound: jest.fn(),
}));

// Mock server-only for client-side tests
jest.mock('server-only', () => ({}));

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ReactDOMTestUtils') || args[0].includes('not wrapped in act'))
    ) {
      return;
    }
    originalError(...args);
  });
  console.warn = jest.fn((...args) => {
    originalWarn(...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
