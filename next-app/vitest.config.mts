// vitest.config.ts
// Configures Vitest to run tests (simulation environment, plugins to use, prior setup, etc.)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';           // Lets Vitest process .tsx files
import tsconfigPaths from 'vite-tsconfig-paths';    // Lets Vitest understand import aliases

export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths({ projects: ['./tsconfig.vitest.json'] })     // Points at a vitest-specific tsconfig file
    ],
    test: {
        environment: 'jsdom',               // Simulate a browser environment (window, document, etc.)
        globals: true,                      // Lets Vitest use global test functions (describe, it, expect, etc.) without importing them
        setupFiles: ['./vitest.setup.ts'],  // Run once before testing
    },
});