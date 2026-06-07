import { apiClient } from "@/src/lib/api-client";

export const chatService = {
  /**
   * Lấy danh sách cuộc hội thoại
   */
  async getConversations() {
    const response = await apiClient.get("/api/chat/conversations");
    return response.data;
  },

  /**
   * Lấy lịch sử tin nhắn của cuộc hội thoại
   */
  async getConversationMessages(id: string) {
    const response = await apiClient.get(`/api/chat/conversations/${id}`);
    return response.data;
  },

  /**
   * Lấy danh sách yêu cầu phê duyệt (approvals) đang chờ của cuộc hội thoại
   */
  async getConversationApprovals(id: string) {
    const response = await apiClient.get(`/api/chat/conversations/${id}/approvals`);
    return response.data;
  },

  /**
   * Tạo cuộc hội thoại mới
   */
  async createConversation(title: string) {
    const response = await apiClient.post("/api/chat/conversations", { title });
    return response.data;
  },

  /**
   * Xóa cuộc hội thoại
   */
  async deleteConversation(id: string) {
    const response = await apiClient.delete(`/api/chat/conversations/${id}`);
    return response.data;
  },
};
