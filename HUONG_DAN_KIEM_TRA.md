# KIỂM TRA VÀ SỬA LỖI - Sản phẩm đã đặt hiển thị sai

## Vấn đề

Khi bạn chọn (tick) 1 sản phẩm từ 3 sản phẩm trong giỏ hàng:

-   ✅ Trang Checkout hiển thị đúng (chỉ 1 sản phẩm)
-   ✅ Thanh toán thành công
-   ❌ **Trang "Sản phẩm đã đặt" hiển thị TẤT CẢ 3 sản phẩm** thay vì chỉ 1 sản phẩm đã trả tiền

## Nguyên nhân

Backend API trả về TẤT CẢ sản phẩm trong giỏ hàng, không phải chỉ sản phẩm được thanh toán.
Chúng tôi sử dụng sessionStorage để override dữ liệu từ backend, nhưng cần kiểm tra xem nó có đúng không.

## Cách kiểm tra (Bước theo bước)

### Bước 1: Mở DevTools

Nhấn **F12** → chọn tab **Console**

### Bước 2: Trang Cart

1. Có 3 sản phẩm trong giỏ hàng
2. **Uncheck (bỏ chọn) 2 sản phẩm**
3. Chỉ select (chọn) 1 sản phẩm
4. Xem logs trong Console:

```
[Cart] Total cart items: 3
[Cart] Selected products count: 1
[Cart] Selected products IDs: [{ id: "xxxxxx", name: "Product Name" }]
```

✓ Nếu count = 1 thì Bước 2 đúng

### Bước 3: Trang Checkout (Trước khi thanh toán)

1. Nhấn nút "Thanh toán" ở Cart
2. Xem logs trong Console:

```
[Checkout] Received selectedProducts from Cart, count: 1
[Checkout] Selected products IDs: [{ id: "xxxxxx", name: "Product Name" }]
```

✓ Nếu count = 1 thì Bước 3 đúng

### Bước 4: Trang Checkout (Khi thanh toán)

1. Điền đầy đủ thông tin giao hàng (tên, phone, địa chỉ)
2. Chọn "Thanh toán khi nhận hàng" (COD)
3. Nhấn "Thanh toán"
4. Xem logs trong Console:

```
[Checkout.handlePaymentSuccess] Storing paid items in sessionStorage
[Checkout.handlePaymentSuccess] cartData count: 1
[Checkout.handlePaymentSuccess] cartData IDs: [{ id: "xxxxxx", name: "Product Name" }]
[Checkout.handlePaymentSuccess] Item IDs to remove: ["xxxxxx"]
```

✓ Nếu cartData count = 1 thì Bước 4 đúng

### Bước 5: Trang Payment Success (QUAN TRỌNG!)

Sau khi thanh toán, xem logs trong Console:

```
[PaymentSucces] Raw paidItems from sessionStorage: (long JSON string here)
[PaymentSucces] sessionStorage keys: ["paidItems", "itemIdsToRemove"]
[PaymentSucces] Parsed items count: 1
[PaymentSucces] Parsed items details: [{ id: "xxxxxx", name: "Product Name" }]
[PaymentSucces] Backend returned items count: 3
[PaymentSucces] Backend items details: [{ id: "xxx", name: "P1" }, { id: "xxx", name: "P2" }, { id: "xxx", name: "P3" }]
[PaymentSucces] OVERRIDING payment.items with sessionStorage items
[PaymentSucces] Final items count after override: 1
[PaymentSucces] Final items details: [{ id: "xxxxxx", name: "Product Name" }]
```

**QUAN TRỌNG**: Các giá trị này phải đúng:

-   `Parsed items count: 1` ✓
-   `Backend returned items count: 3` ✓ (Đây là bình thường - backend trả ALL items)
-   `Final items count after override: 1` ✓ (Quan trọng nhất!)

### Bước 6: Kiểm tra hiển thị

Trên trang "Sản phẩm đã đặt" phải hiển thị:

-   **Chỉ 1 sản phẩm** (sản phẩm bạn đã tick)
-   Không hiển thị 2 sản phẩm bạn bỏ chọn

## Nếu vẫn thấy 3 sản phẩm trên trang Success

### Kiểm tra 1: SessionStorage có dữ liệu không?

Chạy lệnh này trong Console:

```javascript
sessionStorage.getItem('paidItems');
```

Kết quả:

-   ✓ Nếu trả về JSON string với 1 sản phẩm → OK
-   ❌ Nếu trả về `null` → sessionStorage không được set

### Kiểm tra 2: Logs có tất cả không?

Tìm các logs sau trong Console:

-   `[Cart] Total cart items: 3`
-   `[Cart] Selected products count: 1`
-   `[Checkout] Received selectedProducts from Cart, count: 1`
-   `[Checkout.handlePaymentSuccess] Storing paid items in sessionStorage`
-   `[PaymentSucces] OVERRIDING payment.items with sessionStorage items`
-   `[PaymentSucces] Final items count after override: 1`

Nếu thiếu bất kỳ log nào → có lỗi ở giai đoạn đó

### Kiểm tra 3: selectedItems state có đúng không?

Trên trang Cart, mở Console và chạy:

```javascript
// Tìm React component instance
const cartDiv = document.querySelector('[class*="cart"]');
// Hoặc inspect element để tìm selectedItems state
```

## Các tập tin đã sửa

1. **Cart.jsx**

    - Thêm logs chi tiết trong `handleProceedCheckout()`
    - Kiểm tra `selectedProducts` count

2. **Checkout.jsx**

    - Thêm logs trong `useEffect` để confirm nhận đúng selectedProducts
    - Thêm logs trong `handlePaymentSuccess` để confirm lưu sessionStorage đúng

3. **PaymentSucces.jsx**
    - Rewrite logic để rõ ràng hơn
    - Thêm logs để trace tất cả các bước
    - Logs hiển thị dữ liệu backend vs sessionStorage override

## Lưu ý

-   Bạn **PHẢI uncheck** 2 sản phẩm khác, chỉ select 1 sản phẩm
-   Nếu bạn nhấn "Chọn tất cả" → toàn bộ 3 sản phẩm sẽ được chọn
-   sessionStorage chỉ tồn tại trong tab hiện tại
-   Khi refresh trang → sessionStorage sẽ mất

## Kết quả mong đợi

Sau khi hoàn thành các bước trên, trang "Sản phẩm đã đặt" phải hiển thị đúng 1 sản phẩm bạn đã chọn.
