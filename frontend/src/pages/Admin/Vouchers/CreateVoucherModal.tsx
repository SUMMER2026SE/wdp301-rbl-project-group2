import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import VoucherAPI from "@/services/voucher.service";
import {
  DiscountType,
  VoucherCategory,
  type CreateVoucherRequest,
  type Voucher,
} from "@/types/voucher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreateVoucherModalProps {
  open: boolean;
  editingVoucher?: Voucher | null;
  onClose: () => void;
  onSaved: () => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateVN = (date: Date) => {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const parseDateVN = (value: string, endOfDay = false) => {
  const [day, month, year] = value.trim().split("/").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? date : null;
};

const normalizeNumberInput = (value: string) => value.replace(/[^\d]/g, "");

const generateVoucherCode = () =>
  `RDM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

const CreateVoucherModal = ({
  open,
  editingVoucher,
  onClose,
  onSaved,
}: CreateVoucherModalProps) => {
  const isEditMode = Boolean(editingVoucher);
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  const [newVoucherCode, setNewVoucherCode] = useState("");

  const [newVoucherCategory, setNewVoucherCategory] = useState<VoucherCategory>(
    VoucherCategory.DISCOUNT,
  );

  const [newVoucherDiscountType, setNewVoucherDiscountType] =
    useState<DiscountType>(DiscountType.PERCENTAGE);

  const [newVoucherDiscountValue, setNewVoucherDiscountValue] = useState("10");
  const [newVoucherMaxDiscount, setNewVoucherMaxDiscount] = useState("");
  const [newVoucherMinOrderValue, setNewVoucherMinOrderValue] = useState("");

  const [newVoucherStartAt, setNewVoucherStartAt] = useState(() =>
    formatDateVN(new Date()),
  );

  const [newVoucherEndAt, setNewVoucherEndAt] = useState(() =>
    formatDateVN(addDays(new Date(), 7)),
  );

  const [newVoucherUsageLimit, setNewVoucherUsageLimit] = useState("");

  const [newVoucherIsActive, setNewVoucherIsActive] = useState(true);
  const [newVoucherIsStackable, setNewVoucherIsStackable] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingVoucher) {
      setNewVoucherCode(editingVoucher.code);
      setNewVoucherCategory(editingVoucher.category);
      setNewVoucherDiscountType(editingVoucher.discountType);
      setNewVoucherDiscountValue(String(editingVoucher.discountValue));

      setNewVoucherMaxDiscount(
        editingVoucher.maxDiscount === null ||
          editingVoucher.maxDiscount === undefined
          ? ""
          : String(editingVoucher.maxDiscount),
      );

      setNewVoucherMinOrderValue(
        editingVoucher.minOrderValue
          ? String(editingVoucher.minOrderValue)
          : "",
      );

      setNewVoucherStartAt(formatDateVN(new Date(editingVoucher.startAt)));
      setNewVoucherEndAt(formatDateVN(new Date(editingVoucher.endAt)));

      setNewVoucherUsageLimit(
        editingVoucher.usageLimit ? String(editingVoucher.usageLimit) : "",
      );

      setNewVoucherIsActive(editingVoucher.isActive);
      setNewVoucherIsStackable(editingVoucher.isStackable);

      return;
    }

    setNewVoucherCode(generateVoucherCode());
    setNewVoucherCategory(VoucherCategory.DISCOUNT);
    setNewVoucherDiscountType(DiscountType.PERCENTAGE);

    setNewVoucherDiscountValue("10");
    setNewVoucherMaxDiscount("");
    setNewVoucherMinOrderValue("");

    setNewVoucherStartAt(formatDateVN(new Date()));
    setNewVoucherEndAt(formatDateVN(addDays(new Date(), 7)));

    setNewVoucherUsageLimit("");

    setNewVoucherIsActive(true);
    setNewVoucherIsStackable(false);
  }, [open, editingVoucher]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const startDate = parseDateVN(newVoucherStartAt);
    const endDate = parseDateVN(newVoucherEndAt, true);

    const discountValue = Number(newVoucherDiscountValue);
    const maxDiscount =
      newVoucherMaxDiscount === "" ? undefined : Number(newVoucherMaxDiscount);
    const minOrderValue =
      newVoucherMinOrderValue === "" ? 0 : Number(newVoucherMinOrderValue);
    const usageLimit =
      newVoucherUsageLimit === "" ? 0 : Number(newVoucherUsageLimit);

    if (!newVoucherCode.trim()) {
      return toast.error("Không thể tạo mã voucher, thử lại sau");
    }

    if (!startDate || !endDate) {
      return toast.error("Thời gian phải có định dạng dd/mm/yyyy");
    }

    if (startDate >= endDate) {
      return toast.error("Ngày bắt đầu phải trước ngày kết thúc");
    }

    if (!newVoucherDiscountValue || discountValue <= 0) {
      return toast.error("Vui lòng nhập giá trị giảm giá hợp lệ");
    }

    if (
      newVoucherDiscountType === DiscountType.PERCENTAGE &&
      discountValue > 100
    ) {
      return toast.error("Phần trăm giảm không được vượt quá 100%");
    }

    if (
      newVoucherDiscountType === DiscountType.PERCENTAGE &&
      maxDiscount !== undefined &&
      maxDiscount < 0
    ) {
      return toast.error("Giảm tối đa không hợp lệ");
    }

    if (minOrderValue < 0) {
      return toast.error("Giá trị đơn hàng tối thiểu không hợp lệ");
    }

    if (usageLimit < 0) {
      return toast.error("Giới hạn lượt dùng không hợp lệ");
    }

    const payload: CreateVoucherRequest = {
      code: newVoucherCode.trim(),
      title: editingVoucher?.title || newVoucherCode.trim(),
      description: editingVoucher?.description || "Voucher được tạo tự động",
      category: newVoucherCategory,
      discountType: newVoucherDiscountType,
      discountValue,
      maxDiscount:
        newVoucherDiscountType === DiscountType.PERCENTAGE
          ? maxDiscount
          : undefined,
      minOrderValue,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      usageLimit,
      conditions: editingVoucher?.conditions || [],
      isActive: newVoucherIsActive,
      isStackable: newVoucherIsStackable,
    };

    setCreatingVoucher(true);

    try {
      if (editingVoucher) {
        await VoucherAPI.updateVoucher(editingVoucher._id, payload);
        toast.success("Voucher đã được cập nhật thành công");
      } else {
        await VoucherAPI.createVoucher(payload);
        toast.success("Voucher đã được tạo thành công");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving voucher:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Đã xảy ra lỗi khi lưu voucher",
      );
    } finally {
      setCreatingVoucher(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Chỉnh sửa voucher" : "Tạo voucher mới"}
        </DialogTitle>

        <DialogDescription>
          {isEditMode
            ? "Cập nhật thông tin voucher hiện có."
            : "Nhập thông tin voucher để triển khai chương trình khuyến mãi."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Mã voucher
            </span>

            <div className="flex items-center gap-2">
              <Input value={newVoucherCode} readOnly />

              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewVoucherCode(generateVoucherCode())}
                >
                  Tạo lại
                </Button>
              )}
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Loại voucher
            </span>

            <select
              value={newVoucherCategory}
              onChange={(e) =>
                setNewVoucherCategory(e.target.value as VoucherCategory)
              }
              className="w-full rounded-xl border border-[#e7dbcf] bg-[#fcfaf8] px-4 py-3 text-sm text-[#1b140d] outline-none focus:border-[#ee8c2b]"
            >
              <option value={VoucherCategory.DISCOUNT}>Giảm giá</option>
              <option value={VoucherCategory.FREESHIP}>
                Miễn phí vận chuyển
              </option>
              <option value={VoucherCategory.NEWUSER}>Khách mới</option>
              <option value={VoucherCategory.SPECIAL}>Đặc biệt</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Loại chiết khấu
            </span>

            <select
              value={newVoucherDiscountType}
              onChange={(e) => {
                const selectedType = e.target.value as DiscountType;

                setNewVoucherDiscountType(selectedType);

                if (selectedType === DiscountType.FIXED_AMOUNT) {
                  setNewVoucherMaxDiscount("");
                }
              }}
              className="w-full rounded-xl border border-[#e7dbcf] bg-[#fcfaf8] px-4 py-3 text-sm text-[#1b140d] outline-none focus:border-[#ee8c2b]"
            >
              <option value={DiscountType.PERCENTAGE}>Phần trăm</option>
              <option value={DiscountType.FIXED_AMOUNT}>Số tiền cố định</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              {newVoucherDiscountType === DiscountType.PERCENTAGE
                ? "Phần trăm giảm (%)"
                : "Số tiền giảm (VND)"}
            </span>

            <Input
              type="text"
              inputMode="numeric"
              placeholder={
                newVoucherDiscountType === DiscountType.PERCENTAGE
                  ? "VD: 10"
                  : "VD: 50000"
              }
              value={newVoucherDiscountValue}
              onChange={(e) =>
                setNewVoucherDiscountValue(normalizeNumberInput(e.target.value))
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Giảm tối đa (VND)
            </span>

            <Input
              type="text"
              inputMode="numeric"
              placeholder={
                newVoucherDiscountType === DiscountType.PERCENTAGE
                  ? "VD: 50000"
                  : ""
              }
              value={newVoucherMaxDiscount}
              disabled={newVoucherDiscountType === DiscountType.FIXED_AMOUNT}
              onChange={(e) =>
                setNewVoucherMaxDiscount(normalizeNumberInput(e.target.value))
              }
              className={
                newVoucherDiscountType === DiscountType.FIXED_AMOUNT
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : ""
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Giá trị đơn hàng tối thiểu (VND)
            </span>

            <Input
              type="text"
              inputMode="numeric"
              placeholder="VD: 100000"
              value={newVoucherMinOrderValue}
              onChange={(e) =>
                setNewVoucherMinOrderValue(normalizeNumberInput(e.target.value))
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">Bắt đầu</span>

            <Input
              type="text"
              placeholder="dd/mm/yyyy"
              value={newVoucherStartAt}
              onChange={(e) => setNewVoucherStartAt(e.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">Kết thúc</span>

            <Input
              type="text"
              placeholder="dd/mm/yyyy"
              value={newVoucherEndAt}
              onChange={(e) => setNewVoucherEndAt(e.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#1b140d]">
              Giới hạn lượt dùng
            </span>

            <Input
              type="text"
              inputMode="numeric"
              placeholder="Không giới hạn nếu trống"
              value={newVoucherUsageLimit}
              onChange={(e) =>
                setNewVoucherUsageLimit(normalizeNumberInput(e.target.value))
              }
            />
          </label>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1b140d]">
              <span>Kích hoạt</span>

              <input
                type="checkbox"
                checked={newVoucherIsActive}
                onChange={(e) => setNewVoucherIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-[#e7dbcf] accent-[#ee8c2b] focus:ring-[#ee8c2b]"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1b140d]">
              <span>Dùng chung</span>

              <input
                type="checkbox"
                checked={newVoucherIsStackable}
                onChange={(e) => setNewVoucherIsStackable(e.target.checked)}
                className="h-4 w-4 rounded border-[#e7dbcf] accent-[#ee8c2b] focus:ring-[#ee8c2b]"
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>

          <Button type="submit" disabled={creatingVoucher}>
            {creatingVoucher
              ? isEditMode
                ? "Đang cập nhật..."
                : "Đang tạo..."
              : isEditMode
                ? "Cập nhật"
                : "Tạo voucher"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default CreateVoucherModal;
