# PROJECT DATA CONTRACT — Suite Thiết kế Kho lạnh NH3 (4 Trạm)

Tài liệu này mô tả **hợp đồng dữ liệu** giữa 4 công cụ tính toán độc lập và
`Hub_Shell.html` — lớp vỏ điều phối (orchestrator) liên kết chúng thành một
ứng dụng duy nhất. Các file trạm đã tự tham chiếu tài liệu này trong comment
từ trước (`PROJECT_DATA_CONTRACT.md`) nhưng file chưa từng tồn tại trong repo
— tài liệu này chính thức hoá lại đúng những gì 4 app đã ngầm triển khai,
cộng thêm phần mở rộng cho Hub Shell (Mục 4 và 6).

## 1. Sơ đồ luồng dữ liệu (DAG)

```
Trạm 1                Trạm 2                  Trạm 3                   Trạm 4
RefrigDesignNH3   →   NH3 Vessel Calculator →  Pressure Vessel Calc →  BOQ & Cost Estimate
(window.RefrigDesignNH3)  (window.AppNH3Vessel)   (window.AppPV)          (window.AppBOQ)
       │                                               ▲
       └───────────────────────────────────────────────┘
              (T_vessel / mDot_coil tham khảo cho Trung Gian/Economizer)
       │
       └──────────────────────────────────────────────────────────────→ Trạm 4
              (máy nén / dàn ngưng / điện / thiết bị phụ tải)
```

* **Trạm 1 → Trạm 2**: chu trình lạnh (Te, Tc, mDot, Vh, feed type gợi ý…)
* **Trạm 1 → Trạm 3**: T_vessel + mDot_coil tham khảo cho bình Trung Gian/Economizer
* **Trạm 1 → Trạm 4**: máy nén, dàn ngưng, điện, thiết bị phụ tải đã chọn
* **Trạm 2 → Trạm 3**: kích thước bình sơ bộ (Di, L, Pdes) + gas charge
* **Trạm 3 → Trạm 4**: bình áp lực ĐÃ DUYỆT BỀN (chiều dày thật, khối lượng gia công)
* **Trạm 4**: điểm cuối (terminal) — không xuất tiếp đi đâu

## 2. Namespace toàn cục mỗi app

| Trạm | File | Namespace | Ghi chú |
|---|---|---|---|
| 1 | `RefrigDesignNH3.html` | `window.RefrigDesignNH3` | alias nội bộ `NS` |
| 2 | `NH3_Vessel_Calculator.html` | `window.AppNH3Vessel` | |
| 3 | `Pressure_Vessel_Calculator.html` | `window.AppPV` | mẫu tham chiếu — có `hub{}` sẵn |
| 4 | `BOQ_Cost_Estimate_Calculator.html` | `window.AppBOQ` | trạm cuối, không có `exportProjectData` |

## 3. API chuẩn mỗi app phải có (đã triển khai đủ ở cả 4 file)

```js
window.App<Xyz>.exportProjectData()   // -> object bundle | null | undefined
window.App<Xyz>.importProjectData(bundle)  // pre-fill form nhập + mở preview, KHÔNG ghi thẳng state
```

**Nguyên tắc bất biến (không được phá vỡ khi sửa các app):**

1. `importProjectData()` **không bao giờ ghi thẳng dữ liệu vào state**. Nó chỉ
   mở đúng modal nhập, tự điền JSON, và gọi bước "Xem trước". Người kỹ sư vẫn
   phải bấm nút xác nhận riêng của trạm đó (mỗi trạm có gate PASS/WARN/FAIL
   riêng cần được xem qua trước khi ghi dữ liệu thật) — đây là **safety gate**
   cố ý, Hub Shell không được và không cố bỏ qua bước này.
2. `exportProjectData()` **có thể** đồng bộ (trả bundle ngay — Trạm 1, Trạm 3)
   hoặc **bất đồng bộ / có gate xác nhận riêng** (Trạm 2 — mở modal thẩm định
   PASS/WARN/FAIL từng bình trước khi thật sự xuất). Vì vậy Hub Shell **không**
   dựa vào giá trị trả về của `exportProjectData()` làm nguồn tin cậy duy nhất
   — xem Mục 4 (event `HUB:export`).

## 4. Event contract cho Hub Shell (mới thêm)

Mỗi hàm export "gốc" (`exportToBOQ`, `exportToVesselCalc`, `_doExport`, …) sau
khi bundle đã sẵn sàng (kể cả khi phải qua modal thẩm định trước) sẽ:

```js
window.dispatchEvent(new CustomEvent('HUB:export', {
  detail: { to: 'boq' | 'nh3vessel' | 'pressurevessel', bundle }
}));
```

Mỗi hàm confirm-import (`confirmImport`, `importAllVessels`, `confirmImportRdn3`, …)
sau khi người kỹ sư đã bấm xác nhận và ghi dữ liệu vào state sẽ:

```js
window.dispatchEvent(new CustomEvent('HUB:import', {
  detail: { from: 'refrigdesign' | 'nh3vessel', bundle }
}));
```

Hub Shell lắng nghe 2 event này trên `iframe.contentWindow` của trạm đang mở
để: (a) lưu bundle vào kho dự án trung tâm, (b) tự chuyển tab sang trạm đích,
(c) tự gọi `importProjectData(bundle)` ở trạm đích ngay khi iframe sẵn sàng.
Đây chính là cơ chế thay thế cho việc tải file → mở app khác → tìm nút nhập →
dán/tải file → bấm xem trước, thủ công 100% trước đây.

## 5. Cấu trúc `bundle` (rút gọn, xem code từng hàm export để biết đầy đủ field)

```jsonc
{
  "projectId": "rdn3-1699999999",
  "projectName": "Kho lạnh ABC",
  "exportedAt": "2026-08-20T10:00:00.000Z",
  "exportedBy": "RefrigDesignNH3 v26.07.02.01",
  "stages": {
    "<tên stage>": {
      "status": "PASS" | "WARN" | "FAIL" | "NOT_EVALUATED",
      "fields": [ { "fieldId", "label", "unit", "value_calc", "value_selected",
                    "selectionSource", "deviationPercent", "gateStatus", "note",
                    "sourceApp", "sourceAppVersion", "timestamp", "locked" } ]
      // + field riêng của từng stage (compressors[], vessels[], equipment[]...)
    }
  },
  "auditLog": [ { "timestamp", "app", "action", "summary" } ]
}
```

Mỗi `field` mang theo **gate riêng** (`PASS/WARN/FAIL`) — đây là cơ chế kiểm
soát chất lượng dữ liệu xuyên suốt 4 trạm, không phải thứ Hub Shell tạo ra
thêm. Hub Shell chỉ đọc `status`/`gateStatus` để tô màu trạng thái trên màn
hình Tổng quan, không tự đánh giá lại.

## 6. Trách nhiệm của Hub Shell (không thuộc phạm vi 4 app)

* Giữ **project trung tâm**: `{ projectId, projectName, bundles: { [stationId]: {bundle, exportedAt} }, importedInto: { [stationId]: Set<sourceStationId> } }`, lưu `localStorage` (`hubshell_project_<id>`).
* Quyết định **routing** (trạm nào nhận bundle của trạm nào) theo bảng ở Mục 1 — bảng này nằm trong `Hub_Shell.html`, không sửa trong 4 app.
* Lazy-mount iframe từng trạm (chỉ tải khi người dùng mở tới trạm đó lần đầu — 4 file gốc khá nặng ~2-5MB/app).
* Không được tự ý bỏ qua bước xác nhận thủ công (Mục 3.1) — chỉ tự động hoá phần *điều hướng + điền sẵn dữ liệu*.
* Hiển thị trạng thái tổng thể dự án (4 thẻ trạm + progress) dựa trên việc **đã có bundle** hay chưa, không introspect sâu vào state nội bộ từng app.

## 7. Tương thích ngược

Mọi thay đổi trong Mục 4 chỉ **thêm** dòng `dispatchEvent`/`return bundle` vào
cuối các hàm export/import hiện có — không đổi hành vi tải file (`.json`) hay
copy clipboard hiện tại. Bốn app vẫn chạy độc lập 100% khi mở trực tiếp
(không qua Hub Shell), đúng như thiết kế ban đầu.
