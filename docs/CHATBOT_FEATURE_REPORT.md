# Báo cáo tính năng AI Chatbot FOA

Tài liệu này tóm tắt tính năng AI Chatbot hiện tại của FOA ở góc nhìn feature/report: chatbot phục vụ việc hỏi thực đơn, gợi ý món, lọc an toàn dị ứng, kiểm tra ưu đãi, voucher, cửa hàng và đơn hàng. Backend giữ vai trò nguồn dữ liệu đáng tin cậy; LLM chỉ hỗ trợ phân loại, chọn tool, điền tham số có schema và diễn đạt câu trả lời cuối khi cần.

---

## 1. Mục tiêu tính năng

AI Chatbot FOA được xây dựng để:

- Hỗ trợ khách tìm món ăn theo nhu cầu tự nhiên.
- Gợi ý món theo ngân sách, combo, khẩu vị, sức khỏe và dị ứng.
- Kiểm tra campaign, voucher và thông tin cửa hàng.
- Tra cứu trạng thái/lịch sử đơn hàng bằng UI card có thể bấm vào xem chi tiết.
- Giữ an toàn dữ liệu bằng cách để backend kiểm soát query, quyền truy cập, giá, khuyến mãi, ngân sách và lọc dị ứng.

Nguyên tắc thiết kế chính:

- Backend là source of truth.
- AI output luôn được xem là untrusted.
- Không để LLM tự quyết định giá, quyền xem đơn, trạng thái thanh toán, tồn kho hoặc user id.
- Chỉ gửi dữ liệu tối thiểu cần thiết sang AI provider.

---

## 2. API Chatbot

Endpoint:

```http
POST /chat
```

Route backend:

```txt
backend/src/routes/chat.route.ts
```

Controller:

```txt
backend/src/controllers/chat.controller.ts
```

Frontend service:

```txt
frontend/src/services/chat.service.ts
```

### Request body

```ts
{
  message: string;
  clientMessageId?: string;
  conversationId?: string;
  storeId?: string;
  fulfillmentType?: "delivery" | "pickup" | "dine_in";
  locale?: string;
  timezone?: string;
  history?: Array<{
    role: "user";
    content: string;
  }>;
}
```

Ràng buộc chính:

- `message`: bắt buộc, 1 đến 1000 ký tự.
- `history`: tối đa 20 tin, chỉ nhận `role: "user"`.
- Không nhận `assistant/model history` từ client.
- `storeId`: nếu có thì phải là Mongo ObjectId.
- `userId` không nằm trong body; backend lấy từ `optionalAuthenticate`.

### Response body

```ts
{
  response: string;
  recommendedProducts: Array<{
    _id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    description?: string;
  }>;
  orderCards: Array<{
    _id: string;
    code: string;
    status: string;
    totalPrice: number;
    createdAt: string;
    firstItemName?: string;
    itemCount: number;
  }>;
}
```

Frontend dùng:

- `recommendedProducts` để render card món ăn.
- `orderCards` để render card đơn hàng, bấm vào `/orders/:id`.

---

## 3. Luồng xử lý qua từng layer

### Layer 1: Frontend UI

File:

```txt
frontend/src/components/shared/FloatingAIChatbot.tsx
```

Nhiệm vụ:

- Nhận input của user.
- Lưu message để hiển thị trong chat widget.
- Chỉ gửi lại lịch sử tin nhắn của user, không gửi assistant history.
- Render text response, product card và order card.

### Layer 2: Frontend API service

File:

```txt
frontend/src/services/chat.service.ts
```

Nhiệm vụ:

- Gửi `POST /chat`.
- Đính kèm `clientMessageId`.
- Chuẩn hóa response mặc định:
  - `recommendedProducts || []`
  - `orderCards || []`

### Layer 3: Route và optional auth

File:

```txt
backend/src/routes/chat.route.ts
```

Flow:

```ts
chatRoutes.post("/", optionalAuthenticate, handleChat);
```

Nếu có token hợp lệ, middleware gắn `req.userId`. Nếu không có token, user vẫn chat được ở chế độ guest.

### Layer 4: Zod validation

File:

```txt
backend/src/validators/chat.validator.ts
```

Nhiệm vụ:

- Validate body.
- Chặn history role không hợp lệ.
- Giới hạn độ dài message/history.
- Validate `storeId`.

### Layer 5: Controller orchestration

File:

```txt
backend/src/controllers/chat.controller.ts
```

Controller thực hiện:

1. Tạo `ChatRequestContext` với `traceId` và deadline.
2. Gắn listener abort nếu client đóng request.
3. Validate request.
4. Rate limit theo user/IP.
5. Guard no-budget.
6. Gọi intent router.
7. Xử lý response static hoặc deterministic domain nếu có.
8. Load `preferences` tối thiểu của user nếu đã đăng nhập.
9. Gọi `getAIResponseForChat`.
10. Verify `recommendedProductIds` bằng allowlist.
11. Query lại product thật từ MongoDB.
12. Áp campaign pricing.
13. Enforce budget nếu có.
14. Trả response về frontend.
15. Enqueue preference extraction sau response.
16. Release concurrency key trong `finally`.

### Layer 6: Intent router

File:

```txt
backend/src/services/chatbot.service.ts
```

Intent hiện tại:

- `GREETING`
- `MENU_SEARCH`
- `ALLERGY_SAFE_RECOMMENDATION`
- `ORDER_STATUS`
- `DELIVERY_FEE`
- `PROMOTION`
- `DISCOUNTED_PRODUCTS`
- `STORE_HOURS`
- `OUT_OF_SCOPE`
- `JAILBREAK`

Flow:

1. Rule-based classifier chạy trước.
2. Nếu chưa chắc, fallback sang Groq intent model.
3. Output được validate bằng Zod.
4. Nếu lỗi, fallback về `MENU_SEARCH`.

### Layer 7: Deterministic domain responder

File:

```txt
backend/src/services/chat-domain-response.service.ts
```

Hiện xử lý deterministic cho:

- Campaign/khuyến mãi.
- Voucher khả dụng của user.
- Store/giờ mở cửa/chi nhánh.

Order không còn xử lý ở layer này. Order đi qua tool-calling để LLM điền filter có schema.

### Layer 8: Chatbot service và tool-calling

File:

```txt
backend/src/services/chatbot.service.ts
```

Nhiệm vụ:

- Xây dựng search plan.
- Chạy deterministic search fast-path cho các câu rõ.
- Gọi Groq tool-calling cho câu phức tạp.
- Execute tool bằng code backend.
- Validate final JSON từ Groq.
- Trả `message`, `recommendedProductIds`, `allowlistIds`, `budgetVnd`, `orderCards`.

Tool hiện có:

- `search_products`
- `search_allergy_safe_products`
- `get_product_details`
- `get_active_campaigns`
- `get_hot_products`
- `get_user_vouchers`
- `get_user_order_history`
- `get_store_list`
- `check_product_store_availability`

### Layer 9: Database và business safety

Backend query MongoDB qua các model:

- `ProductModel`
- `OrderModel`
- `CampaignModel`
- `UserVoucherModel`
- `StoreModel`
- `StoreSettingsModel`
- `UserModel`

Các query chính có:

- Scope theo user/store khi cần.
- `.lean()` cho read-only.
- `limit`.
- `maxTimeMS`.
- Projection/select field cần thiết.

### Layer 10: Background queue

File:

```txt
backend/src/jobs/chat-preference-queue.ts
```

Sau khi response đã trả về, controller enqueue job để trích xuất sở thích ăn uống từ message. Job này không block API chatbot.

---

## 4. Kỹ thuật được áp dụng

### Zod validation

Dùng để validate:

- Request body.
- Intent JSON từ Groq.
- Final JSON response từ Groq.
- Order tool arguments.
- Preference extraction result.

### Optional authentication

API hỗ trợ cả guest và logged-in user. User id luôn lấy từ auth middleware, không lấy từ body hoặc từ LLM.

### Redis rate limiting

Áp dụng 3 lớp giới hạn:

- Daily limit.
- Burst limit.
- Concurrency guard.

Giới hạn hiện tại:

| Actor | Daily | Burst | Concurrent |
|---|---:|---:|---:|
| Guest | 5/ngày | 3/phút | 1 |
| User | 20/ngày | 6/phút | 2 |

### Global deadline và timeout

Mỗi request có deadline mặc định khoảng 12 giây, cấu hình bằng `CHAT_REQUEST_DEADLINE_MS`. Các call AI/database quan trọng được bọc timeout để tránh treo request.

Các timeout có thể tune bằng env:

| Env | Default |
|---|---:|
| `CHAT_REQUEST_DEADLINE_MS` | `12000` |
| `CHAT_INTENT_TIMEOUT_MS` | `3000` |
| `CHAT_SEMANTIC_PLANNER_TIMEOUT_MS` | `1500` |
| `CHAT_EMBEDDING_TIMEOUT_MS` | `4000` |
| `CHAT_COMPLETION_TIMEOUT_MS` | `6000` |

### Intent routing

Classifier chia message thành nhóm nghiệp vụ trước khi quyết định:

- Trả static response.
- Trả deterministic domain response.
- Đi vào chatbot service/tool-calling.

### Deterministic response

Một số câu đơn giản không cần LLM:

- Greeting.
- Delivery fee: đọc `SettingsModel` và trả chính sách hiện tại theo công thức checkout, không hardcode range phí.
- No-budget guardrail.
- Campaign.
- Voucher.
- Store/giờ mở cửa.
- Out-of-scope.
- Jailbreak.

### LLM tool-calling

Groq được dùng để chọn tool và điền tham số cho các câu phức tạp. Backend execute tool, không để LLM tự query database.

Tối ưu latency hiện tại:

- Các intent rõ như greeting, delivery fee, no-budget, promotion, voucher, discounted products, store-hours không gọi LLM chat.
- `ORDER_STATUS` vẫn dùng Groq tool-calling để tự điền `statuses/limit`, nhưng bỏ semantic planner vì order không cần product search plan.
- Gợi ý/tìm món thông thường đi thẳng qua deterministic product search và trả card UI, không gọi Groq tool selection/final wording.
- Chỉ giữ tool-calling cho câu hỏi cần suy luận tool chi tiết: trạng thái đơn, thành phần/dị ứng/giá/rating của món cụ thể, còn hàng ở chi nhánh.

System prompt hiện được tổ chức theo ma trận chọn tool:

- `DISCOUNTED_PRODUCTS` hoặc câu hỏi món đang sale -> `get_active_campaigns`, trả product-level answer.
- `ORDER_STATUS` -> `get_user_order_history`.
- Câu hỏi chi tiết món/thành phần/dị ứng/rating/giá -> `get_product_details`.
- Gợi ý món an toàn dị ứng/sức khỏe -> `search_allergy_safe_products`.
- Gợi ý/tìm món thường -> `search_products`.
- Món hot/bán chạy -> `get_hot_products`.
- Còn hàng ở chi nhánh -> `check_product_store_availability`.

### Chính sách phí giao hàng

Phí giao hàng không phải là rule tĩnh kiểu "dưới 2km miễn phí". Hệ thống hiện tính phí theo cùng logic checkout:

```txt
fee = round((baseDeliveryFee + feePerKm * distanceKm) / 2)
```

- `baseDeliveryFee`, `feePerKm`, `freeDeliveryEnabled`, `freeDeliveryThreshold` lấy từ `SettingsModel`.
- Nếu chưa có settings trong DB, backend/frontend fallback theo default hiện tại: `baseDeliveryFee=25.000đ`, `feePerKm=5.000đ/km`, `freeDeliveryThreshold=150.000đ`, `freeDeliveryEnabled=true`.
- Nếu `freeDeliveryEnabled=true` và subtotal đạt `freeDeliveryThreshold`, phí giao hàng là `0đ`.
- Backend tự tính lại phí khi tạo đơn bằng địa chỉ giao hàng, ward/city được hỗ trợ và chi nhánh được chọn; không tin `shippingFee` do frontend gửi lên.
- Chatbot chỉ trả policy/ước lượng cách tính. Phí chính xác cần địa chỉ giao hàng và chi nhánh tại checkout.

### Structured output validation

Groq final response phải là JSON:

```ts
{
  message: string;
  recommendedProductIds: string[];
}
```

Backend validate lại trước khi dùng.

### Tool argument validation

Ví dụ `get_user_order_history`:

```ts
{
  statuses?: string[];
  limit?: number;
}
```

Backend validate:

- `statuses` phải nằm trong enum `OrderStatus`.
- `limit` từ 1 đến 5.
- Query luôn scope theo `cusId`.

### Hybrid product search

Search sản phẩm kết hợp:

- Atlas lexical search.
- Gemini embedding.
- Atlas Vector Search.
- RRF fusion.

Nếu vector search lỗi, fallback lexical-only. Nếu Atlas Search lỗi, fallback `$text` hoặc top products nhẹ.

### Allergy safety filtering

Backend lọc dị ứng bằng code dựa trên:

- `allergenTags`
- `mayContain`
- `crossContaminationRisk`
- `recipe[].name`
- `ALLERGEN_CATALOG.aliases`

LLM không quyết định món nào an toàn dị ứng.

### Product detail tool

`get_product_details` là tool read-only để chatbot trả lời các câu hỏi về một món cụ thể:

- thành phần
- allergen tags
- may contain
- nguy cơ nhiễm chéo
- health tags
- rating/review count
- mô tả và giá

Tool nhận `productId` nếu đã biết, hoặc `query` tên món nếu chưa biết ID. Backend tự search, giới hạn tối đa 3 món, lọc theo store nếu có `storeId`, và chỉ trả dữ liệu rút gọn.

### Allowlist verification

LLM chỉ có thể recommend product ID nằm trong allowlist do backend tạo. Controller verify lại trước khi trả `recommendedProducts`.

### Server-side pricing và budget enforcement

Backend:

- Query lại product thật.
- Áp `applyCampaignPricing`.
- Nếu có `budgetVnd`, lọc danh sách sao cho tổng không vượt ngân sách.

LLM không quyết định giá cuối.

### UI structured response

Response tách text và UI data:

- `response`: text.
- `recommendedProducts`: card món ăn.
- `orderCards`: card đơn hàng.

### Background job queue

BullMQ + Redis xử lý preference extraction sau response để API chat không bị chậm.

### Observability nhẹ

Log theo stage với:

- `traceId`
- elapsed time
- remaining time
- intent
- recommended count
- order card count

Không log raw sensitive data.

---

## 5. Vai trò của Groq và Gemini

### Groq

Groq là LLM chính trong realtime chat flow.

Groq phụ trách:

- Intent fallback classifier.
- Semantic planner.
- Tool selection.
- Final JSON wording.

Nếu câu hỏi cần AI diễn đạt câu trả lời cuối, Groq là LLM viết final response.

### Gemini

Gemini không phải LLM trả lời cuối trong chat realtime.

Gemini hiện dùng cho:

- Embedding trong semantic/vector search.
- Background preference extraction sau khi response đã trả về.

Ví dụ preference extraction:

User nói:

```txt
tôi thích món cay, ít dầu mỡ
```

Sau khi chatbot trả lời xong, backend enqueue job. Gemini đọc message này và trích xuất:

```json
["cay", "ít dầu mỡ"]
```

Kết quả được validate rồi merge vào `user.preferences.tastes` để lần sau gợi ý món hợp khẩu vị hơn.

---

## 6. Flow order status

Order status hiện dùng LLM tool-calling, không dùng deterministic regex status filter.

Flow:

1. User hỏi: "các đơn hàng chưa được giao".
2. Controller validate và lấy `userId` từ auth.
3. Intent router phân loại `ORDER_STATUS`.
4. Domain responder bỏ qua order.
5. Chatbot service gọi Groq tool selection.
6. Groq chọn `get_user_order_history`.
7. Groq điền `statuses` và `limit`.
8. Backend validate args bằng Zod.
9. Backend query:

```ts
{
  cusId: userContext.userId,
  status?: { $in: validatedStatuses }
}
```

10. Backend build `orderCards`.
11. Groq viết final JSON nếu còn chạy bình thường.
12. Nếu Groq final response lỗi sau khi tool đã chạy, backend fallback bằng `buildOrderToolFallbackResponse`.
13. Frontend render order card.

LLM không được:

- Truyền user id.
- Quyết định quyền xem đơn.
- Sửa trạng thái đơn.
- Sửa payment.
- Lấy quá 5 đơn.

---

## 7. Flow product recommendation

Flow gợi ý món:

1. User hỏi món, combo, ngân sách hoặc nhu cầu sức khỏe.
2. `parseChatSearchPlan`/semantic planner tạo search plan.
3. Backend search sản phẩm.
4. Backend lọc theo store nếu có `storeId`.
5. Backend lọc food/drink boundary:
   - Câu hỏi món ăn/đồ ăn/sức khỏe không trả đồ uống hoặc tráng miệng.
   - Chỉ trả đồ uống khi user hỏi rõ đồ uống/nước uống/giải khát.
6. Backend lọc health/trait:
   - `sức khỏe`, `tốt cho sức khỏe`, `lành mạnh`, `healthy`, `ăn kiêng`, `thanh đạm` -> `healthNeeds: healthy`.
   - Ưu tiên category `Góc Healthy & Ăn Kiêng`, `healthTags`, rau củ/salad/ức gà/ít dầu.
   - Nếu nhóm healthy quá hẹp hoặc bị dị ứng loại hết, backend mở rộng sang món ăn khác nhưng vẫn giữ allergy hard filter.
7. Backend lọc dị ứng.
8. Nếu user hỏi đích danh một món bị dị ứng:
   - Backend không đưa món đó vào allowlist/card.
   - Backend trả safety notice nói rõ không gợi ý món đó vì xung đột hồ sơ dị ứng.
   - Backend không tự trả list món thay thế; chỉ gợi ý thay thế khi user hỏi rõ.
   - Controller giữ nguyên safety notice, không đổi sang câu card-only chung.
9. Short exact request như `tôi muốn cơm gà` cũng được xử lý như targeted request:
   - Nếu query nhắc allergen trong hồ sơ user, backend phải cảnh báo.
   - Nếu an toàn và match được món, backend chỉ trả tối đa 1 product card phù hợp nhất.
10. Nếu user hỏi đích danh một món và món đó an toàn, backend chỉ trả tối đa 1 product card đúng món đó.
11. Backend tạo allowlist.
12. Groq chỉ được recommend ID trong allowlist.
13. Controller verify ID.
14. Controller áp campaign price.
15. Controller enforce budget.
16. Frontend render product card.

---

## 8. Flow campaign, voucher, store

### Campaign

Hiện có thể đi qua:

- Deterministic domain responder cho câu hỏi danh sách chương trình/campaign.
- Tool `get_active_campaigns` nếu câu hỏi đi vào chatbot service.

Deterministic query:

- Campaign approved.
- `startTime <= now`.
- `endTime >= now`.
- Limit 5.

Nếu user hỏi theo hướng product-level như:

- "các món nào đang giảm giá"
- "món ăn đang sale"
- "món nào có giá ưu đãi"

Intent nên được phân loại thành `DISCOUNTED_PRODUCTS`, không để trả nhầm danh sách campaign hoặc rơi về menu search. Flow đúng hiện tại là deterministic sale route:

1. Controller chạy fast-path `isDiscountedProductsQuestion(message)` trước khi gọi Groq intent classifier.
2. Intent được ép về `DISCOUNTED_PRODUCTS` nếu câu hỏi có nghĩa là món/sản phẩm/thực đơn đang giảm giá, sale hoặc giá ưu đãi.
3. `buildDeterministicDomainResponse` xử lý trực tiếp intent này, không phụ thuộc LLM tool-calling.
4. Backend query active campaign, populate `products.productId`, tính `salePrice` từ `fixedPrice` hoặc `% discount`.
5. Backend chỉ giữ sản phẩm thật sự có `salePrice < originalPrice`.
6. Response trả `recommendedProducts` đã enrich: `price`, `originalPrice`, `discountPercentage`, `campaignName`, `campaignEndTime`.
7. Frontend chatbot render sale card: giá sale, giá gốc gạch ngang, badge phần trăm giảm, campaign và ngày kết thúc.

### Voucher

Hiện có thể đi qua:

- Deterministic domain responder.
- Tool `get_user_vouchers`.

Điểm an toàn:

- Query theo `userId` từ auth/userContext.
- Chỉ lấy `status: "available"`.
- Không cho LLM/client truyền user id.

### Store

Hiện có thể đi qua:

- Deterministic domain responder.
- Tool `get_store_list`.

Nếu có `storeId`, backend ưu tiên lấy store/settings của store đó. Nếu không có, list tối đa 5 store active.

Ghi chú: campaign/voucher/store hiện vẫn còn deterministic route và có regex nhỏ để phân nhánh. Nếu muốn giảm regex triệt để, nên chuyển các domain này sang tool-calling schema giống order.

---

## 9. Guardrails bảo mật và dữ liệu

Chatbot hiện áp dụng các guardrails:

- Không nhận user id từ body.
- Không gửi token/cookie/password/payment payload sang AI provider.
- Không log raw sensitive data.
- Không để AI tự quyết định payment/order/security.
- Không để AI trả product ID ngoài allowlist.
- Không để AI quyết định giá.
- Không để AI query order ngoài `cusId` hiện tại.
- Không gửi assistant history từ client lên backend.
- Giới hạn request bằng Redis.
- Giới hạn tool result và query result bằng `limit`.

---

## 10. Hạn chế hiện tại

Các hạn chế còn tồn tại:

- Intent router vẫn có rule-based regex classifier cho nhóm lớn.
- Campaign/voucher/store vẫn có regex nhỏ trong domain responder.
- Campaign/voucher/store chưa có tool args schema giàu như order.
- History canonical server-side chưa được lưu bằng conversation store.
- Observability mới là log JSON nhẹ, chưa có OpenTelemetry/Prometheus.
- `AbortSignal` có trong context nhưng SDK bên dưới có thể chưa hủy HTTP request thật sự.
- Product health metadata vẫn phụ thuộc dữ liệu hiện có.

---

## 11. Đề xuất nâng cấp tiếp theo

Để kiến trúc sạch hơn và nhất quán với hướng tool-calling:

1. Chuyển campaign/voucher/store sang tool schema:

```ts
get_active_campaigns({ activeOnly: boolean, limit: number })
get_user_vouchers({ status: "available" | "used" | "expired", limit: number })
get_store_list({ district?: string, openNow?: boolean, limit: number })
get_store_hours({ storeId?: string })
```

2. Giảm rule-based intent router, chỉ giữ guardrail cực rõ:

- jailbreak
- greeting
- no-budget

3. Thêm conversation store server-side nếu cần context dài hơn.

4. Thêm metric dashboard cho:

- latency
- timeout
- rate limit hit
- tool call count
- fallback count
- order card count
- recommendation count

5. Chuẩn hóa UI card cho campaign/voucher/store nếu muốn chatbot trả về nhiều dạng card hơn.

6. Các tool có thể cân nhắc thêm nhưng chưa nên mở vội:

- `get_product_reviews`: read-only, hữu ích cho câu "món này đánh giá sao".
- `get_cart_summary`: chỉ đọc giỏ hàng của user hiện tại, nhưng cần cân nhắc riêng tư và wording để không biến thành checkout action.
- `get_membership_status`: chỉ đọc hạng/điểm, hữu ích cho voucher/reward, nhưng cần scope user chặt.
- Không mở tool tạo/sửa order, payment, cart mutation, voucher redeem hoặc admin/staff action cho LLM.

---

## 12. File liên quan

- `backend/src/routes/chat.route.ts`
- `backend/src/controllers/chat.controller.ts`
- `backend/src/validators/chat.validator.ts`
- `backend/src/services/chatbot.service.ts`
- `backend/src/services/chat-domain-response.service.ts`
- `backend/src/services/chat-rate-limit.service.ts`
- `backend/src/services/chat-deadline.service.ts`
- `backend/src/services/chat-observability.service.ts`
- `backend/src/services/ai-model-registry.service.ts`
- `backend/src/jobs/chat-preference-queue.ts`
- `backend/src/services/chat-query-planner.service.ts`
- `frontend/src/services/chat.service.ts`
- `frontend/src/components/shared/FloatingAIChatbot.tsx`
