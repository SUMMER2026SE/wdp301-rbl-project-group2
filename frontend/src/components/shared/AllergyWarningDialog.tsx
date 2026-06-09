/**
 * FSS-40: AllergyWarningDialog
 * Modal that warns users about allergen conflicts in their cart items
 * before they complete an order. User must explicitly confirm to proceed.
 */

import type { Product } from '@/types/product';
import { checkProductAllergies } from '@/hooks/useAllergyCheck';

interface ConflictItem {
  productName: string;
  conflictIngredients: string[];
  warningMessage: string;
  level: 'danger' | 'warning';
}

interface AllergyWarningDialogProps {
  /** Cart items with their product data */
  conflicts: ConflictItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function AllergyWarningDialog({ conflicts, onConfirm, onCancel }: AllergyWarningDialogProps) {
  const dangerItems = conflicts.filter((c) => c.level === 'danger');
  const warningItems = conflicts.filter((c) => c.level === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 pt-6 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">health_and_safety</span>
            </div>
            <div>
              <h2 className="text-white text-xl font-black">Cảnh báo sức khỏe!</h2>
              <p className="text-white/80 text-sm">Giỏ hàng có món không phù hợp với hồ sơ của bạn</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 -mt-3 space-y-3 max-h-64 overflow-y-auto">
          {dangerItems.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
              <span className="material-symbols-outlined text-red-500 text-xl mt-0.5 shrink-0">warning</span>
              <div>
                <p className="font-bold text-red-800 text-sm">{item.productName}</p>
                <p className="text-red-600 text-xs mt-0.5">{item.warningMessage}</p>
                {item.conflictIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.conflictIngredients.map((ing, j) => (
                      <span key={j} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {ing}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {warningItems.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5 shrink-0">info</span>
              <div>
                <p className="font-bold text-amber-800 text-sm">{item.productName}</p>
                <p className="text-amber-700 text-xs mt-0.5">{item.warningMessage}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-blue-700 text-xs">
            💡 Bạn vẫn có thể đặt nếu đang mua giúp người khác hoặc đã tham khảo ý kiến bác sĩ.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl border-2 border-gray-200 text-slate-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm hover:from-orange-600 hover:to-red-600 transition-colors shadow-lg shadow-orange-200"
          >
            Tôi hiểu, tiếp tục đặt
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility: scan all cart items and return a list of allergy/dietary conflicts
 */
export function scanCartForAllergies(
  cartItems: { product: Product; quantity: number }[],
  userAllergies: string[],
  userDietary: string[] = []
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  for (const { product } of cartItems) {
    const result = checkProductAllergies(product, userAllergies, userDietary);
    if (result.level !== 'safe') {
      conflicts.push({
        productName: product.name,
        conflictIngredients: result.conflictIngredients,
        warningMessage: result.warningMessage,
        level: result.level,
      });
    }
  }
  return conflicts;
}
