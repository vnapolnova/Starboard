import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts',
      'functions/src/**/*.test.ts',
      'functions/test/**/*.test.ts',
    ],
    // Emulator tests share one emulator, so files run one at a time.
    fileParallelism: false,
  },
});
