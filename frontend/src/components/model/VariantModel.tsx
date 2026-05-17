import React, { useMemo, useState } from "react";

type VariantOption = { choice: string; extra_price: number };
type VariantGroup = {
  name: string;
  required?: boolean;
  multiple?: boolean;
  max_choices?: number;
  options: VariantOption[];
};

type SelectedMap = Record<string, string[]>;

function calcExtra(variants: VariantGroup[], selected: SelectedMap) {
  let extra = 0;
  for (const g of variants) {
    const picked = selected[g.name] ?? [];
    for (const c of picked) {
      const opt = g.options?.find((o) => o.choice === c);
      extra += Number(opt?.extra_price ?? 0);
    }
  }
  return extra;
}

function validateSelected(variants: VariantGroup[], selected: SelectedMap) {
  for (const g of variants) {
    const picked = selected[g.name] ?? [];
    if (g.required && picked.length === 0) {
      return `Vui lòng chọn ${g.name}`;
    }
    if (!g.multiple && picked.length > 1) {
      return `${g.name} chỉ được chọn 1`;
    }
    if (g.multiple && g.max_choices && picked.length > g.max_choices) {
      return `${g.name} chỉ được chọn tối đa ${g.max_choices}`;
    }
  }
  return null;
}

function initSelected(variants: VariantGroup[]) {
  const init: SelectedMap = {};
  for (const g of variants) {
    if (g.required && !g.multiple && g.options?.length) {
      init[g.name] = [g.options[0].choice]; // auto chọn option đầu cho required single
    } else {
      init[g.name] = [];
    }
  }
  return init;
}

interface VariantModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  basePrice: number;
  variants: VariantGroup[];
  quantity: number;
  onConfirm: (payload: { variations: { name: string; choice: string }[]; unitPrice: number }) => void;
  toastError?: (msg: string) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({
  open,
  onClose,
  productName,
  basePrice,
  variants,
  quantity,
  onConfirm,
  toastError,
}) => {
  const [selected, setSelected] = useState<SelectedMap>(() => initSelected(variants));

  // re-init khi mở modal với product khác / variants khác
  React.useEffect(() => {
    if (open) setSelected(initSelected(variants));
  }, [open, productName, variants]);

  const extra = useMemo(() => calcExtra(variants, selected), [variants, selected]);
  const unitPrice = basePrice + extra;
  const total = unitPrice * quantity;

  const toggleChoice = (group: VariantGroup, choice: string) => {
    setSelected((prev) => {
      const current = prev[group.name] ?? [];
      if (!group.multiple) {
        return { ...prev, [group.name]: [choice] };
      }

      const exists = current.includes(choice);
      let next = exists ? current.filter((c) => c !== choice) : [...current, choice];

      if (group.max_choices && next.length > group.max_choices) {
        // vượt quá giới hạn → không cho thêm
        return prev;
      }

      return { ...prev, [group.name]: next };
    });
  };

  const handleConfirm = () => {
    const err = validateSelected(variants, selected);
    if (err) {
      toastError?.(err);
      return;
    }

    const variations = variants.flatMap((g) => {
      const picked = selected[g.name] ?? [];
      return picked.map((choice) => ({ name: g.name, choice }));
    });

    onConfirm({ variations, unitPrice });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* modal */}
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="w-full md:max-w-2xl bg-white dark:bg-black rounded-t-2xl md:rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden">
          {/* header */}
          <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-start justify-between">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white">
                Tuỳ chọn cho: {productName}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Giá cơ bản: {Number(basePrice).toLocaleString("vi-VN")}đ
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* body */}
          <div className="p-5 max-h-[60vh] overflow-auto space-y-5">
            {variants.map((g) => {
              const picked = selected[g.name] ?? [];
              return (
                <div key={g.name} className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{g.name}</p>
                      {g.required && (
                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-red-50 text-red-600">
                          Bắt buộc
                        </span>
                      )}
                      {g.multiple && (
                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                          Chọn nhiều{g.max_choices ? ` (tối đa ${g.max_choices})` : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Đã chọn: {picked.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {g.options.map((opt) => {
                      const active = picked.includes(opt.choice);
                      return (
                        <button
                          key={opt.choice}
                          type="button"
                          onClick={() => toggleChoice(g, opt.choice)}
                          className={`px-3 py-2 rounded-xl border text-sm font-bold transition
                            ${
                              active
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-gray-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                            }
                          `}
                        >
                          {opt.choice}
                          {Number(opt.extra_price ?? 0) > 0 && (
                            <span className="ml-2 text-[11px] font-extrabold text-slate-500">
                              +{Number(opt.extra_price).toLocaleString("vi-VN")}đ
                            </span>
                          )}
                          {active && <span className="ml-2">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="p-5 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <div>
                Giá 1 món:{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {unitPrice.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div>
                Tổng ({quantity}):{" "}
                <span className="font-extrabold text-orange-600">
                  {total.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="h-12 px-6 rounded-2xl bg-orange-600 text-white font-extrabold hover:bg-orange-700 transition shadow-lg"
            >
              Xác nhận tuỳ chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default VariantModal;