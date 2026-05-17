// Mock Orders for Staff Interface with AI Analysis

import type { OrderItem } from "./mockOrders";
import type { AIRiskAnalysis, ParsedInstruction } from "../types/aiTypes";

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface StaffOrder {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    customerAvatar: string;
    items: OrderItem[];
    customerNotes: string;
    status: OrderStatus;
    createdAt: string;
    estimatedTime: string;
    aiRiskLevel: 'normal' | 'attention' | 'high_risk';
    aiAnalysis: AIRiskAnalysis;
    aiParsedInstructions: ParsedInstruction[];
    totalAmount: number;
}

export const MOCK_STAFF_ORDERS: StaffOrder[] = [
    {
        id: "ORD001",
        orderNumber: "FD-9821",
        customerId: "CUST001",
        customerName: "Nguyễn Thị Hoa",
        customerAvatar: "https://i.pravatar.cc/150?img=1",
        items: [
            {
                id: 1,
                name: "Phở Hải Sản",
                price: 65000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 1,
                options: "Tôm, mực, nghêu"
            },
            {
                id: 2,
                name: "Gỏi Cuốn Tôm",
                price: 45000,
                image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&h=500&fit=crop",
                quantity: 2
            }
        ],
        customerNotes: "Tôi bị dị ứng hải sản, xin đổi sang thịt bò nhé",
        status: "pending",
        createdAt: "31/01/2026 08:30",
        estimatedTime: "09:00",
        aiRiskLevel: "high_risk",
        aiAnalysis: {
            riskLevel: "high_risk",
            reasons: [
                "Khách hàng dị ứng hải sản nhưng đặt món có hải sản",
                "Tiền sử phản ứng dị ứng nghiêm trọng (15/12/2024)",
                "Khách hàng có tiểu đường type 2"
            ],
            customerAllergies: ["Hải sản", "Đậu phộng"],
            healthWarnings: ["Tiểu đường type 2"],
            orderConflicts: [
                "⚠️ Phở Hải Sản chứa tôm, mực, nghêu",
                "⚠️ Gỏi Cuốn Tôm chứa tôm"
            ]
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không hải sản",
                matched: true,
                category: "ingredient"
            },
            {
                type: "modify",
                instruction: "Đổi sang thịt bò",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "Khách hàng dị ứng hải sản",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 155000
    },
    {
        id: "ORD002",
        orderNumber: "FD-9822",
        customerId: "CUST002",
        customerName: "Trần Văn Minh",
        customerAvatar: "https://i.pravatar.cc/150?img=12",
        items: [
            {
                id: 3,
                name: "Bún Chả Hà Nội",
                price: 60000,
                image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=500&fit=crop",
                quantity: 1
            },
            {
                id: 4,
                name: "Chả Giò",
                price: 35000,
                image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Tôi bị đau dạ dày, làm ơn ít dầu, không cay, không chua",
        status: "pending",
        createdAt: "31/01/2026 08:45",
        estimatedTime: "09:15",
        aiRiskLevel: "attention",
        aiAnalysis: {
            riskLevel: "attention",
            reasons: [
                "Khách hàng có đau dạ dày và trào ngược",
                "Yêu cầu ít dầu nhưng đặt món chiên",
                "Cần tránh đồ cay và chua"
            ],
            customerAllergies: [],
            healthWarnings: ["Đau dạ dày", "Trào ngược dạ dày"],
            orderConflicts: [
                "⚠️ Chả Giò là món chiên nhiều dầu"
            ]
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không cay",
                matched: true,
                category: "cooking"
            },
            {
                type: "exclude",
                instruction: "Không chua",
                matched: true,
                category: "cooking"
            },
            {
                type: "modify",
                instruction: "Ít dầu",
                matched: true,
                category: "cooking"
            },
            {
                type: "info",
                instruction: "Khách hàng bị đau dạ dày",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 95000
    },
    {
        id: "ORD003",
        orderNumber: "FD-9823",
        customerId: "CUST003",
        customerName: "Lê Hoàng Anh",
        customerAvatar: "https://i.pravatar.cc/150?img=5",
        items: [
            {
                id: 5,
                name: "Phở Bò",
                price: 55000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 1,
                options: "Bánh phở tươi"
            }
        ],
        customerNotes: "Tôi không dung nạp gluten, xin dùng bánh phở tươi, không quẩy",
        status: "processing",
        createdAt: "31/01/2026 08:15",
        estimatedTime: "08:45",
        aiRiskLevel: "attention",
        aiAnalysis: {
            riskLevel: "attention",
            reasons: [
                "Khách hàng có Celiac disease (không dung nạp gluten)",
                "Cần kiểm tra kỹ nguyên liệu không chứa gluten"
            ],
            customerAllergies: ["Gluten"],
            healthWarnings: ["Celiac disease"],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không gluten",
                matched: true,
                category: "ingredient"
            },
            {
                type: "include",
                instruction: "Bánh phở tươi",
                matched: true,
                category: "ingredient"
            },
            {
                type: "exclude",
                instruction: "Không quẩy",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "Celiac disease - không dung nạp gluten",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 55000
    },
    {
        id: "ORD004",
        orderNumber: "FD-9824",
        customerId: "CUST005",
        customerName: "Võ Đức Thắng",
        customerAvatar: "https://i.pravatar.cc/150?img=13",
        items: [
            {
                id: 6,
                name: "Cơm Gà Xối Mỡ",
                price: 50000,
                image: "https://images.unsplash.com/photo-1603073006-573599aa16bb?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Tôi bị huyết áp cao, xin bỏ hết mỡ, ít muối, thêm rau",
        status: "pending",
        createdAt: "31/01/2026 09:00",
        estimatedTime: "09:30",
        aiRiskLevel: "attention",
        aiAnalysis: {
            riskLevel: "attention",
            reasons: [
                "Khách hàng có huyết áp cao và cholesterol cao",
                "Đặt món 'Xối Mỡ' nhưng yêu cầu bỏ mỡ",
                "Cần giảm muối và dầu"
            ],
            customerAllergies: [],
            healthWarnings: ["Huyết áp cao", "Cholesterol cao"],
            orderConflicts: [
                "⚠️ Cơm Gà Xối Mỡ mặc định có nhiều mỡ"
            ]
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Bỏ hết mỡ",
                matched: true,
                category: "ingredient"
            },
            {
                type: "modify",
                instruction: "Ít muối",
                matched: true,
                category: "cooking"
            },
            {
                type: "include",
                instruction: "Thêm rau",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "Huyết áp cao - cần kiểm soát muối và mỡ",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 50000
    },
    {
        id: "ORD005",
        orderNumber: "FD-9825",
        customerId: "CUST008",
        customerName: "Bùi Thị Thu",
        customerAvatar: "https://i.pravatar.cc/150?img=16",
        items: [
            {
                id: 7,
                name: "Gỏi Cuốn",
                price: 40000,
                image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&h=500&fit=crop",
                quantity: 2
            },
            {
                id: 8,
                name: "Phở Gà",
                price: 50000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Tôi đang mang thai, xin nấu chín kỹ, không đồ sống",
        status: "pending",
        createdAt: "31/01/2026 08:50",
        estimatedTime: "09:20",
        aiRiskLevel: "high_risk",
        aiAnalysis: {
            riskLevel: "high_risk",
            reasons: [
                "Khách hàng đang mang thai (tháng thứ 6)",
                "Cần đảm bảo vệ sinh an toàn thực phẩm cao",
                "Tránh thực phẩm sống hoặc không chín kỹ"
            ],
            customerAllergies: [],
            healthWarnings: ["Đang mang thai (tháng thứ 6)"],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "modify",
                instruction: "Nấu chín kỹ",
                matched: true,
                category: "cooking"
            },
            {
                type: "exclude",
                instruction: "Không đồ sống",
                matched: true,
                category: "cooking"
            },
            {
                type: "info",
                instruction: "Đang mang thai - cần vệ sinh cao",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 130000
    },
    {
        id: "ORD006",
        orderNumber: "FD-9826",
        customerId: "CUST009",
        customerName: "Ngô Văn Hùng",
        customerAvatar: "https://i.pravatar.cc/150?img=15",
        items: [
            {
                id: 9,
                name: "Pad Thai",
                price: 55000,
                image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&h=500&fit=crop",
                quantity: 1,
                options: "Thêm đậu phộng rang"
            }
        ],
        customerNotes: "Không bỏ hạt, không đậu phộng, tôi dị ứng nghiêm trọng",
        status: "pending",
        createdAt: "31/01/2026 09:10",
        estimatedTime: "09:40",
        aiRiskLevel: "high_risk",
        aiAnalysis: {
            riskLevel: "high_risk",
            reasons: [
                "⚠️ NGUY HIỂM: Khách hàng dị ứng nghiêm trọng với đậu phộng",
                "Tiền sử phản ứng nghiêm trọng có thể gây sốc phản vệ",
                "Đặt món Pad Thai mặc định có đậu phộng"
            ],
            customerAllergies: ["Hạt điều", "Đậu phộng"],
            healthWarnings: [],
            orderConflicts: [
                "🚨 NGUY HIỂM: Pad Thai có đậu phộng rang",
                "⚠️ Tiền sử: Phản ứng nghiêm trọng 20/11/2025"
            ]
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không bỏ hạt",
                matched: true,
                category: "ingredient"
            },
            {
                type: "exclude",
                instruction: "Không đậu phộng",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "🚨 Dị ứng nghiêm trọng - có thể sốc phản vệ",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 55000
    },
    {
        id: "ORD007",
        orderNumber: "FD-9827",
        customerId: "CUST012",
        customerName: "Kiều Anh Thư",
        customerAvatar: "https://i.pravatar.cc/150?img=23",
        items: [
            {
                id: 10,
                name: "Cơm Gà",
                price: 45000,
                image: "https://images.unsplash.com/photo-1603073006-573599aa16bb?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Cho con nhỏ 3 tuổi, cắt nhỏ, không cay, mềm",
        status: "processing",
        createdAt: "31/01/2026 08:20",
        estimatedTime: "08:50",
        aiRiskLevel: "high_risk",
        aiAnalysis: {
            riskLevel: "high_risk",
            reasons: [
                "Đơn hàng cho trẻ nhỏ 3 tuổi",
                "Cần đảm bảo an toàn và phù hợp với trẻ em",
                "Cần cắt nhỏ để tránh nghẹn"
            ],
            customerAllergies: [],
            healthWarnings: [],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "modify",
                instruction: "Cắt nhỏ",
                matched: true,
                category: "special"
            },
            {
                type: "exclude",
                instruction: "Không cay",
                matched: true,
                category: "cooking"
            },
            {
                type: "modify",
                instruction: "Nấu mềm",
                matched: true,
                category: "cooking"
            },
            {
                type: "info",
                instruction: "Cho trẻ 3 tuổi - cần an toàn",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 45000
    },
    {
        id: "ORD008",
        orderNumber: "FD-9828",
        customerId: "CUST010",
        customerName: "Đinh Thị Hương",
        customerAvatar: "https://i.pravatar.cc/150?img=20",
        items: [
            {
                id: 11,
                name: "Phở Chay",
                price: 50000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 1
            },
            {
                id: 12,
                name: "Gỏi Cuốn Chay",
                price: 35000,
                image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Ăn chay trường, không hành tỏi, không trứng",
        status: "completed",
        createdAt: "31/01/2026 07:30",
        estimatedTime: "08:00",
        aiRiskLevel: "normal",
        aiAnalysis: {
            riskLevel: "normal",
            reasons: [
                "Đơn hàng phù hợp với chế độ ăn chay của khách",
                "Không có xung đột với dietary preferences"
            ],
            customerAllergies: [],
            healthWarnings: [],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không thịt",
                matched: true,
                category: "ingredient"
            },
            {
                type: "exclude",
                instruction: "Không hành tỏi",
                matched: true,
                category: "ingredient"
            },
            {
                type: "exclude",
                instruction: "Không trứng",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "Ăn chay trường",
                matched: true,
                category: "special"
            }
        ],
        totalAmount: 85000
    },
    {
        id: "ORD009",
        orderNumber: "FD-9829",
        customerId: "CUST007",
        customerName: "Đỗ Minh Tuấn",
        customerAvatar: "https://i.pravatar.cc/150?img=14",
        items: [
            {
                id: 13,
                name: "Bún Bò Huế",
                price: 60000,
                image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Không bột ngọt, không MSG, tôi bị đau đầu",
        status: "processing",
        createdAt: "31/01/2026 08:35",
        estimatedTime: "09:05",
        aiRiskLevel: "attention",
        aiAnalysis: {
            riskLevel: "attention",
            reasons: [
                "Khách hàng nhạy cảm với MSG",
                "MSG gây đau nửa đầu",
                "Cần sử dụng gia vị tự nhiên"
            ],
            customerAllergies: ["MSG", "Bột ngọt"],
            healthWarnings: ["Đau nửa đầu"],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không bột ngọt",
                matched: true,
                category: "ingredient"
            },
            {
                type: "exclude",
                instruction: "Không MSG",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "MSG gây đau đầu",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 60000
    },
    {
        id: "ORD010",
        orderNumber: "FD-9830",
        customerId: "CUST011",
        customerName: "Lý Tuấn Kiệt",
        customerAvatar: "https://i.pravatar.cc/150?img=17",
        items: [
            {
                id: 14,
                name: "Phở Gà",
                price: 50000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 1
            },
            {
                id: 15,
                name: "Rau Xào",
                price: 30000,
                image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&h=500&fit=crop",
                quantity: 1
            }
        ],
        customerNotes: "Tôi bị gout, không hải sản, ít thịt, nhiều rau",
        status: "completed",
        createdAt: "31/01/2026 07:45",
        estimatedTime: "08:15",
        aiRiskLevel: "normal",
        aiAnalysis: {
            riskLevel: "normal",
            reasons: [
                "Đơn hàng phù hợp với chế độ ăn kiêng gout",
                "Tránh hải sản và thịt đỏ như khuyến nghị"
            ],
            customerAllergies: ["Sò", "Nghêu"],
            healthWarnings: ["Gout"],
            orderConflicts: []
        },
        aiParsedInstructions: [
            {
                type: "exclude",
                instruction: "Không hải sản",
                matched: true,
                category: "ingredient"
            },
            {
                type: "modify",
                instruction: "Ít thịt",
                matched: true,
                category: "ingredient"
            },
            {
                type: "include",
                instruction: "Nhiều rau",
                matched: true,
                category: "ingredient"
            },
            {
                type: "info",
                instruction: "Bệnh gout - ít purine",
                matched: true,
                category: "health"
            }
        ],
        totalAmount: 80000
    }
];

// Helper functions
export const getOrdersByStatus = (status: OrderStatus): StaffOrder[] => {
    return MOCK_STAFF_ORDERS.filter(order => order.status === status);
};

export const getOrdersByRiskLevel = (riskLevel: 'normal' | 'attention' | 'high_risk'): StaffOrder[] => {
    return MOCK_STAFF_ORDERS.filter(order => order.aiRiskLevel === riskLevel);
};

export const getOrderById = (id: string): StaffOrder | undefined => {
    return MOCK_STAFF_ORDERS.find(order => order.id === id);
};

export const searchOrders = (query: string): StaffOrder[] => {
    const lowerQuery = query.toLowerCase();
    return MOCK_STAFF_ORDERS.filter(order =>
        order.orderNumber.toLowerCase().includes(lowerQuery) ||
        order.customerName.toLowerCase().includes(lowerQuery)
    );
};
