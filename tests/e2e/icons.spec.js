// Hồi quy cho lỗi thật: icon SVG (chuyển từ <i data-lucide="...">) trong cả 4
// file trạm không có width/height nào cả — class Tailwind "w-3.5 h-3.5"...
// không tồn tại trong CSS build (bị purge vì chỉ xuất hiện trong chuỗi JS),
// nên trình duyệt vẽ SVG ở kích thước mặc định (~300x150px), phủ gần kín màn
// hình — đặc biệt lộ rõ trên viewport hẹp (điện thoại). Test này buộc 1 icon
// dựng lên thật (qua toast, chạm mọi trạm) rồi kiểm tra nó có width/height
// nhỏ, hợp lý — không phải kích thước mặc định của trình duyệt.

const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation } = require('./helpers');

test.describe('Icon SVG trong các trạm phải có kích thước hợp lý (không phóng to mặc định)', () => {
  test('Trạm 2 (NH3 Vessel): icon toast render ra <svg> có width/height nhỏ', async ({ page }) => {
    await gotoHub(page);
    const nh3 = await openAndWaitStation(page, 'nh3vessel');
    await nh3.evaluate(() => window.AppNH3Vessel.ui.toast('ok', 'kiểm tra icon'));
    const svgSizes = await nh3.evaluate(() => {
      return Array.from(document.querySelectorAll('svg')).map((s) => ({
        w: parseFloat(s.getAttribute('width') || '0'),
        h: parseFloat(s.getAttribute('height') || '0'),
      }));
    });
    expect(svgSizes.length, 'Phải có ít nhất 1 icon SVG được dựng (từ toast + các icon tĩnh khác)').toBeGreaterThan(0);
    for (const { w, h } of svgSizes) {
      expect(w, 'Icon không được có width mặc định của trình duyệt (~300px) — thiếu width/height rõ ràng').toBeLessThanOrEqual(32);
      expect(h, 'Icon không được có height mặc định của trình duyệt (~150px) — thiếu width/height rõ ràng').toBeLessThanOrEqual(32);
      expect(w, 'Icon phải có width > 0 (không bị co về 0)').toBeGreaterThan(0);
    }
  });

  test('Trạm 1 (RefrigDesignNH3): icon toast render ra <svg> có width/height nhỏ', async ({ page }) => {
    await gotoHub(page);
    const rdn3 = await openAndWaitStation(page, 'refrigdesign');
    await rdn3.evaluate(() => window.RefrigDesignNH3.ui.toast('ok', 'kiểm tra icon'));
    const svgSizes = await rdn3.evaluate(() => {
      return Array.from(document.querySelectorAll('svg')).map((s) => ({
        w: parseFloat(s.getAttribute('width') || '0'),
        h: parseFloat(s.getAttribute('height') || '0'),
      }));
    });
    expect(svgSizes.length).toBeGreaterThan(0);
    for (const { w, h } of svgSizes) {
      expect(w).toBeLessThanOrEqual(32);
      expect(h).toBeLessThanOrEqual(32);
      expect(w).toBeGreaterThan(0);
    }
  });
});
