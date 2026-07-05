import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Te permite usar 'describe', 'test', 'expect' sin importarlos en cada archivo
    environment: 'node',
  },
});