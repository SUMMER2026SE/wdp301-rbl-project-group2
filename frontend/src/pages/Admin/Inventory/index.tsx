import { useState } from "react";
import { clsx } from "clsx";

// Ingredient interface
interface Ingredient {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    minStock: number;
    maxStock: number;
    supplier: string;
    lastRestocked: string;
    costPerUnit: number;
    status: "in-stock" | "low-stock" | "out-of-stock";
}

// Mock inventory data
const INVENTORY_MOCK: Ingredient[] = [
    {
        id: "ING-001",
        name: "Nấm Truffle",
        category: "Nguyên liệu cao cấp",
        currentStock: 2.5,
        unit: "kg",
        minStock: 2,
        maxStock: 10,
        supplier: "TruffleVN",
        lastRestocked: "2024-01-28",
        costPerUnit: 5200000,
        status: "low-stock",
    },
    {
        id: "ING-002",
        name: "Thịt bò Wagyu",
        category: "Thịt",
        currentStock: 15,
        unit: "kg",
        minStock: 5,
        maxStock: 30,
        supplier: "Premium Beef Co.",
        lastRestocked: "2024-01-29",
        costPerUnit: 1800000,
        status: "in-stock",
    },
    {
        id: "ING-003",
        name: "Phô mai Mozzarella",
        category: "Sữa",
        currentStock: 0,
        unit: "kg",
        minStock: 3,
        maxStock: 20,
        supplier: "Italian Imports",
        lastRestocked: "2024-01-20",
        costPerUnit: 320000,
        status: "out-of-stock",
    },
    {
        id: "ING-004",
        name: "Cà chua bi",
        category: "Rau củ",
        currentStock: 25,
        unit: "kg",
        minStock: 10,
        maxStock: 50,
        supplier: "Dalat Farm",
        lastRestocked: "2024-01-30",
        costPerUnit: 45000,
        status: "in-stock",
    },
    {
        id: "ING-005",
        name: "Dầu olive Extra Virgin",
        category: "Gia vị",
        currentStock: 8,
        unit: "lít",
        minStock: 5,
        maxStock: 25,
        supplier: "Mediterranean Goods",
        lastRestocked: "2024-01-25",
        costPerUnit: 380000,
        status: "in-stock",
    },
    {
        id: "ING-006",
        name: "Mì Ý Spaghetti",
        category: "Tinh bột",
        currentStock: 3,
        unit: "kg",
        minStock: 5,
        maxStock: 30,
        supplier: "Pasta Italia",
        lastRestocked: "2024-01-22",
        costPerUnit: 125000,
        status: "low-stock",
    },
];

// CATEGORY_FILTER removed as it's unused

const AdminInventory = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // Calculate stats
    const totalItems = INVENTORY_MOCK.length;
    const lowStockItems = INVENTORY_MOCK.filter(
        (i) => i.status === "low-stock"
    ).length;
    const outOfStockItems = INVENTORY_MOCK.filter(
        (i) => i.status === "out-of-stock"
    ).length;
    const totalValue = INVENTORY_MOCK.reduce(
        (sum, i) => sum + i.currentStock * i.costPerUnit,
        0
    );

    // Filter inventory
    const filteredInventory = INVENTORY_MOCK.filter((item) => {
        const matchesSearch =
            searchQuery === "" ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLowStock = !showLowStockOnly || item.status !== "in-stock";
        return matchesSearch && matchesLowStock;
    });

    const getStatusBadge = (status: Ingredient["status"]) => {
        switch (status) {
            case "in-stock":
                return "bg-green-100 text-green-700 border-green-200";
            case "low-stock":
                return "bg-amber-100 text-amber-700 border-amber-200";
            case "out-of-stock":
                return "bg-red-100 text-red-700 border-red-200";
        }
    };

    const getStatusLabel = (status: Ingredient["status"]) => {
        switch (status) {
            case "in-stock":
                return "Đủ hàng";
            case "low-stock":
                return "Sắp hết";
            case "out-of-stock":
                return "Hết hàng";
        }
    };

    const getStockPercentage = (item: Ingredient) => {
        return (item.currentStock / item.maxStock) * 100;
    };

    return (
        <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
                        Quản lý kho
                    </h2>
                    <p className="text-[#9a734c] mt-1">
                        Theo dõi nguyên liệu, cảnh báo tồn kho và nhà cung cấp.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 border border-[#e7dbcf] bg-white rounded-lg text-sm font-medium text-[#1b140d] hover:bg-[#f3ede7]"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Xuất dữ liệu
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 px-6 py-3 bg-[#ee8c2b] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#d87c24]"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        Thêm nguyên liệu
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600">
                                inventory_2
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">
                        Tổng nguyên liệu
                    </p>
                    <h3 className="text-3xl font-bold text-[#1b140d]">{totalItems}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <span className="material-symbols-outlined text-amber-600">
                                warning
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Sắp hết hàng</p>
                    <h3 className="text-3xl font-bold text-amber-600">{lowStockItems}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <span className="material-symbols-outlined text-red-600">
                                error
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Hết hàng</p>
                    <h3 className="text-3xl font-bold text-red-600">{outOfStockItems}</h3>
                </div>

                <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
                            <span className="material-symbols-outlined text-[#ee8c2b]">
                                payments
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-[#9a734c] mb-1">Giá trị kho</p>
                    <h3 className="text-2xl font-bold text-[#1b140d]">
                        {totalValue.toLocaleString("vi-VN")}₫
                    </h3>
                </div>
            </div>

            {/* Alerts Section - Low Stock & Out of Stock */}
            {(lowStockItems > 0 || outOfStockItems > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-600 text-2xl">
                            notification_important
                        </span>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-red-900 mb-2">
                                Cảnh báo tồn kho
                            </h4>
                            <div className="space-y-2">
                                {outOfStockItems > 0 && (
                                    <p className="text-sm text-red-800">
                                        <span className="font-bold">{outOfStockItems} nguyên liệu</span>{" "}
                                        đã hết hàng cần nhập ngay.
                                    </p>
                                )}
                                {lowStockItems > 0 && (
                                    <p className="text-sm text-amber-800">
                                        <span className="font-bold">{lowStockItems} nguyên liệu</span>{" "}
                                        sắp hết, cần đặt hàng sớm.
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                        >
                            {showLowStockOnly ? "Xem tất cả" : "Xem cảnh báo"}
                        </button>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm nguyên liệu hoặc nhà cung cấp..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                    Nguyên liệu
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                    Danh mục
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                    Tồn kho
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                                    Nhà cung cấp
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                    Giá/đơn vị
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e7dbcf]">
                            {filteredInventory.map((item) => {
                                const stockPercentage = getStockPercentage(item);
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-[#fcfaf8] transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-[#1b140d]">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-[#9a734c]">{item.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-sm font-bold text-[#1b140d]">
                                                        {item.currentStock} {item.unit}
                                                    </span>
                                                    <span className="text-xs text-[#9a734c]">
                                                        / {item.maxStock} {item.unit}
                                                    </span>
                                                </div>
                                                <div className="w-32 h-2 bg-[#f3ede7] rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all",
                                                            item.status === "out-of-stock"
                                                                ? "bg-red-500"
                                                                : item.status === "low-stock"
                                                                    ? "bg-amber-500"
                                                                    : "bg-green-500"
                                                        )}
                                                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={clsx(
                                                    "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                                                    getStatusBadge(item.status)
                                                )}
                                            >
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-[#1b140d]">{item.supplier}</p>
                                            <p className="text-xs text-[#9a734c]">
                                                Nhập:{" "}
                                                {new Date(item.lastRestocked).toLocaleDateString("vi-VN")}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-[#1b140d]">
                                                {item.costPerUnit.toLocaleString("vi-VN")}₫
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    className="p-1.5 text-[#9a734c] hover:text-[#ee8c2b] hover:bg-[#ee8c2b]/10 rounded transition-colors"
                                                    title="Nhập hàng"
                                                >
                                                    <span className="material-symbols-outlined text-xl">
                                                        add_circle
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="p-1.5 text-[#9a734c] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <span className="material-symbols-outlined text-xl">
                                                        edit
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Empty state */}
                {filteredInventory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-24 h-24 rounded-full bg-[#f3ede7] flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-5xl text-[#9a734c]">
                                inventory_2
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1b140d] mb-2">
                            Không tìm thấy nguyên liệu
                        </h3>
                        <p className="text-sm text-[#9a734c]">
                            Thử thay đổi từ khóa tìm kiếm
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminInventory;
