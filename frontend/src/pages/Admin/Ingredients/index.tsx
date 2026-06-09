import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Loader2, Pencil, Trash2, X } from "lucide-react";
import { ALLERGEN_OPTIONS, getAllergenLabel } from "@/constants/allergenCatalog";
import ingredientService, {
  type AllergenSuggestion,
  type Ingredient,
} from "@/services/ingredient.service";

type FormState = {
  id?: string;
  name: string;
  description: string;
  allergenTags: string[];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  allergenTags: [],
};

const getSourceBadge = (ingredient: Ingredient) => {
  if (ingredient.allergenSource === "ai" || ingredient.allergenSuggestion) {
    return {
      label: "AI gợi ý",
      className: "bg-blue-50 text-blue-700 border-blue-100",
    };
  }

  return {
    label: "Thủ công",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
};

const AdminIngredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<AllergenSuggestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showForm) return;
    window.setTimeout(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [showForm]);

  const closeForm = () => {
    setShowForm(false);
    setSuggestion(null);
    setError("");
  };

  const loadIngredients = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ingredientService.list();
      setIngredients(data);
    } catch {
      setError("Không thể tải danh sách nguyên liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadIngredients);
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return ingredients;
    return ingredients.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [ingredients, search]);

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      allergenTags: prev.allergenTags.includes(tag)
        ? prev.allergenTags.filter((item) => item !== tag)
        : [...prev.allergenTags, tag],
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSuggestion(null);
    setShowForm(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setError("");
    setForm({
      id: ingredient.id,
      name: ingredient.name,
      description: ingredient.description ?? "",
      allergenTags: ingredient.allergenTags ?? [],
    });
    setSuggestion(
      ingredient.allergenSuggestion
        ? {
            suggestedTags: ingredient.allergenSuggestion.suggestedTags,
            confidence: ingredient.allergenSuggestion.confidence,
            reason: ingredient.allergenSuggestion.reason,
            source: "ai",
          }
        : null,
    );
    setShowForm(true);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setForm((prev) => ({
      ...prev,
      allergenTags: suggestion.suggestedTags,
    }));
  };

  const handleSuggest = async () => {
    if (!form.name.trim()) {
      setError("Nhập tên nguyên liệu trước khi gọi AI");
      return;
    }
    setSuggesting(true);
    setError("");
    try {
      const data = await ingredientService.suggestAllergens({
        name: form.name,
        description: form.description,
      });
      setSuggestion(data);
      setForm((prev) => ({
        ...prev,
        allergenTags: data.suggestedTags,
      }));
    } catch {
      setError("AI chưa gợi ý được tag cho nguyên liệu này");
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Tên nguyên liệu là bắt buộc");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        allergenTags: form.allergenTags,
      };

      if (form.id) {
        await ingredientService.update(form.id, payload);
      } else {
        await ingredientService.create(payload);
      }

      setShowForm(false);
      setForm(emptyForm);
      setSuggestion(null);
      await loadIngredients();
    } catch {
      setError("Không thể lưu nguyên liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      await ingredientService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadIngredients();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Không thể xóa nguyên liệu";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1b140d] dark:text-white">
            Kho nguyên liệu & dị ứng
          </h1>
          <p className="text-sm text-[#9a734c] mt-1">
            Quản lý nguyên liệu, dùng AI để gợi ý tag dị ứng tham khảo khi thêm hoặc chỉnh sửa.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Thêm nguyên liệu
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
        <div role="dialog" aria-modal="true" className="w-full max-w-3xl max-h-[calc(100vh-3rem)] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{form.id ? "Sửa nguyên liệu" : "Nguyên liệu mới"}</h3>
            <button
              type="button"
              onClick={closeForm}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              ref={nameInputRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên nguyên liệu, ví dụ: Tôm tươi"
              className="h-11 px-4 rounded-xl bg-[#f3ede7] dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-orange-500/20"
            />
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả ngắn nếu cần"
              className="h-11 px-4 rounded-xl bg-[#f3ede7] dark:bg-gray-800 border-none text-sm focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold text-[#9a734c] uppercase">Tag dị ứng</p>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || !form.name.trim()}
                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-100 hover:bg-emerald-100 disabled:opacity-60 flex items-center gap-2"
              >
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI gợi ý
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    form.allergenTags.includes(tag.id)
                      ? "bg-red-100 border-red-300 text-red-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {suggestion && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-800">
                <Sparkles className="w-4 h-4" />
                AI đề xuất
                <span className="text-xs text-emerald-600">
                  Độ tin cậy {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestion.suggestedTags.length > 0 ? (
                  suggestion.suggestedTags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-white text-emerald-700 text-xs font-bold">
                      {getAllergenLabel(tag)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">Không có tag chắc chắn</span>
                )}
              </div>
              {suggestion.reason && <p className="mt-2 text-xs text-emerald-700">{suggestion.reason}</p>}
              {suggestion.suggestedTags.length > 0 && (
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white text-emerald-700 text-xs font-black border border-emerald-100 hover:bg-emerald-100"
                >
                  Áp dụng gợi ý
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-500 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu nguyên liệu
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-semibold text-[#9a734c] hover:text-[#1b140d]"
            >
              Hủy
            </button>
          </div>
        </div>
        </div>
      )}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] text-[18px]">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm nguyên liệu..."
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-[#e7dbcf] dark:border-gray-800 text-sm focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#e7dbcf] dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-[#9a734c]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7dbcf] dark:border-gray-800 bg-[#f3ede7]/50 dark:bg-gray-800/50">
                <th className="px-5 py-3 text-left text-xs font-bold text-[#9a734c] uppercase tracking-wider">Nguyên liệu</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-[#9a734c] uppercase tracking-wider">Dị ứng</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-[#9a734c] uppercase tracking-wider">Sản phẩm</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-[#9a734c] uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7dbcf]/50 dark:divide-gray-800">
              {filtered.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-[#f3ede7]/30 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold">{ingredient.name}</div>
                    {ingredient.description && <div className="text-xs text-slate-400 mt-0.5">{ingredient.description}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {ingredient.allergenTags.length > 0 ? (
                        ingredient.allergenTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                            {getAllergenLabel(tag)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-500 font-semibold">Không có</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-[#9a734c]">{ingredient.usedInProducts}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(ingredient)}
                        className="p-2 rounded-lg text-[#9a734c] hover:bg-[#f3ede7] hover:text-[#1b140d] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(ingredient)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm font-semibold text-slate-400">
                    Chưa có nguyên liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-[#e7dbcf] dark:border-gray-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#1b140d] dark:text-white">Xóa nguyên liệu</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bạn có chắc muốn xóa <span className="font-bold text-[#1b140d] dark:text-white">{deleteTarget.name}</span> không?
              Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-60"
              >
                {saving ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIngredients;
