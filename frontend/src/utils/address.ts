import type { AuthAddress } from '@/store/authStore';
import type { AddressPayload } from '@/services/profile.service';

const VIETNAM_PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;
const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/** Chuẩn hóa SĐT VN trước khi gửi API (bỏ khoảng trắng, đổi +84 → 0). */
export function normalizePhone(raw: string | undefined | null): string {
    if (!raw) return '';
    let p = raw.trim().replace(/[\s.-]/g, '');
    if (p.startsWith('+84')) {
        p = `0${p.slice(3)}`;
    } else if (p.startsWith('84') && p.length === 11) {
        p = `0${p.slice(2)}`;
    }
    return p;
}

export function isValidPhone(raw: string | undefined | null): boolean {
    if (!raw) return false;
    const p = normalizePhone(raw);
    return VIETNAM_PHONE_REGEX.test(p) || INTERNATIONAL_PHONE_REGEX.test(p);
}

/** Chỉ gửi field BE chấp nhận — tránh 400 do district/phone rỗng hoặc field thừa. */
export function sanitizeAddressForApi(addr: AuthAddress): AddressPayload {
    const phone = normalizePhone(addr.phone);
    const payload: AddressPayload = {
        label: (addr.label || 'home').trim(),
        receiverName: (addr.receiverName ?? '').trim(),
        detail: (addr.detail ?? '').trim(),
        ward: (addr.ward ?? '').trim(),
        city: (addr.city ?? '').trim(),
        isDefault: Boolean(addr.isDefault),
    };

    // Chỉ đưa phone vào payload nếu có giá trị (BE dùng optionalPhone validator)
    if (phone) {
        payload.phone = phone;
    }

    const district = addr.district?.trim();
    if (district) {
        payload.district = district;
    }

    return payload;
}

export function sanitizeAddressesForApi(addresses: AuthAddress[]): AddressPayload[] {
    return addresses
        .filter(addr =>
            // Chỉ gửi địa chỉ có đủ field bắt buộc — tránh lỗi Zod 400 do data cũ trong DB
            (addr.receiverName ?? '').trim().length > 0 &&
            (addr.ward ?? '').trim().length > 0 &&
            (addr.city ?? '').trim().length > 0 &&
            (addr.detail ?? '').trim().length > 0
        )
        .map(sanitizeAddressForApi);
}
