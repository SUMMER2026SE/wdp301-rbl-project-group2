import { useState, useEffect } from "react";
import campaignAPI, { CampaignStatus } from "@/services/campaign.service";
import type { Campaign } from "@/services/campaign.service";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  Search,
  X,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Check,
  Ban,
  Tag,
  Store,
  Pencil,
} from "lucide-react";

const AdminCampaigns = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("discount");
  const [campaignProducts, setCampaignProducts] = useState<{
    productId: string;
    fixedPrice?: number | null;
    discount?: number | null;
  }[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignAPI.getCampaigns();
      if (res.success) {
        setCampaigns(res.data);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Không thể tải danh sách chiến dịch");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const prodRes = await productAPI.getProducts({ limit: 1000, isAvailable: true });
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchMetadata();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCampaign(null);
    setFormName("");
    setFormType("discount");
    setCampaignProducts([]);
    setStartTime("");
    setEndTime("");
    setProductSearch("");
    setShowModal(true);
  };

  const toLocalDatetimeInput = (isoStr: string) => {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEditModal = (c: Campaign) => {
    setEditingCampaign(c);
    setFormName(c.name);
    setFormType(c.type);
    setStartTime(toLocalDatetimeInput(c.startTime));
    setEndTime(toLocalDatetimeInput(c.endTime));

    const formattedProducts = c.products.map(p => {
      const pId = typeof p.productId === "string" ? p.productId : (p.productId as any)._id;
      return {
        productId: pId,
        fixedPrice: p.fixedPrice,
        discount: p.discount
      };
    });
    setCampaignProducts(formattedProducts);
    setProductSearch("");
    setShowModal(true);
  };

  const handleToggleProduct = (productId: string) => {
    setCampaignProducts(prev =>
      prev.some(p => p.productId === productId)
        ? prev.filter(p => p.productId !== productId)
        : [...prev, { productId, fixedPrice: null, discount: 10 }]
    );
  };

  const handleProductRuleChange = (productId: string, field: "fixedPrice" | "discount", value: number) => {
    setCampaignProducts(prev =>
      prev.map(p => (p.productId === productId ? { ...p, [field]: value } : p))
    );
  };

  const getFinalPrice = (
    basePrice: number,
    rule: { fixedPrice?: number | null; discount?: number | null }
  ): number | null => {
    if (formType === "fixed_price") {
      return rule.fixedPrice ?? null;
    }
    if (rule.discount === null || rule.discount === undefined) return null;
    return Math.round(basePrice * (1 - rule.discount / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return toast.error("Vui lòng nhập tên chiến dịch");
    if (!startTime || !endTime) return toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
    if (new Date(startTime) >= new Date(endTime)) return toast.error("Thời gian bắt đầu phải trước thời gian kết thúc");
    if (campaignProducts.length === 0) return toast.error("Chiến dịch phải có ít nhất một sản phẩm");

    // Check product rules
    for (const p of campaignProducts) {
      if (formType === "fixed_price" && (p.fixedPrice === undefined || p.fixedPrice === null || p.fixedPrice < 0)) {
        return toast.error("Vui lòng nhập giá cố định hợp lệ cho tất cả sản phẩm");
      }
      if (formType === "discount" && (p.discount === undefined || p.discount === null || p.discount < 0 || p.discount > 100)) {
        return toast.error("Vui lòng nhập phần trăm giảm giá (0-100) cho tất cả sản phẩm");
      }
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      products: campaignProducts.map(p => ({
        productId: p.productId,
        fixedPrice: formType === "fixed_price" ? Number(p.fixedPrice) : null,
        discount: formType === "discount" ? Number(p.discount) : null
      })),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };

    setSubmitting(true);
    try {
      if (editingCampaign) {
        const res = await campaignAPI.updateCampaign(editingCampaign._id, payload);
        if (res.success) {
          toast.success("Cập nhật chiến dịch thành công");
          fetchCampaigns();
          setShowModal(false);
        }
      } else {
        const res = await campaignAPI.createCampaign(payload);
        if (res.success) {
          toast.success(isAdmin ? "Tạo và phê duyệt chiến dịch thành công" : "Gửi đề xuất chiến dịch thành công");
          fetchCampaigns();
          setShowModal(false);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: CampaignStatus) => {
    try {
      const res = await campaignAPI.updateStatus(id, status);
      if (res.success) {
        toast.success(status === CampaignStatus.APPROVED ? "Đã duyệt chiến dịch!" : "Đã từ chối đề xuất");
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Cập nhật trạng thái thất bại");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (deletingId) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa chiến dịch này không?")) return;
    setDeletingId(id);
    try {
      const res = await campaignAPI.deleteCampaign(id);
      if (res.success) {
        toast.success("Xóa chiến dịch thành công");
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Xóa thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const isCampaignActive = (c: Campaign) => {
    if (c.status !== CampaignStatus.APPROVED) return false;
    const now = new Date().getTime();
    return now >= new Date(c.startTime).getTime() && now <= new Date(c.endTime).getTime();
  };

  const getStatusBadge = (c: Campaign) => {
    switch (c.status) {
      case CampaignStatus.APPROVED: {
        if (new Date().getTime() < new Date(c.startTime).getTime()) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              <span className="size-1.5 rounded-full bg-sky-500" />
              Đã duyệt / Sắp diễn ra
            </span>
          );
        }
        if (!isCampaignActive(c)) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <span className="size-1.5 rounded-full bg-slate-400" />
              Đã kết thúc
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Đang diễn ra
          </span>
        );
      }
      case CampaignStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Từ chối
          </span>
        );
      case CampaignStatus.PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ duyệt
          </span>
        );
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý chiến dịch khuyến mãi
          </h2>
          <p className="text-[#9a734c] mt-1 text-sm">
            {isAdmin 
              ? "Tạo mới, phê duyệt hoặc từ chối các đề xuất chiến dịch của quản lý."
              : "Đề xuất các chương trình khuyến mãi và theo dõi trạng thái phê duyệt."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 h-12 px-6 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-600/10 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {isAdmin ? "Tạo chiến dịch" : "Đề xuất chiến dịch"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-[#1b140d] text-2xl font-black mt-1">
              {campaigns.filter(isCampaignActive).length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">Đang chờ duyệt</p>
            <p className="text-[#1b140d] text-2xl font-black mt-1">
              {campaigns.filter(c => c.status === CampaignStatus.PENDING).length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-gray-50 text-gray-600 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">Tổng số chiến dịch</p>
            <p className="text-[#1b140d] text-2xl font-black mt-1">{campaigns.length}</p>
          </div>
        </div>
      </div>

      {/* Toolbar & List Table */}
      <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm">
        {/* Search */}
        <div className="p-4 border-b border-[#e7dbcf]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm tên chiến dịch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f3ede7]/50 border-none focus:ring-2 focus:ring-orange-600 focus:bg-white text-sm outline-none transition-all placeholder:text-[#9a734c] text-slate-800"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Tên chiến dịch</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Người tạo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Loại ưu đãi</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">Thời gian</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7dbcf]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không tìm thấy chiến dịch nào</td>
                </tr>
              ) : filteredCampaigns.map((c) => {
                const isCreator = typeof c.createdBy !== "string" && c.createdBy._id === user?._id;
                const canModify = isAdmin || (isCreator && c.status === CampaignStatus.PENDING);
                const creatorName = typeof c.createdBy === "string" ? "Hệ thống" : (c.createdBy?.username || "Ẩn danh");

                return (
                  <tr key={c._id} className="hover:bg-orange-50/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{creatorName}</td>
                    <td className="px-6 py-4">{getStatusBadge(c)}</td>
                    <td className="px-6 py-4 text-sm font-semibold capitalize text-orange-700">
                      {c.type === "fixed_price" ? "Giá cố định" : "Phần trăm giảm"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        <span>Bắt đầu: {new Date(c.startTime).toLocaleString("vi-VN")}</span>
                        <span>Kết thúc: {new Date(c.endTime).toLocaleString("vi-VN")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {isAdmin && c.status === CampaignStatus.PENDING && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(c._id, CampaignStatus.APPROVED)}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Duyệt"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(c._id, CampaignStatus.REJECTED)}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Từ chối"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4.5 h-4.5" />
                          </button>
                        )}
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(c._id)}
                            disabled={deletingId === c._id}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Xóa"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full border border-slate-100 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {editingCampaign ? "Cập nhật chiến dịch" : (isAdmin ? "Tạo chiến dịch mới" : "Đề xuất chiến dịch mới")}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800">Tên chiến dịch</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-sm"
                  placeholder="Ví dụ: Khuyến mãi Hè Rực Rỡ"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800">Loại ưu đãi</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-sm"
                >
                  <option value="discount">Phần trăm giảm (%)</option>
                  <option value="fixed_price">Giá cố định (VND)</option>
                </select>
                <p className="text-xs text-[#9a734c] flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Áp dụng cho sản phẩm đã chọn trên toàn bộ hệ thống cửa hàng.
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Products selection */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <label className="text-sm font-bold text-slate-800">Danh sách sản phẩm và ưu đãi</label>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                    Đã chọn {campaignProducts.length} sản phẩm
                  </span>
                </div>

                {/* Search within product list */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] w-4 h-4" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-xs placeholder:text-slate-400"
                  />
                </div>

                {/* Tick-list of products */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                    {(() => {
                      const visibleProducts = products.filter(p =>
                        p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
                      );
                      if (visibleProducts.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 italic text-center py-8">
                            {products.length === 0 ? "Không có sản phẩm khả dụng" : "Không tìm thấy sản phẩm phù hợp"}
                          </p>
                        );
                      }
                      return visibleProducts.map(p => {
                        const rule = campaignProducts.find(cp => cp.productId === p._id);
                        const isSelected = !!rule;
                        const finalPrice = rule ? getFinalPrice(p.price, rule) : null;
                        const isPriceIncreased = finalPrice !== null && finalPrice > p.price;
                        return (
                          <div
                            key={p._id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                              isSelected ? "bg-orange-50/60" : "hover:bg-slate-50"
                            }`}
                            onClick={() => handleToggleProduct(p._id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProduct(p._id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4.5 h-4.5 shrink-0 rounded border-slate-300 accent-orange-600 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${isSelected ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>
                                {p.name}
                              </p>
                              {isSelected && finalPrice !== null ? (
                                <p className="text-xs flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-400 line-through">{p.price.toLocaleString("vi-VN")}đ</span>
                                  <span className="text-slate-400">→</span>
                                  <span className={`font-bold ${isPriceIncreased ? "text-rose-600" : "text-emerald-600"}`}>
                                    {finalPrice.toLocaleString("vi-VN")}đ
                                  </span>
                                  {isPriceIncreased ? (
                                    <span className="text-rose-500 font-semibold">cao hơn giá gốc!</span>
                                  ) : (
                                    p.price > 0 && finalPrice < p.price && (
                                      <span className="text-emerald-600/80">
                                        (-{Math.round(((p.price - finalPrice) / p.price) * 100)}%)
                                      </span>
                                    )
                                  )}
                                </p>
                              ) : (
                                <p className="text-xs text-[#9a734c]">{p.price.toLocaleString("vi-VN")}đ</p>
                              )}
                            </div>

                            {/* Inline rule input for the selected product */}
                            {isSelected && (
                              <div className="w-32 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {formType === "discount" ? (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={rule.discount ?? ""}
                                      onChange={(e) => handleProductRuleChange(p._id, "discount", Number(e.target.value))}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 text-xs pr-7"
                                      placeholder="Giảm"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      value={rule.fixedPrice ?? ""}
                                      onChange={(e) => handleProductRuleChange(p._id, "fixedPrice", Number(e.target.value))}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 text-xs pr-7"
                                      placeholder="Giá"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {campaignProducts.length === 0 && (
                  <p className="text-xs text-slate-400 italic">
                    Tick chọn sản phẩm trong danh sách trên để thêm vào chiến dịch.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/10 transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Đang xử lý..." : editingCampaign ? "Lưu thay đổi" : (isAdmin ? "Kích hoạt chiến dịch" : "Gửi đề xuất")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaigns;
