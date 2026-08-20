# Changelog — Hub Shell

Theo dõi thay đổi của lớp điều phối `Hub_Shell.html`. Mỗi trạm (RefrigDesignNH3,
NH3 Vessel Calculator, Pressure Vessel Calculator, BOQ & Cost Estimate) tự quản
version riêng của mình (hiển thị ở footer/PDF của từng app) — **không** đổi theo
version Hub Shell dưới đây. Bảng snapshot cuối file ghi lại version từng trạm
tại các mốc quan trọng để tham chiếu.

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
