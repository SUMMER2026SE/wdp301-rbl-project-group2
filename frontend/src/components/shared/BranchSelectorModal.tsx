import React, { useEffect, useState } from "react";
import { useStoreStore, type IStore } from "@/store/storeStore";
import { useTranslation } from "react-i18next";
import { MapPin, Loader2, RefreshCw } from "lucide-react";

interface BranchSelectorModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isClosable?: boolean;
}

// Haversine formula to compute exact distance in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const findNearestStore = (userLat: number, userLng: number, stores: IStore[]) => {
  if (stores.length === 0) return null;
  let nearestStore = stores[0];
  let minDistance = calculateDistance(
    userLat,
    userLng,
    stores[0].location.coordinates[1],
    stores[0].location.coordinates[0]
  );

  for (let i = 1; i < stores.length; i++) {
    const store = stores[i];
    const dist = calculateDistance(
      userLat,
      userLng,
      store.location.coordinates[1],
      store.location.coordinates[0]
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestStore = store;
    }
  }
  return { store: nearestStore, distance: minDistance };
};

export const BranchSelectorModal: React.FC<BranchSelectorModalProps> = ({
  isOpen,
  onClose,
  isClosable = false,
}) => {
  const { t } = useTranslation(["common", "customer"]);
  const { stores, selectedStore, isLoading, error, fetchStores, selectStore } = useStoreStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    selectedStore?._id || null
  );

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStore, setNearestStore] = useState<IStore | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [hasTriedAutoLocate, setHasTriedAutoLocate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStores();
    }
  }, [isOpen, fetchStores]);

  // Sync selected branch ID when store selection changes externally
  useEffect(() => {
    if (selectedStore) {
      setSelectedBranchId(selectedStore._id);
    }
  }, [selectedStore]);

  // Geolocation lookup function
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt của bạn không hỗ trợ định vị.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setNearestStore(null);
        setNearestDistance(null);
        if (error.code === 1) {
          setLocationError("Bạn đã từ chối cấp quyền vị trí. Vui lòng tự chọn chi nhánh bên dưới.");
        } else {
          setLocationError("Không thể xác định vị trí của bạn. Vui lòng tự chọn chi nhánh bên dưới.");
        }
      },
      { timeout: 8000 }
    );
  };

  // Automatically trigger location calculation when coordinates or stores are populated
  useEffect(() => {
    if (userCoords && stores.length > 0) {
      const result = findNearestStore(userCoords.lat, userCoords.lng, stores);
      if (result) {
        setNearestStore(result.store);
        setNearestDistance(result.distance);
      }
    }
  }, [userCoords, stores]);

  // Automatically trigger geolocation prompt on first open when no store is selected yet
  useEffect(() => {
    if (isOpen && !selectedStore && !hasTriedAutoLocate) {
      setHasTriedAutoLocate(true);
      handleLocate();
    }
  }, [isOpen, selectedStore, hasTriedAutoLocate]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (store: IStore) => {
    setSelectedBranchId(store._id);
    selectStore(store);
    if (onClose) onClose();
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#3c2415]/45 backdrop-blur-md transition-opacity duration-300"
        onClick={() => isClosable && onClose?.()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-orange-100/50 dark:border-slate-800 animate-in zoom-in-95 fade-in duration-200 z-10 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              📍 Chọn Chi Nhánh
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Vui lòng chọn chi nhánh FoodieDash tại Đà Nẵng để xem thực đơn chính xác và đặt hàng.
            </p>
          </div>
          {isClosable && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          )}
        </div>

        {/* Location Info / Error Alerts */}
        {locationError && (
          <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0">info</span>
            <div className="flex-1">
              <p className="leading-relaxed">{locationError}</p>
            </div>
          </div>
        )}

        {/* Suggested store banner */}
        {nearestStore && (
          <div className="mb-5 p-4 bg-gradient-to-br from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 rounded-[1.8rem] text-white shadow-lg relative overflow-hidden animate-in slide-in-from-top duration-300">
            {/* Decorative blur circles */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
            <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-amber-300/20 rounded-full blur-lg pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 text-[9px] font-black tracking-wider uppercase rounded-full leading-none">
                    ⭐ Gần Bạn Nhất (Đề xuất)
                  </span>
                  {nearestDistance !== null && (
                    <span className="text-[10px] font-bold text-amber-100 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">location_on</span>
                      {formatDistance(nearestDistance)}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black tracking-tight leading-snug">
                  {nearestStore.name}
                </h3>
                <p className="text-xs text-orange-50/90 font-medium">
                  {nearestStore.address}
                </p>
              </div>
              <button
                onClick={() => handleSelect(nearestStore)}
                className="px-5 py-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl font-black text-xs transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer hover:shadow-lg"
              >
                <span>Chọn chi nhánh này</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Content list header */}
        {!isLoading && !error && stores.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Danh sách chi nhánh
            </span>
            <button
              onClick={handleLocate}
              disabled={isLocating}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                  Đang định vị...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  {userCoords ? "Định vị lại" : "Tự động tìm chi nhánh gần nhất"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-sm text-slate-400 font-medium animate-pulse">
              Đang tải danh sách chi nhánh...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="inline-flex p-3 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full mb-3">
              <span className="material-symbols-outlined text-[30px]">warning</span>
            </div>
            <p className="text-sm text-red-500 font-bold mb-4">{error}</p>
            <button
              onClick={fetchStores}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
            {stores.map((store) => {
              const isSelected = selectedBranchId === store._id;
              
              // Compute distance for each card if user coordinates exist
              let distanceText = "";
              if (userCoords) {
                const dist = calculateDistance(
                  userCoords.lat,
                  userCoords.lng,
                  store.location.coordinates[1],
                  store.location.coordinates[0]
                );
                distanceText = formatDistance(dist);
              }

              return (
                <button
                  key={store._id}
                  onClick={() => handleSelect(store)}
                  className={`flex items-start text-left p-4 rounded-2xl border-2 transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5"
                  }`}
                >
                  <div className={`p-3 rounded-xl mr-4 shrink-0 transition-colors ${
                    isSelected 
                      ? "bg-orange-500 text-white" 
                      : "bg-orange-100 text-orange-600 dark:bg-slate-800 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white"
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-block text-[9px] font-black tracking-widest text-orange-500 uppercase">
                        Quận {store.district}
                      </span>
                      {distanceText && (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                          <span className="material-symbols-outlined text-[10px]">navigation</span>
                          {distanceText}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                      {store.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {store.address}
                    </p>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center animate-in zoom-in-75">
                      <span className="material-symbols-outlined text-[16px] font-black">check</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            💡 Bạn có thể thay đổi chi nhánh bất kỳ lúc nào bằng cách bấm vào tên chi nhánh trên thanh Header.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectorModal;
