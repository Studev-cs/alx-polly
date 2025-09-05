// Mock Next.js modules
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Global test setup
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
