// AI Service - Mock implementation for Staff Interface

import type { AIRiskAnalysis, ParsedInstruction, CustomerInsight, RiskLevel, OrderAIInsights } from "../types/aiTypes";
import type { StaffOrder } from "../constants/mockStaffOrders";
import type { CustomerProfile } from "../constants/mockCustomers";

/** Gợi ý món thay thế an toàn khi có dị ứng/xung đột */
const DISH_ALTERNATIVES: Record<string, string> = {
    "Phở Hải Sản": "Phở Bò",
    "Gỏi Cuốn Tôm": "Gỏi Cuốn Thịt",
    "Bún Bò": "Bún Chay",
    "Chả Giò": "Chả Giò Lụa (ít dầu) hoặc Gỏi Cuốn",
    "Cơm Gà Xối Mỡ": "Cơm Gà Luộc hoặc Cơm Gà (bỏ mỡ, ít muối)",
};

/**
 * Analyze order risk based on customer profile and order details
 */
export const analyzeOrderRisk = (
    order: StaffOrder,
    customer: CustomerProfile
): AIRiskAnalysis => {
    const reasons: string[] = [];
    const orderConflicts: string[] = [];
    let riskLevel: RiskLevel = 'normal';

    // Check for allergies
    if (customer.allergies.length > 0) {
        const allergyKeywords = customer.allergies.map(a => a.toLowerCase());

        // Check if order items contain allergens
        order.items.forEach(item => {
            const itemName = item.name.toLowerCase();
            const itemOptions = (item.options || '').toLowerCase();

            allergyKeywords.forEach(allergen => {
                if (itemName.includes(allergen) || itemOptions.includes(allergen)) {
                    riskLevel = 'high_risk';
                    orderConflicts.push(`⚠️ ${item.name} có thể chứa ${allergen}`);
                    reasons.push(`Khách hàng dị ứng ${allergen} nhưng đặt món có chứa nguyên liệu này`);
                }
            });
        });
    }

    // Check for health conditions
    if (customer.healthConditions.length > 0) {
        customer.healthConditions.forEach(condition => {
            const conditionLower = condition.toLowerCase();

            // Special handling for specific conditions
            if (conditionLower.includes('tiểu đường')) {
                reasons.push(`Khách hàng có ${condition} - cần lưu ý lượng đường`);
                if (riskLevel === 'normal') riskLevel = 'attention';
            }

            if (conditionLower.includes('dạ dày') || conditionLower.includes('trào ngược')) {
                // Check for fried food
                const hasFriedFood = order.items.some(item =>
                    item.name.toLowerCase().includes('chiên') ||
                    item.name.toLowerCase().includes('giò')
                );

                if (hasFriedFood) {
                    reasons.push(`Khách hàng có ${condition} nhưng đặt món chiên`);
                    orderConflicts.push(`⚠️ Món chiên không phù hợp với người bị đau dạ dày`);
                    if (riskLevel === 'normal') riskLevel = 'attention';
                }
            }

            if (conditionLower.includes('huyết áp') || conditionLower.includes('cholesterol')) {
                // Check for high-fat dishes
                const itemName = order.items.map(i => i.name.toLowerCase()).join(' ');
                if (itemName.includes('mỡ') || itemName.includes('xối')) {
                    reasons.push(`Khách hàng có ${condition} nhưng đặt món nhiều mỡ`);
                    orderConflicts.push(`⚠️ Món có nhiều mỡ không phù hợp`);
                    if (riskLevel === 'normal') riskLevel = 'attention';
                }
            }

            if (conditionLower.includes('mang thai')) {
                reasons.push(`Khách hàng đang mang thai - cần đảm bảo vệ sinh cao`);
                riskLevel = 'high_risk';
            }

            if (conditionLower.includes('gout')) {
                // Check for seafood
                const hasSeafood = order.items.some(item =>
                    item.name.toLowerCase().includes('hải sản') ||
                    item.name.toLowerCase().includes('tôm')
                );

                if (hasSeafood) {
                    reasons.push(`Khách hàng có ${condition} - nên tránh hải sản`);
                    if (riskLevel === 'normal') riskLevel = 'attention';
                }
            }
        });
    }

    // Check customer notes for children
    if (order.customerNotes.toLowerCase().includes('con nhỏ') ||
        order.customerNotes.toLowerCase().includes('trẻ em') ||
        order.customerNotes.toLowerCase().includes('bé')) {
        reasons.push('Đơn hàng cho trẻ em - cần đảm bảo an toàn');
        riskLevel = 'high_risk';
    }

    // Check for severe allergy history
    if (customer.orderHistory.lastIncident) {
        reasons.push(`Tiền sử: ${customer.orderHistory.lastIncident}`);
        if (customer.allergies.length > 0) {
            riskLevel = 'high_risk';
        }
    }

    // If no issues found
    if (reasons.length === 0) {
        reasons.push('Đơn hàng phù hợp với hồ sơ khách hàng');
    }

    return {
        riskLevel,
        reasons,
        customerAllergies: customer.allergies,
        healthWarnings: customer.healthConditions,
        orderConflicts
    };
};

/**
 * Parse customer notes into structured instructions
 */
export const parseOrderNotes = (notes: string): ParsedInstruction[] => {
    const instructions: ParsedInstruction[] = [];
    const notesLower = notes.toLowerCase();

    // Common Vietnamese keywords mapping
    const excludeKeywords = [
        { keywords: ['không cay', 'ko cay', 'bỏ cay'], instruction: 'Không cay', category: 'cooking' as const },
        { keywords: ['không chua', 'ko chua', 'bỏ chua'], instruction: 'Không chua', category: 'cooking' as const },
        { keywords: ['không hành', 'ko hành', 'bỏ hành'], instruction: 'Không hành', category: 'ingredient' as const },
        { keywords: ['không tỏi', 'ko tỏi', 'bỏ tỏi'], instruction: 'Không tỏi', category: 'ingredient' as const },
        { keywords: ['không đường', 'ko đường', 'bỏ đường'], instruction: 'Không đường', category: 'ingredient' as const },
        { keywords: ['không mỡ', 'bỏ mỡ', 'bỏ hết mỡ'], instruction: 'Bỏ hết mỡ', category: 'ingredient' as const },
        { keywords: ['không hải sản', 'ko hải sản'], instruction: 'Không hải sản', category: 'ingredient' as const },
        { keywords: ['không thịt', 'ko thịt'], instruction: 'Không thịt', category: 'ingredient' as const },
        { keywords: ['không trứng', 'ko trứng'], instruction: 'Không trứng', category: 'ingredient' as const },
        { keywords: ['không bột ngọt', 'không msg', 'ko msg'], instruction: 'Không bột ngọt/MSG', category: 'ingredient' as const },
        { keywords: ['không đậu', 'ko đậu phộng', 'không hạt'], instruction: 'Không đậu phộng/hạt', category: 'ingredient' as const },
        { keywords: ['không sữa', 'ko sữa'], instruction: 'Không sữa', category: 'ingredient' as const },
        { keywords: ['không đồ sống', 'ko sống'], instruction: 'Không đồ sống', category: 'cooking' as const },
        { keywords: ['không quẩy', 'ko quẩy'], instruction: 'Không quẩy', category: 'ingredient' as const },
    ];

    const modifyKeywords = [
        { keywords: ['ít dầu'], instruction: 'Ít dầu', category: 'cooking' as const },
        { keywords: ['ít muối'], instruction: 'Ít muối', category: 'cooking' as const },
        { keywords: ['ít đường'], instruction: 'Ít đường', category: 'cooking' as const },
        { keywords: ['ít cay'], instruction: 'Ít cay', category: 'cooking' as const },
        { keywords: ['ít đá'], instruction: 'Ít đá', category: 'cooking' as const },
        { keywords: ['chín kỹ', 'nấu chín kỹ'], instruction: 'Nấu chín kỹ', category: 'cooking' as const },
        { keywords: ['cắt nhỏ'], instruction: 'Cắt nhỏ', category: 'special' as const },
        { keywords: ['mềm', 'nấu mềm'], instruction: 'Nấu mềm', category: 'cooking' as const },
    ];

    const includeKeywords = [
        { keywords: ['thêm rau', 'nhiều rau'], instruction: 'Thêm rau', category: 'ingredient' as const },
        { keywords: ['thêm đá', 'nhiều đá'], instruction: 'Thêm đá', category: 'cooking' as const },
        { keywords: ['bánh phở tươi'], instruction: 'Bánh phở tươi', category: 'ingredient' as const },
    ];

    // Check exclude keywords
    excludeKeywords.forEach(({ keywords, instruction, category }) => {
        if (keywords.some(keyword => notesLower.includes(keyword))) {
            instructions.push({
                type: 'exclude',
                instruction,
                matched: true,
                category
            });
        }
    });

    // Check modify keywords
    modifyKeywords.forEach(({ keywords, instruction, category }) => {
        if (keywords.some(keyword => notesLower.includes(keyword))) {
            instructions.push({
                type: 'modify',
                instruction,
                matched: true,
                category
            });
        }
    });

    // Check include keywords
    includeKeywords.forEach(({ keywords, instruction, category }) => {
        if (keywords.some(keyword => notesLower.includes(keyword))) {
            instructions.push({
                type: 'include',
                instruction,
                matched: true,
                category
            });
        }
    });

    // Check for health-related info
    const healthKeywords = [
        { keywords: ['dị ứng', 'allergy'], info: 'Khách hàng có dị ứng' },
        { keywords: ['dạ dày', 'đau bụng'], info: 'Khách hàng có vấn đề dạ dày' },
        { keywords: ['tiểu đường', 'đường huyết'], info: 'Khách hàng có tiểu đường' },
        { keywords: ['mang thai', 'có thai'], info: 'Khách hàng đang mang thai - cần vệ sinh cao' },
        { keywords: ['huyết áp', 'cao huyết'], info: 'Khách hàng có huyết áp cao' },
        { keywords: ['con nhỏ', 'trẻ em', 'bé'], info: 'Đơn hàng cho trẻ em - cần an toàn' },
        { keywords: ['gout'], info: 'Khách hàng có bệnh gout' },
        { keywords: ['ăn chay'], info: 'Khách hàng ăn chay' },
    ];

    healthKeywords.forEach(({ keywords, info }) => {
        if (keywords.some(keyword => notesLower.includes(keyword))) {
            instructions.push({
                type: 'info',
                instruction: info,
                matched: true,
                category: 'health'
            });
        }
    });

    return instructions;
};

/**
 * Generate customer insights based on order history
 */
export const generateCustomerInsights = (customer: CustomerProfile): CustomerInsight[] => {
    const insights: CustomerInsight[] = [];

    // Check order frequency
    if (customer.orderHistory.totalOrders > 50) {
        insights.push({
            type: 'preference',
            message: `Khách hàng VIP với ${customer.orderHistory.totalOrders} đơn hàng`,
            confidence: 95
        });
    } else if (customer.orderHistory.totalOrders > 20) {
        insights.push({
            type: 'preference',
            message: `Khách hàng thường xuyên (${customer.orderHistory.totalOrders} đơn hàng)`,
            confidence: 85
        });
    }

    // Check common requests pattern
    if (customer.orderHistory.commonRequests.length > 0) {
        const topRequest = customer.orderHistory.commonRequests[0];
        insights.push({
            type: 'pattern',
            message: `Thường yêu cầu: ${topRequest}`,
            confidence: 90
        });
    }

    // Check incident history
    if (customer.orderHistory.lastIncident) {
        insights.push({
            type: 'warning',
            message: customer.orderHistory.lastIncident,
            confidence: 100
        });
    }

    // Check allergies
    if (customer.allergies.length > 0) {
        insights.push({
            type: 'warning',
            message: `⚠️ Dị ứng: ${customer.allergies.join(', ')}`,
            confidence: 100
        });
    }

    // Check health conditions
    if (customer.healthConditions.length > 0) {
        insights.push({
            type: 'warning',
            message: `⚠️ Tình trạng sức khỏe: ${customer.healthConditions.join(', ')}`,
            confidence: 100
        });
    }

    return insights;
};

/**
 * Tạo phân tích, suy luận và đề xuất hành động từ đơn hàng + kết quả phân tích rủi ro.
 * Dùng cho Staff: không chỉ lặp lại ghi chú khách mà đưa ra insight và hành động cụ thể.
 */
export const getOrderAIInsights = (
    order: StaffOrder,
    analysis: AIRiskAnalysis
): OrderAIInsights => {
    const { riskLevel, reasons, orderConflicts, customerAllergies, healthWarnings } = analysis;
    const summary =
        riskLevel === "high_risk"
            ? `Rủi ro cao: ${reasons[0]}. Cần xử lý ngay trước khi chế biến.`
            : riskLevel === "attention"
                ? `Cần chú ý: ${reasons[0]}. Nên xác nhận hoặc điều chỉnh theo ghi chú.`
                : "Đơn phù hợp với hồ sơ và ghi chú khách. Có thể xác nhận và chế biến theo yêu cầu.";

    let reasoning: string;
    if (riskLevel === "high_risk") {
        if (orderConflicts.length > 0) {
            reasoning = `Đơn có xung đột trực tiếp giữa yêu cầu khách (dị ứng/sức khỏe) và món đặt. Nếu chế biến như bình thường có thể gây phản ứng dị ứng hoặc ảnh hưởng sức khỏe. Hệ thống đánh giá mức nguy cơ cao và đề xuất thay món hoặc xác nhận lại với khách trước khi vào bếp.`;
        } else {
            reasoning = `Khách có tiền sử dị ứng hoặc tình trạng đặc biệt (mang thai, trẻ em). Cần vệ sinh và chế biến cẩn thận, tránh nhiễm chéo và đảm bảo đúng yêu cầu.`;
        }
    } else if (riskLevel === "attention") {
        reasoning = `Ghi chú khách và món đặt cần điều chỉnh nhẹ (ít dầu, ít cay, bỏ mỡ…). Nếu không điều chỉnh đúng có thể gây khó chịu hoặc không phù hợp sức khỏe. Đề xuất thực hiện đúng ghi chú hoặc đề xuất món thay thế phù hợp hơn.`;
    } else {
        reasoning = "Không phát hiện xung đột giữa đơn hàng và ghi chú/hồ sơ khách. Có thể xác nhận và chế biến theo đơn.";
    }

    const suggestions: string[] = [];

    if (riskLevel === "high_risk" && orderConflicts.length > 0) {
        order.items.forEach((item) => {
            const alt = DISH_ALTERNATIVES[item.name];
            if (alt) {
                suggestions.push(`Đề xuất đổi món: «${item.name}» → «${alt}» (phù hợp với dị ứng/ghi chú khách).`);
            }
        });
        if (customerAllergies.length > 0) {
            suggestions.push("Gọi điện xác nhận với khách về món thay thế trước khi chế biến.");
        }
        suggestions.push("Chuẩn bị riêng, tránh nhiễm chéo với nguyên liệu gây dị ứng.");
        suggestions.push("Sau khi đổi món/xác nhận, cập nhật đơn và thông báo lại cho bếp.");
    } else if (riskLevel === "high_risk") {
        suggestions.push("Kiểm tra kỹ nguyên liệu và quy trình chế biến theo đúng ghi chú.");
        suggestions.push("Chuẩn bị riêng nếu cần, tránh nhiễm chéo.");
    } else if (riskLevel === "attention") {
        if (orderConflicts.length > 0) {
            order.items.forEach((item) => {
                const alt = DISH_ALTERNATIVES[item.name];
                if (alt) {
                    suggestions.push(`Cân nhắc đổi «${item.name}» → «${alt}» hoặc chế biến đúng ghi chú (ít dầu, không cay…).`);
                }
            });
        }
        if (healthWarnings.some((w) => w.toLowerCase().includes("dạ dày") || w.toLowerCase().includes("trào ngược"))) {
            suggestions.push("Chế biến: ít dầu, không cay, không chua; tránh món chiên rán nhiều dầu.");
        }
        if (healthWarnings.some((w) => w.toLowerCase().includes("huyết áp") || w.toLowerCase().includes("cholesterol"))) {
            suggestions.push("Thực hiện đúng yêu cầu: bỏ mỡ, ít muối, thêm rau khi có thể.");
        }
        if (healthWarnings.some((w) => w.toLowerCase().includes("gluten") || w.toLowerCase().includes("celiac"))) {
            suggestions.push("Dùng bánh phở tươi / nguyên liệu không gluten; không quẩy; kiểm tra nước sốt và gia vị không chứa gluten.");
        }
        suggestions.push("Xác nhận lại với khách nếu cần để đảm bảo đúng yêu cầu.");
    } else {
        suggestions.push("Xác nhận đơn và chế biến theo ghi chú khách.");
    }

    return { summary, reasoning, suggestions };
};

/**
 * Get risk level color for UI
 */
export const getRiskColor = (riskLevel: RiskLevel): string => {
    switch (riskLevel) {
        case 'normal':
            return '#10b981'; // green
        case 'attention':
            return '#f59e0b'; // orange
        case 'high_risk':
            return '#ef4444'; // red
        default:
            return '#6b7280'; // gray
    }
};

/**
 * Get risk level label in Vietnamese
 */
export const getRiskLabel = (riskLevel: RiskLevel): string => {
    switch (riskLevel) {
        case 'normal':
            return 'Bình thường';
        case 'attention':
            return 'Cần chú ý';
        case 'high_risk':
            return 'Nguy cơ cao';
        default:
            return 'Không xác định';
    }
};

/**
 * Get risk level icon
 */
export const getRiskIcon = (riskLevel: RiskLevel): string => {
    switch (riskLevel) {
        case 'normal':
            return '🟢';
        case 'attention':
            return '🟡';
        case 'high_risk':
            return '🔴';
        default:
            return '⚪';
    }
};
