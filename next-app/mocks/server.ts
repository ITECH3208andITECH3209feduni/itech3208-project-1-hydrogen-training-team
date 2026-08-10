// mocks/server.ts
// Sets up a mock server to intercept API requests and deliver mock responses
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);