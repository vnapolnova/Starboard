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
    // Each emulator test runs several transactions, and the emulator can take
    // seconds per transaction once warm runs pile up (seen in cloud containers).
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
