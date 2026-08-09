import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock react-router-dom for components that use navigation
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-project-id' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock axios globally
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [], success: true } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {}, success: true } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {}, success: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
    isCancel: vi.fn(() => false),
  },
}));

// Suppress console.error noise from expected error boundaries in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error boundaries'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
