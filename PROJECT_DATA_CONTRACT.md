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

## 4b. Backup contract cho Hub Shell (mới thêm — khác Mục 3/4 ở trên)

Mục 3–4 nói về dữ liệu **bàn giao giữa các trạm** (handoff). Mục này nói về
việc **không để mất dữ liệu làm việc của chính một trạm** — quan trọng nhất
với Trạm 2 (NH3 Vessel) và Trạm 4 (BOQ), vốn *không có bất kỳ cơ chế lưu trữ
trình duyệt nào* trước bản vá này (dữ liệu chỉ ở biến JS, mất khi F5/đóng tab).
Mỗi app expose thêm 2 hàm, tách biệt hoàn toàn với `exportProjectData`/
`importProjectData`:

```js
window.App<Xyz>.exportFullBackup()      // -> object, đồng bộ hoặc Promise tuỳ app
window.App<Xyz>.importFullBackup(data)  // ghi THẲNG vào state — KHÔNG qua modal preview
```

Khác biệt cố ý so với `importProjectData`: `importFullBackup` ghi thẳng, không
cần con người xác nhận lại — vì đây là khôi phục **dữ liệu của chính bạn** sau
sự cố (mất mạng, F5 nhầm, đổi máy), không phải nhận dữ liệu từ trạm khác cần
kiểm tra chéo.

Nguồn dữ liệu mỗi app trả về khác nhau tuỳ hạ tầng lưu trữ sẵn có:
- **Trạm 1 (RefrigDesignNH3), Trạm 3 (Pressure Vessel):** đã có IndexedDB —
  `exportFullBackup()` bọc lại đúng cơ chế export/import toàn bộ đã có sẵn.
  Riêng Trạm 3 **chưa** chụp được input đang gõ dở ở tab Tính toán nếu chưa
  bấm "Lưu vào dự án" — giới hạn còn tồn đọng, xem README.
- **Trạm 2 (NH3 Vessel), Trạm 4 (BOQ):** không có nơi lưu trữ nào từ trước —
  bản vá này thêm autosave debounce 800ms vào `localStorage` (`nh3vessel_autosave`,
  `boq_autosave`) mỗi khi tính lại, cộng thêm tự khôi phục khi tải trang nếu
  phát hiện dữ liệu cũ còn hợp lệ.

Hub Shell gọi `exportFullBackup()` của **mọi trạm đang mở** (không chỉ trạm
hiện hành) để gộp thành 1 file `.json` duy nhất (nút 💾 trên thanh công cụ),
và gọi `importFullBackup(data)` cho từng trạm ngay khi trạm đó được mở lần
đầu sau khi khôi phục từ file (không cần mở đủ cả 4 trạm cùng lúc).
`exportFullBackup()`/`importFullBackup()` có thể **đồng bộ hoặc async** tuỳ
app — Hub Shell luôn bọc lời gọi trong `Promise.resolve(...).then(...)`, kể
cả với app đồng bộ, để không lặp lại lỗi từng có: gọi thẳng không `await` với
1 app async khiến `JSON.stringify` một `Promise` chưa resolve ra `"{}"` (file
backup rỗng âm thầm).

## 4c. Nguồn sự thật của "dự án" — Trạm 1, và event `HUB:projectChanged`

Khác với bundle bàn giao (Mục 4) hay backup dữ liệu làm việc (Mục 4b), **danh
tính "dự án"** (tên + ID dùng chung cho cả 4 trạm) có đúng **1 nguồn sự thật
duy nhất**: CSDL đa dự án thật của Trạm 1 (`window.RefrigDesignNH3.db`,
IndexedDB). Hub Shell **không** tự tạo/lưu 1 danh sách dự án riêng song song
nữa (từng có ở bản trước — gây trùng lặp ID giữa Hub và Trạm 1 cho "cùng 1"
dự án). Thay vào đó:

```js
window.RefrigDesignNH3.db.listProjects()        // -> Promise<Array<{id,name,updatedAt,...}>>
window.RefrigDesignNH3.db.createProject(name)    // tạo + set làm dự án đang mở
window.RefrigDesignNH3.db.loadProject(id)        // mở 1 dự án có sẵn làm dự án đang mở
window.RefrigDesignNH3.db.renameProject(id,name) // đổi tên, không cần mở modal riêng
window.RefrigDesignNH3.db.deleteProject(id)
window.RefrigDesignNH3.db.currentProjectId       // getter/setter — ID dự án đang mở
window.RefrigDesignNH3.db.open()                 // idempotent — tự nhớ lại promise cũ,
                                                  // an toàn gọi lại từ bên ngoài iframe
                                                  // để chắc IndexedDB đã mở xong trước
                                                  // khi gọi các hàm ở trên.
```

Mỗi khi dự án đang mở đổi (tạo/mở/đổi tên/xoá) — **kể cả khi thao tác trực
tiếp trong modal "Quản lý Dự án" riêng của Trạm 1**, không qua Tổng quan của
Hub — Trạm 1 tự phát:

```js
window.dispatchEvent(new CustomEvent('HUB:projectChanged', { detail: { id: currentProjectId } }));
```

Hub Shell lắng nghe event này trên `iframe.contentWindow` của Trạm 1 (chỉ
Trạm 1 — 3 trạm còn lại không có khái niệm đa dự án riêng, chúng chỉ giữ 1
phiên làm việc autosave/handoff) để đồng bộ lại tên/ID hiển thị ở sidebar +
Tổng quan. Vì lý do này, Trạm 1 luôn được **mount ngầm (ẩn)** ngay từ lúc Hub
Shell khởi động — xem `mountStation()`/`waitStation1Ready()` — không đợi tới
khi người dùng bấm mở trạm đó.

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
