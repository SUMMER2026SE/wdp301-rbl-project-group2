import { apiClient } from "@/lib/api-client";

// ---- Types aligned with BE ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password?: string;
}

/**
 * BE user object shape (after omitPassword).
 * Role is UPPERCASE enum from BE: 'ADMIN' | 'STAFF' | 'CUSTOMER'
 */
export interface BEUser {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  isActive: boolean;
  verified_at: string | null;
  addresses: Array<{
    label: string;
    receiver_name: string;
    phone: string;
    detail: string;
    ward: string;
    district: string;
    city: string;
    isDefault: boolean;
  }>;
  collected_points: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard BE response wrapper.
 * Tokens are set via httpOnly cookies, NOT in response body.
 */
export interface BEResponse<T = unknown> {
  status: number;
  data?: T;
  message?: string;
  info?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
  confirm_password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

// ---- Service ----

class AuthService {
  /**
   * Login with email and password.
   * BE sets accessToken + refreshToken + deviceId via httpOnly cookies.
   * Response body contains: { data: BEUser, message: string }
   */
  async login(data: LoginRequest): Promise<BEResponse<BEUser>> {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  }

  /**
   * Register a new user.
   */
  async register(data: RegisterRequest): Promise<BEResponse<BEUser>> {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  }

  /**
   * Request a password reset link via email.
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<BEResponse> {
    const response = await apiClient.post("/auth/password/forgot", data);
    return response.data;
  }

  /**
   * Reset password with verification code.
   */
  async resetPassword(data: ResetPasswordRequest): Promise<BEResponse> {
    const response = await apiClient.post("/auth/password/reset", data);
    return response.data;
  }

  /**
   * Verify password reset OTP.
   */
  async verifyPasswordResetOTP(data: {
    email: string;
    code: string;
  }): Promise<BEResponse> {
    const response = await apiClient.post("/auth/password/verify-otp", data);
    return response.data;
  }

  /**
   * Login with Google OAuth credential.
   */
  async loginWithGoogle(data: GoogleLoginRequest): Promise<BEResponse<BEUser>> {
    const response = await apiClient.post("/auth/google", data);
    return response.data;
  }

  /**
   * Get current authenticated user info.
   * Uses cookie-based auth (accessToken cookie sent automatically).
   */
  async getCurrentUser(): Promise<BEResponse<BEUser>> {
    const response = await apiClient.get("/auth/me");
    return response.data;
  }

  /**
   * Refresh access token.
   * Uses refreshToken cookie.
   */
  async refreshToken(): Promise<BEResponse> {
    const response = await apiClient.post("/auth/refresh");
    return response.data;
  }

  /**
   * Logout — clears cookies on BE side.
   */
  async logout(): Promise<BEResponse> {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  }

  /**
   * Verify email with 6-digit code.
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<BEResponse<BEUser>> {
    const response = await apiClient.post("/auth/verify-email", data);
    return response.data;
  }

  /**
   * Resend verification email.
   */
  async resendVerifyEmail(email: string): Promise<BEResponse> {
    const response = await apiClient.post("/auth/resend-verify-email", {
      email,
    });
    return response.data;
  }
}

export default new AuthService();
