import { Info, ShoppingCart } from 'lucide-react';
import { useAllergyWarningStore } from '@/store/allergyWarningStore';

export function AddToCartWarningModal() {
  const { isOpen, conflictData, closeWarning, confirmWarning } = useAllergyWarningStore();

  if (!isOpen || !conflictData) return null;

  const { productName, warningMessage, conflictIngredients } = conflictData;
  const friendlyMessage = conflictIngredients.length > 0
    ? `Món này có ${conflictIngredients.join(', ')}. Bạn xem qua để chọn món hợp với khẩu vị và nhu cầu của mình nhé.`
    : warningMessage || 'Bạn xem qua thông tin thành phần trước khi thêm món nhé.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeWarning} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 pt-6 pb-8 bg-gradient-to-r from-amber-400 to-orange-400">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center">
              <Info className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl font-black">Lưu ý nhỏ về thành phần</h2>
              <p className="text-white/85 text-sm">Món này có vài thành phần trùng với hồ sơ của bạn</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 -mt-3">
          <div className="flex gap-3 p-4 rounded-2xl border bg-amber-50 border-amber-200">
            <Info className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-base text-slate-900">{productName}</p>
              <p className="text-sm mt-1 text-amber-800">{friendlyMessage}</p>
              {conflictIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {conflictIngredients.map((ingredient, index) => (
                    <span
                      key={`${ingredient}-${index}`}
                      className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-amber-700 border border-amber-200"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-6 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-blue-700 text-xs text-center">
            Bạn vẫn có thể thêm vào giỏ nếu món này phù hợp với nhu cầu của mình hoặc đang mua giúp người khác.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={closeWarning}
            className="flex-1 h-12 rounded-2xl border-2 border-gray-200 text-slate-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Xem lại
          </button>
          <button
            onClick={confirmWarning}
            className="flex-1 h-12 rounded-2xl text-white font-bold text-sm transition-colors shadow-lg bg-orange-600 hover:bg-orange-700 shadow-orange-200 inline-flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Vẫn thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
