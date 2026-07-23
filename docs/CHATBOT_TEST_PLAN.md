# Chatbot Test Plan

Tai lieu nay mo ta bo test hoi quy cho AI Chatbot FOA va cach mo rong no khi them intent/tool moi.

## Muc tieu

- Chay duoc offline, khong goi Groq/Gemini that.
- Bat loi regression o cac layer quan trong: intent, validator, deterministic domain response, pricing, response contract.
- Danh gia chat response theo rule ro rang thay vi chi so sanh text tuyet doi.
- Dat toi thieu 80% coverage theo nhom rui ro chatbot da dinh nghia trong regression matrix.

## Cach chay

```bash
pnpm --filter backend test
```

Script nay se:

1. Build backend bang TypeScript.
2. Chay Node built-in test runner tren `backend/tests`.

Khong can Jest/Vitest va khong can network.

## Test pyramid cho chatbot

He thong chatbot thuong nen co cac lop test sau:

1. Unit tests
   - Normalize text.
   - Intent detector.
   - Query planner.
   - Response validator/evaluator.

2. Contract tests
   - API request schema.
   - Response schema.
   - Card payload fields.
   - Tool args schema.

3. Tool/domain tests voi mock database
   - Campaign/voucher/store/order query.
   - Allowlist product IDs.
   - Campaign price metadata.
   - Empty state.

4. Golden-set evaluation
   - Tap cau hoi mau theo intent.
   - Moi case co expected intent, required fields, forbidden text, card rules.
   - Khong nen assert nguyen van toan bo cau tra loi vi wording co the thay doi.

5. Safety tests
   - Jailbreak/out-of-scope.
   - Khong leak system prompt/API key.
   - Khong tin user id/order id/price tu client.
   - Khong de LLM tu quyet dinh order/payment/inventory.

6. Integration tests tuy chon
   - Chay voi seeded MongoDB test.
   - Mock AI provider hoac dung provider sandbox.
   - Nen chay nightly/CI rieng vi co the cham va flaky.

7. E2E/UI tests tuy chon
   - Chat widget render text.
   - Product sale card hien gia sale/gia goc/badge.
   - Order card click toi detail.

## Bo test hien tai

File:

```txt
backend/tests/chatbot-regression.test.cjs
```

Dang cover:

- Intent detector cho `DISCOUNTED_PRODUCTS`.
- Negative intent cases de khong bat nham voucher/campaign policy.
- Chat request validator.
- Deterministic sale response tu active campaign.
- Empty state khi khong co mon sale that.
- Promotion response khong tra nham product cards.
- `applyCampaignPricing` gắn `campaignPrice`, `campaignName`, `campaignEndTime`, `campaignDiscount`, `campaignFixedPrice`.
- Response quality evaluator de tranh loi lap text/card.

## Quy tac evaluator

Evaluator khong so sanh text tuyet doi. Thay vao do no kiem:

- Message dung domain, vi du sale phai noi ve uu dai/giam gia.
- Message khong dung wording sai, vi du sale khong noi "mon phu hop nhat".
- Message khong lap ten san pham neu frontend da render card.
- Sale card phai co `price < originalPrice`.
- Sale card phai co `discountPercentage`, `campaignName`, `campaignEndTime`.

## Cach them test case moi

Khi them intent/tool moi:

1. Them positive va negative intent cases.
2. Them mocked domain/tool response.
3. Them evaluator rule rieng cho response/card neu co.
4. Them empty/error state.
5. Neu la domain co quyen rieng, them case guest/user/store scope.
6. Cap nhat `REQUIRED_EVAL_AREAS` neu day la nhom rui ro moi.

## Khong nen lam

- Khong goi Groq/Gemini that trong regression test mac dinh.
- Khong ket noi MongoDB production/staging.
- Khong assert nguyen van toan bo response neu chi khac wording.
- Khong de test can `.env` secret that.
- Khong mock bang cach bo qua validation/allowlist, vi do la boundary an toan cua chatbot.
