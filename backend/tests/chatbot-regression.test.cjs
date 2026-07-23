const test = require('node:test');
const assert = require('node:assert/strict');

const requiredEnv = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:5173',
  AUTH_JWT_SECRET: 'test-access-secret',
  AUTH_JWT_REFRESH_SECRET: 'test-refresh-secret',
  MONGODB_URI: 'mongodb://localhost:27017/foa-test',
  GOOGLE_APP_USER: 'test@example.com',
  GOOGLE_APP_PASSWORD: 'test-password',
  GOOGLE_CLIENT_ID: 'test-client-id',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-cloud-key',
  CLOUDINARY_API_SECRET: 'test-cloud-secret',
  GEMINI_API_KEY: 'test-gemini-key',
  GROQ_API_KEY: 'test-groq-key',
  PAYOS_CLIENT_ID: 'test-payos-client',
  PAYOS_API_KEY: 'test-payos-key',
  PAYOS_CHECKSUM_KEY: 'test-payos-checksum',
};

for (const [key, value] of Object.entries(requiredEnv)) {
  process.env[key] ||= value;
}

const { chatRequestValidator } = require('../dist/validators/chat.validator');
const {
  buildAllergyBlockedProductNotice,
  getMentionedUserAllergyLabels,
  isDiscountedProductsQuestion,
  isExactProductRequest,
  isNoBudgetQuestion,
  isPromotionDomainQuestion,
  productMatchesSpecificChatQuery,
} = require('../dist/services/chatbot.service');
const { buildDeterministicDomainResponse } = require('../dist/services/chat-domain-response.service');
const { createChatRequestContext } = require('../dist/services/chat-deadline.service');
const { parseChatSearchPlan } = require('../dist/services/chat-query-planner.service');
const { applyCampaignPricing } = require('../dist/services/product.service');
const { calculateShippingFee } = require('../dist/services/order.service');
const { CampaignModel } = require('../dist/models/campaign.model');
const { SettingsModel } = require('../dist/models');

const ORIGINAL_CAMPAIGN_FIND = CampaignModel.find;
const ORIGINAL_SETTINGS_FIND_ONE = SettingsModel.findOne;
const REQUIRED_EVAL_AREAS = new Set([
  'intent',
  'validator',
  'discounted-products',
  'promotion',
  'no-budget',
  'food-drink-boundary',
  'health-search',
  'allergy-specific-request',
  'shipping',
  'timeout',
  'pricing',
  'response-quality',
]);
const coveredEvalAreas = new Set();

const cover = (area) => coveredEvalAreas.add(area);

const queryChain = (value) => ({
  select() { return this; },
  populate() { return this; },
  sort() { return this; },
  limit() { return this; },
  lean() { return this; },
  maxTimeMS() { return Promise.resolve(value); },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const withMockedCampaigns = async (campaigns, fn) => {
  CampaignModel.find = () => queryChain(campaigns);
  try {
    await fn();
  } finally {
    CampaignModel.find = ORIGINAL_CAMPAIGN_FIND;
  }
};

const withMockedSettings = async (settings, fn) => {
  SettingsModel.findOne = () => queryChain(settings);
  try {
    await fn();
  } finally {
    SettingsModel.findOne = ORIGINAL_SETTINGS_FIND_ONE;
  }
};

const product = (id, overrides = {}) => ({
  _id: id,
  name: overrides.name || `Món ${id.slice(-4)}`,
  price: overrides.price || 40000,
  description: overrides.description || 'Mô tả món ăn test',
  image: overrides.image || '',
  category: overrides.category || 'Cơm Đĩa Truyền Thống',
  isAvailable: overrides.isAvailable ?? true,
  storeAvailability: overrides.storeAvailability || [],
});

const saleCampaign = (overrides = {}) => ({
  _id: overrides._id || '64f000000000000000000001',
  name: overrides.name || 'Flash Sale Test',
  type: overrides.type || 'discount',
  status: 'approved',
  startTime: overrides.startTime || new Date('2026-07-01T00:00:00.000Z'),
  endTime: overrides.endTime || new Date('2026-08-01T00:00:00.000Z'),
  products: overrides.products || [],
});

const evaluateSaleAnswer = (result) => {
  cover('response-quality');
  assert.equal(typeof result.response, 'string');
  assert.match(result.response, /ưu đãi|giảm giá|sale/i);
  assert.doesNotMatch(result.response, /phù hợp nhất/i);
  assert.ok(Array.isArray(result.recommendedProducts));
  assert.ok(result.recommendedProducts.length > 0);

  for (const card of result.recommendedProducts) {
    assert.equal(typeof card._id, 'string');
    assert.equal(typeof card.name, 'string');
    assert.ok(card.originalPrice > card.price, 'sale card phải có giá sale nhỏ hơn giá gốc');
    assert.ok(card.discountPercentage > 0, 'sale card phải có phần trăm giảm');
    assert.equal(typeof card.campaignName, 'string');
    assert.ok(card.campaignEndTime, 'sale card phải có ngày kết thúc campaign');
    assert.ok(!result.response.includes(card.name), 'message không nên lặp tên món vì card đã render chi tiết');
  }
};

test('intent detector nhận đúng các câu hỏi product-level đang giảm giá', () => {
  cover('intent');
  const positives = [
    'món nào trong hệ thống đang được giảm giá',
    'mon nao trong he thong dang duoc giam gia',
    'các món đang khuyến mãi',
    'món nào đang sale',
    'món giảm giá',
    'sản phẩm nào có giá ưu đãi',
  ];

  for (const message of positives) {
    assert.equal(isDiscountedProductsQuestion(message), true, message);
  }
});

test('intent detector không bắt nhầm voucher/campaign policy thành discounted products', () => {
  cover('intent');
  const negatives = [
    'tôi có voucher nào',
    'có chương trình khuyến mãi nào đang chạy',
    'chiến dịch nào đang hoạt động',
    'gợi ý món healthy ít béo',
  ];

  for (const message of negatives) {
    assert.equal(isDiscountedProductsQuestion(message), false, message);
  }
});

test('promotion detector nhận voucher/campaign nhưng không bắt nhầm product sale', () => {
  cover('promotion');
  const positives = [
    'có chương trình khuyến mãi nào đang chạy',
    'chiến dịch nào đang hoạt động',
    'tôi có voucher nào',
    'ưu đãi nào đang chạy',
  ];

  for (const message of positives) {
    assert.equal(isPromotionDomainQuestion(message), true, message);
  }

  assert.equal(isPromotionDomainQuestion('món nào đang được giảm giá'), false);
});

test('no-budget detector nhận các biến thể không có ngân sách', () => {
  cover('no-budget');
  const positives = [
    'tôi chưa có ngân sách để đặt món',
    'mình không có tiền',
    'ví rỗng rồi có món nào không',
    'ngân sách 0đ',
  ];

  for (const message of positives) {
    assert.equal(isNoBudgetQuestion(message), true, message);
  }

  assert.equal(isNoBudgetQuestion('tôi có 50k muốn ăn cơm'), false);
});

test('search planner hiểu món ăn là food-only, không phải đồ uống', () => {
  cover('food-drink-boundary');
  const plan = parseChatSearchPlan('còn các món ăn thì sao');

  assert.equal(plan.requiresFood, true);
  assert.equal(plan.requiresDrink, false);
});

test('search planner hiểu tiếng Việt sức khỏe là nhu cầu healthy', () => {
  cover('health-search');
  const plan = parseChatSearchPlan('hãy gợi ý cho tôi các món ăn tốt cho sức khỏe của tôi');

  assert.equal(plan.requiresFood, true);
  assert.equal(plan.requiresDrink, false);
  assert.ok(plan.healthNeeds.includes('healthy'));
  assert.equal(plan.preferredCategory, 'Góc Healthy & Ăn Kiêng');
  assert.match(plan.expandedQuery, /sức khỏe|healthy|lành mạnh/i);
});

test('allergy safety notice giữ cảnh báo khi món cụ thể bị loại do dị ứng', () => {
  cover('allergy-specific-request');
  const plan = parseChatSearchPlan('tôi muốn món cơm gà xối mỡ');
  const typoPlan = parseChatSearchPlan('tôi muốn món cơm gạo lức');
  const shortChickenPlan = parseChatSearchPlan('tôi muốn cơm gà');

  assert.equal(isExactProductRequest(plan), true);
  assert.equal(isExactProductRequest(typoPlan), true);
  assert.equal(isExactProductRequest(shortChickenPlan), true);
  assert.equal(isExactProductRequest(parseChatSearchPlan('gợi ý vài món cơm ngon')), false);
  assert.equal(productMatchesSpecificChatQuery({ name: 'Cơm Gà Xối Mỡ Nhúng Mắm' }, plan), true);
  assert.equal(productMatchesSpecificChatQuery({ name: 'Cơm Thố Xá Xíu' }, plan), false);
  assert.equal(productMatchesSpecificChatQuery({ name: 'Cơm Gạo Lứt Hấp Rau Củ & Nấm' }, typoPlan), true);
  assert.equal(productMatchesSpecificChatQuery({ name: 'Cơm Thố Xá Xíu' }, typoPlan), false);
  assert.deepEqual(getMentionedUserAllergyLabels(shortChickenPlan, ['chicken']), ['Thịt gà']);

  const notice = buildAllergyBlockedProductNotice([
    {
      id: '64f100000000000000000050',
      name: 'Cơm Gà Xối Mỡ Nhúng Mắm',
      allergies: ['Thịt gà'],
    },
  ]);

  assert.match(notice, /không gợi ý/i);
  assert.match(notice, /Cơm Gà Xối Mỡ Nhúng Mắm/);
  assert.match(notice, /Thịt gà/);
  assert.doesNotMatch(notice, /hiển thị các món thay thế/i);
});

test('chat request validator giữ API contract an toàn', () => {
  cover('validator');
  const valid = chatRequestValidator.safeParse({
    message: 'gợi ý món cho tôi',
    clientMessageId: 'msg-1',
    storeId: '60c72b2f9b1d8b2a3c8b456b',
    fulfillmentType: 'delivery',
    history: [{ role: 'user', content: 'xin chào' }],
  });

  assert.equal(valid.success, true);
  assert.equal(valid.data.locale, 'vi-VN');
  assert.equal(valid.data.timezone, 'Asia/Ho_Chi_Minh');

  const assistantHistory = chatRequestValidator.safeParse({
    message: 'test',
    history: [{ role: 'assistant', content: 'không hợp lệ' }],
  });
  assert.equal(assistantHistory.success, false);

  const invalidStore = chatRequestValidator.safeParse({
    message: 'test',
    storeId: 'not-object-id',
  });
  assert.equal(invalidStore.success, false);
});

test('chat deadline default đủ rộng cho flow AI nhưng vẫn có chặn treo request', () => {
  cover('timeout');
  const context = createChatRequestContext();

  assert.equal(context.deadlineAt - context.startedAt, 12000);
});

test('chat deadline có thể override cho từng request khi cần smoke test nhanh', () => {
  cover('timeout');
  const context = createChatRequestContext(3000);

  assert.equal(context.deadlineAt - context.startedAt, 3000);
});

test('DISCOUNTED_PRODUCTS trả sale cards từ campaign active và không lặp text/card', async () => {
  cover('discounted-products');
  const storeId = '60c72b2f9b1d8b2a3c8b456b';
  const products = [
    {
      productId: product('64f100000000000000000001', {
        name: 'Cơm Ba Chỉ Rang Cháy Cạnh',
        price: 40000,
        storeAvailability: [{ storeId, status: 'active' }],
      }),
      discount: 15,
      fixedPrice: null,
    },
    {
      productId: product('64f100000000000000000002', {
        name: 'Flan Caramel Đắng',
        price: 25000,
        storeAvailability: [{ storeId, status: 'active' }],
      }),
      fixedPrice: null,
      discount: 28,
    },
    {
      productId: product('64f100000000000000000003', {
        name: 'Món Không Sale',
        price: 45000,
        storeAvailability: [{ storeId, status: 'active' }],
      }),
      fixedPrice: null,
      discount: null,
    },
    {
      productId: product('64f100000000000000000004', {
        name: 'Món Tạm Ẩn',
        price: 45000,
        isAvailable: false,
        storeAvailability: [{ storeId, status: 'active' }],
      }),
      discount: 20,
    },
  ];

  await withMockedCampaigns([saleCampaign({ products })], async () => {
    const result = await buildDeterministicDomainResponse({
      intent: 'DISCOUNTED_PRODUCTS',
      message: 'món nào trong hệ thống đang được giảm giá',
      storeId,
    });

    assert.ok(result);
    evaluateSaleAnswer(result);
    assert.deepEqual(
      result.recommendedProducts.map((item) => item.name),
      ['Cơm Ba Chỉ Rang Cháy Cạnh', 'Flan Caramel Đắng']
    );
  });
});

test('DISCOUNTED_PRODUCTS trả empty state khi không có món sale thật', async () => {
  cover('discounted-products');
  await withMockedCampaigns([
    saleCampaign({
      products: [
        { productId: product('64f100000000000000000010', { price: 40000 }), fixedPrice: 45000 },
        { productId: product('64f100000000000000000011', { price: 40000 }), discount: null },
      ],
    }),
  ], async () => {
    const result = await buildDeterministicDomainResponse({
      intent: 'DISCOUNTED_PRODUCTS',
      message: 'món giảm giá',
    });

    assert.ok(result);
    assert.match(result.response, /chưa thấy món nào/i);
    assert.deepEqual(result.recommendedProducts, []);
  });
});

test('PROMOTION vẫn trả danh sách campaign, không nhầm sang product sale cards', async () => {
  cover('promotion');
  await withMockedCampaigns([
    saleCampaign({
      name: 'Khuyến Mãi Cuối Tuần',
      products: [{ productId: product('64f100000000000000000020'), discount: 20 }],
    }),
  ], async () => {
    const result = await buildDeterministicDomainResponse({
      intent: 'PROMOTION',
      message: 'có chương trình khuyến mãi nào đang chạy',
    });

    assert.ok(result);
    assert.match(result.response, /Các chương trình đang hoạt động/i);
    assert.match(result.response, /Khuyến Mãi Cuối Tuần/i);
    assert.deepEqual(result.recommendedProducts, []);
  });
});

test('applyCampaignPricing gắn giá sale và metadata campaign từ backend', async () => {
  cover('pricing');
  await withMockedCampaigns([
    saleCampaign({
      name: 'Campaign Giá Chuẩn',
      endTime: new Date('2026-08-02T00:00:00.000Z'),
      products: [
        { productId: '64f100000000000000000030', discount: 25 },
      ],
    }),
    saleCampaign({
      name: 'Campaign Fixed Price',
      type: 'fixed_price',
      endTime: new Date('2026-08-03T00:00:00.000Z'),
      products: [
        { productId: '64f100000000000000000031', fixedPrice: 22000 },
      ],
    }),
  ], async () => {
    const priced = await applyCampaignPricing([
      { _id: '64f100000000000000000030', price: 40000, name: 'Món giảm phần trăm' },
      { _id: '64f100000000000000000031', price: 50000, name: 'Món fixed price' },
      { _id: '64f100000000000000000032', price: 60000, name: 'Món thường' },
    ]);

    assert.equal(priced[0].campaignPrice, 30000);
    assert.equal(priced[0].campaignName, 'Campaign Giá Chuẩn');
    assert.equal(priced[0].campaignDiscount, 25);
    assert.equal(priced[1].campaignPrice, 22000);
    assert.equal(priced[1].campaignName, 'Campaign Fixed Price');
    assert.equal(priced[1].campaignFixedPrice, 22000);
    assert.equal(priced[2].isCampaignRunning, false);
  });
});

test('shipping fee tính theo settings, khoảng cách và ngưỡng freeship server-side', async () => {
  cover('shipping');
  await withMockedSettings({
    baseDeliveryFee: '25000',
    feePerKm: '5000',
    freeDeliveryEnabled: true,
    freeDeliveryThreshold: '150000',
  }, async () => {
    const inner = await calculateShippingFee('Hải Châu', 'Đà Nẵng', 100000);
    assert.equal(inner.blocked, false);
    assert.equal(inner.distance, 2);
    assert.equal(inner.fee, 17500);

    const outer = await calculateShippingFee('Hòa Xuân', 'Đà Nẵng', 100000);
    assert.equal(outer.blocked, false);
    assert.equal(outer.distance, 5);
    assert.equal(outer.fee, 25000);

    const free = await calculateShippingFee('Hải Châu', 'Đà Nẵng', 150000);
    assert.equal(free.blocked, false);
    assert.equal(free.fee, 0);

    const outside = await calculateShippingFee('Bến Nghé', 'TP.HCM', 200000);
    assert.equal(outside.blocked, true);
    assert.match(outside.reason || '', /Đà Nẵng/i);
  });
});

test('chatbot regression matrix bao phủ ít nhất 80% nhóm rủi ro đã định nghĩa', () => {
  const coverageRatio = coveredEvalAreas.size / REQUIRED_EVAL_AREAS.size;
  assert.ok(
    coverageRatio >= 0.8,
    `Regression matrix mới bao phủ ${(coverageRatio * 100).toFixed(0)}%, cần >= 80%`
  );
});
