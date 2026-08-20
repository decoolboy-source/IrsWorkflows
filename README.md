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

Hub Shell hỗ trợ nhiều dự án ở cấp điều phối (nút ☰ trên thanh công cụ):
tạo mới, đổi tên, xoá, xuất/nhập toàn bộ (`.json`, chứa mọi bundle đã bàn
giao giữa các trạm cho dự án đó). Đây là lớp quản lý **riêng** với hệ thống
đa dự án nội bộ của từng trạm (mỗi trạm vẫn có `IndexedDB`/danh sách dự án
của chính nó) — Hub chỉ nhớ "đã gửi bundle nào cho trạm nào" để tự động điền
lại nếu bạn quay lại sau.

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

## Cập nhật sau này

Khi sửa nội dung 1 trong 4 file trạm hoặc `Hub_Shell.html`, nhớ tăng
`CACHE_VERSION` trong `sw.js` (VD `hubshell-v2`) để trình duyệt của người
dùng đã cài app tải lại đúng bản mới thay vì dùng bản cache cũ.
