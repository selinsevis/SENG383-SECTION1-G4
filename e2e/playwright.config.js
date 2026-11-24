const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', workers: 1, fullyParallel: false, timeout: 45000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node server.cjs', url: 'http://localhost:3100/api/auth/me', reuseExistingServer: false,
      env: { AI_MODE: 'mock' } },
    { command: 'npm run dev -- --port 5174 --strictPort', cwd: '../client',
      url: 'http://localhost:5174', reuseExistingServer: false, env: { API_TARGET: 'http://localhost:3100' } },
  ],
});
