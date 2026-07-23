const fs = require('node:fs');
const path = require('node:path');

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
  productMatchesSpecificChatQuery,
} = require('../dist/services/chatbot.service');
const { parseChatSearchPlan } = require('../dist/services/chat-query-planner.service');
const { buildDeterministicDomainResponse } = require('../dist/services/chat-domain-response.service');
const { applyCampaignPricing } = require('../dist/services/product.service');
const { calculateShippingFee } = require('../dist/services/order.service');
const { CampaignModel } = require('../dist/models/campaign.model');
const { SettingsModel } = require('../dist/models');

const ORIGINAL_CAMPAIGN_FIND = CampaignModel.find;
const ORIGINAL_SETTINGS_FIND_ONE = SettingsModel.findOne;
const reportPath = path.resolve(__dirname, '../../docs/CHATBOT_AI_EVALUATION_REPORT.md');

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
    return await fn();
  } finally {
    CampaignModel.find = ORIGINAL_CAMPAIGN_FIND;
  }
};

const withMockedSettings = async (settings, fn) => {
  SettingsModel.findOne = () => queryChain(settings);
  try {
    return await fn();
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

const grade = (earned, total, message) => ({ earned, total, message });

const runCase = async ({ id, group, weight, description, evaluate }) => {
  const startedAt = Date.now();
  try {
    const checks = await evaluate();
    const earned = checks.reduce((sum, item) => sum + item.earned, 0);
    const total = checks.reduce((sum, item) => sum + item.total, 0);
    const normalized = total > 0 ? (earned / total) * weight : 0;
    return {
      id,
      group,
      description,
      weight,
      earned: Number(normalized.toFixed(2)),
      status: normalized >= weight ? 'pass' : normalized > 0 ? 'partial' : 'fail',
      durationMs: Date.now() - startedAt,
      checks,
    };
  } catch (err) {
    return {
      id,
      group,
      description,
      weight,
      earned: 0,
      status: 'fail',
      durationMs: Date.now() - startedAt,
      checks: [grade(0, 1, err instanceof Error ? err.message : String(err))],
    };
  }
};

const evalCases = [
  {
    id: 'intent-discounted-positive',
    group: 'Intent routing',
    weight: 15,
    description: 'Nhận đúng các biến thể câu hỏi món/sản phẩm đang giảm giá.',
    evaluate: async () => {
      const messages = [
        'món nào trong hệ thống đang được giảm giá',
        'mon nao trong he thong dang duoc giam gia',
        'các món đang khuyến mãi',
        'món nào đang sale',
        'món giảm giá',
        'sản phẩm nào có giá ưu đãi',
      ];

      return messages.map((message) =>
        grade(isDiscountedProductsQuestion(message) ? 1 : 0, 1, message)
      );
    },
  },
  {
    id: 'intent-discounted-negative',
    group: 'Intent routing',
    weight: 10,
    description: 'Không bắt nhầm voucher/campaign policy hoặc gợi ý món thường thành món sale.',
    evaluate: async () => {
      const messages = [
        'tôi có voucher nào',
        'có chương trình khuyến mãi nào đang chạy',
        'chiến dịch nào đang hoạt động',
        'gợi ý món healthy ít béo',
      ];

      return messages.map((message) =>
        grade(!isDiscountedProductsQuestion(message) ? 1 : 0, 1, message)
      );
    },
  },
  {
    id: 'planner-healthy-vietnamese',
    group: 'Intent routing',
    weight: 10,
    description: 'Hiểu câu tiếng Việt "tốt cho sức khỏe" là nhu cầu healthy food.',
    evaluate: async () => {
      const plan = parseChatSearchPlan('hãy gợi ý cho tôi các món ăn tốt cho sức khỏe của tôi');

      return [
        grade(plan.healthNeeds.includes('healthy') ? 1 : 0, 1, 'có healthNeeds healthy'),
        grade(plan.requiresFood && !plan.requiresDrink ? 1 : 0, 1, 'food-only, không phải đồ uống'),
        grade(plan.preferredCategory === 'Góc Healthy & Ăn Kiêng' ? 1 : 0, 1, 'ưu tiên category healthy'),
      ];
    },
  },
  {
    id: 'specific-allergy-blocked-notice',
    group: 'Fallback and response quality',
    weight: 10,
    description: 'Khi user hỏi món cụ thể bị dị ứng, chatbot phải giữ cảnh báo và không tự đưa list thay thế.',
    evaluate: async () => {
      const plan = parseChatSearchPlan('tôi muốn món cơm gà xối mỡ');
      const typoPlan = parseChatSearchPlan('tôi muốn món cơm gạo lức');
      const shortChickenPlan = parseChatSearchPlan('tôi muốn cơm gà');
      const notice = buildAllergyBlockedProductNotice([
        {
          id: '64f100000000000000000050',
          name: 'Cơm Gà Xối Mỡ Nhúng Mắm',
          allergies: ['Thịt gà'],
        },
      ]);

      return [
        grade(isExactProductRequest(plan) ? 1 : 0, 1, 'nhận diện exact product request'),
        grade(productMatchesSpecificChatQuery({ name: 'Cơm Gà Xối Mỡ Nhúng Mắm' }, plan) ? 1 : 0, 1, 'match món cụ thể user hỏi'),
        grade(!productMatchesSpecificChatQuery({ name: 'Cơm Thố Xá Xíu' }, plan) ? 1 : 0, 1, 'không match món thay thế khác'),
        grade(isExactProductRequest(typoPlan) ? 1 : 0, 1, 'nhận diện exact request có typo'),
        grade(productMatchesSpecificChatQuery({ name: 'Cơm Gạo Lứt Hấp Rau Củ & Nấm' }, typoPlan) ? 1 : 0, 1, 'match typo gạo lức với gạo lứt'),
        grade(!productMatchesSpecificChatQuery({ name: 'Cơm Thố Xá Xíu' }, typoPlan) ? 1 : 0, 1, 'typo không match bừa món khác'),
        grade(isExactProductRequest(shortChickenPlan) ? 1 : 0, 1, 'nhận diện exact request ngắn cơm gà'),
        grade(getMentionedUserAllergyLabels(shortChickenPlan, ['chicken']).includes('Thịt gà') ? 1 : 0, 1, 'cơm gà nhắc đúng dị ứng chicken'),
        grade(/không gợi ý|khong goi y/i.test(notice) ? 1 : 0, 1, 'notice nói rõ không gợi ý món conflict'),
        grade(/Thịt gà|thit ga/i.test(notice) ? 1 : 0, 1, 'notice nêu đúng dị ứng gà'),
        grade(!/hiển thị các món thay thế|hien thi cac mon thay the/i.test(notice) ? 1 : 0, 1, 'notice không tự hứa hiển thị list thay thế'),
      ];
    },
  },
  {
    id: 'api-contract',
    group: 'API contract and safety',
    weight: 15,
    description: 'Validator giữ request contract: chỉ user history, ObjectId storeId, fulfillmentType hợp lệ.',
    evaluate: async () => {
      const valid = chatRequestValidator.safeParse({
        message: 'gợi ý món cho tôi',
        clientMessageId: 'msg-1',
        storeId: '60c72b2f9b1d8b2a3c8b456b',
        fulfillmentType: 'delivery',
        history: [{ role: 'user', content: 'xin chào' }],
      });
      const assistantHistory = chatRequestValidator.safeParse({
        message: 'test',
        history: [{ role: 'assistant', content: 'không hợp lệ' }],
      });
      const invalidStore = chatRequestValidator.safeParse({ message: 'test', storeId: 'bad-store' });

      return [
        grade(valid.success ? 1 : 0, 1, 'valid user-only request'),
        grade(valid.success && valid.data.locale === 'vi-VN' ? 1 : 0, 1, 'default locale'),
        grade(!assistantHistory.success ? 1 : 0, 1, 'reject assistant history'),
        grade(!invalidStore.success ? 1 : 0, 1, 'reject invalid storeId'),
      ];
    },
  },
  {
    id: 'discounted-products-answer',
    group: 'Domain accuracy',
    weight: 25,
    description: 'Trả đúng sale cards từ active campaign, không lẫn món không sale hoặc tạm ẩn.',
    evaluate: async () => withMockedCampaigns([
      saleCampaign({
        products: [
          {
            productId: product('64f100000000000000000001', {
              name: 'Cơm Ba Chỉ Rang Cháy Cạnh',
              price: 40000,
              storeAvailability: [{ storeId: '60c72b2f9b1d8b2a3c8b456b', status: 'active' }],
            }),
            discount: 15,
          },
          {
            productId: product('64f100000000000000000002', {
              name: 'Flan Caramel Đắng',
              price: 25000,
              storeAvailability: [{ storeId: '60c72b2f9b1d8b2a3c8b456b', status: 'active' }],
            }),
            discount: 28,
          },
          {
            productId: product('64f100000000000000000003', { name: 'Món Không Sale', price: 45000 }),
            discount: null,
          },
          {
            productId: product('64f100000000000000000004', {
              name: 'Món Tạm Ẩn',
              price: 45000,
              isAvailable: false,
            }),
            discount: 20,
          },
        ],
      }),
    ], async () => {
      const result = await buildDeterministicDomainResponse({
        intent: 'DISCOUNTED_PRODUCTS',
        message: 'món nào trong hệ thống đang được giảm giá',
        storeId: '60c72b2f9b1d8b2a3c8b456b',
      });
      const names = (result.recommendedProducts || []).map((item) => item.name);

      return [
        grade(/ưu đãi|giảm giá|sale/i.test(result.response) ? 1 : 0, 1, 'message đúng domain sale'),
        grade(names.includes('Cơm Ba Chỉ Rang Cháy Cạnh') ? 1 : 0, 1, 'có món sale percent'),
        grade(names.includes('Flan Caramel Đắng') ? 1 : 0, 1, 'có món sale thứ hai'),
        grade(!names.includes('Món Không Sale') ? 1 : 0, 1, 'không lẫn món không sale'),
        grade(!names.includes('Món Tạm Ẩn') ? 1 : 0, 1, 'không lẫn món tạm ẩn'),
      ];
    }),
  },
  {
    id: 'sale-card-contract',
    group: 'UI card contract',
    weight: 15,
    description: 'Sale card có giá sale, giá gốc, phần trăm giảm, campaign và hạn kết thúc.',
    evaluate: async () => withMockedCampaigns([
      saleCampaign({
        name: 'Flash Sale Test',
        endTime: new Date('2026-08-01T00:00:00.000Z'),
        products: [
          { productId: product('64f100000000000000000005', { name: 'Cơm Sale', price: 50000 }), discount: 20 },
        ],
      }),
    ], async () => {
      const result = await buildDeterministicDomainResponse({
        intent: 'DISCOUNTED_PRODUCTS',
        message: 'món sale',
      });
      const card = result.recommendedProducts?.[0] || {};

      return [
        grade(card.price === 40000 ? 1 : 0, 1, 'price là sale price'),
        grade(card.originalPrice === 50000 ? 1 : 0, 1, 'originalPrice là giá gốc'),
        grade(card.discountPercentage === 20 ? 1 : 0, 1, 'discountPercentage đúng'),
        grade(card.campaignName === 'Flash Sale Test' ? 1 : 0, 1, 'campaignName đúng'),
        grade(Boolean(card.campaignEndTime) ? 1 : 0, 1, 'campaignEndTime có giá trị'),
        grade(!result.response.includes(card.name) ? 1 : 0, 1, 'message không lặp tên món trong card'),
      ];
    }),
  },
  {
    id: 'pricing-source-of-truth',
    group: 'Pricing source of truth',
    weight: 15,
    description: 'Backend pricing gắn metadata campaign, hỗ trợ discount và fixed_price.',
    evaluate: async () => withMockedCampaigns([
      saleCampaign({
        name: 'Campaign Discount',
        products: [{ productId: '64f100000000000000000030', discount: 25 }],
      }),
      saleCampaign({
        name: 'Campaign Fixed',
        type: 'fixed_price',
        products: [{ productId: '64f100000000000000000031', fixedPrice: 22000 }],
      }),
    ], async () => {
      const priced = await applyCampaignPricing([
        { _id: '64f100000000000000000030', price: 40000, name: 'Món giảm phần trăm' },
        { _id: '64f100000000000000000031', price: 50000, name: 'Món fixed price' },
        { _id: '64f100000000000000000032', price: 60000, name: 'Món thường' },
      ]);

      return [
        grade(priced[0].campaignPrice === 30000 ? 1 : 0, 1, 'discount campaignPrice'),
        grade(priced[0].campaignName === 'Campaign Discount' ? 1 : 0, 1, 'discount campaignName'),
        grade(priced[1].campaignPrice === 22000 ? 1 : 0, 1, 'fixed campaignPrice'),
        grade(priced[1].campaignName === 'Campaign Fixed' ? 1 : 0, 1, 'fixed campaignName'),
        grade(priced[2].isCampaignRunning === false ? 1 : 0, 1, 'normal product not marked campaign'),
      ];
    }),
  },
  {
    id: 'shipping-source-of-truth',
    group: 'Pricing source of truth',
    weight: 15,
    description: 'Shipping fee dùng settings, khoảng cách và ngưỡng freeship backend.',
    evaluate: async () => withMockedSettings({
      baseDeliveryFee: '25000',
      feePerKm: '5000',
      freeDeliveryEnabled: true,
      freeDeliveryThreshold: '150000',
    }, async () => {
      const inner = await calculateShippingFee('Hải Châu', 'Đà Nẵng', 100000);
      const outer = await calculateShippingFee('Hòa Xuân', 'Đà Nẵng', 100000);
      const free = await calculateShippingFee('Hải Châu', 'Đà Nẵng', 150000);
      const outside = await calculateShippingFee('Bến Nghé', 'TP.HCM', 200000);

      return [
        grade(inner.fee === 17500 && inner.blocked === false ? 1 : 0, 1, 'inner ward fee theo công thức'),
        grade(outer.fee === 25000 && outer.blocked === false ? 1 : 0, 1, 'outer ward fee theo công thức'),
        grade(free.fee === 0 && free.blocked === false ? 1 : 0, 1, 'đạt ngưỡng freeship'),
        grade(outside.blocked === true ? 1 : 0, 1, 'ngoài Đà Nẵng bị chặn'),
      ];
    }),
  },
  {
    id: 'fallback-empty-state',
    group: 'Fallback and response quality',
    weight: 5,
    description: 'Không có món sale thật thì trả empty state rõ ràng, không bịa món.',
    evaluate: async () => withMockedCampaigns([
      saleCampaign({
        products: [
          { productId: product('64f100000000000000000040', { price: 40000 }), fixedPrice: 45000 },
          { productId: product('64f100000000000000000041', { price: 40000 }), discount: null },
        ],
      }),
    ], async () => {
      const result = await buildDeterministicDomainResponse({
        intent: 'DISCOUNTED_PRODUCTS',
        message: 'món giảm giá',
      });

      return [
        grade(/chưa thấy món nào/i.test(result.response) ? 1 : 0, 1, 'empty state rõ nghĩa'),
        grade(Array.isArray(result.recommendedProducts) && result.recommendedProducts.length === 0 ? 1 : 0, 1, 'không trả card bịa'),
      ];
    }),
  },
];

const formatStatus = (status) => {
  if (status === 'pass') return 'PASS';
  if (status === 'partial') return 'PARTIAL';
  return 'FAIL';
};

const main = async () => {
  const results = [];
  for (const item of evalCases) {
    results.push(await runCase(item));
  }

  const totalScore = results.reduce((sum, item) => sum + item.earned, 0);
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0);
  const score = Number(((totalScore / totalWeight) * 100).toFixed(1));
  const failed = results.filter((item) => item.status === 'fail');
  const partial = results.filter((item) => item.status === 'partial');

  const rows = results.map((item) =>
    `| ${item.id} | ${item.group} | ${formatStatus(item.status)} | ${item.earned.toFixed(2)}/${item.weight} | ${item.description} |`
  ).join('\n');

  const details = results.map((item) => {
    const checks = item.checks.map((check) =>
      `  - ${check.earned === check.total ? 'PASS' : 'FAIL'}: ${check.message} (${check.earned}/${check.total})`
    ).join('\n');
    return `### ${item.id}\n\n- Group: ${item.group}\n- Score: ${item.earned.toFixed(2)}/${item.weight}\n- Status: ${formatStatus(item.status)}\n- Duration: ${item.durationMs}ms\n\n${checks}`;
  }).join('\n\n');

  const report = `# Chatbot AI Evaluation Report

Generated by:

\`\`\`bash
pnpm --filter backend eval:chatbot
\`\`\`

## Summary

- Overall score: **${score}/100**
- Weighted score: **${totalScore.toFixed(2)}/${totalWeight}**
- Cases: **${results.length}**
- Pass: **${results.filter((item) => item.status === 'pass').length}**
- Partial: **${partial.length}**
- Fail: **${failed.length}**
- Evaluation mode: **offline mocked regression**, không gọi Groq/Gemini thật.

## Rubric

| Group | Weight |
|---|---:|
| Intent routing | 35 |
| API contract and safety | 15 |
| Domain accuracy | 25 |
| UI card contract | 15 |
| Pricing source of truth | 15 |
| Fallback and response quality | 15 |

## Case Results

| Case | Group | Status | Score | Description |
|---|---|---:|---:|---|
${rows}

## Detailed Checks

${details}

## Interpretation

- >= 90: Tot cho regression offline. Co the merge neu build/test khac cung pass.
- 80-89: Chap nhan duoc nhung can xem cac case partial.
- < 80: Khong nen merge thay doi chatbot.

## Limitations

- Bao cao nay khong cham live Groq/Gemini wording vi regression mac dinh phai on dinh va khong ton chi phi.
- Bao cao nay khong ket noi MongoDB that; campaign/product data duoc mock de kiem contract va logic.
- De cham live AI, nen them bo golden-set rieng chay tren staging voi seed DB va mock/recorded provider responses.
`;

  fs.writeFileSync(reportPath, report);
  console.log(`Chatbot AI score: ${score}/100`);
  console.log(`Report written: ${reportPath}`);

  if (score < 80 || failed.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
