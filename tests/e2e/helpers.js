// Helper dùng chung cho bộ test e2e Hub Shell.
// Mục đích bộ test: bắt sớm khi ai đó sửa 1 trong 4 file trạm (đổi tên hàm,
// đổi id DOM, đổi shape bundle...) mà vô tình phá vỡ cầu nối Hub Shell đang
// dựa vào — xem PROJECT_DATA_CONTRACT.md.

const { expect } = require('@playwright/test');

const STATIONS = {
  refrigdesign:   { file: 'RefrigDesignNH3.html',            ns: 'RefrigDesignNH3' },
  nh3vessel:      { file: 'NH3_Vessel_Calculator.html',      ns: 'AppNH3Vessel' },
  pressurevessel: { file: 'Pressure_Vessel_Calculator.html', ns: 'AppPV' },
  boq:            { file: 'BOQ_Cost_Estimate_Calculator.html', ns: 'AppBOQ' },
};

async function gotoHub(page) {
  await page.goto('/Hub_Shell.html', { waitUntil: 'load' });
}

/** Mở 1 trạm qua sidebar/bottom-nav của Hub Shell (không mở file trực tiếp). */
async function openStation(page, stationId) {
  await page.click(`.nav-item[data-id="${stationId}"]`);
}

/**
 * Chờ tới khi iframe của 1 trạm thực sự sẵn sàng (namespace + API contract
 * đã tồn tại trên contentWindow) — mirror đúng logic readiness-poll trong
 * Hub_Shell.html (bindBridge). Nếu điều kiện này không bao giờ đúng, nghĩa
 * là namespace/API của trạm đã đổi tên — đúng loại lỗi bộ test này cần bắt.
 */
async function waitForStationReady(page, stationId, timeout = 20_000) {
  const { ns } = STATIONS[stationId];
  await page.waitForFunction(
    ({ stationId, ns }) => {
      const el = document.querySelector(`#wrap-${stationId} iframe`);
      if (!el || !el.contentWindow) return false;
      const app = el.contentWindow[ns];
      return !!(app && (app.exportProjectData || app.importProjectData));
    },
    { stationId, ns },
    { timeout }
  );
}

function getFrame(page, stationId) {
  const { file } = STATIONS[stationId];
  const frame = page.frame({ url: new RegExp(file.replace('.', '\\.') + '$') });
  expect(frame, `Không tìm thấy iframe cho trạm "${stationId}" (${file}) — kiểm tra src trong Hub_Shell.html`).toBeTruthy();
  return frame;
}

async function openAndWaitStation(page, stationId, timeout) {
  await openStation(page, stationId);
  await waitForStationReady(page, stationId, timeout);
  return getFrame(page, stationId);
}

module.exports = { STATIONS, gotoHub, openStation, waitForStationReady, getFrame, openAndWaitStation };
