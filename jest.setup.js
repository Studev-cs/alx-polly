

// Mock Next.js modules
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    // Throw an error to simulate the redirect interruption
    const error = new Error('REDIRECT');
    error.digest = 'REDIRECT';
    throw error;
  }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// --- Improved Supabase Mock ---

// This is a factory function that creates a new mock client for each test
const createMockSupabaseClient = () => {
  const mock = {
    // Mock chainable methods
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    or: jest.fn(),
    in: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    // Mock RPC
    rpc: jest.fn(),
    // Mock Auth
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
    },
  };

  // Make methods chainable by returning `this`
  mock.from.mockReturnThis();
  mock.select.mockReturnThis();
  mock.insert.mockReturnThis();
  mock.update.mockReturnThis();
  mock.delete.mockReturnThis();
  mock.eq.mockReturnThis();
  mock.or.mockReturnThis();
  mock.in.mockReturnThis();
  mock.order.mockReturnThis();
  mock.limit.mockReturnThis();

  // The final method in a chain will be `.single()` or a `thenable` (promise)
  // We will mock the return values for these in the tests themselves.

  return mock;
};

// Mock the entire @supabase/ssr module
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => createMockSupabaseClient()),
}));

// --- Global Test Setup ---

// Expose a fresh mock client for each test to use
global.mockSupabase = createMockSupabaseClient();

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  // Provide a fresh mock for every test
  const { createServerClient } = require('@supabase/ssr');
  global.mockSupabase = createMockSupabaseClient();
  createServerClient.mockReturnValue(global.mockSupabase);
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock global console to prevent test logs from cluttering the output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(), // Also mock log to hide our debug logs
};