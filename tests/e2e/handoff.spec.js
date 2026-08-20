// Test QUAN TRỌNG NHẤT của bộ suite: xác nhận cầu nối HUB:export/HUB:import
// vẫn hoạt động đúng — tức là nếu ai đó sửa 1 trong 4 file trạm (đổi tên hàm,
// xoá dòng dispatchEvent, đổi shape bundle...) mà làm gãy cầu nối, test này
// phải FAIL. Vì vậy các bước dưới đây LUÔN gọi hàm/nút THẬT của từng trạm
// (exportProjectData(), click nút xác nhận thật...), KHÔNG tự dispatchEvent
// giả lập — dispatchEvent giả lập sẽ chỉ test được Hub Shell, không test
// được liệu trạm gốc có còn tự phát event đó hay không.

const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation, getFrame } = require('./helpers');

test.describe('Cầu nối Hub Shell — HUB:export / HUB:import (dùng dữ liệu thật)', () => {
  test('RefrigDesignNH3 → NH3 Vessel (primary) + → Pressure Vessel (secondary, nền)', async ({ page }) => {
    await gotoHub(page);
    const rdn3 = await openAndWaitStation(page, 'refrigdesign');

    // Lần đầu mở RefrigDesignNH3 tự bật modal "Quản lý Dự án" (chưa có dự án
    // nào) — phải tạo 1 dự án thật trước, đúng luồng người dùng thật gặp:
    // "+ Tạo dự án mới" (mở form) → "Tạo dự án" (xác nhận, dùng tên mặc định).
    await rdn3.click('#t_btnNewProject');
    await rdn3.click('#t_btnCreateProject');
    await expect(rdn3.locator('#modalProjects')).toBeHidden({ timeout: 10_000 });

    // Tạo 1 trạm thật qua đúng luồng UI (modal "+ Thêm trạm tính toán" → "Tạo trạm")
    await rdn3.click('#t_btnAddStation');
    await rdn3.click('#t_btnCreateStation');
    await rdn3.evaluate(() => window.RefrigDesignNH3.calc.runCalc());

    // Gọi đúng entrypoint chuẩn CONTRACT (không phải hàm nội bộ) — nếu ai đó
    // đổi tên window.RefrigDesignNH3.exportProjectData, dòng này sẽ throw.
    const exportResult = await rdn3.evaluate(() => window.RefrigDesignNH3.exportProjectData());
    expect(exportResult, 'exportProjectData() phải trả về bundle khi đã có dữ liệu tính toán thật').toBeTruthy();

    // Primary route → Hub phải tự chuyển sang Trạm 2
    await expect(page.locator('#crumb b')).toContainText('NH3 Vessel Calculator', { timeout: 10_000 });

    // Trạm 2 phải mở modal xem trước đã điền sẵn JSON — chứng minh importProjectData()
    // thật của Trạm 2 đã được Hub gọi (safety-gate: chưa ghi vào _state tới khi xác nhận).
    const nh3vessel = getFrame(page, 'nh3vessel');
    await expect(nh3vessel.locator('#importJson')).not.toHaveValue('', { timeout: 10_000 });

    // Secondary route (nền) → phải lưu bundle cho Pressure Vessel dù chưa mở trạm đó
    const state = await page.evaluate(() => {
      const active = localStorage.getItem('hubshell_active_project');
      const proj = JSON.parse(localStorage.getItem('hubshell_project_' + active));
      return { hasEdge: !!proj.bundles['refrigdesign>pressurevessel'] };
    });
    expect(state.hasEdge, 'Bundle nền refrigdesign>pressurevessel phải được lưu để giao khi mở Trạm 3 sau này').toBe(true);
  });

  test('NH3 Vessel → Pressure Vessel (primary, qua modal thẩm định thật)', async ({ page }) => {
    await gotoHub(page);
    const nh3vessel = await openAndWaitStation(page, 'nh3vessel');

    await nh3vessel.click('#t_btnAddStation'); // tạo 1 trạm mặc định + tự tính vessels
    await expect(nh3vessel.locator('#btnExportHandoff')).toBeEnabled({ timeout: 10_000 });

    // Gọi đúng entrypoint CONTRACT — với Trạm 2 hàm này CHỈ mở modal thẩm định
    // (không xuất ngay), đúng thiết kế safety-gate đã ghi trong CONTRACT.
    await nh3vessel.evaluate(() => window.AppNH3Vessel.exportProjectData());
    const confirmBtn = nh3vessel.locator('#btnConfirmAudit');
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click(); // đây mới là bước thật sự dispatch HUB:export (trong _doExport())

    await expect(page.locator('#crumb b')).toContainText('Pressure Vessel Calculator', { timeout: 10_000 });
    const pv = getFrame(page, 'pressurevessel');
    // PV mở modal xem trước (KHÔNG tự ghi thẳng) — đúng nguyên tắc safety-gate ở Mục 3 CONTRACT
    await expect(pv.locator('#hoV_json')).not.toHaveValue('', { timeout: 10_000 });
  });

  test('Pressure Vessel → BOQ (primary, dùng giá trị mặc định thật của form)', async ({ page }) => {
    await gotoHub(page);
    const pv = await openAndWaitStation(page, 'pressurevessel');

    // state.db được nạp bất đồng bộ từ IndexedDB lúc init() — chờ danh sách
    // vật liệu render xong (bằng chứng DB đã sẵn sàng) trước khi tính toán,
    // nếu không calculateTheoreticalDesign() sẽ đọc phải state.db=null.
    await pv.waitForFunction(() => document.getElementById('MaterialSel')?.options.length > 0, { timeout: 15_000 });

    // Form Tính toán đã có sẵn giá trị mặc định hợp lệ trong HTML — chỉ cần
    // chạy đúng hàm tính thật để state.lastCalc có dữ liệu, không cần nhập tay.
    await pv.evaluate(() => window.AppPV.calc.runFullCalculation());
    const exportResult = await pv.evaluate(() => window.AppPV.exportProjectData());
    expect(exportResult, 'exportProjectData() (Trạm 3) phải trả về bundle với dữ liệu tính toán mặc định').toBeTruthy();

    await expect(page.locator('#crumb b')).toContainText('BOQ & Cost Estimate', { timeout: 10_000 });
    const boq = getFrame(page, 'boq');
    // BOQ cũng theo đúng safety-gate: importProjectData() chỉ mở modal xem
    // trước đã điền sẵn JSON, KHÔNG tự ghi vào _state.items cho tới khi người
    // dùng bấm xác nhận trong modal — nên kiểm tra nội dung textarea, không
    // phải banner (banner chỉ xuất hiện SAU khi xác nhận).
    await expect(boq.locator('#importJson')).not.toHaveValue('', { timeout: 10_000 });
  });

  test('BOQ là trạm cuối — không có exportProjectData (không được tự thêm nhầm)', async ({ page }) => {
    await gotoHub(page);
    const boq = await openAndWaitStation(page, 'boq');
    const hasExport = await boq.evaluate(() => typeof window.AppBOQ.exportProjectData === 'function');
    expect(hasExport, 'BOQ là điểm cuối DAG — nếu test này fail, PROJECT_DATA_CONTRACT.md Mục 1 cần cập nhật lại sơ đồ').toBe(false);
  });
});
