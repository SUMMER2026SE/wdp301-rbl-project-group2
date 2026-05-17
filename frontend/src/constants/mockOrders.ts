// Mock data for consistent order items across pages
export interface OrderItem {
    id: number;
    name: string;
    price: number;
    image: string;
    quantity: number;
    options?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled' | 'needs_review';

export interface OrderMessage {
    id: string;
    sender: 'staff' | 'customer';
    senderName: string;
    message: string;
    timestamp: string;
}

export interface CustomerOrder {
    id: string;
    orderId: string;
    orderDate: string;
    orderTime: string;
    estimatedDelivery: string;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    staffMessage?: string;
    needsCustomerAction?: boolean;
    messages?: OrderMessage[];
}

// UNIFIED ORDER ITEMS - Used across ALL pages (ShoppingCart, Checkout, OrderDetail, TrackOrder)
export const MOCK_ORDER_ITEMS: OrderItem[] = [
    {
        id: 1,
        name: "Phở Bò Tái",
        price: 55000,
        image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
        quantity: 2,
        options: "Bánh phở tươi"
    },
    {
        id: 2,
        name: "Bún Chả Hà Nội",
        price: 60000,
        image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=500&fit=crop",
        quantity: 1,
        options: "Không hành"
    },
    {
        id: 3,
        name: "Trà Đào Cam Sả",
        price: 35000,
        image: "https://img.meta.com.vn/Data/image/2021/05/20/tra-dao-cam-sa-2.jpg",
        quantity: 1,
        options: "Ít đá"
    }
];

// Legacy exports for backward compatibility (all point to same data)
export const MOCK_CART_ITEMS = MOCK_ORDER_ITEMS;
export const MOCK_ORDER_DETAIL_ITEMS = MOCK_ORDER_ITEMS;

// Upsell items - used in ShoppingCart
export const MOCK_UPSELL_ITEMS = [
    { id: 101, name: "Quẩy Giòn", price: 5000, image: "https://cdn.sforum.vn/sforum/wp-content/uploads/2023/12/cach-lam-quay-1.jpg" },
    { id: 102, name: "Trứng Chần", price: 10000, image: "https://i.ytimg.com/vi/DIJ9QtsFRRA/maxresdefault.jpg" },
    { id: 103, name: "Trà Chanh", price: 5000, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&h=500&fit=crop" },
    { id: 104, name: "Nước Cam", price: 15000, image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&h=500&fit=crop" },
];

// Order information
export const MOCK_ORDER_INFO = {
    orderId: "FD-8829",
    orderDate: "12/05/2024",
    orderTime: "12:15 PM",
    estimatedDelivery: "12:45 PM",
    estimatedDuration: "25-30 phút"
};

// Delivery info
export const MOCK_DELIVERY_INFO = {
    address: "742 Đường Nguyễn Huệ",
    district: "Quận 1, TP. Hồ Chí Minh",
    gateCode: "1234",
    recipientName: "Nguyễn Văn A",
    recipientPhone: "+84 (555) 012-3456"
};

// Mock customer orders with different statuses
export const MOCK_CUSTOMER_ORDERS: CustomerOrder[] = [
    {
        id: "1",
        orderId: "FD-8830",
        orderDate: "31/01/2024",
        orderTime: "09:30 AM",
        estimatedDelivery: "10:00 AM",
        status: "needs_review",
        items: [
            {
                id: 1,
                name: "Phở Bò Tái",
                price: 55000,
                image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&h=500&fit=crop",
                quantity: 3,
                options: "Không rau thơm"
            },
            {
                id: 5,
                name: "Gỏi Cuốn Tôm Thịt",
                price: 45000,
                image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&h=500&fit=crop",
                quantity: 2,
                options: "Thêm tương"
            }
        ],
        subtotal: 255000,
        deliveryFee: 25000,
        discount: 0,
        total: 280000,
        staffMessage: "⚠️ Cảnh báo không đảm bảo cho sức khỏe, có thể gây dị ứng!",
        needsCustomerAction: true,
        messages: [
            {
                id: "msg-1",
                sender: "staff",
                senderName: "Nhân viên",
                message: "Xin chào quý khách! Hiện tại chúng tôi đang hết rau thơm tươi. Bạn có muốn đổi sang rau mùi hoặc chúng tôi sẽ bổ sung sau khi có hàng không ạ?",
                timestamp: "09:32 AM"
            }
        ]
    },
    {
        id: "2",
        orderId: "FD-8829",
        orderDate: "30/01/2024",
        orderTime: "12:15 PM",
        estimatedDelivery: "12:45 PM",
        status: "delivered",
        items: MOCK_ORDER_ITEMS,
        subtotal: 205000,
        deliveryFee: 25000,
        discount: 20000,
        total: 210000
    },
    {
        id: "3",
        orderId: "FD-8828",
        orderDate: "29/01/2024",
        orderTime: "07:00 PM",
        estimatedDelivery: "07:30 PM",
        status: "delivering",
        items: [
            {
                id: 4,
                name: "Cơm Tấm Sườn Bì",
                price: 65000,
                image: "https://i.ytimg.com/vi/OVb5uoDWspM/maxresdefault.jpg",
                quantity: 2,
                options: "Thêm trứng"
            }
        ],
        subtotal: 130000,
        deliveryFee: 25000,
        discount: 0,
        total: 155000
    },
    {
        id: "4",
        orderId: "FD-8825",
        orderDate: "28/01/2024",
        orderTime: "06:00 PM",
        estimatedDelivery: "06:30 PM",
        status: "needs_review",
        items: [
            {
                id: 6,
                name: "Bánh Mì Pate",
                price: 25000,
                image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop",
                quantity: 5,
                options: "Đầy đủ"
            }
        ],
        subtotal: 125000,
        deliveryFee: 25000,
        discount: 0,
        total: 150000,
        staffMessage: "⚠️ Số lượng bánh mì bạn đặt khá nhiều (5 ổ). Vui lòng xác nhận lại số lượng để tránh lãng phí.",
        needsCustomerAction: true,
        messages: [
            {
                id: "msg-2",
                sender: "staff",
                senderName: "Nhân viên",
                message: "Chào bạn! Mình thấy bạn đặt 5 ổ bánh mì. Đây là số lượng khá nhiều, bạn có chắc chắn không ạ? Để tránh lãng phí mình muốn xác nhận lại.",
                timestamp: "06:05 PM"
            }
        ]
    },
    {
        id: "5",
        orderId: "FD-8820",
        orderDate: "27/01/2024",
        orderTime: "11:00 AM",
        estimatedDelivery: "11:30 AM",
        status: "delivered",
        items: [
            {
                id: 3,
                name: "Trà Đào Cam Sả",
                price: 35000,
                image: "https://img.meta.com.vn/Data/image/2021/05/20/tra-dao-cam-sa-2.jpg",
                quantity: 2,
                options: "Ít đá"
            }
        ],
        subtotal: 70000,
        deliveryFee: 25000,
        discount: 10000,
        total: 85000
    }
];

// Calculate totals
export const calculateOrderTotal = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 300000 ? 0 : 25000;
    const discount = 0;
    const total = subtotal + deliveryFee - discount;

    return { subtotal, deliveryFee, discount, total };
};

// Get count of orders needing review
export const getOrdersNeedingReviewCount = () => {
    return MOCK_CUSTOMER_ORDERS.filter(order => order.status === 'needs_review').length;
};
