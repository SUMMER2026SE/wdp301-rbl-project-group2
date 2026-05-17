// Mock Customer Profiles for Staff Interface

export interface CustomerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    allergies: string[];
    healthConditions: string[];
    dietaryPreferences: string[];
    specialNotes: string[];
    orderHistory: {
        totalOrders: number;
        commonRequests: string[];
        lastIncident?: string;
        lastOrderDate: string;
    };
}

export const MOCK_CUSTOMER_PROFILES: CustomerProfile[] = [
    {
        id: "CUST001",
        name: "Nguyễn Thị Hoa",
        email: "hoa.nguyen@email.com",
        phone: "+84 912 345 678",
        avatar: "https://i.pravatar.cc/150?img=1",
        allergies: ["Hải sản", "Đậu phộng"],
        healthConditions: ["Tiểu đường type 2"],
        dietaryPreferences: ["Ăn chay vào thứ 2"],
        specialNotes: ["Cần ít đường", "Không thể ăn tôm cua"],
        orderHistory: {
            totalOrders: 47,
            commonRequests: ["Không đường", "Ít dầu", "Không hành"],
            lastIncident: "Phản ứng dị ứng với tôm - 15/12/2024",
            lastOrderDate: "25/01/2026"
        }
    },
    {
        id: "CUST002",
        name: "Trần Văn Minh",
        email: "minh.tran@email.com",
        phone: "+84 913 456 789",
        avatar: "https://i.pravatar.cc/150?img=12",
        allergies: [],
        healthConditions: ["Đau dạ dày", "Trào ngược dạ dày"],
        dietaryPreferences: ["Ít cay", "Không chua"],
        specialNotes: ["Dạ dày yếu", "Không ăn được đồ chiên"],
        orderHistory: {
            totalOrders: 32,
            commonRequests: ["Không cay", "Ít dầu", "Không chua"],
            lastOrderDate: "28/01/2026"
        }
    },
    {
        id: "CUST003",
        name: "Lê Hoàng Anh",
        email: "anh.le@email.com",
        phone: "+84 914 567 890",
        avatar: "https://i.pravatar.cc/150?img=5",
        allergies: ["Gluten"],
        healthConditions: ["Celiac disease"],
        dietaryPreferences: ["Gluten-free"],
        specialNotes: ["Không thể ăn bột mì", "Cần bánh phở thay bánh mì"],
        orderHistory: {
            totalOrders: 23,
            commonRequests: ["Không gluten", "Bánh phở tươi", "Kiểm tra kỹ nguyên liệu"],
            lastOrderDate: "29/01/2026"
        }
    },
    {
        id: "CUST004",
        name: "Phạm Thị Mai",
        email: "mai.pham@email.com",
        phone: "+84 915 678 901",
        avatar: "https://i.pravatar.cc/150?img=9",
        allergies: ["Sữa", "Bơ"],
        healthConditions: [],
        dietaryPreferences: ["Lactose-free"],
        specialNotes: ["Dị ứng lactose", "Không phô mai"],
        orderHistory: {
            totalOrders: 18,
            commonRequests: ["Không sữa", "Không bơ", "Không phô mai"],
            lastOrderDate: "30/01/2026"
        }
    },
    {
        id: "CUST005",
        name: "Võ Đức Thắng",
        email: "thang.vo@email.com",
        phone: "+84 916 789 012",
        avatar: "https://i.pravatar.cc/150?img=13",
        allergies: [],
        healthConditions: ["Huyết áp cao", "Cholesterol cao"],
        dietaryPreferences: ["Ít muối", "Ít dầu"],
        specialNotes: ["Cần kiểm soát muối", "Không ăn mỡ"],
        orderHistory: {
            totalOrders: 56,
            commonRequests: ["Ít muối", "Không mỡ", "Ít dầu", "Nhiều rau"],
            lastOrderDate: "31/01/2026"
        }
    },
    {
        id: "CUST006",
        name: "Hoàng Thị Lan",
        email: "lan.hoang@email.com",
        phone: "+84 917 890 123",
        avatar: "https://i.pravatar.cc/150?img=10",
        allergies: ["Trứng"],
        healthConditions: [],
        dietaryPreferences: [],
        specialNotes: ["Dị ứng trứng gà", "Kiểm tra kỹ món có trứng"],
        orderHistory: {
            totalOrders: 12,
            commonRequests: ["Không trứng", "Kiểm tra nguyên liệu"],
            lastIncident: "Phản ứng nhẹ với món có trứng - 10/01/2026",
            lastOrderDate: "27/01/2026"
        }
    },
    {
        id: "CUST007",
        name: "Đỗ Minh Tuấn",
        email: "tuan.do@email.com",
        phone: "+84 918 901 234",
        avatar: "https://i.pravatar.cc/150?img=14",
        allergies: ["MSG", "Bột ngọt"],
        healthConditions: ["Đau nửa đầu"],
        dietaryPreferences: ["Organic"],
        specialNotes: ["Nhạy cảm với MSG", "Gây đau đầu"],
        orderHistory: {
            totalOrders: 41,
            commonRequests: ["Không bột ngọt", "Không MSG", "Tự nhiên"],
            lastOrderDate: "30/01/2026"
        }
    },
    {
        id: "CUST008",
        name: "Bùi Thị Thu",
        email: "thu.bui@email.com",
        phone: "+84 919 012 345",
        avatar: "https://i.pravatar.cc/150?img=16",
        allergies: [],
        healthConditions: ["Đang mang thai (tháng thứ 6)"],
        dietaryPreferences: ["Chín kỹ", "An toàn"],
        specialNotes: ["Đang mang thai", "Cần thực phẩm chín kỹ", "Tránh đồ sống"],
        orderHistory: {
            totalOrders: 8,
            commonRequests: ["Chín kỹ", "Không đồ sống", "Vệ sinh"],
            lastOrderDate: "31/01/2026"
        }
    },
    {
        id: "CUST009",
        name: "Ngô Văn Hùng",
        email: "hung.ngo@email.com",
        phone: "+84 920 123 456",
        avatar: "https://i.pravatar.cc/150?img=15",
        allergies: ["Hạt điều", "Đậu phộng"],
        healthConditions: [],
        dietaryPreferences: [],
        specialNotes: ["Dị ứng nghiêm trọng với hạt", "Có thể gây sốc phản vệ"],
        orderHistory: {
            totalOrders: 15,
            commonRequests: ["Không hạt", "Kiểm tra kỹ nguyên liệu", "Không đậu"],
            lastIncident: "Phản ứng nghiêm trọng với đậu phộng - 20/11/2025",
            lastOrderDate: "28/01/2026"
        }
    },
    {
        id: "CUST010",
        name: "Đinh Thị Hương",
        email: "huong.dinh@email.com",
        phone: "+84 921 234 567",
        avatar: "https://i.pravatar.cc/150?img=20",
        allergies: [],
        healthConditions: [],
        dietaryPreferences: ["Ăn chay"],
        specialNotes: ["Ăn chay trường", "Không hành tỏi"],
        orderHistory: {
            totalOrders: 34,
            commonRequests: ["Ăn chay", "Không thịt", "Không hành tỏi", "Không trứng"],
            lastOrderDate: "30/01/2026"
        }
    },
    {
        id: "CUST011",
        name: "Lý Tuấn Kiệt",
        email: "kiet.ly@email.com",
        phone: "+84 922 345 678",
        avatar: "https://i.pravatar.cc/150?img=17",
        allergies: ["Sò", "Nghêu"],
        healthConditions: ["Gout"],
        dietaryPreferences: ["Ít purine"],
        specialNotes: ["Bệnh gout", "Tránh hải sản", "Ít đạm"],
        orderHistory: {
            totalOrders: 29,
            commonRequests: ["Không hải sản", "Ít thịt đỏ", "Nhiều rau"],
            lastOrderDate: "29/01/2026"
        }
    },
    {
        id: "CUST012",
        name: "Kiều Anh Thư",
        email: "thu.kieu@email.com",
        phone: "+84 923 456 789",
        avatar: "https://i.pravatar.cc/150?img=23",
        allergies: [],
        healthConditions: [],
        dietaryPreferences: [],
        specialNotes: ["Đặt cho con nhỏ 3 tuổi", "Không cay", "Cắt nhỏ"],
        orderHistory: {
            totalOrders: 11,
            commonRequests: ["Không cay", "Cắt nhỏ", "Ít gia vị", "Mềm"],
            lastOrderDate: "31/01/2026"
        }
    }
];

// Helper function to get customer by ID
export const getCustomerById = (id: string): CustomerProfile | undefined => {
    return MOCK_CUSTOMER_PROFILES.find(customer => customer.id === id);
};

// Helper function to search customers
export const searchCustomers = (query: string): CustomerProfile[] => {
    const lowerQuery = query.toLowerCase();
    return MOCK_CUSTOMER_PROFILES.filter(customer =>
        customer.name.toLowerCase().includes(lowerQuery) ||
        customer.email.toLowerCase().includes(lowerQuery) ||
        customer.phone.includes(query)
    );
};
