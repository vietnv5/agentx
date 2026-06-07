import { apiClient } from "@/src/lib/api-client";

export const authService = {
  /**
   * Đăng nhập hệ thống
   */
  async login(payload: Record<string, any>) {
    const response = await apiClient.post("/api/auth/login", payload);

    return response.data;
  },

  /**
   * Đăng xuất hệ thống
   */
  async logout(refreshToken: string | null) {
    return apiClient.post("/api/auth/logout", { refreshToken });
  },
};
