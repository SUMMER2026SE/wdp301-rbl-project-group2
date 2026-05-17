import apiClient from '@/lib/api-client';
import type {
    VoucherListResponse,
    VoucherDetailResponse,
    ValidateVoucherRequest,
    ValidateVoucherResponse,
    CreateVoucherRequest,
    VoucherCategory,
} from '@/types/voucher';

class VoucherAPI {
    private baseURL = '/vouchers';

    // Get all vouchers with filters
    async getVouchers(params?: {
        category?: VoucherCategory;
        is_active?: boolean;
        page?: number;
        limit?: number;
    }): Promise<VoucherListResponse> {
        const response = await apiClient.get<VoucherListResponse>(this.baseURL, { params });
        return response.data;
    }

    // Get voucher by ID
    async getVoucherById(id: string): Promise<VoucherDetailResponse> {
        const response = await apiClient.get<VoucherDetailResponse>(`${this.baseURL}/${id}`);
        return response.data;
    }

    // Get voucher by code
    async getVoucherByCode(code: string): Promise<VoucherDetailResponse> {
        const response = await apiClient.get<VoucherDetailResponse>(`${this.baseURL}/code/${code}`);
        return response.data;
    }

    // Validate voucher
    async validateVoucher(data: ValidateVoucherRequest): Promise<ValidateVoucherResponse> {
        const response = await apiClient.post<ValidateVoucherResponse>(
            `${this.baseURL}/validate`,
            data
        );
        return response.data;
    }

    // Create voucher (admin)
    async createVoucher(data: CreateVoucherRequest): Promise<VoucherDetailResponse> {
        const response = await apiClient.post<VoucherDetailResponse>(this.baseURL, data);
        return response.data;
    }

    // Update voucher (admin)
    async updateVoucher(id: string, data: Partial<CreateVoucherRequest>): Promise<VoucherDetailResponse> {
        const response = await apiClient.put<VoucherDetailResponse>(`${this.baseURL}/${id}`, data);
        return response.data;
    }

    // Delete voucher (admin)
    async deleteVoucher(id: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `${this.baseURL}/${id}`
        );
        return response.data;
    }

    // Use voucher
    async useVoucher(id: string): Promise<VoucherDetailResponse> {
        const response = await apiClient.post<VoucherDetailResponse>(`${this.baseURL}/${id}/use`);
        return response.data;
    }
}

export default new VoucherAPI();
