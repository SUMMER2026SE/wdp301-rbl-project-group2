// Staff Menu Management Page

import { useState } from "react";

interface MenuItem {
    id: string;
    name: string;
    description: string;
    category: string;
    price: number;
    image: string;
    inStock: boolean;
}

const MOCK_MENU_ITEMS: MenuItem[] = [
    { id: "1", name: "Phở Hà Nội đặc biệt", description: "Nước dùng thanh ngọt, thịt bò mềm", category: "Món chính", price: 75000, image: "https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400", inStock: true },
    { id: "2", name: "Bún chả Hà Nội", description: "Chả nướng, bún tươi, nước mắm chua ngọt", category: "Món chính", price: 65000, image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400", inStock: true },
    { id: "3", name: "Gỏi cuốn tôm thịt", description: "Tôm tươi, thịt heo, rau sống, bún", category: "Khai vị", price: 45000, image: "https://yummyday.vn/uploads/images/goi-cuon-tom-thit-9.jpg", inStock: false },
    { id: "4", name: "Phở Hải Sản", description: "Tôm, mực, cá, nước dùng đậm đà", category: "Món chính", price: 85000, image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400", inStock: true },
    { id: "5", name: "Cơm tấm sườn bì", description: "Sườn nướng, bì, chả, trứng", category: "Món chính", price: 55000, image: "https://i.ytimg.com/vi/OVb5uoDWspM/maxresdefault.jpg", inStock: true },
    { id: "6", name: "Trà sữa trân châu", description: "Trân châu đen, trà Ô long", category: "Đồ uống", price: 35000, image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400", inStock: false },
    { id: "7", name: "Cà phê sữa đá", description: "Cà phê phin truyền thống", category: "Đồ uống", price: 25000, image: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400", inStock: true },
    { id: "8", name: "Bánh mì pate", description: "Pate, thịt nguội, dưa leo, rau thơm", category: "Khai vị", price: 20000, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", inStock: true },
    { id: "9", name: "Nem rán", description: "Nem rán giòn, rau sống", category: "Khai vị", price: 40000, image: "https://images.unsplash.com/photo-1626790680787-de5e9a07bcf2?w=400", inStock: true },
    { id: "10", name: "Chè ba màu", description: "Đậu đỏ, đậu xanh, thạch, nước cốt dừa", category: "Tráng miệng", price: 30000, image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400", inStock: false },
    { id: "11", name: "Nước ép dưa hấu", description: "Dưa hấu tươi, mát lạnh", category: "Đồ uống", price: 28000, image: "https://cookbeo.com/media/2020/12/nuoc-ep-dua-hau/coc-nuoc-ep-dua-hau.jpg", inStock: true },
    { id: "12", name: "Bánh flan", description: "Bánh flan mềm mịn, caramel thơm ngon", category: "Tráng miệng", price: 25000, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400", inStock: true },
];

const CATEGORIES = ["Tất cả", "Món chính", "Khai vị", "Đồ uống", "Tráng miệng"];

export default function StaffMenu() {
    const [menuItems, setMenuItems] = useState(MOCK_MENU_ITEMS);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Tất cả");

    const filteredItems = menuItems.filter(item => {
        const matchesSearch = searchQuery === '' ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "Tất cả" || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const toggleStock = (id: string) => {
        setMenuItems(prev => prev.map(item =>
            item.id === id ? { ...item, inStock: !item.inStock } : item
        ));
    };

    const totalItems = menuItems.length;
    const inStockItems = menuItems.filter(item => item.inStock).length;
    const outOfStockItems = totalItems - inStockItems;

    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
                        Quản lý thực đơn
                    </h2>
                    <p className="text-sm text-[#9a734c] mt-1">Cập nhật trạng thái món ăn trong thực đơn theo thời gian thực.</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="px-5 py-4 bg-white border border-[#e7dbcf] rounded-xl text-center min-w-[100px] shadow-sm">
                        <div className="text-2xl font-bold text-[#1b140d] leading-none mb-1">{totalItems}</div>
                        <div className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">Tổng món</div>
                    </div>
                    <div className="px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[100px] shadow-sm">
                        <div className="text-2xl font-bold text-emerald-600 leading-none mb-1">{inStockItems}</div>
                        <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider">Còn món</div>
                    </div>
                    <div className="px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-center min-w-[100px] shadow-sm">
                        <div className="text-2xl font-bold text-red-600 leading-none mb-1">{outOfStockItems}</div>
                        <div className="text-[10px] font-bold text-red-600/70 uppercase tracking-wider">Hết món</div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm món ăn..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#fcfaf8] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${categoryFilter === cat
                                        ? 'bg-[#ee8c2b] text-white'
                                        : 'bg-[#fcfaf8] text-[#1b140d] border border-[#e7dbcf] hover:border-[#ee8c2b] hover:text-[#ee8c2b]'
                                    }`}
                                onClick={() => setCategoryFilter(cat)}
                            >
                                {cat}{cat !== 'Tất cả' && ` (${menuItems.filter(i => i.category === cat).length})`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredItems.map(item => (
                    <div key={item.id} className={`bg-white rounded-xl overflow-hidden border border-[#e7dbcf] hover:shadow-md hover:border-[#ee8c2b] transition-all flex flex-col ${!item.inStock ? 'opacity-80' : ''}`}>
                        <div className="relative w-full h-[180px] overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className={`absolute top-3 right-3 px-2 py-1 rounded shadow-sm text-[10px] font-bold text-white uppercase tracking-wider ${item.inStock ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                {item.inStock ? 'Sẵn sàng' : 'Hết hàng'}
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start gap-3 mb-2">
                                <h3 className="text-lg font-bold text-[#1b140d] leading-tight line-clamp-1">{item.name}</h3>
                                <span className="px-2 py-0.5 bg-[#fcfaf8] border border-[#e7dbcf] rounded text-[10px] font-bold text-[#9a734c] uppercase">{item.category}</span>
                            </div>
                            <p className="text-sm text-[#9a734c] line-clamp-2 mb-4 flex-1">{item.description}</p>
                            
                            <div className="flex justify-between items-center pt-4 border-t border-[#e7dbcf]/50">
                                <div className="text-xl font-black text-[#1b140d] tracking-tight">{item.price.toLocaleString('vi-VN')}đ</div>
                                <button
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${item.inStock
                                            ? 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-500'
                                            : 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                                        }`}
                                    onClick={() => toggleStock(item.id)}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {item.inStock ? 'block' : 'check_circle'}
                                    </span>
                                    {item.inStock ? 'Tạm ngưng' : 'Mở lại'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#fcfaf8] flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-[#9a734c]">no_food</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#1b140d]">Không tìm thấy món nào</h3>
                    <p className="text-sm text-[#9a734c]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                </div>
            )}
        </div>
    );
}
