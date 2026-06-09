import { useAllergyWarningStore } from '@/store/allergyWarningStore';

export function AddToCartWarningModal() {
  const { isOpen, conflictData, closeWarning, confirmWarning } = useAllergyWarningStore();

  if (!isOpen || !conflictData) return null;

  const { productName, warningMessage, conflictIngredients, level } = conflictData;
  const isDanger = level === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeWarning} />

      {/* Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`px-6 pt-6 pb-8 ${isDanger ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">health_and_safety</span>
            </div>
            <div>
              <h2 className="text-white text-xl font-black">{isDanger ? 'Cảnh báo dị ứng!' : 'Lưu ý sức khỏe'}</h2>
              <p className="text-white/80 text-sm">Món ăn này có rủi ro so với hồ sơ của bạn</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 -mt-3">
          <div className={`flex gap-3 p-4 rounded-2xl border ${isDanger ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className={`material-symbols-outlined text-2xl mt-0.5 shrink-0 ${isDanger ? 'text-red-500' : 'text-amber-500'}`}>
              {isDanger ? 'warning' : 'info'}
            </span>
            <div>
              <p className={`font-bold text-base ${isDanger ? 'text-red-800' : 'text-amber-800'}`}>{productName}</p>
              <p className={`text-sm mt-1 ${isDanger ? 'text-red-700' : 'text-amber-700'}`}>{warningMessage}</p>
              {conflictIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {conflictIngredients.map((ing, j) => (
                    <span key={j} className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDanger ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ing}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-blue-700 text-xs text-center">
            💡 Bạn có xác nhận muốn bỏ qua cảnh báo và tiếp tục thêm vào giỏ không?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={closeWarning}
            className="flex-1 h-12 rounded-2xl border-2 border-gray-200 text-slate-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={confirmWarning}
            className={`flex-1 h-12 rounded-2xl text-white font-bold text-sm transition-colors shadow-lg ${isDanger ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-200' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'}`}
          >
            Tiếp tục thêm
          </button>
        </div>
      </div>
    </div>
  );
}
