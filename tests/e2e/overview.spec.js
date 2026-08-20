const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation, STATIONS } = require('./helpers');

test.describe('Hub Shell — tổng quan & điều hướng', () => {
  test('tải trang không lỗi console/page, hiện đủ 4 thẻ trạm', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await gotoHub(page);
    await expect(page.locator('.ov-title')).toBeVisible();

    for (const id of Object.keys(STATIONS)) {
      await expect(page.locator(`.card[data-id="${id}"]`)).toBeVisible();
      await expect(page.locator(`.nav-item[data-id="${id}"]`)).toBeVisible();
    }

    expect(errors, 'Không được có lỗi JS nào khi tải Overview').toEqual([]);
  });

  test('mở từng trạm qua sidebar phải nạp đúng đúng iframe, không lỗi', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoHub(page);
    for (const id of Object.keys(STATIONS)) {
      const frame = await openAndWaitStation(page, id, 20_000);
      expect(frame.url()).toContain(STATIONS[id].file);
    }
    expect(errors, 'Không được có lỗi JS khi mở lần lượt cả 4 trạm').toEqual([]);
  });

  test('quay lại Tổng quan từ 1 trạm hoạt động đúng qua breadcrumb', async ({ page }) => {
    await gotoHub(page);
    await openAndWaitStation(page, 'refrigdesign');
    await expect(page.locator('#crumb b')).toContainText('RefrigDesignNH3');

    await page.click('#crumbHome');
    await expect(page.locator('#crumb b')).toContainText('Tổng quan');
    await expect(page.locator('#view-overview')).toBeVisible();
  });

  test('đổi ngôn ngữ vi/en cập nhật cả sidebar lẫn topbar', async ({ page }) => {
    await gotoHub(page);
    await expect(page.locator('.ov-title')).toHaveText('Tổng quan');
    await page.click('#btnLang');
    await expect(page.locator('.ov-title')).toHaveText('Overview');
    await page.click('#btnLang');
    await expect(page.locator('.ov-title')).toHaveText('Tổng quan');
  });
});
