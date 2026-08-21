const { test, expect } = require('@playwright/test');
const { gotoHub, openAndWaitStation, getFrame, STATIONS } = require('./helpers');

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

  // Hồi quy cho lỗi thật: #frames (vùng chứa iframe các trạm) phủ kín #content
  // ngay cả khi rỗng (chưa mở trạm nào) — nếu thiếu pointer-events:none, nó
  // âm thầm chặn MỌI click/lăn chuột lên #view-overview bên dưới dù không có
  // gì hiển thị. Bug này lọt qua bản trước vì suite cũ chỉ click .nav-item ở
  // sidebar (ngoài #content), chưa từng click thật vào .card hay lăn chuột.
  test('bấm trực tiếp vào thẻ trạm (không qua sidebar) phải mở đúng trạm đó', async ({ page }) => {
    await gotoHub(page);
    const hit = await page.evaluate(() => {
      const card = document.querySelector('.card[data-id="refrigdesign"]');
      const r = card.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { isCardOrInside: card.contains(el) || card === el };
    });
    expect(hit.isCardOrInside, '#frames (dù rỗng) không được nằm trên thẻ trạm và chặn click').toBe(true);

    await page.click('.card[data-id="refrigdesign"]');
    await expect(page.locator('#crumb b')).toContainText('RefrigDesignNH3', { timeout: 10_000 });
  });

  test('lăn chuột trên màn Tổng quan phải cuộn được khi nội dung tràn khỏi màn hình', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 500 }); // ép tràn nội dung để có gì mà cuộn
    await gotoHub(page);
    const overflowing = await page.evaluate(() => {
      const el = document.getElementById('view-overview');
      return el.scrollHeight > el.clientHeight;
    });
    expect(overflowing, 'Cần viewport đủ nhỏ để nội dung Tổng quan thực sự tràn — nếu không test này không có ý nghĩa').toBe(true);

    await page.mouse.move(250, 250);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    const scrollTop = await page.evaluate(() => document.getElementById('view-overview').scrollTop);
    expect(scrollTop, 'Lăn chuột phải cuộn được #view-overview — không bị #frames chặn').toBeGreaterThan(0);
  });

  // Trước đây phải mở Trạm 1, tự bấm qua modal "Quản lý Dự án" riêng của
  // trạm đó mới bắt đầu được — giờ tạo 1 lần từ Tổng quan, tự động mở sẵn
  // dự án cùng tên bên trong Trạm 1 (nơi thực sự chứa dữ liệu tính toán).
  test('nút "Tạo dự án mới" ở Tổng quan tự tạo dự án thật bên trong Trạm 1', async ({ page }) => {
    await gotoHub(page);
    await page.click('#btnNewProjectOverview');
    await page.fill('#npInputName', 'Kho lạnh Test E2E');
    await page.click('#npCreate');

    // Phải tự chuyển sang Trạm 1 — không bắt người dùng tự bấm mở
    await expect(page.locator('#crumb b')).toContainText('RefrigDesignNH3', { timeout: 15_000 });

    const rdn3 = await getFrame(page, 'refrigdesign', 15_000);
    await expect.poll(async () => {
      return await rdn3.evaluate(async () => {
        const projects = await window.RefrigDesignNH3.db.listProjects();
        return projects.length;
      });
    }, { timeout: 10_000 }).toBeGreaterThan(0);

    const state = await rdn3.evaluate(async () => {
      const projects = await window.RefrigDesignNH3.db.listProjects();
      return { name: projects[0].name, activeId: window.RefrigDesignNH3.state.activeProjectId };
    });
    expect(state.name).toBe('Kho lạnh Test E2E');
    expect(state.activeId).toBeTruthy();

    // Modal "Quản lý Dự án" của Trạm 1 không được tự bật lên chặn màn hình —
    // đã có dự án active nên không cần hỏi lại người dùng.
    const modalStillOpen = await rdn3.evaluate(() => {
      const m = document.getElementById('modalProjects');
      return !!(m && m.classList.contains('show'));
    });
    expect(modalStillOpen, 'Không được để modal Quản lý Dự án của Trạm 1 tự bật chặn màn hình sau khi đã tạo dự án').toBe(false);
  });

  // Hồi quy: trước đây Hub tự tạo/lưu 1 danh sách dự án RIÊNG song song với
  // CSDL thật của Trạm 1 — 1 dự án cùng tên nhưng 2 ID khác nhau ở 2 nơi.
  // Giờ modal "Dự án" ở Tổng quan phải đọc/ghi THẲNG qua CSDL thật của Trạm
  // 1: đúng 1 dòng (không trùng lặp), cùng 1 ID, và đổi tên qua modal phải
  // phản ánh đúng vào tên thật bên trong Trạm 1 — kể cả khi đổi tên trực
  // tiếp trong modal riêng của Trạm 1 (không qua Tổng quan), Hub vẫn phải
  // đồng bộ lại (sự kiện HUB:projectChanged).
  test('modal "Dự án" dùng chung 1 nguồn thật với Trạm 1 — không trùng lặp, đổi tên đồng bộ 2 chiều', async ({ page }) => {
    await gotoHub(page);
    await page.click('#btnNewProjectOverview');
    await page.fill('#npInputName', 'Kho lạnh Hợp Nhất E2E');
    await page.click('#npCreate');
    await expect(page.locator('#crumb b')).toContainText('RefrigDesignNH3', { timeout: 15_000 });
    const rdn3 = await getFrame(page, 'refrigdesign', 15_000);

    const hubActiveId = await page.evaluate(() => localStorage.getItem('hubshell_active_project'));
    const s1 = await rdn3.evaluate(async () => {
      const list = await window.RefrigDesignNH3.db.listProjects();
      return { count: list.length, id: list[0] && list[0].id };
    });
    expect(s1.count, 'Chỉ được có đúng 1 dự án thật trong Trạm 1 (vừa tạo)').toBe(1);
    expect(hubActiveId, 'ID dự án đang mở ở Hub phải TRÙNG với ID thật trong Trạm 1 — không phải 2 bản ghi khác nhau').toBe(s1.id);

    // Mở modal Dự án ở Tổng quan — phải thấy đúng 1 dòng, không trùng lặp.
    await page.click('#btnProjects');
    await expect(page.locator('.modal-row')).toHaveCount(1);

    // Đổi tên qua modal Hub — phải ghi thẳng vào tên thật của Trạm 1.
    page.once('dialog', (d) => d.accept('Kho lạnh Hợp Nhất E2E (đổi tên)'));
    await page.click('.btn-icon-sm[data-act="rename"]');
    await expect.poll(async () => {
      return await rdn3.evaluate(async () => {
        const list = await window.RefrigDesignNH3.db.listProjects();
        return list[0] && list[0].name;
      });
    }, { timeout: 5_000 }).toBe('Kho lạnh Hợp Nhất E2E (đổi tên)');
    await page.click('#mClose');

    // Đổi tên trực tiếp TRONG Trạm 1 (không qua Tổng quan) — sidebar Hub vẫn
    // phải tự đồng bộ theo (HUB:projectChanged).
    await rdn3.evaluate(async () => {
      await window.RefrigDesignNH3.db.renameProject(
        window.RefrigDesignNH3.db.currentProjectId,
        'Đổi tên trực tiếp trong Trạm 1'
      );
    });
    await expect(page.locator('.brand-text span')).toHaveText('Đổi tên trực tiếp trong Trạm 1', { timeout: 5_000 });
  });
});
