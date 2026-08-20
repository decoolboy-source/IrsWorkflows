// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Cho phép ghi đè executablePath khi chạy cục bộ trong sandbox (chromium đã
// cài sẵn ở đường dẫn riêng, không khớp version @playwright/test pin trong
// package.json). CI KHÔNG set biến này — Playwright tự tải đúng bản trình
// duyệt tương ứng qua bước "npx playwright install".
const localExecutablePath = process.env.PW_EXECUTABLE_PATH || undefined;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // các test dùng chung 1 static server + đôi khi chung state trình duyệt — chạy tuần tự cho ổn định
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: localExecutablePath ? { executablePath: localExecutablePath } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://localhost:4173/Hub_Shell.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
