# Suite Thiết kế Kho lạnh NH3 — Hub Shell

4 công cụ tính toán độc lập, liên kết thành **một ứng dụng duy nhất** qua
`Hub_Shell.html`: khi 1 trạm tính xong và xuất dữ liệu, Hub tự động chuyển
giao diện sang trạm kế tiếp và điền sẵn dữ liệu — kỹ sư chỉ cần xem lại và
bấm xác nhận (không còn tải file → đổi tab → tìm nút nhập → dán/tải file →
xem trước thủ công như trước).

## Cấu trúc

```
Hub_Shell.html                    ← điểm vào chính, mở file này
RefrigDesignNH3.html              ← Trạm 1: chu trình lạnh NH3
NH3_Vessel_Calculator.html        ← Trạm 2: sizing bình sơ bộ
Pressure_Vessel_Calculator.html   ← Trạm 3: kiểm bền cơ khí ASME/TCVN
BOQ_Cost_Estimate_Calculator.html ← Trạm 4: khái toán chi phí (điểm cuối)
PROJECT_DATA_CONTRACT.md          ← hợp đồng dữ liệu giữa 4 trạm + Hub
manifest.webmanifest, sw.js       ← cho phép cài ứng dụng (PWA) trên điện thoại/máy tính
assets/icons/                     ← icon ứng dụng
tests/e2e/                        ← bộ test tự động bảo vệ cầu nối Hub Shell (xem mục "Test tự động")
```

Mỗi trạm vẫn là **1 file HTML độc lập, chạy được một mình** (mở trực tiếp
bằng trình duyệt, không cần Hub) — đúng kiến trúc ban đầu. Hub Shell chỉ là
lớp điều phối bên ngoài, không sửa logic tính toán/kỹ thuật bên trong.

## Cách chạy

Cần một static file server (không cần backend/database — mọi thứ chạy phía
client, dữ liệu lưu trong trình duyệt qua `localStorage`/`IndexedDB`).
Không mở bằng `file://` trực tiếp vì trình duyệt chặn `iframe`/`fetch` qua
giao thức file — phải phục vụ qua HTTP(S).

**Chạy thử cục bộ:**
```bash
python3 -m http.server 8080
# rồi mở http://localhost:8080/Hub_Shell.html
```

**Triển khai lên cloud (chọn 1, đều miễn phí và không cần cấu hình build):**
- **GitHub Pages**: Settings → Pages → Deploy from branch → chọn branch này, thư mục gốc `/`.
- **Cloudflare Pages / Netlify / Vercel** (static site): kéo thả cả thư mục repo, không có build command, output directory = gốc repo.

Sau khi có URL, mở trên điện thoại → trình duyệt sẽ gợi ý "Cài đặt ứng dụng"
(hoặc dùng nút ⬇ trên thanh công cụ Hub Shell) → icon xuất hiện trên màn
hình chính, chạy toàn màn hình như app gốc, dùng offline được sau lần mở
đầu (nhờ `sw.js` cache toàn bộ 4 trạm).

## Cách hoạt động (tóm tắt — chi tiết xem `PROJECT_DATA_CONTRACT.md`)

1. Mỗi trạm có `window.App<Xyz>.exportProjectData()` / `.importProjectData(bundle)`
   — API này đã tồn tại sẵn trong cả 4 file trước khi có Hub Shell (comment
   "CONTRACT Mục 5"), Hub Shell chỉ thêm phần còn thiếu:
   - Các hàm export gốc nay `return bundle` (trước chỉ tải file/copy clipboard).
   - Mỗi hàm export/confirm-import phát thêm sự kiện `HUB:export` / `HUB:import`
     trên `window` để Hub bắt được thời điểm dữ liệu sẵn sàng, kể cả khi trạm
     đó có bước xác nhận riêng (VD Trạm 2 có modal thẩm định PASS/WARN/FAIL).
2. Hub Shell lắng nghe 2 sự kiện này trên từng `iframe`, tự động:
   - Lưu bundle vào "dự án Hub" (`localStorage`, tách biệt với dữ liệu nội bộ
     từng trạm — xoá dự án Hub không ảnh hưởng dữ liệu đã lưu trong từng app).
   - Chuyển tab sang trạm kế tiếp theo đúng trạm (Trạm 1 → Trạm 2 & Trạm 4 ngầm;
     Trạm 2 → Trạm 3; Trạm 3 → Trạm 4).
   - Gọi `importProjectData(bundle)` ở trạm đích — trạm đó tự mở modal xem
     trước đã điền sẵn. **Người kỹ sư vẫn phải bấm xác nhận** — đây là gate an
     toàn cố ý của từng trạm, Hub không bỏ qua bước này.
3. Màn hình **Tổng quan** tổng hợp trạng thái 4 trạm (chưa có dữ liệu / sẵn
   sàng nhận / đạt / cảnh báo / không đạt) dựa trên gate PASS/WARN/FAIL đã có
   sẵn trong từng bundle, không tự đánh giá lại.

## Quản lý dự án

"Dự án" dùng chung cho cả 4 trạm, khai báo 1 lần — nguồn sự thật duy nhất là
CSDL đa dự án thật của **Trạm 1** (RefrigDesignNH3, `IndexedDB`). Modal Dự án
(nút ☰ trên thanh công cụ, hoặc nút "✦ Dự án mới" ở Tổng quan) đọc/ghi thẳng
qua đó: tạo mới, mở, đổi tên, xoá — áp dụng ngay cho cả 4 trạm, không còn
danh sách riêng ở cấp Hub nữa. Đổi tên/xoá/tạo trực tiếp trong modal "Quản
lý Dự án" riêng của Trạm 1 (không qua Tổng quan) cũng tự đồng bộ ngược lại
Hub. Hub chỉ giữ thêm 1 "sổ theo dõi bàn giao" riêng (không phải danh sách
dự án) để nhớ đã gửi bundle nào cho trạm nào, phục vụ badge PASS/WARN/FAIL
ở Tổng quan — xoá sổ này không ảnh hưởng dữ liệu tính toán thật.

## Sao lưu — quan trọng, đọc trước khi dùng cho dự án thật

**Trạm 2 (NH3 Vessel) và Trạm 4 (BOQ) không tự lưu trình duyệt** — trước bản
vá này, dữ liệu chỉ nằm trong bộ nhớ JS và **mất trắng khi F5, đóng nhầm tab,
hay hết pin/crash trình duyệt**. Bản vá này đã thêm autosave debounce vào
`localStorage` cho 2 trạm này (tự khôi phục khi mở lại trang), nhưng
`localStorage` vẫn gắn với 1 trình duyệt/1 thiết bị — xoá cache hoặc đổi máy
vẫn mất.

**Cách an toàn nhất: bấm nút 💾 (góc trên bên phải) thường xuyên** — nút này
gom dữ liệu THẬT của mọi trạm đang mở (không chỉ Trạm 2/4) thành 1 file
`.json` tải về máy, độc lập hoàn toàn với trình duyệt. Hub Shell tự nhắc mỗi
15 phút nếu phát hiện Trạm 2/4 đang mở mà lâu chưa sao lưu, và cảnh báo trước
khi đóng tab nếu có dữ liệu chưa kịp lưu ra file. Khôi phục qua nút ☰ → "📂
Khôi phục từ file sao lưu".

Giới hạn còn tồn đọng: Trạm 3 (Pressure Vessel) chỉ backup được các bình
**đã bấm "Lưu vào dự án"** — input đang gõ dở ở tab Tính toán mà chưa lưu thì
chưa nằm trong phạm vi bản vá này.

## Test tự động — bảo vệ cầu nối khi sửa 1 trong 4 trạm

Hub Shell dựa vào một số hàm/tên biến/id DOM cụ thể bên trong từng trạm
(`exportProjectData()`, `#importJson`, `#t_btnAddStation`...). Nếu ai đó sửa
1 trong 4 file trạm và vô tình đổi tên/xoá 1 trong số đó, cầu nối sẽ gãy
**âm thầm** — không lỗi console, chỉ đơn giản là dữ liệu không còn tự chuyển
giữa các trạm nữa. Bộ test `tests/e2e/` được viết ra chính để bắt loại lỗi
này, tự chạy trong CI (`.github/workflows/e2e-tests.yml`) mỗi khi có PR sửa
`Hub_Shell.html` hoặc 1 trong 4 file trạm.

Nguyên tắc quan trọng của bộ test: **luôn gọi hàm/nút thật** của từng trạm
(`exportProjectData()`, click nút xác nhận thật trong modal...), **không**
tự tạo/`dispatchEvent()` giả lập — vì nếu tự giả lập event thì test sẽ luôn
pass ngay cả khi trạm gốc đã bị xoá mất dòng phát event thật.

```bash
npm install
npx playwright install --with-deps chromium   # chỉ cần 1 lần
npm run test:e2e            # chạy toàn bộ (~20s)
npm run test:e2e:ui         # chạy có giao diện, tiện khi debug 1 test đang fail
```

`tests/e2e/handoff.spec.js` là quan trọng nhất — kiểm tra đủ cả 4 cạnh bàn
giao (Trạm 1→2, 1→3 ngầm, 2→3, 3→4) bằng dữ liệu tính toán thật. Khi thêm
tính năng mới vào bất kỳ trạm nào làm đổi tên hàm/id trong danh sách CONTRACT
(PROJECT_DATA_CONTRACT.md), nhớ cập nhật cả `tests/e2e/helpers.js` lẫn spec
liên quan trong cùng PR.

### Test trên di động — những gì đã kiểm chứng và những gì chưa

`tests/e2e/mobile.spec.js` chạy trên 2 project mô phỏng di động của
Playwright (`mobile-chrome` = Pixel 7 engine Chromium, `mobile-safari` =
iPhone 14 engine WebKit) — kiểm tra bottom-nav hiện đúng, thẻ trạm không
tràn ngang, mở trạm qua bottom-nav hoạt động. Đây **không phải** test trên
thiết bị thật — Playwright chỉ mô phỏng kích thước màn hình/user agent/touch,
**không** mô phỏng được: bàn phím ảo che form nhập liệu, cử chỉ vuốt thật,
thanh địa chỉ Safari thu/giãn làm đổi chiều cao viewport động, hiệu năng
render trên phần cứng di động thật (các file trạm nặng 2-5MB). Trước khi
dùng cho dự án thật, nên tự bấm thử trên ít nhất 1 điện thoại Android
(Chrome) và 1 iPhone (Safari) thật.

## Cập nhật sau này

Khi sửa nội dung 1 trong 4 file trạm hoặc `Hub_Shell.html`, nhớ:
1. Tăng `CACHE_VERSION` trong `sw.js` (VD `hubshell-v3`) để trình duyệt của
   người dùng đã cài app tải lại đúng bản mới thay vì dùng bản cache cũ.
2. Nếu thay đổi ảnh hưởng hành vi của `Hub_Shell.html` (không phải sửa nhỏ
   trong 1 trạm), tăng `HUB_SHELL_VERSION` trong `Hub_Shell.html` và ghi vào
   `CHANGELOG.md`. Version này độc lập với version riêng của từng trạm.
