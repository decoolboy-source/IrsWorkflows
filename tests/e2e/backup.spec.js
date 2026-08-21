// Test cho tính năng Backup Center (autosave + sao lưu/khôi phục toàn bộ).
// Trọng tâm: Trạm 2 (NH3 Vessel) và Trạm 4 (BOQ) trước đây KHÔNG lưu trữ gì
// cả — mất trắng khi F5. Test dưới đây tạo dữ liệu THẬT qua UI thật, reload
// cả trang (mô phỏng đóng nhầm tab/F5), rồi xác nhận dữ liệu tự khôi phục.

const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation, getFrame } = require('./helpers');

test.describe('Backup Center — autosave & sao lưu/khôi phục', () => {
  test('NH3 Vessel: autosave sống sót qua F5 (reload toàn trang)', async ({ page }) => {
    await gotoHub(page);
    const nh3 = await openAndWaitStation(page, 'nh3vessel');
    await nh3.click('#t_btnAddStation');
    await page.waitForTimeout(1200); // chờ debounce autosave 800ms

    const before = await nh3.evaluate(() => window.AppNH3Vessel.exportFullBackup().state.vessels.length);
    expect(before).toBeGreaterThan(0);

    await page.reload({ waitUntil: 'load' });
    const nh3After = await openAndWaitStation(page, 'nh3vessel');
    const after = await nh3After.evaluate(() => window.AppNH3Vessel.exportFullBackup().state.vessels.length);
    expect(after, 'Số bình phải giữ nguyên sau khi reload toàn trang (autosave phải tự khôi phục)').toBe(before);
  });

  test('BOQ: autosave sống sót qua F5 (reload toàn trang)', async ({ page }) => {
    await gotoHub(page);
    const boq = await openAndWaitStation(page, 'boq');
    const addBtn = boq.locator('button.add-row-btn').first();
    await addBtn.click();
    await page.waitForTimeout(1200);

    const before = await boq.evaluate(() => window.AppBOQ.exportFullBackup().state.items.length);
    expect(before).toBeGreaterThan(0);

    await page.reload({ waitUntil: 'load' });
    const boqAfter = await openAndWaitStation(page, 'boq');
    const after = await boqAfter.evaluate(() => window.AppBOQ.exportFullBackup().state.items.length);
    expect(after, 'Số dòng BOQ phải giữ nguyên sau khi reload toàn trang').toBe(before);
  });

  test('exportFullBackup() không throw ở cả 4 trạm', async ({ page }) => {
    await gotoHub(page);
    const rdn3 = await openAndWaitStation(page, 'refrigdesign');
    await expect(rdn3.evaluate(() => window.RefrigDesignNH3.exportFullBackup())).resolves.toBeTruthy();

    const pv = await openAndWaitStation(page, 'pressurevessel');
    const pvBackup = await pv.evaluate(() => window.AppPV.exportFullBackup());
    expect(pvBackup).toBeTruthy();
  });

  test('Nút Sao lưu (Hub) tải file .json hợp lệ chứa dữ liệu trạm đang mở', async ({ page }) => {
    await gotoHub(page);
    const nh3 = await openAndWaitStation(page, 'nh3vessel');
    await nh3.click('#t_btnAddStation');
    await page.waitForTimeout(800);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#btnBackup'),
    ]);
    const path = await download.path();
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(path, 'utf8'));

    expect(backup.format).toBe('hubshell-full-backup');
    expect(backup.stations.nh3vessel).toBeTruthy();
    expect(backup.stations.nh3vessel.state.vessels.length).toBeGreaterThan(0);
  });

  test('Khôi phục từ file sao lưu: tạo dữ án mới rồi phục hồi đúng dữ liệu vào Trạm 2', async ({ page }) => {
    await gotoHub(page);
    const nh3 = await openAndWaitStation(page, 'nh3vessel');
    await nh3.click('#t_btnAddStation');
    await page.waitForTimeout(800);
    const originalCount = await nh3.evaluate(() => window.AppNH3Vessel.exportFullBackup().state.vessels.length);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#btnBackup'),
    ]);
    const backupPath = await download.path();

    // Tạo dự án MỚI (dùng chung, tạo thật bên trong Trạm 1) rồi khôi phục từ file vừa tải
    await page.click('#btnProjects');
    await page.click('#mNew');
    await page.fill('#npInputName', 'Dự án khôi phục (test)');
    await page.click('#npCreate');
    await expect(page.locator('#crumb b')).toContainText('RefrigDesignNH3', { timeout: 15_000 });

    await page.click('#btnProjects');
    await page.setInputFiles('#mRestoreFile', backupPath);
    await page.waitForTimeout(600);

    const nh3Restored = await openAndWaitStation(page, 'nh3vessel');
    const restoredCount = await nh3Restored.evaluate(() => window.AppNH3Vessel.exportFullBackup().state.vessels.length);
    expect(restoredCount, 'Số bình sau khi khôi phục từ file phải đúng bằng lúc sao lưu (không nhân đôi trạm)').toBe(originalCount);
  });
});
