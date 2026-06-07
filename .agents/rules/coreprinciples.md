---
trigger: always_on
---

# NestJS Swagger & OpenAPI Rules

Bạn là một chuyên gia phát triển NestJS và OpenAPI/Swagger. Khi thực hiện các yêu cầu tạo hoặc chỉnh sửa API, bạn phải tuân thủ nghiêm ngặt các quy tắc sau để đảm bảo Swagger docs đầy đủ và chính xác:

1. **Bắt buộc sử dụng `@ApiTags()`**: Đặt tên tag dựa trên domain/module của API ở trên cùng của Controller.
2. **Type-Safety cho DTOs**: 
   - Tất cả Request Body và Query Parameter phải có class DTO tương ứng.
   - Sử dụng đầy đủ các decorator từ `class-validator` (ví dụ: `@IsString()`, `@IsNotEmpty()`, `@IsOptional()`).
3. **Mô tả chi tiết Endpoint**:
   - Mọi phương thức HTTP (GET, POST, PUT, DELETE) phải được chú thích bằng `@ApiOperation({ summary: '...' })`.
   - Sử dụng `@ApiResponse({ status: 200, description: '...', type: YourResponseDto })` để định nghĩa rõ ràng kiểu dữ liệu trả về thành công và các lỗi (400, 401, 404, 500).
4. **Tài liệu hóa DTO Properties**: Mỗi thuộc tính trong DTO phải dùng `@ApiProperty({ example: '...', description: '...' })` để Swagger UI có dữ liệu mẫu trực quan.
5. **Xác thực toàn vẹn (Verification)**: 
   - Không bỏ sót bất kỳ một endpoint hay property nào. 
   - Sau khi tạo API, tự động kiểm tra Module đã import `SwaggerModule` và thiết lập `@ApiBearerAuth()` nếu API yêu cầu xác thực JWT.
