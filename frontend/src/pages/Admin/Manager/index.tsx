import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

import adminManagerService from "@/services/admin-manager.service";
import CreateManagerModal from "./CreateManagerModal";

import type {
  CreateManagerPayload,
  ManagerMember,
  StoreOption,
} from "@/types/adminManager";

import {
  extractManagersFromResponse,
  getStatusBadge,
  getStatusDotClass,
  getStatusLabel,
  getTimeAgo,
  normalizeManagerFromApi,
} from "@/utils/manager-utils";

const initialFormData: CreateManagerPayload = {
  name: "",
  email: "",
  phone: "",
  storeId: "",
};

const ManagerPage = () => {
  const [managers, setManagers] = useState<ManagerMember[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedManager, setSelectedManager] = useState<ManagerMember | null>(
    null,
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] =
    useState<CreateManagerPayload>(initialFormData);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminManagerService.fetchManagers(1, 100);
      const rawManagers = extractManagersFromResponse(res);

      setManagers(rawManagers.map(normalizeManagerFromApi));
    } catch (err) {
      console.error("Lỗi tải danh sách manager:", err);
      setError("Không thể tải danh sách quản lý cửa hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async () => {
    setStoresLoading(true);

    try {
      const stores = await adminManagerService.fetchStores();
      setStores(stores);
    } catch (err) {
      console.error("Lỗi tải danh sách cửa hàng:", err);
      toast.error("Không thể tải danh sách cửa hàng.");
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchStores();
  }, [fetchManagers, fetchStores]);

  const filteredManagers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) return managers;

    return managers.filter((manager) => {
      return (
        manager.name.toLowerCase().includes(keyword) ||
        manager.email.toLowerCase().includes(keyword) ||
        manager.phone.toLowerCase().includes(keyword) ||
        manager.storeName.toLowerCase().includes(keyword)
      );
    });
  }, [managers, searchQuery]);

  const totalManagers = managers.length;
  const activeManagers = managers.filter((m) => m.status === "active").length;
  const inactiveManagers = managers.filter(
    (m) => m.status === "inactive",
  ).length;
  const blockedManagers = managers.filter((m) => m.status === "blocked").length;

  const handleOpenCreateModal = () => {
    setIsAddModalOpen(true);
    fetchStores();
  };

  const handleCloseCreateModal = () => {
    setIsAddModalOpen(false);
    setFormData(initialFormData);
  };

  const handleCreateManager = async () => {
    setIsSubmitting(true);

    try {
      await adminManagerService.createManager({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        storeId: formData.storeId,
      });

      toast.success("Thêm quản lý cửa hàng thành công.");

      setIsAddModalOpen(false);
      setFormData(initialFormData);

      await fetchManagers();
    } catch (err: any) {
      console.error("Lỗi thêm manager:", err);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể thêm quản lý. Vui lòng kiểm tra lại thông tin.";

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (manager: ManagerMember) => {
    const nextActive = manager.status !== "active";

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${
        manager.status === "active" ? "ngưng kích hoạt" : "kích hoạt lại"
      } quản lý này?`,
    );

    if (!confirmed) return;

    try {
      await adminManagerService.updateManagerStatus(manager.id, nextActive);

      toast.success("Cập nhật trạng thái quản lý thành công.");
      await fetchManagers();
    } catch (err: any) {
      console.error("Lỗi cập nhật trạng thái manager:", err);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật trạng thái quản lý.";

      console.error(message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý nhân sự
          </h2>
          <p className="text-[#9a734c] mt-1">
            Tạo tài khoản nhân sự và phân công phụ trách từng cửa hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#ee8c2b] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#d87c24]"
        >
          <span className="material-symbols-outlined text-xl">person_add</span>
          Thêm quản lý
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
          <p className="text-sm font-medium text-[#9a734c] mb-1">
            Tổng quản lý
          </p>
          <h3 className="text-3xl font-bold text-[#1b140d]">
            {loading ? "—" : totalManagers}
          </h3>
        </div>

        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
          <p className="text-sm font-medium text-[#9a734c] mb-1">
            Đang hoạt động
          </p>
          <h3 className="text-3xl font-bold text-green-600">
            {loading ? "—" : activeManagers}
          </h3>
        </div>

        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
          <p className="text-sm font-medium text-[#9a734c] mb-1">
            Chưa kích hoạt
          </p>
          <h3 className="text-3xl font-bold text-gray-600">
            {loading ? "—" : inactiveManagers}
          </h3>
        </div>

        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
          <p className="text-sm font-medium text-[#9a734c] mb-1">Đã khóa</p>
          <h3 className="text-3xl font-bold text-red-600">
            {loading ? "—" : blockedManagers}
          </h3>
        </div>
      </div>

      <div className="bg-white border border-[#e7dbcf] rounded-xl p-4 mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c]">
            search
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại hoặc cửa hàng..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f3ede7] border-none focus:ring-2 focus:ring-[#ee8c2b]/50 text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden shadow-sm">
        {loading && (
          <div className="p-8 flex flex-col gap-4 animate-pulse">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f3ede7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#f3ede7] rounded w-1/4" />
                  <div className="h-3 bg-[#f3ede7] rounded w-1/3" />
                </div>
                <div className="h-3 bg-[#f3ede7] rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-red-400">
                error
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#1b140d] mb-2">
              Lỗi tải dữ liệu
            </h3>

            <p className="text-sm text-[#9a734c] mb-4">{error}</p>

            <button
              type="button"
              onClick={fetchManagers}
              className="px-4 py-2 bg-[#ee8c2b] text-white text-sm font-bold rounded-lg hover:bg-[#d87c24] transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                      Quản lý
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                      Cửa hàng
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                      Liên hệ
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                      Trạng thái
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                      Ngày tạo
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e7dbcf]">
                  {filteredManagers.map((manager) => (
                    <tr
                      key={manager.id}
                      className="hover:bg-[#fcfaf8] transition-colors group cursor-pointer"
                      onClick={() => setSelectedManager(manager)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#ee8c2b]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ee8c2b]">
                              manage_accounts
                            </span>
                          </div>

                          <div>
                            <p className="text-sm font-bold text-[#1b140d]">
                              {manager.name}
                            </p>

                            <p className="text-xs text-[#9a734c]">
                              {getTimeAgo(manager.lastActive)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-[#1b140d]">
                          {manager.storeName}
                        </p>

                        {manager.storeAddress && (
                          <p className="text-xs text-[#9a734c]">
                            {manager.storeAddress}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-[#1b140d]">
                          {manager.email}
                        </p>
                        <p className="text-xs text-[#9a734c]">
                          {manager.phone}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                            getStatusBadge(manager.status),
                          )}
                        >
                          <span
                            className={clsx(
                              "w-2 h-2 rounded-full",
                              getStatusDotClass(manager.status),
                            )}
                          />
                          {getStatusLabel(manager.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-[#1b140d]">
                          {new Date(manager.joinDate).toLocaleDateString(
                            "vi-VN",
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className={clsx(
                              "p-1.5 rounded transition-colors",
                              manager.status === "active"
                                ? "text-[#9a734c] hover:text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50",
                            )}
                            title={
                              manager.status === "active"
                                ? "Ngưng kích hoạt"
                                : "Kích hoạt lại"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(manager);
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">
                              {manager.status === "active"
                                ? "person_off"
                                : "person_check"}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredManagers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-24 h-24 rounded-full bg-[#f3ede7] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-[#9a734c]">
                    manage_accounts
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#1b140d] mb-2">
                  Không tìm thấy quản lý
                </h3>

                <p className="text-sm text-[#9a734c]">
                  Thử thay đổi từ khóa tìm kiếm hoặc thêm quản lý mới.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedManager && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedManager(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#e7dbcf] px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#1b140d]">
                  {selectedManager.name}
                </h3>
                <p className="text-sm text-[#9a734c]">
                  Quản lý cửa hàng: {selectedManager.storeName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedManager(null)}
                className="p-2 hover:bg-[#f3ede7] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-lg font-bold text-[#1b140d] mb-4">
                  Thông tin quản lý
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#9a734c] mb-1">
                      Email
                    </p>
                    <p className="text-sm text-[#1b140d]">
                      {selectedManager.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#9a734c] mb-1">
                      Điện thoại
                    </p>
                    <p className="text-sm text-[#1b140d]">
                      {selectedManager.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#9a734c] mb-1">
                      Cửa hàng
                    </p>
                    <p className="text-sm text-[#1b140d]">
                      {selectedManager.storeName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#9a734c] mb-1">
                      Trạng thái
                    </p>

                    <span
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                        getStatusBadge(selectedManager.status),
                      )}
                    >
                      <span
                        className={clsx(
                          "w-2 h-2 rounded-full",
                          getStatusDotClass(selectedManager.status),
                        )}
                      />
                      {getStatusLabel(selectedManager.status)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedManager.storeAddress && (
                <div>
                  <h4 className="text-lg font-bold text-[#1b140d] mb-2">
                    Địa chỉ cửa hàng
                  </h4>
                  <p className="text-sm text-[#1b140d]">
                    {selectedManager.storeAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CreateManagerModal
        open={isAddModalOpen}
        loading={isSubmitting}
        stores={stores}
        storesLoading={storesLoading}
        payload={formData}
        onChange={setFormData}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateManager}
      />
    </div>
  );
};

export default ManagerPage;
