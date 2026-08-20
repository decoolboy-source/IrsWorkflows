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
  },
  projects: [
    // Suite đầy đủ (handoff/backup/overview/mobile) chạy trên desktop Chrome.
    // executablePath ghi đè chỉ áp dụng cho project dùng engine Chromium —
    // không đưa vào `use` gốc ở trên vì project webkit bên dưới sẽ không
    // khởi động được với đường dẫn binary Chromium.
    {
      name: 'chromium',
      testIgnore: /mobile\.spec\.js/, // mobile.spec.js chỉ có ý nghĩa ở viewport di động — xem 2 project bên dưới
      use: { ...devices['Desktop Chrome'], launchOptions: localExecutablePath ? { executablePath: localExecutablePath } : {} },
    },
    // Layout responsive — chỉ chạy tests/e2e/mobile.spec.js, không lặp lại
    // toàn bộ handoff/backup (không phụ thuộc kích thước màn hình, chạy 1
    // lần trên desktop là đủ). Mobile Chrome dùng chung engine Chromium nên
    // chạy được ngay cả khi chỉ có chromium cài sẵn; Mobile Safari cần
    // browser webkit riêng (CI cài qua "playwright install webkit").
    {
      name: 'mobile-chrome',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['Pixel 7'], launchOptions: localExecutablePath ? { executablePath: localExecutablePath } : {} },
    },
    {
      name: 'mobile-safari',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['iPhone 14'] },
    },
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
