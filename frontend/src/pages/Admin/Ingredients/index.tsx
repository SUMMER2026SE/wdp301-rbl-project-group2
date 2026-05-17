import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---- Mock Data ----

interface Ingredient {
    id: string;
    name: string;
    allergens: string[];
    dietary: string[];
    usedInProducts: number;
}

const ALLERGEN_OPTIONS = [
    'Dairy', 'Gluten', 'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Soy', 'Eggs', 'Sesame',
];

const DIETARY_OPTIONS = [
    'Non-Vegan', 'Non-Vegetarian', 'Contains Alcohol', 'High Sugar', 'High Sodium',
];

const MOCK_INGREDIENTS: Ingredient[] = [
    { id: '1', name: 'Sữa đặc', allergens: ['Dairy'], dietary: ['Non-Vegan'], usedInProducts: 12 },
    { id: '2', name: 'Bơ lạc', allergens: ['Peanuts'], dietary: ['Non-Vegan'], usedInProducts: 5 },
    { id: '3', name: 'Bột mì', allergens: ['Gluten'], dietary: [], usedInProducts: 28 },
    { id: '4', name: 'Tôm tươi', allergens: ['Shellfish'], dietary: ['Non-Vegan', 'Non-Vegetarian'], usedInProducts: 15 },
    { id: '5', name: 'Thịt heo', allergens: [], dietary: ['Non-Vegan', 'Non-Vegetarian'], usedInProducts: 22 },
    { id: '6', name: 'Nước mắm', allergens: ['Fish'], dietary: ['Non-Vegan'], usedInProducts: 35 },
    { id: '7', name: 'Đậu nành', allergens: ['Soy'], dietary: [], usedInProducts: 18 },
];

// ---- Component ----

const AdminIngredients = () => {
    const { t } = useTranslation(['admin', 'common']);
    const [search, setSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAllergens, setNewAllergens] = useState<string[]>([]);
    const [newDietary, setNewDietary] = useState<string[]>([]);

    const filtered = MOCK_INGREDIENTS.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
        setter(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-[#1b140d] dark:text-white">
                        🧪 {t('admin:ingredients.title', 'Kho Nguyên liệu & Dị ứng')}
                    </h1>
                    <p className="text-sm text-[#9a734c] mt-1">
                        {t('admin:ingredients.subtitle', '"Dạy" AI về nguyên liệu — định nghĩa chất dị ứng và chế độ ăn cho mỗi nguyên liệu. Khi tạo món ăn mới, AI sẽ tự động hiểu.')}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Thêm nguyên liệu
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 p-6 space-y-4">
                    <h3 className="font-bold text-sm">Nguyên liệu mới</h3>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Tên nguyên liệu (VD: Sữa tươi)"
                        className="w-full h-10 px-4 rounded-xl bg-[#f3ede7] dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-orange-500/20"
                    />
                    <div>
                        <p className="text-xs font-bold text-[#9a734c] mb-2">Chất gây dị ứng</p>
                        <div className="flex flex-wrap gap-2">
                            {ALLERGEN_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag, newAllergens, setNewAllergens)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${newAllergens.includes(tag)
                                            ? 'bg-red-100 border-red-300 text-red-700'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-[#9a734c] mb-2">Chế độ ăn</p>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag, newDietary, setNewDietary)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${newDietary.includes(tag)
                                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-500">
                            Lưu nguyên liệu
                        </button>
                        <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-semibold text-[#9a734c] hover:text-[#1b140d]">
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] text-[18px]">search</span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm nguyên liệu..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-[#e7dbcf] dark:border-gray-800 text-sm focus:ring-2 focus:ring-orange-500/20"
                />
            </div>

            {/* Ingredients Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#e7dbcf] dark:border-gray-800 bg-[#f3ede7]/50 dark:bg-gray-800/50">
                            <th className="px-5 py-3 text-left text-xs font-bold text-[#9a734c] uppercase tracking-wider">Nguyên liệu</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-[#9a734c] uppercase tracking-wider">Dị ứng</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-[#9a734c] uppercase tracking-wider">Chế độ ăn</th>
                            <th className="px-5 py-3 text-center text-xs font-bold text-[#9a734c] uppercase tracking-wider">Sản phẩm</th>
                            <th className="px-5 py-3 text-right text-xs font-bold text-[#9a734c] uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7dbcf]/50 dark:divide-gray-800">
                        {filtered.map((ing) => (
                            <tr key={ing.id} className="hover:bg-[#f3ede7]/30 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-5 py-3.5 font-bold">{ing.name}</td>
                                <td className="px-5 py-3.5">
                                    <div className="flex flex-wrap gap-1">
                                        {ing.allergens.map(a => (
                                            <span key={a} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                                {a}
                                            </span>
                                        ))}
                                        {ing.allergens.length === 0 && (
                                            <span className="text-xs text-emerald-500 font-semibold">✓ None</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex flex-wrap gap-1">
                                        {ing.dietary.map(d => (
                                            <span key={d} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                                {d}
                                            </span>
                                        ))}
                                        {ing.dietary.length === 0 && (
                                            <span className="text-xs text-gray-400">—</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-center font-semibold text-[#9a734c]">{ing.usedInProducts}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <button className="text-[#9a734c] hover:text-[#1b140d] transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminIngredients;
