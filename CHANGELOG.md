# Changelog — Hub Shell

Theo dõi thay đổi của lớp điều phối `Hub_Shell.html`. Mỗi trạm (RefrigDesignNH3,
NH3 Vessel Calculator, Pressure Vessel Calculator, BOQ & Cost Estimate) tự quản
version riêng của mình (hiển thị ở footer/PDF của từng app) — **không** đổi theo
version Hub Shell dưới đây. Bảng snapshot cuối file ghi lại version từng trạm
tại các mốc quan trọng để tham chiếu.

## [1.3.0] — 2026-08-21

### Changed — Hợp nhất "dự án" thành 1 nguồn duy nhất
- Trước đây Hub Shell tự tạo/lưu 1 danh sách dự án RIÊNG (`hubshell_projects`),
  song song và **độc lập** với CSDL đa dự án thật của Trạm 1 (IndexedDB) — 1
  dự án "Abc" ở Hub và "Abc" bên trong Trạm 1 là 2 bản ghi khác ID nhau, có
  thể lệch nhau (đổi tên/xoá 1 bên không ảnh hưởng bên kia). Giờ Trạm 1 là
  **nguồn sự thật duy nhất**: modal "Dự án" ở Tổng quan đọc/ghi thẳng qua
  `RefrigDesignNH3.db` (tạo/mở/đổi tên/xoá) — không còn danh sách riêng của
  Hub. Trạm 1 tự phát sự kiện `HUB:projectChanged` mỗi khi dự án đang mở đổi
  (kể cả khi thao tác trực tiếp trong modal "Quản lý Dự án" riêng của Trạm 1,
  không qua Tổng quan) để Hub luôn đồng bộ đúng tên/ID.
- Trạm 1 được mount ngầm (ẩn) ngay từ lúc Hub khởi động thay vì chỉ khi người
  dùng mở trạm đó, để CSDL dự án của nó luôn sẵn sàng tra cứu.
- Gỡ bỏ 2 nút "Xuất toàn bộ (.json)" / "Nhập dự án (.json)" trong modal Dự án
  — trước đây chỉ xuất/nhập đúng cái sổ ledger riêng (redundant) của Hub, dễ
  nhầm với "Sao lưu toàn bộ" (dữ liệu tính toán thật) vốn là cơ chế đúng cần
  dùng.

### Fixed
- **Lỗi hiển thị**: icon SVG (mũi tên liên kết, kẹp giấy...) trong cả 4 file
  trạm không có `width`/`height` nào cả (class Tailwind `w-3.5 h-3.5`... bị
  purge khỏi CSS build vì chỉ xuất hiện trong chuỗi JS) — trình duyệt vẽ ở
  kích thước mặc định (~300px), phủ gần kín màn hình, đặc biệt trên điện
  thoại. Nay icon luôn có `width`/`height` gán thẳng lên thẻ `<svg>`, không
  phụ thuộc CSS ngoài.
- `iframe.loading="lazy"` khiến Trạm 1 mount ngầm (display:none) **không bao
  giờ** tải xong — lazy-load gốc của trình duyệt dựa vào việc phần tử có gần
  viewport hay không, mà phần tử ẩn thì không bao giờ được coi là gần
  viewport. Gỡ thuộc tính này (Hub Shell đã tự quản lý việc mount theo nhu
  cầu ở tầng JS).
- `collectFullBackup()`/nút "Sao lưu ngay" không `await` `exportFullBackup()`
  của Trạm 1/3 (hàm async, đọc IndexedDB) — file backup tải về **âm thầm
  rỗng** cho đúng 2 trạm có dữ liệu quan trọng nhất. Trạm 2/4 (đồng bộ,
  không qua IndexedDB) không bị ảnh hưởng nên lỗi lọt qua khi trước đây chỉ
  test 2 trạm đó.
- CSDL Trạm 1 (IndexedDB) có thể được gọi (từ Hub, hoặc script bên ngoài)
  trước khi `init()` nội bộ của Trạm 1 mở kết nối xong — `db.open()` giờ tự
  nhớ lại promise cũ (idempotent) và mọi hàm CRUD (`get/put/getAll/del`) tự
  `await open()` trước, loại bỏ toàn bộ race "Cannot read properties of null
  (reading 'transaction')".

## [1.2.0] — 2026-08-20

### Added
- Bộ test e2e Playwright (`tests/e2e/`) bảo vệ cầu nối `HUB:export`/`HUB:import`
  — chạy trong CI mỗi khi có PR sửa `Hub_Shell.html` hoặc 1 trong 4 file trạm.
- Hiển thị version Hub Shell (`Hub Shell vX.Y.Z`) ở cuối sidebar (desktop).

### Fixed
- Pressure Vessel Calculator: footer PDF hiển thị sai version (`2607.20.01`,
  không khớp với 3 chỗ khác trong cùng file đều ghi `2606.05.01`) — sửa lại
  cho nhất quán trong chính file đó.

## [1.1.0] — 2026-08-20

### Added
- **Backup Center**: nút 💾 gom `exportFullBackup()` của mọi trạm đang mở
  thành 1 file `.json`, chấm trạng thái độ mới, nhắc định kỳ 15 phút, cảnh
  báo `beforeunload` khi Trạm 2/4 có dữ liệu chưa sao lưu, luồng khôi phục
  từ file trong modal Dự án.
- Autosave debounce thật (trước đó không tồn tại) cho NH3 Vessel Calculator
  và BOQ & Cost Estimate — 2 trạm này trước bản vá mất trắng dữ liệu khi F5.
- API `exportFullBackup()`/`importFullBackup()` thống nhất trên cả 4 trạm.

## [1.0.1] — 2026-08-20

### Fixed
- `actions/configure-pages` cần `enablement: true` để tự bật GitHub Pages ở
  lần deploy đầu tiên (mặc định action từ chối tạo Pages site nếu chưa có).

## [1.0.0] — 2026-08-20

### Added
- `Hub_Shell.html` ra mắt: gộp 4 trạm tính toán độc lập thành 1 app duy nhất
  (sidebar desktop / bottom-nav mobile), màn hình Tổng quan, chuyển tab tự
  động + điền sẵn dữ liệu khi 1 trạm xuất xong (`HUB:export`/`HUB:import`).
- PWA (`manifest.webmanifest`, `sw.js`, icon) — cài được lên điện thoại/máy
  tính, chạy offline sau lần mở đầu.
- `PROJECT_DATA_CONTRACT.md` — chính thức hoá hợp đồng dữ liệu giữa 4 trạm.
- GitHub Actions deploy tự động lên GitHub Pages khi push `main`.
- Vá tối thiểu 4 file trạm: hàm export nay `return bundle` + phát
  `HUB:export`/`HUB:import` — không đổi hành vi tải file/clipboard cũ.

---

## Snapshot version từng trạm (tham khảo, không phải version Hub Shell)

| Trạm | Version hiển thị trong chính app đó | Ghi tại |
|---|---|---|
| RefrigDesignNH3 | 2606.02.01 (footer/backup) · 26.07.02.01 (metadata bundle export) | 2026-08-20 |
| NH3 Vessel Calculator | 26.07.02.01 | 2026-08-20 |
| Pressure Vessel Calculator | 2606.05.01 (footer/backup/PDF) · 26.07.02.01 (metadata bundle export) | 2026-08-20 |
| BOQ & Cost Estimate | không tự ghi version | 2026-08-20 |

Ghi chú: 3/4 trạm đã tự đồng bộ version dùng cho `sourceAppVersion` trong
bundle bàn giao (`26.07.02.01`) — đây là version phục vụ khả năng tương
thích dữ liệu giữa các trạm (PROJECT_DATA_CONTRACT.md), tách biệt với version
hiển thị/release riêng của từng app. BOQ hiện chưa có version nào — nên bổ
sung nếu sau này cần truy vết report/PDF xuất ra từ bản nào.
