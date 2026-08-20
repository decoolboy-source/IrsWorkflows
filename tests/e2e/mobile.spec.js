// Kiểm tra layout responsive trên viewport di động thật (Pixel 7 / iPhone 14
// qua device descriptor của Playwright — mô phỏng kích thước màn hình + user
// agent + touch, KHÔNG thay thế hoàn toàn cho việc bấm thử trên điện thoại
// thật, đặc biệt các hành vi chỉ có trên thiết bị thật: bàn phím ảo che form,
// cử chỉ vuốt, Safari address-bar thu/giãn làm đổi viewport height động,
// hiệu năng render trên phần cứng yếu hơn. Xem README mục "Test trên di
// động thật" cho phần còn lại chưa kiểm chứng được bằng Playwright.
//
// File này CHỈ chạy trên project mobile-chrome/mobile-safari (xem
// playwright.config.js) — các spec khác (handoff/backup/overview) chỉ chạy
// trên desktop chromium để tránh nhân 3 thời gian chạy CI cho phần logic
// không phụ thuộc kích thước màn hình.

const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation, STATIONS } = require('./helpers');

test.describe('Layout di động', () => {
  test('bottom-nav hiện thay vì sidebar, đủ 5 mục (Tổng quan + 4 trạm)', async ({ page }) => {
    await gotoHub(page);
    // Ở breakpoint mobile (CSS max-width:860px), #nav chuyển thành hàng ngang
    // dưới cùng — kiểm tra bằng chiều rộng thực tế thay vì đọc CSS class.
    const navBox = await page.locator('#nav').boundingBox();
    const viewport = page.viewportSize();
    expect(navBox.width, 'Sidebar/bottom-nav phải rộng gần bằng toàn màn hình ở layout mobile').toBeGreaterThan(viewport.width * 0.9);
    expect(navBox.height, 'Ở layout mobile, #nav phải là thanh ngang thấp (bottom-nav), không phải cột dọc cao').toBeLessThan(120);

    const items = page.locator('.nav-item');
    await expect(items).toHaveCount(Object.keys(STATIONS).length + 1); // + Tổng quan
  });

  test('thẻ trạm ở Tổng quan xếp 1 cột (không tràn ngang)', async ({ page }) => {
    await gotoHub(page);
    const viewport = page.viewportSize();
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box.width, `Thẻ trạm #${i} không được tràn ra ngoài viewport ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
    }
    // Trang không được cuộn ngang — dấu hiệu rõ nhất của lỗi responsive.
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasHorizontalScroll, 'Trang không được có thanh cuộn ngang ở layout mobile').toBe(false);
  });

  test('chạm vào 1 mục bottom-nav mở đúng trạm, không cần scroll/zoom', async ({ page }) => {
    await gotoHub(page);
    const frame = await openAndWaitStation(page, 'refrigdesign', 20_000);
    expect(frame.url()).toContain(STATIONS.refrigdesign.file);
    // Sau khi mở trạm, iframe phải chiếm toàn bộ phần nội dung còn lại — không
    // bị kẹt sau bottom-nav hay tràn khỏi viewport.
    const frameBox = await page.locator('#wrap-refrigdesign').boundingBox();
    const viewport = page.viewportSize();
    expect(frameBox.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
