import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Rules tests share one emulator, so files run one at a time.
    fileParallelism: false,
  },
});
