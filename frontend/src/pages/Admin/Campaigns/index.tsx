import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import campaignAPI, { CampaignStatus } from "@/services/campaign.service";
import type {
  Campaign,
  CampaignSuggestionResponse,
} from "@/services/campaign.service";
import productAPI from "@/services/product.service";
import type { Product } from "@/types/product";
import {
  isCampaignDraft,
  type CampaignDraft,
  type CampaignNavigationState,
} from "@/types/campaignDraft";
import { useAuth } from "@/hooks/useAuth";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
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
  ChevronDown,
  Percent,
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Award,
  Eye,
  Lightbulb,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

type AIGoal = "boost_sales" | "clear_stock" | "contextual";

type AISuggestionContext = {
  goal: AIGoal;
  days: number;
};

const AdminCampaigns = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const consumedDraftRef = useRef<string | null>(null);
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [metadataLoadFailed, setMetadataLoadFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("discount");
  const [campaignProducts, setCampaignProducts] = useState<
    {
      productId: string;
      fixedPrice?: number | null;
      discount?: number | null;
    }[]
  >([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "running" | "upcoming" | "ended_rejected"
  >("all");
  const [viewMode, setViewMode] = useState<"list" | "analytics">("list");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<
    "week" | "month" | "year"
  >("month");
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(
    null,
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [selectedProductDetails, setSelectedProductDetails] =
    useState<Product | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(
    null,
  );
  const [aiDays, setAiDays] = useState(14);
  const [aiGoal, setAiGoal] = useState<AIGoal>("boost_sales");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] =
    useState<CampaignSuggestionResponse | null>(null);
  const [aiSuggestionContext, setAiSuggestionContext] =
    useState<AISuggestionContext | null>(null);
  const [aiProductCount, setAiProductCount] = useState(3);
  const [aiWeather, setAiWeather] = useState<
    "auto" | "rainy" | "hot" | "cold" | "sunny" | "normal"
  >("auto");
  const [aiOccasion, setAiOccasion] = useState<string>("auto");
  const [isCustomOccasion, setIsCustomOccasion] = useState(false);
  const [customOccasion, setCustomOccasion] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAICampaign, setPendingAICampaign] =
    useState<CampaignSuggestionResponse | null>(null);
  const [pendingAIContext, setPendingAIContext] =
    useState<AISuggestionContext | null>(null);
  const [confirmingAiCampaign, setConfirmingAiCampaign] = useState(false);
  const [aiCampaignName, setAiCampaignName] = useState("Chiến dịch Ưu đãi Đặc biệt");
  const [aiStartTime, setAiStartTime] = useState("");
  const [aiEndTime, setAiEndTime] = useState("");

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
      const prodRes = await productAPI.getProducts({
        limit: 1000,
        isAvailable: true,
      });
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error("Error fetching metadata:", err);
      setMetadataLoadFailed(true);
      toast.error("Không thể tải sản phẩm để tạo chiến dịch");
    } finally {
      setMetadataLoaded(true);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await orderService.getAllOrders({ limit: 1000 });
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchMetadata();
    fetchOrders();
  }, []);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (
      showModal ||
      showAIModal ||
      showConfirmModal ||
      selectedProductDetails
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal, showAIModal, showConfirmModal, selectedProductDetails]);

  const handleOpenCreateModal = () => {
    setCampaignDraft(null);
    setEditingCampaign(null);
    setFormName("");
    setFormType("discount");
    setCampaignProducts([]);
    setStartTime("");
    setEndTime("");
    setProductSearch("");
    setWasSubmitted(false);
    setShowCalendar(false);
    setShowTypeDropdown(false);
    setShowModal(true);
  };

  const handleOpenAIModal = () => {
    setAiSuggestion(null);
    setAiSuggestionContext(null);
    setPendingAICampaign(null);
    setPendingAIContext(null);
    setAiDays(14);
    setAiGoal("boost_sales");
    setAiProductCount(3);
    setAiWeather("auto");
    setAiOccasion("auto");
    setIsCustomOccasion(false);
    setCustomOccasion("");
    setShowConfirmModal(false);
    setShowAIModal(true);
  };

  const handleGenerateAISuggestion = async () => {
    setAiSuggestion(null); // Xóa kết quả cũ ngay lập tức trước khi gọi API mới
    setAiSuggestionContext(null);
    setAiLoading(true);
    const requestContext: AISuggestionContext = {
      goal: aiGoal,
      days: aiDays,
    };
    try {
      const res = await campaignAPI.suggestCampaign({
        days: requestContext.days,
        goal: requestContext.goal,
        productCount: aiProductCount,
        ...(aiWeather !== "auto" && { weather: aiWeather }),
        ...(aiOccasion !== "auto" && { occasion: aiOccasion }),
      });
      if (res.success) {
        setAiSuggestion(res.data);
        setAiSuggestionContext(requestContext);
        toast.success("Đã tạo gợi ý chiến dịch thành công");
      } else {
        toast.error(res.message || "Không thể tạo gợi ý chiến dịch");
      }
    } catch (error) {
      console.error("Error generating AI campaign suggestion:", error);
      toast.error("Không thể tạo gợi ý chiến dịch lúc này");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiSuggestion) return;

    setPendingAICampaign(aiSuggestion);
    setPendingAIContext(aiSuggestionContext);
    // Use the AI-generated contextual name as default (based on occasion/weather/goal)
    // User can still edit it before confirming
    setAiCampaignName(aiSuggestion.name || "Chiến dịch Ưu đãi Đặc biệt");

    const startVal = aiSuggestion.startTime
      ? toLocalDatetimeInput(aiSuggestion.startTime)
      : toLocalDatetimeInput(new Date().toISOString());

    const endVal = aiSuggestion.endTime
      ? toLocalDatetimeInput(aiSuggestion.endTime)
      : toLocalDatetimeInput(
        new Date(new Date(startVal).getTime() + (aiSuggestion.durationDays || 7) * 24 * 60 * 60 * 1000).toISOString()
      );

    setAiStartTime(startVal);
    setAiEndTime(endVal);

    setShowAIModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmAICampaign = async () => {
    if (!pendingAICampaign) return;

    if (!aiCampaignName.trim()) {
      toast.error("Vui lòng nhập tên chiến dịch");
      return;
    }
    if (!aiStartTime || !aiEndTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    const startDate = new Date(aiStartTime);
    const endDate = new Date(aiEndTime);

    if (startDate >= endDate) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    // Frontend uniqueness check against already-loaded campaigns
    const trimmedName = aiCampaignName.trim();
    const isDuplicateName = campaigns.some(
      (c) =>
        c.name.toLowerCase() === trimmedName.toLowerCase() &&
        new Date(c.startTime).getTime() < endDate.getTime() &&
        new Date(c.endTime).getTime() > startDate.getTime()
    );
    if (isDuplicateName) {
      toast.error(
        "Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này. Vui lòng đặt tên khác."
      );
      return;
    }

    const payload = {
      name: aiCampaignName.trim(),
      type: pendingAICampaign.type || "discount",
      products: pendingAICampaign.products.map((product) => ({
        productId: product.productId,
        fixedPrice:
          pendingAICampaign.type === "fixed_price"
            ? (product.fixedPrice ?? null)
            : null,
        discount:
          pendingAICampaign.type === "discount"
            ? (product.discount ?? 10)
            : null,
      })),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };

    setConfirmingAiCampaign(true);
    try {
      const res = await campaignAPI.createCampaign(payload);
      if (res.success) {
        toast.success("Đã tạo chiến dịch từ gợi ý AI thành công");
        fetchCampaigns();
        setShowConfirmModal(false);
        setPendingAICampaign(null);
        setPendingAIContext(null);
      } else {
        toast.error(res.message || "Không thể tạo chiến dịch từ gợi ý AI");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Đã xảy ra lỗi",
      );
    } finally {
      setConfirmingAiCampaign(false);
    }
  };

  useEffect(() => {
    if (!metadataLoaded) return;

    const navigationState = location.state as CampaignNavigationState | null;
    const draft = navigationState?.campaignDraft;

    if (!isCampaignDraft(draft)) return;

    const draftKey = `${draft.productId}:${draft.suggestion}:${draft.periodDays}:${draft.coveragePercent}`;

    if (consumedDraftRef.current === draftKey) return;

    consumedDraftRef.current = draftKey;

    const product = products.find((item) => item._id === draft.productId);

    navigate(location.pathname, {
      replace: true,
      state: null,
    });

    if (metadataLoadFailed) return;

    if (!product) {
      toast.error("Món được gợi ý hiện không còn khả dụng để tạo chiến dịch");
      return;
    }

    setEditingCampaign(null);
    setCampaignDraft(draft);
    setFormName(
      draft.suggestion === "recover"
        ? "Chiến dịch phục hồi"
        : draft.suggestionLabel,
    );
    setFormType("discount");
    setCampaignProducts([
      {
        productId: product._id,
        fixedPrice: null,
        discount: draft.suggestedDiscount,
      },
    ]);
    setStartTime("");
    setEndTime("");
    setProductSearch("");
    setWasSubmitted(false);
    setShowCalendar(false);
    setShowTypeDropdown(false);
    setViewMode("list");
    setShowModal(true);
  }, [
    location.pathname,
    location.state,
    metadataLoadFailed,
    metadataLoaded,
    navigate,
    products,
  ]);

  const toLocalDatetimeInput = (isoStr: string) => {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getOccasionTimeframeText = (occ: string) => {
    const currentYear = new Date().getFullYear();
    let label = "";
    let range = "";

    let resolvedOcc = occ;
    if (occ === "auto") {
      const date = new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const isTet = (month === 1 && day >= 20) || (month === 2 && day <= 10) || (month === 12 && day >= 25);
      const isChristmas = (month === 12 && day >= 20) || (month === 1 && day <= 5);
      const isSummer = month >= 5 && month <= 8;
      const isValentine = (month === 2 && day >= 7 && day <= 17);

      if (isTet) resolvedOcc = "tet";
      else if (isChristmas) resolvedOcc = "christmas";
      else if (isSummer) resolvedOcc = "summer";
      else if (isValentine) resolvedOcc = "valentine";
      else resolvedOcc = "none";
    }

    if (resolvedOcc === "christmas") {
      label = "Giáng Sinh";
      range = `20/12/${currentYear} - 05/01/${currentYear + 1}`;
    } else if (resolvedOcc === "tet") {
      label = "Tết Nguyên Đán";
      range = `20/01/${currentYear} - 15/02/${currentYear}`;
    } else if (resolvedOcc === "valentine") {
      label = "Valentine";
      range = `07/02/${currentYear} - 17/02/${currentYear}`;
    } else if (resolvedOcc === "summer") {
      label = "Mùa Hè";
      range = `01/05/${currentYear} - 31/08/${currentYear}`;
    } else {
      label = "Chiến dịch thường";
      range = "Bắt đầu ngày mai, kéo dài theo số ngày phân tích";
    }

    return { label, range, isAuto: occ === "auto", resolvedOcc };
  };

  const formatDateToLocalInput = (date: Date, isEnd: boolean) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const hours = isEnd ? 23 : 0;
    const minutes = isEnd ? 59 : 0;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hours)}:${pad(minutes)}`;
  };

  const handleCalendarDayClick = (day: number) => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const clickedDate = new Date(year, month, day);

    if (!startTime || (startTime && endTime)) {
      // Start selection
      setStartTime(formatDateToLocalInput(clickedDate, false));
      setEndTime("");
    } else {
      const currentStart = new Date(startTime);
      if (clickedDate < currentStart) {
        // Reset start
        setStartTime(formatDateToLocalInput(clickedDate, false));
      } else {
        // Complete range
        setEndTime(formatDateToLocalInput(clickedDate, true));
        setShowCalendar(false);
      }
    }
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const handleOpenEditModal = (c: Campaign) => {
    setCampaignDraft(null);
    setEditingCampaign(c);
    setFormName(c.name);
    setFormType(c.type);
    setStartTime(toLocalDatetimeInput(c.startTime));
    setEndTime(toLocalDatetimeInput(c.endTime));

    const formattedProducts = c.products.map((p) => {
      const pId =
        typeof p.productId === "string"
          ? p.productId
          : (p.productId as any)._id;

      return {
        productId: pId,
        fixedPrice: p.fixedPrice,
        discount: p.discount,
      };
    });
    setCampaignProducts(formattedProducts);
    setProductSearch("");
    setWasSubmitted(false);
    setShowCalendar(false);
    setShowTypeDropdown(false);
    setShowModal(true);
  };

  const handleToggleProduct = (productId: string) => {
    setCampaignProducts((prev) =>
      prev.some((p) => p.productId === productId)
        ? prev.filter((p) => p.productId !== productId)
        : [...prev, { productId, fixedPrice: null, discount: 10 }],
    );
  };

  const handleProductRuleChange = (
    productId: string,
    field: "fixedPrice" | "discount",
    value: number,
  ) => {
    setCampaignProducts((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, [field]: value } : p,
      ),
    );
  };

  const getFinalPrice = (
    basePrice: number,
    rule: { fixedPrice?: number | null; discount?: number | null },
  ): number | null => {
    if (formType === "fixed_price") {
      return rule.fixedPrice ?? null;
    }
    if (rule.discount === null || rule.discount === undefined) return null;
    return Math.round(basePrice * (1 - rule.discount / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWasSubmitted(true);
    if (!formName.trim()) return toast.error("Vui lòng nhập tên chiến dịch");
    if (!startTime || !endTime)
      return toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
    if (new Date(startTime) >= new Date(endTime))
      return toast.error("Thời gian bắt đầu phải trước thời gian kết thúc");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isNewCampaign = !editingCampaign;
    const isStartTimeModified =
      editingCampaign &&
      new Date(startTime).getTime() !==
      new Date(editingCampaign.startTime).getTime();
    if ((isNewCampaign || isStartTimeModified) && new Date(startTime) < today) {
      return toast.error("Thời gian bắt đầu phải từ ngày hôm nay trở đi");
    }

    if (campaignProducts.length === 0)
      return toast.error("Chiến dịch phải có ít nhất một sản phẩm");

    // Check if another campaign has the same name and overlaps in time
    const formStart = new Date(startTime).getTime();
    const formEnd = new Date(endTime).getTime();
    const normalizedFormName = formName.trim().toLowerCase();

    const nameCollision = campaigns.find((c) => {
      if (editingCampaign && c._id === editingCampaign._id) return false;
      const cStart = new Date(c.startTime).getTime();
      const cEnd = new Date(c.endTime).getTime();
      const nameMatches = c.name.trim().toLowerCase() === normalizedFormName;
      const timeOverlaps = formStart < cEnd && cStart < formEnd;
      return nameMatches && timeOverlaps;
    });

    if (nameCollision) {
      return toast.error(
        "Đã có chiến dịch cùng tên hoạt động trong khoảng thời gian này",
      );
    }

    // Check product rules
    for (const p of campaignProducts) {
      if (
        formType === "fixed_price" &&
        (p.fixedPrice === undefined ||
          p.fixedPrice === null ||
          p.fixedPrice < 0)
      ) {
        return toast.error(
          "Vui lòng nhập giá cố định hợp lệ cho tất cả sản phẩm",
        );
      }
      if (
        formType === "discount" &&
        (p.discount === undefined ||
          p.discount === null ||
          p.discount < 0 ||
          p.discount > 100)
      ) {
        return toast.error(
          "Vui lòng nhập phần trăm giảm giá (0-100) cho tất cả sản phẩm",
        );
      }
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      products: campaignProducts.map((p) => ({
        productId: p.productId,
        fixedPrice: formType === "fixed_price" ? Number(p.fixedPrice) : null,
        discount: formType === "discount" ? Number(p.discount) : null,
      })),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };

    setSubmitting(true);
    try {
      if (editingCampaign) {
        const res = await campaignAPI.updateCampaign(
          editingCampaign._id,
          payload,
        );
        if (res.success) {
          toast.success("Cập nhật chiến dịch thành công");
          fetchCampaigns();
          setShowModal(false);
        }
      } else {
        const res = await campaignAPI.createCampaign(payload);
        if (res.success) {
          toast.success(
            isAdmin
              ? "Tạo và phê duyệt chiến dịch thành công"
              : "Gửi đề xuất chiến dịch thành công",
          );
          fetchCampaigns();
          setShowModal(false);
        }
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Đã xảy ra lỗi",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: CampaignStatus) => {
    try {
      const res = await campaignAPI.updateStatus(id, status);
      if (res.success) {
        toast.success(
          status === CampaignStatus.APPROVED
            ? "Đã duyệt chiến dịch!"
            : "Đã từ chối đề xuất",
        );
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Cập nhật trạng thái thất bại",
      );
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (deletingId) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa chiến dịch này không?"))
      return;
    setDeletingId(id);
    try {
      const res = await campaignAPI.deleteCampaign(id);
      if (res.success) {
        toast.success("Xóa chiến dịch thành công");
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Xóa thất bại",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const isCampaignActive = (c: Campaign) => {
    if (c.status !== CampaignStatus.APPROVED) return false;
    const now = new Date().getTime();
    return (
      now >= new Date(c.startTime).getTime() &&
      now <= new Date(c.endTime).getTime()
    );
  };

  const getStatusBadge = (c: Campaign) => {
    switch (c.status) {
      case CampaignStatus.APPROVED: {
        if (new Date().getTime() < new Date(c.startTime).getTime()) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              <span className="size-1.5 rounded-full bg-sky-500" />
              Sắp diễn ra
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

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesName = c.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const startTimeMs = new Date(c.startTime).getTime();
    const endTimeMs = new Date(c.endTime).getTime();
    const now = new Date().getTime();

    let matchesStartDate = true;
    if (filterStartDate) {
      const filterStartMs = new Date(filterStartDate).setHours(0, 0, 0, 0);
      matchesStartDate = startTimeMs >= filterStartMs;
    }

    let matchesEndDate = true;
    if (filterEndDate) {
      const filterEndMs = new Date(filterEndDate).setHours(23, 59, 59, 999);
      matchesEndDate = endTimeMs <= filterEndMs;
    }

    let matchesTab = true;
    if (activeTab === "pending") {
      matchesTab = c.status === CampaignStatus.PENDING;
    } else if (activeTab === "running") {
      matchesTab =
        c.status === CampaignStatus.APPROVED &&
        now >= startTimeMs &&
        now <= endTimeMs;
    } else if (activeTab === "upcoming") {
      matchesTab = c.status === CampaignStatus.APPROVED && now < startTimeMs;
    } else if (activeTab === "ended_rejected") {
      matchesTab =
        c.status === CampaignStatus.REJECTED ||
        (c.status === CampaignStatus.APPROVED && now > endTimeMs);
    }

    return matchesName && matchesStartDate && matchesEndDate && matchesTab;
  });

  // Find all product IDs already active in other approved campaigns during the selected form's time range
  const occupiedProductIds = useMemo(() => {
    if (!showModal || !startTime || !endTime) return new Set<string>();

    const formStart = new Date(startTime).getTime();
    const formEnd = new Date(endTime).getTime();

    if (isNaN(formStart) || isNaN(formEnd) || formStart >= formEnd) {
      return new Set<string>();
    }

    const occupied = new Set<string>();

    campaigns.forEach((c) => {
      // Skip current editing campaign to allow editing its own products
      if (editingCampaign && c._id === editingCampaign._id) return;
      // Only check approved (active/scheduled) campaigns
      if (c.status !== CampaignStatus.APPROVED) return;

      const cStart = new Date(c.startTime).getTime();
      const cEnd = new Date(c.endTime).getTime();

      // Check if dates overlap
      const isOverlapping = formStart < cEnd && cStart < formEnd;
      if (isOverlapping) {
        c.products.forEach((p) => {
          if (!p.productId) return;
          let pId = "";
          if (typeof p.productId === "string") {
            pId = p.productId;
          } else if (typeof p.productId === "object") {
            pId = (p.productId as any)._id || (p.productId as any).id;
          }
          if (pId) {
            occupied.add(pId.toString());
          }
        });
      }
    });

    return occupied;
  }, [campaigns, startTime, endTime, editingCampaign, showModal]);

  // Auto-deselect products if they become occupied due to date changes
  useEffect(() => {
    if (!showModal) return; // Chỉ kiểm tra khi modal đang mở để tránh race condition khi vừa tạo thành công
    if (occupiedProductIds.size > 0 && campaignProducts.length > 0) {
      const conflictingProducts = campaignProducts.filter((cp) =>
        occupiedProductIds.has(cp.productId),
      );
      if (conflictingProducts.length > 0) {
        setCampaignProducts((prev) =>
          prev.filter((cp) => !occupiedProductIds.has(cp.productId)),
        );
        toast.error(
          "Một số món bạn đã chọn bị trùng lịch hoạt động ở chiến dịch khác và đã được tự động bỏ chọn.",
        );
      }
    }
  }, [occupiedProductIds, campaignProducts, showModal]);

  const analyticsData = useMemo(() => {
    // CHÚ Ý: Chỉ tính toán số liệu từ các đơn hàng đã thanh toán thành công (order.payment?.paidAt || order.status === "completed" || order.status === "delivered")
    const now = new Date();
    let periodDays = 30;
    if (analyticsPeriod === "week") periodDays = 7;
    if (analyticsPeriod === "year") periodDays = 365;

    const startDateLimit = new Date();
    startDateLimit.setDate(now.getDate() - periodDays);

    const approvedCampaigns = campaigns.filter(
      (c) => c.status === CampaignStatus.APPROVED,
    );

    // Lọc ra các đơn hàng đã thanh toán thành công
    const paidOrders = orders.filter(
      (o) =>
        o.payment?.paidAt ||
        o.status === "completed" ||
        o.status === "delivered",
    );

    const campaignStats = approvedCampaigns
      .filter(
        (c) => selectedCampaignId === "all" || c._id === selectedCampaignId,
      )
      .map((c) => {
        const isWithinPeriod = new Date(c.startTime) >= startDateLimit;

        const campaignProductsDetails = c.products.map((cp, idx) => {
          let prodInfo: Product | undefined = undefined;
          let prodId = "";

          if (typeof cp.productId === "string") {
            prodId = cp.productId;
            prodInfo = products.find((p) => p._id === cp.productId);
          } else if (cp.productId && typeof cp.productId === "object") {
            prodId = (cp.productId as any)._id || (cp.productId as any).id;
            prodInfo = cp.productId as any;
          }

          const pName = prodInfo?.name || `Sản phẩm #${idx + 1}`;
          const pPrice = prodInfo?.price || 85000;

          // Tính toán số lượng và doanh thu thực tế từ orders
          let pQty = 0;
          let pSales = 0;
          let pDiscountVal = 0;

          // Lọc các đơn hàng chứa sản phẩm này và nằm trong khoảng thời gian của chiến dịch
          paidOrders.forEach((order) => {
            const orderDate = new Date(order.createdAt);
            const campaignStart = new Date(c.startTime);
            const campaignEnd = new Date(c.endTime);

            if (orderDate >= campaignStart && orderDate <= campaignEnd) {
              order.items.forEach((item) => {
                const itemProdId =
                  typeof item.productId === "string"
                    ? item.productId
                    : item.productId?._id;
                if (itemProdId === prodId) {
                  pQty += item.quantity;
                  pSales += item.subTotal;

                  // Chiết khấu = Giá gốc * số lượng - Giá bán thực tế (subTotal)
                  const originalSubtotal = item.quantity * pPrice;
                  pDiscountVal += Math.max(0, originalSubtotal - item.subTotal);
                }
              });
            }
          });

          return {
            id: prodId,
            name: pName,
            originalPrice: pPrice,
            rule:
              c.type === "discount"
                ? `-${cp.discount}%`
                : `${cp.fixedPrice?.toLocaleString("vi-VN")}đ`,
            qtySold: pQty,
            sales: pSales,
            discount: pDiscountVal,
          };
        });

        const totalCalculatedSales = campaignProductsDetails.reduce(
          (acc, p) => acc + p.sales,
          0,
        );
        const totalCalculatedDiscount = campaignProductsDetails.reduce(
          (acc, p) => acc + p.discount,
          0,
        );

        // Số lượng đơn hàng thực tế chứa ít nhất một sản phẩm của chiến dịch trong thời gian chạy chiến dịch
        let campaignOrdersCount = 0;
        paidOrders.forEach((order) => {
          const orderDate = new Date(order.createdAt);
          const campaignStart = new Date(c.startTime);
          const campaignEnd = new Date(c.endTime);

          if (orderDate >= campaignStart && orderDate <= campaignEnd) {
            const hasCampaignProduct = order.items.some((item) => {
              const itemProdId =
                typeof item.productId === "string"
                  ? item.productId
                  : item.productId?._id;
              return c.products.some((cp) => {
                const cpProdId =
                  typeof cp.productId === "string"
                    ? cp.productId
                    : cp.productId?._id;
                return itemProdId === cpProdId;
              });
            });
            if (hasCampaignProduct) {
              campaignOrdersCount++;
            }
          }
        });

        const baseSales = totalCalculatedSales;
        const discountAmount = totalCalculatedDiscount;
        const baseOrders = campaignOrdersCount;
        const multiplier =
          discountAmount > 0
            ? parseFloat((baseSales / discountAmount).toFixed(1))
            : 0.0;

        // Tỷ lệ chuyển đổi = (Số đơn hàng thực tế / Lượt xem) * 100
        const conversionRate =
          c.views && c.views > 0
            ? ((baseOrders / c.views) * 100).toFixed(1)
            : "0.0";

        return {
          id: c._id,
          name: c.name,
          startTime: c.startTime,
          endTime: c.endTime,
          type: c.type,
          sales: isWithinPeriod ? baseSales : 0,
          discount: isWithinPeriod ? discountAmount : 0,
          orders: isWithinPeriod ? baseOrders : 0,
          avgDiscount:
            c.type === "discount"
              ? c.products.reduce((acc, p) => acc + (p.discount || 10), 0) /
              (c.products.length || 1)
              : 15,
          multiplier,
          conversionRate,
          views: c.views || 0,
          clicks: c.clicks || 0,
          isWithinPeriod,
          productsList: campaignProductsDetails,
        };
      });

    const activePeriodStats = campaignStats.filter((s) => s.isWithinPeriod);

    const totalSales = activePeriodStats.reduce((acc, s) => acc + s.sales, 0);
    const totalDiscounts = activePeriodStats.reduce(
      (acc, s) => acc + s.discount,
      0,
    );
    const totalOrders = activePeriodStats.reduce((acc, s) => acc + s.orders, 0);
    const totalViews = activePeriodStats.reduce(
      (acc, s) => acc + (s.views || 0),
      0,
    );

    const overallMultiplier =
      totalDiscounts > 0 ? (totalSales / totalDiscounts).toFixed(1) : "0.0";
    const overallConversion =
      totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : "0.0";

    const chartData: any[] = [];
    if (analyticsPeriod === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayLabel = d.toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "numeric",
        });

        let daySales = 0;
        let dayDiscount = 0;

        const startOfDay = new Date(d);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);

        paidOrders.forEach((order) => {
          const orderDate = new Date(order.createdAt);
          if (orderDate >= startOfDay && orderDate <= endOfDay) {
            order.items.forEach((item) => {
              const itemProdId =
                typeof item.productId === "string"
                  ? item.productId
                  : item.productId?._id;

              activePeriodStats.forEach((campStat) => {
                const campaign = approvedCampaigns.find(
                  (ac) => ac._id === campStat.id,
                );
                if (campaign) {
                  const campaignStart = new Date(campaign.startTime);
                  const campaignEnd = new Date(campaign.endTime);
                  if (orderDate >= campaignStart && orderDate <= campaignEnd) {
                    const matchedProd = campaign.products.find((cp) => {
                      const cpProdId =
                        typeof cp.productId === "string"
                          ? cp.productId
                          : cp.productId?._id;
                      return cpProdId === itemProdId;
                    });
                    if (matchedProd) {
                      daySales += item.subTotal;
                      const prodInfo = products.find(
                        (p) => p._id === itemProdId,
                      );
                      const originalPrice = prodInfo?.price || 0;
                      dayDiscount += Math.max(
                        0,
                        item.quantity * originalPrice - item.subTotal,
                      );
                    }
                  }
                }
              });
            });
          }
        });

        chartData.push({
          name: dayLabel,
          "Doanh số": daySales,
          "Chiết khấu": dayDiscount,
        });
      }
    } else if (analyticsPeriod === "month") {
      for (let i = 3; i >= 0; i--) {
        const weekLabel = `Tuần ${4 - i}`;

        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - i * 7 - 6);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date();
        endOfWeek.setDate(now.getDate() - i * 7);
        endOfWeek.setHours(23, 59, 59, 999);

        let weekSales = 0;
        let weekDiscount = 0;

        paidOrders.forEach((order) => {
          const orderDate = new Date(order.createdAt);
          if (orderDate >= startOfWeek && orderDate <= endOfWeek) {
            order.items.forEach((item) => {
              const itemProdId =
                typeof item.productId === "string"
                  ? item.productId
                  : item.productId?._id;
              activePeriodStats.forEach((campStat) => {
                const campaign = approvedCampaigns.find(
                  (ac) => ac._id === campStat.id,
                );
                if (campaign) {
                  const campaignStart = new Date(campaign.startTime);
                  const campaignEnd = new Date(campaign.endTime);
                  if (orderDate >= campaignStart && orderDate <= campaignEnd) {
                    const matchedProd = campaign.products.find((cp) => {
                      const cpProdId =
                        typeof cp.productId === "string"
                          ? cp.productId
                          : cp.productId?._id;
                      return cpProdId === itemProdId;
                    });
                    if (matchedProd) {
                      weekSales += item.subTotal;
                      const prodInfo = products.find(
                        (p) => p._id === itemProdId,
                      );
                      const originalPrice = prodInfo?.price || 0;
                      weekDiscount += Math.max(
                        0,
                        item.quantity * originalPrice - item.subTotal,
                      );
                    }
                  }
                }
              });
            });
          }
        });

        chartData.push({
          name: weekLabel,
          "Doanh số": weekSales,
          "Chiết khấu": weekDiscount,
        });
      }
    } else {
      const months = [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "T8",
        "T9",
        "T10",
        "T11",
        "T12",
      ];
      const currentMonthIndex = now.getMonth();
      for (let i = 11; i >= 0; i--) {
        const mIdx = (currentMonthIndex - i + 12) % 12;
        const monthLabel = months[mIdx];

        const targetYear =
          now.getFullYear() - (currentMonthIndex - i < 0 ? 1 : 0);
        const startOfMonth = new Date(targetYear, mIdx, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(targetYear, mIdx + 1, 0, 23, 59, 59, 999);

        let monthSales = 0;
        let monthDiscount = 0;

        paidOrders.forEach((order) => {
          const orderDate = new Date(order.createdAt);
          if (orderDate >= startOfMonth && orderDate <= endOfMonth) {
            order.items.forEach((item) => {
              const itemProdId =
                typeof item.productId === "string"
                  ? item.productId
                  : item.productId?._id;
              activePeriodStats.forEach((campStat) => {
                const campaign = approvedCampaigns.find(
                  (ac) => ac._id === campStat.id,
                );
                if (campaign) {
                  const campaignStart = new Date(campaign.startTime);
                  const campaignEnd = new Date(campaign.endTime);
                  if (orderDate >= campaignStart && orderDate <= campaignEnd) {
                    const matchedProd = campaign.products.find((cp) => {
                      const cpProdId =
                        typeof cp.productId === "string"
                          ? cp.productId
                          : cp.productId?._id;
                      return cpProdId === itemProdId;
                    });
                    if (matchedProd) {
                      monthSales += item.subTotal;
                      const prodInfo = products.find(
                        (p) => p._id === itemProdId,
                      );
                      const originalPrice = prodInfo?.price || 0;
                      monthDiscount += Math.max(
                        0,
                        item.quantity * originalPrice - item.subTotal,
                      );
                    }
                  }
                }
              });
            });
          }
        });

        chartData.push({
          name: monthLabel,
          "Doanh số": monthSales,
          "Chiết khấu": monthDiscount,
        });
      }
    }

    return {
      campaignStats,
      activePeriodStats,
      totalSales,
      totalDiscounts,
      totalOrders,
      overallMultiplier,
      overallConversion,
      chartData,
    };
  }, [campaigns, orders, products, analyticsPeriod, selectedCampaignId]);

  // Real-time frontend validation errors
  const nameError = !formName.trim()
    ? "Tên chiến dịch không được để trống"
    : "";

  const isStartTimeInPast = useMemo(() => {
    if (!startTime) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (
      editingCampaign &&
      new Date(startTime).getTime() ===
      new Date(editingCampaign.startTime).getTime()
    ) {
      return false;
    }
    return new Date(startTime) < today;
  }, [startTime, editingCampaign]);

  const timeError =
    !startTime || !endTime
      ? "Vui lòng chọn thời gian bắt đầu và kết thúc"
      : new Date(startTime) >= new Date(endTime)
        ? "Thời gian bắt đầu phải trước thời gian kết thúc"
        : isStartTimeInPast
          ? "Thời gian bắt đầu phải từ ngày hôm nay trở đi"
          : "";
  const productCountError =
    campaignProducts.length === 0
      ? "Chiến dịch phải có ít nhất một sản phẩm"
      : "";

  const renderedAISuggestionGoal = aiSuggestionContext?.goal ?? aiGoal;
  const renderedAISuggestionDays = aiSuggestionContext?.days ?? aiDays;
  const renderedPendingDays = pendingAIContext?.days ?? aiDays;

  const getProductError = (cp: {
    productId: string;
    discount?: number | null;
    fixedPrice?: number | null;
  }) => {
    if (formType === "discount") {
      if (
        cp.discount === undefined ||
        cp.discount === null ||
        isNaN(cp.discount)
      ) {
        return "Yêu cầu nhập % giảm";
      }
      if (cp.discount < 0 || cp.discount > 100) {
        return "Phần trăm giảm từ 0 - 100";
      }
    } else if (formType === "fixed_price") {
      if (
        cp.fixedPrice === undefined ||
        cp.fixedPrice === null ||
        isNaN(cp.fixedPrice)
      ) {
        return "Yêu cầu nhập giá";
      }
      if (cp.fixedPrice < 0) {
        return "Giá không được âm";
      }
    }
    return "";
  };

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

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher */}
          <div className="flex bg-[#f3ede7] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "list"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Danh sách
            </button>
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "analytics"
                ? "bg-[#ee8c2b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Báo cáo hiệu quả
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAIModal}
            className="flex items-center justify-center gap-2 h-10 px-5 border border-[#ee8c2b] text-[#ee8c2b] bg-white hover:bg-orange-50 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            AI gợi ý
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 h-10 px-5 bg-[#ee8c2b] hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdmin ? "Tạo chiến dịch" : "Đề xuất chiến dịch"}
          </button>
        </div>
      </div>

      {/* Stats Cards (Only shown in list mode) */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">
                Đang hoạt động
              </p>
              <p className="text-[#1b140d] text-2xl font-black mt-1">
                {campaigns.filter(isCampaignActive).length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-gray-50 text-gray-600 rounded-xl">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">
                Tổng số chiến dịch
              </p>
              <p className="text-[#1b140d] text-2xl font-black mt-1">
                {campaigns.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Filter for Campaign Statuses (Only shown in list mode) */}
      {viewMode === "list" && (
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#e7dbcf] pb-3">
          {(
            [
              {
                key: "all",
                label: "Tất cả",
                count: campaigns.length,
                highlight: false,
              },
              {
                key: "running",
                label: "Đang diễn ra",
                count: campaigns.filter(isCampaignActive).length,
                highlight: false,
              },
              {
                key: "upcoming",
                label: "Sắp diễn ra",
                count: campaigns.filter(
                  (c) =>
                    c.status === CampaignStatus.APPROVED &&
                    new Date().getTime() < new Date(c.startTime).getTime(),
                ).length,
                highlight: false,
              },
              {
                key: "ended_rejected",
                label: "Hết hạn / Từ chối",
                count: campaigns.filter(
                  (c) =>
                    c.status === CampaignStatus.REJECTED ||
                    (c.status === CampaignStatus.APPROVED &&
                      new Date().getTime() > new Date(c.endTime).getTime()),
                ).length,
                highlight: false,
              },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${isActive
                  ? "bg-[#ee8c2b]/10 text-[#ee8c2b] shadow-sm border border-[#ee8c2b]/20"
                  : tab.highlight && tab.count > 0
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                    ? "bg-[#ee8c2b] text-white"
                    : tab.highlight && tab.count > 0
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600"
                    }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#ee8c2b] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar & List Table */}
      {viewMode === "list" && (
        <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm">
          {/* Search & Date Filters */}
          <div className="p-4 border-b border-[#e7dbcf] flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-md flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm tên chiến dịch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f3ede7]/50 border-none focus:ring-2 focus:ring-orange-600 focus:bg-white text-sm outline-none transition-all placeholder:text-[#9a734c] text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9a734c]">
                  Bắt đầu từ:
                </span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f3ede7]/50 text-slate-800 border-none text-xs outline-none focus:ring-2 focus:ring-orange-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9a734c]">
                  Kết thúc trước:
                </span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f3ede7]/50 text-slate-800 border-none text-xs outline-none focus:ring-2 focus:ring-orange-600 focus:bg-white"
                />
              </div>

              {(filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Tên chiến dịch
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Loại ưu đãi
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7dbcf]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      Không tìm thấy chiến dịch nào
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((c) => {
                    const isCreator =
                      typeof c.createdBy !== "string" &&
                      c.createdBy._id === user?._id;
                    const canModify =
                      isAdmin ||
                      (isCreator && c.status === CampaignStatus.PENDING);

                    return (
                      <tr
                        key={c._id}
                        className="hover:bg-[#ee8c2b]/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (c.status === CampaignStatus.APPROVED) {
                                setViewMode("analytics");
                                setSelectedCampaignId(c._id);
                                setExpandedCampaignId(c._id);
                              } else {
                                handleOpenEditModal(c);
                              }
                            }}
                            className="text-slate-800 hover:text-[#ee8c2b] hover:underline transition-colors text-left font-bold focus:outline-none"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(c)}</td>
                        <td className="px-6 py-4 text-sm font-semibold capitalize text-[#ee8c2b]">
                          {c.type === "fixed_price"
                            ? "Giá cố định"
                            : "Phần trăm giảm"}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            <span>
                              Bắt đầu:{" "}
                              {new Date(c.startTime).toLocaleString("vi-VN")}
                            </span>
                            <span>
                              Kết thúc:{" "}
                              {new Date(c.endTime).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {c.status === CampaignStatus.APPROVED && (
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode("analytics");
                                  setSelectedCampaignId(c._id);
                                  setExpandedCampaignId(c._id);
                                }}
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-[#ee8c2b]/10 text-[#ee8c2b] hover:bg-[#ee8c2b]/20 transition-colors"
                                title="Xem hiệu quả chi tiết"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                            )}
                            {isAdmin && c.status === CampaignStatus.PENDING && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateStatus(
                                      c._id,
                                      CampaignStatus.APPROVED,
                                    )
                                  }
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="Duyệt"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateStatus(
                                      c._id,
                                      CampaignStatus.REJECTED,
                                    )
                                  }
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Performance Analytics Dashboard */}
      {viewMode === "analytics" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Analytics Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#e7dbcf] p-4 rounded-2xl shadow-sm">
            <div>
              <h4 className="text-base font-bold text-slate-800">
                {selectedCampaignId === "all"
                  ? "Hiệu quả chiến dịch tổng hợp"
                  : `Hiệu quả: ${campaigns.find((c) => c._id === selectedCampaignId)?.name || ""}`}
              </h4>
              <p className="text-xs text-slate-400">
                Xem và phân tích hiệu quả dựa trên doanh số và chiết khấu của
                các đơn hàng đã thanh toán thành công.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9a734c]">
                  Chiến dịch:
                </span>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#f3ede7]/50 text-slate-800 border border-[#e7dbcf] text-xs outline-none focus:ring-2 focus:ring-orange-600 focus:bg-white transition-all font-bold"
                >
                  <option value="all">Tất cả chiến dịch</option>
                  {campaigns
                    .filter((c) => c.status === CampaignStatus.APPROVED)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9a734c]">
                  Khoảng thời gian:
                </span>
                <div className="flex bg-[#f3ede7] rounded-xl p-1">
                  {(["week", "month", "year"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setAnalyticsPeriod(period)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${analyticsPeriod === period
                        ? "bg-[#ee8c2b] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                        }`}
                    >
                      {period === "week"
                        ? "Tuần này"
                        : period === "month"
                          ? "Tháng này"
                          : "Năm nay"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider">
                  Doanh thu ước tính
                </p>
                <p className="text-[#1b140d] text-2xl font-black mt-1">
                  {analyticsData.totalSales.toLocaleString("vi-VN")}đ
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-[#ee8c2b]/10 text-[#ee8c2b] rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider font-semibold">
                  Chiết khấu đã giảm
                </p>
                <p className="text-[#1b140d] text-2xl font-black mt-1">
                  {analyticsData.totalDiscounts.toLocaleString("vi-VN")}đ
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider font-semibold">
                  Tỷ lệ chuyển đổi
                </p>
                <p className="text-[#1b140d] text-2xl font-black mt-1">
                  {analyticsData.overallConversion}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-6 border border-[#e7dbcf] bg-white shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[#9a734c] text-xs font-medium uppercase tracking-wider font-semibold">
                  Tỷ suất Doanh số / Giảm giá
                </p>
                {(() => {
                  const val = Number(analyticsData.overallMultiplier);
                  let label = "(Tốt)";
                  let colorClass = "text-emerald-600";
                  if (analyticsData.totalOrders === 0) {
                    label = "(Chưa có đơn)";
                    colorClass = "text-slate-400";
                  } else if (val < 3.0) {
                    label = "(Cần cải thiện)";
                    colorClass = "text-rose-600";
                  } else if (val < 5.0) {
                    label = "(Trung bình)";
                    colorClass = "text-amber-600";
                  }
                  return (
                    <p className="text-[#1b140d] text-2xl font-black mt-1 flex items-baseline gap-1">
                      <span>{analyticsData.overallMultiplier} lần</span>
                      <span className={`text-xs font-bold ${colorClass}`}>
                        {label}
                      </span>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white border border-[#e7dbcf] rounded-2xl p-6 shadow-sm">
            <h4 className="text-base font-bold text-slate-800 mb-4">
              Biểu đồ doanh thu vs Chiết khấu chiến dịch
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value) =>
                      `${Number(value).toLocaleString("vi-VN")}đ`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar
                    dataKey="Doanh số"
                    fill="#ee8c2b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Chiết khấu"
                    fill="#9a734c"
                    opacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Campaign Success Matrix */}
          <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e7dbcf]">
              <h4 className="text-base font-bold text-slate-800">
                Đánh giá cụ thể từng chiến dịch
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Tên chiến dịch
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Thời gian chạy
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Doanh thu mang lại
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Đã giảm giá
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Đơn hàng áp dụng
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c]">
                      Tỷ lệ chuyển đổi
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] text-right">
                      Mức độ hiệu quả
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7dbcf]">
                  {analyticsData.campaignStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Chưa có chiến dịch nào được duyệt để phân tích
                      </td>
                    </tr>
                  ) : (
                    analyticsData.campaignStats.map((stat) => {
                      let efficiencyBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hiệu quả cao
                        </span>
                      );
                      if (stat.orders === 0) {
                        efficiencyBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Chưa có đơn hàng
                          </span>
                        );
                      } else if (stat.multiplier < 3.0) {
                        efficiencyBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Hiệu quả thấp
                          </span>
                        );
                      } else if (stat.multiplier < 5.0) {
                        efficiencyBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Hiệu quả trung bình
                          </span>
                        );
                      }

                      const isExpanded = expandedCampaignId === stat.id;
                      return (
                        <Fragment key={stat.id}>
                          <tr
                            onClick={() =>
                              setExpandedCampaignId(isExpanded ? null : stat.id)
                            }
                            className={`hover:bg-orange-50/5 transition-colors cursor-pointer ${isExpanded ? "bg-orange-50/10" : ""}`}
                          >
                            <td className="px-6 py-4 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                                <span>{stat.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {new Date(stat.startTime).toLocaleDateString(
                                "vi-VN",
                              )}{" "}
                              -{" "}
                              {new Date(stat.endTime).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {stat.sales.toLocaleString("vi-VN")}đ
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {stat.discount.toLocaleString("vi-VN")}đ
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {stat.orders} đơn
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 font-bold">
                              <div>{stat.conversionRate}%</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                {stat.clicks} click / {stat.views} xem
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {efficiencyBadge}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="border border-slate-100 rounded-xl bg-white p-4 shadow-inner space-y-3 animate-in slide-in-from-top-1 duration-150">
                                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Chi tiết các món chạy trong chiến dịch:
                                  </h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                                          <th className="py-2 pr-4">
                                            Tên sản phẩm
                                          </th>
                                          <th className="py-2 px-4">Giá gốc</th>
                                          <th className="py-2 px-4">
                                            Hình thức ưu đãi
                                          </th>
                                          <th className="py-2 px-4 text-center">
                                            Đã bán ra
                                          </th>
                                          <th className="py-2 px-4">
                                            Doanh thu sản phẩm
                                          </th>
                                          <th className="py-2 pl-4 text-right">
                                            Tổng giảm giá
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-600">
                                        {stat.productsList.map((p, pIdx) => (
                                          <tr key={`${p.id}-${pIdx}`}>
                                            <td className="py-2.5 pr-4 font-bold">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const prod = products.find(
                                                    (pr) => pr._id === p.id,
                                                  );
                                                  if (prod) {
                                                    setSelectedProductDetails(
                                                      prod,
                                                    );
                                                  } else {
                                                    toast.error(
                                                      "Không tìm thấy thông tin chi tiết sản phẩm",
                                                    );
                                                  }
                                                }}
                                                className="text-slate-700 hover:text-orange-600 hover:underline font-bold text-left focus:outline-none transition-colors"
                                              >
                                                {p.name}
                                              </button>
                                            </td>
                                            <td className="py-2.5 px-4">
                                              {p.originalPrice.toLocaleString(
                                                "vi-VN",
                                              )}
                                              đ
                                            </td>
                                            <td className="py-2.5 px-4 font-semibold text-orange-600">
                                              {p.rule}
                                            </td>
                                            <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                                              {p.qtySold}
                                            </td>
                                            <td className="py-2.5 px-4 font-bold text-emerald-600">
                                              {p.sales.toLocaleString("vi-VN")}đ
                                            </td>
                                            <td className="py-2.5 pl-4 text-right text-rose-600">
                                              {p.discount.toLocaleString(
                                                "vi-VN",
                                              )}
                                              đ
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowAIModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Trợ lý tạo chiến dịch
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Dựa trên dữ liệu bán hàng gần đây để đề xuất tên, sản phẩm và
                  mức ưu đãi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAIModal(false)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Khoảng thời gian phân tích
                  </label>
                  <select
                    value={aiDays}
                    onChange={(e) => setAiDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value={7}>7 ngày gần nhất</option>
                    <option value={14}>14 ngày gần nhất</option>
                    <option value={30}>30 ngày gần nhất</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-[#ee8c2b]/5 p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Mục tiêu chiến dịch
                  </label>
                  <select
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value as any)}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="boost_sales">📈 Tập trung hàng bán chạy</option>
                    <option value="clear_stock">📦 Tập trung hàng tồn / bán chậm</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {aiGoal === "boost_sales" && "Chọn đúng top sản phẩm bán chạy nhất. Thời tiết/dịp lễ chỉ ảnh hưởng tên và nội dung chiến dịch."}
                    {aiGoal === "clear_stock" && "Ưu tiên các món ít bán, giúp giải phóng tồn kho. Thời tiết/dịp lễ hỗ trợ chọn thêm."}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    🌤 Thời tiết
                  </label>
                  <select
                    value={aiWeather}
                    onChange={(e) => setAiWeather(e.target.value as any)}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="auto">Tự động (lấy từ API)</option>
                    <option value="hot">🌡 Nắng nóng</option>
                    <option value="sunny">☀️ Nắng đẹp</option>
                    <option value="rainy">🌧 Mưa</option>
                    <option value="cold">🧊 Lạnh</option>
                    <option value="normal">🌤 Bình thường</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-[#ee8c2b]/5 p-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    🎉 Dịp lễ / Mùa
                  </label>
                  <select
                    value={isCustomOccasion ? "custom" : aiOccasion}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setIsCustomOccasion(true);
                        setAiOccasion(customOccasion);
                      } else {
                        setIsCustomOccasion(false);
                        setAiOccasion(val);
                      }
                    }}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value="auto">Tự động (theo ngày hiện tại)</option>
                    <option value="none">Không có dịp lễ</option>
                    <option value="summer">☀️ Mùa hè</option>
                    <option value="tet">🧧 Tết Nguyên Đán</option>
                    <option value="christmas">🎄 Giáng Sinh</option>
                    <option value="valentine">💝 Valentine</option>
                    <option value="custom">✍️ Khác (Tự nhập...)</option>
                  </select>

                  {isCustomOccasion && (
                    <input
                      type="text"
                      placeholder="Nhập tên dịp lễ / mùa khác (VD: Trung thu, Halloween...)"
                      value={customOccasion}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomOccasion(val);
                        setAiOccasion(val);
                      }}
                      className="mt-2.5 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-orange-500 transition-all font-semibold"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Số món AI nên đề xuất
                  </label>
                  <select
                    value={aiProductCount}
                    onChange={(e) => setAiProductCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  >
                    <option value={2}>2 món</option>
                    <option value={3}>3 món</option>
                    <option value={4}>4 món</option>
                    <option value={5}>5 món</option>
                    <option value={6}>6 món</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAISuggestion}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#ee8c2b] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Lightbulb className="h-4 w-4" />
                  {aiLoading ? "Đang tạo gợi ý..." : "Tạo gợi ý"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>

              {aiSuggestion ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-800">
                        {aiSuggestion.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {aiSuggestion.summary}
                      </p>
                      {/* Goal context banner */}
                      <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${renderedAISuggestionGoal === "boost_sales"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : renderedAISuggestionGoal === "clear_stock"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}>
                        {renderedAISuggestionGoal === "boost_sales" && "📈 Tập trung hàng bán chạy"}
                        {renderedAISuggestionGoal === "clear_stock" && "📦 Giải phóng tồn kho / bán chậm"}
                        {renderedAISuggestionGoal === "contextual" && "🌤 Theo mùa / thời tiết / dịp lễ"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyAISuggestion}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-700 flex-shrink-0"
                    >
                      Áp dụng
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {aiSuggestion.products.map((product) => (
                      <div
                        key={product.productId}
                        className={`rounded-xl border bg-white p-3 ${renderedAISuggestionGoal === "clear_stock"
                            ? "border-amber-100"
                            : renderedAISuggestionGoal === "boost_sales"
                              ? "border-emerald-100"
                              : "border-slate-200"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800">
                              {product.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {product.reason}
                            </p>
                            {/* Goal-aware sales label */}
                            {renderedAISuggestionGoal === "boost_sales" && (
                              <p className="mt-1 text-xs font-semibold text-emerald-600">
                                📈 Đã bán {product.soldQuantity ?? 0} suất trong {renderedAISuggestionDays} ngày — bán chạy
                              </p>
                            )}
                            {renderedAISuggestionGoal === "clear_stock" && (
                              <p className="mt-1 text-xs font-semibold text-amber-600">
                                📦 Chỉ bán {product.soldQuantity ?? 0} suất trong {renderedAISuggestionDays} ngày — cần giải phóng tồn kho
                              </p>
                            )}
                            {renderedAISuggestionGoal === "contextual" && (
                              <p className="mt-1 text-xs font-semibold text-sky-600">
                                🌤 Phù hợp theo mùa / thời tiết · {product.soldQuantity ?? 0} suất/{renderedAISuggestionDays}n
                              </p>
                            )}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-sm font-bold flex-shrink-0 ${renderedAISuggestionGoal === "clear_stock"
                              ? "bg-amber-50 text-amber-600"
                              : renderedAISuggestionGoal === "boost_sales"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-orange-50 text-orange-600"
                            }`}>
                            {aiSuggestion.type === "fixed_price"
                              ? `${product.fixedPrice?.toLocaleString("vi-VN")}đ`
                              : `-${product.discount ?? 10}%`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {aiSuggestion.rationale && (
                    <div className="mt-4 p-3.5 bg-orange-50/40 border border-orange-100 rounded-xl text-xs text-slate-600 italic">
                      <strong>Lý do hiệu quả:</strong> {aiSuggestion.rationale}
                    </div>
                  )}

                  {aiSuggestion.performanceReport && (
                    <div className="mt-4 p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl text-xs text-slate-700">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 mb-2 text-xs">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        BÁO CÁO HIỆU SUẤT DỰ TÍNH (AI DỰ PHÓNG)
                      </h4>
                      <p className="mb-2">
                        <strong>Thời gian hoàn vốn / có lời dự kiến:</strong>{" "}
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg text-xs mr-3">
                          {aiSuggestion.performanceReport.estimatedDaysToProfit} ngày
                        </span>
                        <strong>Lợi nhuận dự tính:</strong>{" "}
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg text-xs">
                          {aiSuggestion.performanceReport.estimatedProfit}
                        </span>
                      </p>
                      <p className="leading-relaxed bg-white/60 p-2.5 rounded-xl border border-emerald-100/30">
                        {aiSuggestion.performanceReport.analysis}
                      </p>
                      <div className="mt-2.5 border-t border-emerald-100/60 pt-2 text-[10px] text-emerald-700/85 leading-relaxed font-medium">
                        {renderedAISuggestionGoal === "boost_sales" ? (
                          <span>💡 <strong>Cơ sở phân tích (Hàng bán chạy):</strong> Nhóm món ăn này có lượng nhu cầu hữu cơ cao và tệp khách quen sẵn có. Áp dụng ưu đãi sẽ kích cầu tức thì, giúp chiến dịch hòa vốn rất sớm (chỉ sau 2-3 ngày) và tối đa hóa doanh thu tích lũy.</span>
                        ) : (
                          <span>💡 <strong>Cơ sở phân tích (Giải phóng kho):</strong> Món ăn bán chậm cần mức ưu đãi hấp dẫn hơn và cần nhiều thời gian chạy để tiếp cận/thay đổi thói quen khách hàng. Điểm hòa vốn sẽ trễ hơn (5-7 ngày) nhằm đổi lấy mục tiêu cắt giảm chi phí tồn kho lâu ngày.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  Chưa có gợi ý nào. Nhấn “Tạo gợi ý” để xem đề xuất chiến dịch
                  từ dữ liệu bán hàng gần đây.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && pendingAICampaign && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0 pr-3">
                <h3 className="text-lg font-black text-slate-800 sm:text-xl">
                  Xác nhận chiến dịch từ AI
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kiểm tra lại thông tin trước khi tạo chiến dịch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-orange-700 mb-1.5">
                      Tên chiến dịch
                    </label>
                    <input
                      type="text"
                      value={aiCampaignName}
                      onChange={(e) => setAiCampaignName(e.target.value)}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-1 transition-colors ${(() => {
                          const nm = aiCampaignName.trim().toLowerCase();
                          const start = aiStartTime ? new Date(aiStartTime) : null;
                          const end = aiEndTime ? new Date(aiEndTime) : null;
                          return nm && start && end && campaigns.some(
                            (c) =>
                              c.name.toLowerCase() === nm &&
                              new Date(c.startTime).getTime() < end.getTime() &&
                              new Date(c.endTime).getTime() > start.getTime()
                          )
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400"
                            : "border-orange-200 focus:border-[#ee8c2b] focus:ring-[#ee8c2b]";
                        })()
                        }`}
                      placeholder="Nhập tên chiến dịch"
                    />
                    {(() => {
                      const nm = aiCampaignName.trim().toLowerCase();
                      const start = aiStartTime ? new Date(aiStartTime) : null;
                      const end = aiEndTime ? new Date(aiEndTime) : null;
                      const isDup = nm && start && end && campaigns.some(
                        (c) =>
                          c.name.toLowerCase() === nm &&
                          new Date(c.startTime).getTime() < end.getTime() &&
                          new Date(c.endTime).getTime() > start.getTime()
                      );
                      return isDup ? (
                        <p className="mt-1 text-xs font-semibold text-rose-500">
                          ⚠ Đã có chiến dịch cùng tên trong khoảng thời gian này. Vui lòng đặt tên khác.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">
                          ✨ Tên gợi ý từ AI dựa theo dịp lễ, mùa và thời tiết. Bạn có thể chỉnh sửa.
                        </p>
                      );
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-1">
                      Mô tả đề xuất từ AI
                    </p>
                    <p className="text-sm text-slate-600">
                      {pendingAICampaign.summary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                      Loại ưu đãi
                    </span>
                    <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                      {pendingAICampaign.type === "fixed_price"
                        ? "Giá cố định"
                        : "Giảm giá"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={aiStartTime}
                    onChange={(e) => setAiStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#ee8c2b] focus:ring-1 focus:ring-[#ee8c2b]"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={aiEndTime}
                    onChange={(e) => setAiEndTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#ee8c2b] focus:ring-1 focus:ring-[#ee8c2b]"
                  />
                </div>
              </div>

              {pendingAICampaign.timeframeRationale && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-1">
                    Cơ sở gợi ý khoảng thời gian
                  </p>
                  <p className="text-sm text-slate-700 italic">
                    "{pendingAICampaign.timeframeRationale}"
                  </p>
                </div>
              )}

              {pendingAICampaign.performanceReport && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Báo cáo hiệu suất dự tính (AI dự phóng)
                  </p>
                  <p className="text-xs font-bold text-slate-800 mb-1.5 flex flex-wrap gap-2 items-center">
                    <span>Thời gian hòa vốn/có lời dự kiến:</span>
                    <span className="bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded font-bold">
                      {pendingAICampaign.performanceReport.estimatedDaysToProfit} ngày
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>Lợi nhuận dự tính:</span>
                    <span className="bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded font-bold">
                      {pendingAICampaign.performanceReport.estimatedProfit}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-emerald-100/30">
                    {pendingAICampaign.performanceReport.analysis}
                  </p>
                  <div className="mt-2 border-t border-emerald-100/60 pt-2 text-[10px] text-emerald-800/80 leading-relaxed font-medium">
                    {pendingAIContext?.goal === "boost_sales" || !pendingAIContext ? (
                      <span>💡 <strong>Cơ sở phân tích (Hàng bán chạy):</strong> Nhóm món ăn này có lượng nhu cầu hữu cơ cao và tệp khách quen sẵn có. Áp dụng ưu đãi sẽ kích cầu tức thì, giúp chiến dịch hòa vốn rất sớm (chỉ sau 2-3 ngày) và tối đa hóa doanh thu tích lũy.</span>
                    ) : (
                      <span>💡 <strong>Cơ sở phân tích (Giải phóng kho):</strong> Món ăn bán chậm cần mức ưu đãi hấp dẫn hơn và cần nhiều thời gian chạy để tiếp cận/thay đổi thói quen khách hàng. Điểm hòa vốn sẽ trễ hơn (5-7 ngày) nhằm đổi lấy mục tiêu cắt giảm chi phí tồn kho lâu ngày.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-bold text-slate-700">
                  Danh sách món được đề xuất
                </p>
                <div className="space-y-2">
                  {pendingAICampaign.products.map((product) => (
                    <div
                      key={product.productId}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 break-words">
                          {product.reason}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-orange-600">
                          Đã bán {product.soldQuantity ?? 0} suất trong {renderedPendingDays}{" "}
                          ngày gần nhất
                        </p>
                      </div>
                      <div className="shrink-0 self-start sm:self-center">
                        {pendingAICampaign.type === "fixed_price" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={product.fixedPrice ?? 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPendingAICampaign((prev) => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    products: prev.products.map((p) =>
                                      p.productId === product.productId
                                        ? { ...p, fixedPrice: val }
                                        : p
                                    ),
                                  };
                                });
                              }}
                              className="w-24 rounded-xl border border-orange-200 bg-white px-2 py-1 text-xs font-bold text-orange-700 text-right outline-none focus:ring-1 focus:ring-[#ee8c2b]"
                            />
                            <span className="text-xs font-bold text-slate-500">đ</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-500">-</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={product.discount ?? 10}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const clamped = Math.min(100, Math.max(1, val));
                                setPendingAICampaign((prev) => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    products: prev.products.map((p) =>
                                      p.productId === product.productId
                                        ? { ...p, discount: clamped }
                                        : p
                                    ),
                                  };
                                });
                              }}
                              className="w-16 rounded-xl border border-orange-200 bg-white px-2 py-1 text-xs font-bold text-orange-700 text-right outline-none focus:ring-1 focus:ring-[#ee8c2b]"
                            />
                            <span className="text-xs font-bold text-slate-500">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingAICampaign(null);
                    setShowAIModal(true);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAICampaign}
                  disabled={confirmingAiCampaign}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#ee8c2b] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Check className="h-4 w-4" />
                  {confirmingAiCampaign
                    ? "Đang tạo..."
                    : "Xác nhận & Tạo chiến dịch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-visible rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 pb-5 pt-6 md:px-8 md:pt-8">
              <h3 className="text-xl font-black text-slate-800">
                {editingCampaign
                  ? "Cập nhật chiến dịch"
                  : isAdmin
                    ? "Tạo chiến dịch mới"
                    : "Đề xuất chiến dịch mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="custom-scrollbar min-h-0 flex-1 overflow-visible px-6 py-5 md:px-8">
                <div className="space-y-4">
                  {campaignDraft && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-orange-800">
                            Bản nháp từ gợi ý: {campaignDraft.suggestionLabel}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-orange-700">
                            {campaignDraft.suggestionReason}
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-[10px] font-bold uppercase text-orange-500">
                                Phạm vi
                              </p>
                              <p className="mt-0.5 font-black text-orange-900">
                                Toàn hệ thống
                              </p>
                            </div>

                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-[10px] font-bold uppercase text-orange-500">
                                Kỳ phân tích
                              </p>
                              <p className="mt-0.5 font-black text-orange-900">
                                {campaignDraft.periodDays} ngày
                              </p>
                            </div>

                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-[10px] font-bold uppercase text-orange-500">
                                Cửa hàng phù hợp
                              </p>
                              <p className="mt-0.5 font-black text-orange-900">
                                {campaignDraft.eligibleStoreCount}/
                                {campaignDraft.totalStoreCount} (
                                {campaignDraft.coveragePercent.toFixed(0)}%)
                              </p>
                            </div>

                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-[10px] font-bold uppercase text-orange-500">
                                Mức giảm gợi ý
                              </p>
                              <p className="mt-0.5 font-black text-orange-900">
                                {campaignDraft.suggestedDiscount}%
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs font-bold text-orange-800">
                            Đã chọn {campaignDraft.productName}. Campaign này sẽ
                            áp dụng cho toàn bộ cửa hàng, vì vậy hãy kiểm tra
                            lợi nhuận, tồn kho và năng lực phục vụ trước khi
                            kích hoạt.
                          </p>

                          <div className="mt-3 overflow-x-auto rounded-xl border border-orange-200 bg-white">
                            <table className="w-full min-w-[620px] text-left text-xs">
                              <thead className="bg-orange-50 text-[10px] uppercase tracking-wide text-orange-700">
                                <tr>
                                  <th className="px-3 py-2 font-bold">
                                    Cửa hàng
                                  </th>
                                  <th className="px-3 py-2 font-bold">
                                    Đã bán
                                  </th>
                                  <th className="px-3 py-2 font-bold">
                                    Doanh thu
                                  </th>
                                  <th className="px-3 py-2 font-bold">
                                    Tăng trưởng
                                  </th>
                                  <th className="px-3 py-2 font-bold">
                                    Kết quả
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-orange-100">
                                {campaignDraft.storeBreakdown.map((store) => (
                                  <tr key={store.storeId}>
                                    <td className="px-3 py-2 font-bold text-slate-800">
                                      {store.storeName}
                                    </td>

                                    <td className="px-3 py-2 text-slate-700">
                                      {store.quantitySold.toLocaleString(
                                        "vi-VN",
                                      )}
                                    </td>

                                    <td className="px-3 py-2 text-slate-700">
                                      {store.revenue.toLocaleString("vi-VN")}đ
                                    </td>

                                    <td className="px-3 py-2">
                                      {store.growthPercent === null ? (
                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                                          Mới
                                        </span>
                                      ) : (
                                        <span
                                          className={
                                            store.growthPercent >= 0
                                              ? "font-bold text-emerald-700"
                                              : "font-bold text-rose-700"
                                          }
                                        >
                                          {store.growthPercent >= 0 ? "+" : ""}
                                          {store.growthPercent.toFixed(1)}%
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 font-bold ${store.readiness === "ready"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : store.readiness === "watch"
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-rose-50 text-rose-700"
                                          }`}
                                      >
                                        {store.reason}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Cột trái: Thông tin chiến dịch */}
                    <div className="space-y-3.5">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          Tên chiến dịch
                        </label>
                        <div className="relative">
                          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-xs ${wasSubmitted && nameError
                              ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                              : "border-slate-200"
                              }`}
                            placeholder="Ví dụ: Khuyến mãi Hè Rực Rỡ"
                          />
                        </div>
                        <div className="min-h-[16px] mt-0.5">
                          {wasSubmitted && nameError ? (
                            <p className="text-[11px] text-rose-500 font-bold">
                              {nameError}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Type */}
                      <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-800">
                          Loại ưu đãi
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setShowTypeDropdown(!showTypeDropdown)
                            }
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-xs text-left"
                          >
                            <span className="flex items-center gap-2">
                              {formType === "discount" ? (
                                <>
                                  <Percent className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Phần trăm giảm (%)</span>
                                </>
                              ) : (
                                <>
                                  <Coins className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Giá cố định (VND)</span>
                                </>
                              )}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform ${showTypeDropdown ? "rotate-180" : ""}`}
                            />
                          </button>

                          {showTypeDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setShowTypeDropdown(false)}
                              />
                              <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-100 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormType("discount");
                                    setShowTypeDropdown(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors hover:bg-orange-50/50 text-left ${formType === "discount"
                                    ? "text-orange-700 font-bold bg-orange-50/30"
                                    : "text-slate-700"
                                    }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Phần trăm giảm (%)</span>
                                  </span>
                                  {formType === "discount" && (
                                    <Check className="w-4 h-4 text-orange-600 animate-in zoom-in duration-100" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormType("fixed_price");
                                    setShowTypeDropdown(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors hover:bg-orange-50/50 text-left ${formType === "fixed_price"
                                    ? "text-orange-700 font-bold bg-orange-50/30"
                                    : "text-slate-700"
                                    }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Giá cố định (VND)</span>
                                  </span>
                                  {formType === "fixed_price" && (
                                    <Check className="w-4 h-4 text-orange-600 animate-in zoom-in duration-100" />
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-[#9a734c] flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          Áp dụng cho sản phẩm trên toàn bộ hệ thống.
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-100 relative">
                        <label className="text-xs font-bold text-slate-800">
                          Thời gian diễn ra chiến dịch
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCalendar(!showCalendar)}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-left text-xs text-slate-800 flex items-center justify-between transition-all ${(wasSubmitted && timeError) ||
                              (startTime &&
                                endTime &&
                                new Date(startTime) >= new Date(endTime))
                              ? "border-rose-500 ring-rose-200"
                              : "border-slate-200"
                              }`}
                          >
                            <span className="truncate">
                              {startTime && endTime
                                ? `${new Date(startTime).toLocaleDateString("vi-VN")} - ${new Date(endTime).toLocaleDateString("vi-VN")}`
                                : startTime
                                  ? `Từ ${new Date(startTime).toLocaleDateString("vi-VN")} (Chọn ngày kết thúc...)`
                                  : "Chọn khoảng thời gian..."}
                            </span>
                            <Calendar className="w-4 h-4 text-[#9a734c] shrink-0" />
                          </button>

                          {showCalendar && (
                            <div className="absolute left-0 top-full mt-1.5 z-[999] bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-64 select-none animate-in fade-in slide-in-from-top-2 duration-150">
                              {/* Calendar Header */}
                              <div className="flex justify-between items-center mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonth(
                                      new Date(
                                        calendarMonth.setMonth(
                                          calendarMonth.getMonth() - 1,
                                        ),
                                      ),
                                    )
                                  }
                                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
                                >
                                  &lt;
                                </button>
                                <span className="text-xs font-bold text-slate-800">
                                  Tháng {calendarMonth.getMonth() + 1}/
                                  {calendarMonth.getFullYear()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonth(
                                      new Date(
                                        calendarMonth.setMonth(
                                          calendarMonth.getMonth() + 1,
                                        ),
                                      ),
                                    )
                                  }
                                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
                                >
                                  &gt;
                                </button>
                              </div>

                              {/* Weekdays */}
                              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(
                                  (w) => (
                                    <span
                                      key={w}
                                      className="text-[10px] font-bold text-slate-400"
                                    >
                                      {w}
                                    </span>
                                  ),
                                )}
                              </div>

                              {/* Days Grid */}
                              <div className="grid grid-cols-7 gap-1">
                                {getCalendarDays().map((d, idx) => {
                                  if (!d) return <div key={`empty-${idx}`} />;

                                  const isStart =
                                    startTime &&
                                    d.toDateString() ===
                                    new Date(startTime).toDateString();
                                  const isEnd =
                                    endTime &&
                                    d.toDateString() ===
                                    new Date(endTime).toDateString();
                                  const isInBetween =
                                    startTime &&
                                    endTime &&
                                    d > new Date(startTime) &&
                                    d < new Date(endTime);

                                  return (
                                    <button
                                      key={d.toISOString()}
                                      type="button"
                                      onClick={() =>
                                        handleCalendarDayClick(d.getDate())
                                      }
                                      className={`text-[10px] p-1.5 text-center transition-all ${isStart || isEnd
                                        ? "bg-orange-600 text-white rounded-lg font-bold"
                                        : isInBetween
                                          ? "bg-orange-50 text-orange-700"
                                          : "hover:bg-slate-100 text-slate-700 rounded-lg"
                                        }`}
                                    >
                                      {d.getDate()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="min-h-[16px]">
                          {(wasSubmitted && timeError) ||
                            (startTime &&
                              endTime &&
                              new Date(startTime) >= new Date(endTime)) ? (
                            <p className="text-[11px] text-rose-500 font-bold">
                              {startTime &&
                                endTime &&
                                new Date(startTime) >= new Date(endTime)
                                ? "Thời gian bắt đầu phải trước kết thúc"
                                : timeError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Chọn sản phẩm */}
                    <div className="space-y-2.5">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-800">
                            Danh sách sản phẩm và ưu đãi
                          </label>
                          <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                            Đã chọn {campaignProducts.length}
                          </span>
                        </div>
                        <div className="min-h-[16px] mt-0.5">
                          {wasSubmitted && productCountError ? (
                            <p className="text-[11px] text-rose-500 font-bold">
                              {productCountError}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Bulk discount/price applier */}
                      <div
                        className={`flex items-center justify-between gap-2 bg-[#fcfaf8] p-2 rounded-xl border border-[#e7dbcf] shadow-sm transition-all duration-200 ${campaignProducts.length === 0
                          ? "opacity-50 pointer-events-none select-none"
                          : ""
                          }`}
                      >
                        <span className="text-[10px] font-bold text-slate-700">
                          Áp dụng nhanh tất cả đã chọn:
                        </span>
                        <div className="relative w-28 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max={formType === "discount" ? "100" : undefined}
                            disabled={campaignProducts.length === 0}
                            placeholder={
                              formType === "discount" ? "Nhập %" : "Nhập giá"
                            }
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 text-[11px] pr-6 disabled:bg-slate-100 disabled:text-slate-400"
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") return;
                              const val = Number(raw);
                              if (!isNaN(val) && val >= 0) {
                                setCampaignProducts((prev) =>
                                  prev.map((p) => ({
                                    ...p,
                                    discount:
                                      formType === "discount" ? val : null,
                                    fixedPrice:
                                      formType === "fixed_price" ? val : null,
                                  })),
                                );
                              }
                            }}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            {formType === "discount" ? "%" : "đ"}
                          </span>
                        </div>
                      </div>

                      {/* Search within product list */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] w-3.5 h-3.5" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Tìm sản phẩm..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 transition-all text-xs placeholder:text-slate-400"
                        />
                      </div>

                      {/* Tick-list of products */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="h-[220px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                          {(() => {
                            const visibleProducts = products.filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes(productSearch.trim().toLowerCase()),
                            );
                            if (visibleProducts.length === 0) {
                              return (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                  {products.length === 0
                                    ? "Không có sản phẩm"
                                    : "Không tìm thấy sản phẩm"}
                                </p>
                              );
                            }
                            return visibleProducts.map((p) => {
                              const rule = campaignProducts.find(
                                (cp) => cp.productId === p._id,
                              );
                              const isSelected = !!rule;
                              const isOccupied = occupiedProductIds.has(p._id);
                              const finalPrice = rule
                                ? getFinalPrice(p.price, rule)
                                : null;
                              const isPriceIncreased =
                                finalPrice !== null && finalPrice > p.price;
                              return (
                                <div
                                  key={p._id}
                                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${isOccupied
                                    ? "opacity-50 cursor-not-allowed bg-slate-50"
                                    : isSelected
                                      ? "bg-orange-50/40 cursor-pointer"
                                      : "hover:bg-slate-50 cursor-pointer"
                                    }`}
                                  onClick={() =>
                                    !isOccupied && handleToggleProduct(p._id)
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isOccupied}
                                    onChange={() =>
                                      !isOccupied && handleToggleProduct(p._id)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 shrink-0 rounded border-slate-300 accent-orange-600 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProductDetails(p);
                                        }}
                                        className={`text-xs truncate text-left hover:text-orange-600 hover:underline focus:outline-none transition-colors ${isSelected
                                          ? "font-bold text-slate-800"
                                          : "font-medium text-slate-600"
                                          }`}
                                      >
                                        {p.name}
                                      </button>
                                      {isOccupied && (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                          Đang chạy lịch này
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && finalPrice !== null ? (
                                      <p className="text-[10px] flex items-center gap-1 flex-wrap leading-tight">
                                        <span className="text-slate-400 line-through">
                                          {p.price.toLocaleString("vi-VN")}đ
                                        </span>
                                        <span className="text-slate-400">
                                          →
                                        </span>
                                        <span
                                          className={`font-bold ${isPriceIncreased ? "text-rose-600" : "text-emerald-600"}`}
                                        >
                                          {finalPrice.toLocaleString("vi-VN")}đ
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-[#9a734c]">
                                        {p.price.toLocaleString("vi-VN")}đ
                                      </p>
                                    )}
                                  </div>

                                  {/* Inline rule input for the selected product */}
                                  {isSelected && (
                                    <div
                                      className="w-32 shrink-0 flex flex-col items-end"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {formType === "discount" ? (
                                        <>
                                          <div className="relative w-full">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={rule.discount ?? ""}
                                              onChange={(e) =>
                                                handleProductRuleChange(
                                                  p._id,
                                                  "discount",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className={`w-full px-2 py-1 bg-white border rounded-lg focus:outline-none focus:ring-2 text-slate-800 text-[11px] pr-6 ${getProductError(rule)
                                                ? "border-rose-500 focus:ring-rose-500"
                                                : "border-slate-200 focus:ring-orange-500"
                                                }`}
                                              placeholder="Giảm"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                              %
                                            </span>
                                          </div>
                                          <div className="min-h-[14px] mt-0.5 text-right w-full">
                                            {getProductError(rule) ? (
                                              <span className="text-[9px] text-rose-500 font-bold block leading-none">
                                                {getProductError(rule)}
                                              </span>
                                            ) : null}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="relative w-full">
                                            <input
                                              type="number"
                                              min="0"
                                              value={rule.fixedPrice ?? ""}
                                              onChange={(e) =>
                                                handleProductRuleChange(
                                                  p._id,
                                                  "fixedPrice",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className={`w-full px-2 py-1 bg-white border rounded-lg focus:outline-none focus:ring-2 text-slate-800 text-[11px] pr-6 ${getProductError(rule)
                                                ? "border-rose-500 focus:ring-rose-500"
                                                : "border-slate-200 focus:ring-orange-500"
                                                }`}
                                              placeholder="Giá"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                              đ
                                            </span>
                                          </div>
                                          <div className="min-h-[14px] mt-0.5 text-right w-full">
                                            {getProductError(rule) ? (
                                              <span className="text-[9px] text-rose-500 font-bold block leading-none">
                                                {getProductError(rule)}
                                              </span>
                                            ) : null}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 md:px-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 bg-[#ee8c2b] hover:opacity-90 text-white font-bold rounded-xl shadow-sm transition-all text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Đang xử lý..."
                    : editingCampaign
                      ? "Lưu thay đổi"
                      : isAdmin
                        ? "Kích hoạt chiến dịch"
                        : "Gửi đề xuất"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details View Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedProductDetails(null)}
          />
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-black text-slate-800">
                Chi tiết sản phẩm đầy đủ
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProductDetails(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Media & Core Info */}
              <div className="space-y-4">
                {/* Product Image */}
                <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center relative">
                  {selectedProductDetails.image ? (
                    <img
                      src={
                        typeof selectedProductDetails.image === "string"
                          ? selectedProductDetails.image
                          : selectedProductDetails.image.secureUrl
                      }
                      alt={selectedProductDetails.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs font-semibold">
                      Không có hình ảnh
                    </span>
                  )}
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedProductDetails.isAvailable &&
                      selectedProductDetails.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                  >
                    {selectedProductDetails.isAvailable &&
                      selectedProductDetails.status === "active"
                      ? "Đang phục vụ"
                      : "Tạm ngưng"}
                  </span>
                </div>

                {/* Name & Restaurant */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tên món & Nhà hàng
                  </span>
                  <h4 className="text-base font-bold text-slate-800">
                    {selectedProductDetails.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                    {selectedProductDetails.restaurant || "Chi nhánh chính"}
                  </p>
                </div>

                {/* Price, Preparation Time & Category */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Giá gốc
                    </span>
                    <span className="text-xs font-black text-slate-800 mt-0.5">
                      {selectedProductDetails.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Thời gian
                    </span>
                    <span className="text-xs font-black text-slate-800 mt-0.5">
                      {selectedProductDetails.time || "15 phút"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Danh mục
                    </span>
                    <span className="text-xs font-black text-orange-700 mt-0.5 truncate px-1">
                      {selectedProductDetails.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Mô tả món ăn
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50 max-h-24 overflow-y-auto custom-scrollbar">
                    {selectedProductDetails.description ||
                      "Không có mô tả cho sản phẩm này."}
                  </p>
                </div>

                {/* Ratings */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                  <span className="text-xs font-bold text-slate-700">
                    Đánh giá chung
                  </span>
                  <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                    ★ {selectedProductDetails.rating || 5.0}
                    <span className="text-[10px] text-slate-400 font-bold">
                      ({selectedProductDetails.reviewCount || 0} lượt)
                    </span>
                  </span>
                </div>
              </div>

              {/* Right Column: Recipe, Health, Tags */}
              <div className="space-y-4">
                {/* Ingredients/Recipe */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Công thức / Nguyên liệu chính
                  </span>
                  {selectedProductDetails.recipe &&
                    selectedProductDetails.recipe.length > 0 ? (
                    <div className="bg-slate-50 rounded-xl border border-slate-100/50 p-3 max-h-36 overflow-y-auto custom-scrollbar space-y-2">
                      {selectedProductDetails.recipe.map((r, idx) => {
                        const ingName =
                          typeof r.ingredientId === "object"
                            ? r.ingredientId?.name
                            : r.name || "Nguyên liệu";
                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0"
                          >
                            <span className="font-semibold text-slate-700">
                              {ingName}
                            </span>
                            <span className="text-slate-500 font-medium">
                              {r.quantity} {r.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      Không có thông tin nguyên liệu cụ thể.
                    </p>
                  )}
                </div>

                {/* Health Warning & Health Tags */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Thông tin Sức khỏe & Dị ứng
                  </span>

                  {/* Warning */}
                  {selectedProductDetails.healthWarning && (
                    <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                      ⚠ Cảnh báo: {selectedProductDetails.healthWarning}
                    </p>
                  )}

                  {/* Health Tags */}
                  {selectedProductDetails.healthTags &&
                    selectedProductDetails.healthTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedProductDetails.healthTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      Không có nhãn cảnh báo sức khỏe.
                    </p>
                  )}
                </div>

                {/* AI recommendation/Reason */}
                {selectedProductDetails.aiReason && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gợi ý từ AI (AI Recommendation)
                    </span>
                    <p className="text-xs text-indigo-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                      💡 {selectedProductDetails.aiReason}
                    </p>
                  </div>
                )}

                {/* Operational Note */}
                {selectedProductDetails.operationalNote && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ghi chú vận hành
                    </span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 italic">
                      📝 {selectedProductDetails.operationalNote}
                    </p>
                  </div>
                )}

                {/* Product Tags */}
                {selectedProductDetails.tags &&
                  selectedProductDetails.tags.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedProductDetails.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProductDetails(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaigns;
