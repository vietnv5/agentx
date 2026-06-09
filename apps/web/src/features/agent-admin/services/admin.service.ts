import { apiClient } from "@/src/lib/api-client";

export const adminService = {
  /**
   * Lấy dữ liệu thống kê tổng quan
   */
  async getOverviewStats() {
    const response = await apiClient.get("/api/admin/audit/stats");

    return response.data;
  },

  /**
   * Lấy danh sách Agents
   */
  async getAgents() {
    const response = await apiClient.get("/api/admin/agents");

    return response.data;
  },

  /**
   * Tạo Agent mới
   */
  async createAgent(payload: Record<string, any>) {
    const response = await apiClient.post("/api/admin/agents", payload);

    return response.data;
  },

  /**
   * Cập nhật thông tin Agent
   */
  async updateAgent(id: string, payload: Record<string, any>) {
    const response = await apiClient.patch(`/api/admin/agents/${id}`, payload);

    return response.data;
  },

  /**
   * Xóa Agent
   */
  async deleteAgent(id: string) {
    const response = await apiClient.delete(`/api/admin/agents/${id}`);

    return response.data;
  },

  /**
   * Lấy danh sách MCP Tools
   */
  async getTools() {
    const response = await apiClient.get("/api/admin/integrations/tools");

    return response.data;
  },

  /**
   * Lấy danh sách tích hợp MCP
   */
  async getIntegrations() {
    const response = await apiClient.get("/api/admin/integrations");

    return response.data;
  },

  /**
   * Đăng ký tích hợp MCP mới
   */
  async createIntegration(payload: Record<string, any>) {
    const response = await apiClient.post("/api/admin/integrations", payload);

    return response.data;
  },

  /**
   * Cập nhật cấu hình MCP Server
   */
  async updateIntegration(id: string, payload: Record<string, any>) {
    const response = await apiClient.patch(
      `/api/admin/integrations/${id}`,
      payload,
    );

    return response.data;
  },

  /**
   * Xóa tích hợp MCP
   */
  async deleteIntegration(id: string) {
    const response = await apiClient.delete(`/api/admin/integrations/${id}`);

    return response.data;
  },

  /**
   * Test kết nối tới MCP Server
   */
  async testIntegration(id: string) {
    const response = await apiClient.post(`/api/admin/integrations/${id}/test`);

    return response.data;
  },

  /**
   * Đồng bộ hóa tools từ MCP Server
   */
  async syncIntegration(id: string) {
    const response = await apiClient.post(`/api/admin/integrations/${id}/sync`);

    return response.data;
  },

  /**
   * Bật/Tắt chế độ yêu cầu phê duyệt khi chạy tool
   */
  async toggleToolApproval(toolId: string, requiresApproval: boolean) {
    const response = await apiClient.patch(
      `/api/admin/integrations/tools/${toolId}/approval`,
      {
        requiresApproval,
      },
    );

    return response.data;
  },

  /**
   * Lấy danh sách Users
   */
  async getUsers() {
    const response = await apiClient.get("/api/admin/users");

    return response.data;
  },

  /**
   * Lấy danh sách các vai trò (roles) trong hệ thống
   */
  async getRoles() {
    const response = await apiClient.get("/api/admin/users/roles");

    return response.data;
  },

  /**
   * Tạo User mới
   */
  async createUser(payload: Record<string, any>) {
    const response = await apiClient.post("/api/admin/users", payload);

    return response.data;
  },

  /**
   * Cập nhật thông tin User (roleId, isActive...)
   */
  async updateUser(userId: string, payload: Record<string, any>) {
    const response = await apiClient.patch(
      `/api/admin/users/${userId}`,
      payload,
    );

    return response.data;
  },

  /**
   * Xóa User
   */
  async deleteUser(userId: string) {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);

    return response.data;
  },

  /**
   * Thêm/Cập nhật quy tắc phân quyền cho một vai trò
   */
  async updateRolePermissions(
    roleId: string,
    payload: { toolPattern: string; allowed: boolean },
  ) {
    const response = await apiClient.post(
      `/api/admin/users/roles/${roleId}/permissions`,
      payload,
    );

    return response.data;
  },

  /**
   * Lấy danh sách tài liệu tri thức (Knowledge Base)
   */
  async getKnowledge() {
    const response = await apiClient.get("/api/admin/knowledge/documents");

    return response.data;
  },

  /**
   * Tải tài liệu tri thức lên (upload & indexing)
   */
  async uploadKnowledge(payload: {
    title: string;
    content: string;
    sourceType: string;
    filename: string;
  }) {
    const response = await apiClient.post(
      "/api/admin/knowledge/upload",
      payload,
    );

    return response.data;
  },

  /**
   * Xóa tài liệu tri thức
   */
  async deleteKnowledge(id: string) {
    const response = await apiClient.delete(
      `/api/admin/knowledge/documents/${id}`,
    );

    return response.data;
  },

  /**
   * Tìm kiếm tương đồng trên cơ sở tri thức (Semantic Search Sandbox)
   */
  async searchKnowledge(payload: { query: string; limit: number }) {
    const response = await apiClient.post(
      "/api/admin/knowledge/search",
      payload,
    );

    return response.data;
  },

  /**
   * Lấy danh sách Audit Logs
   */
  async getAuditLogs() {
    const response = await apiClient.get("/api/admin/audit");

    return response.data;
  },

  /**
   * Lấy danh sách logs gọi công cụ (tools logs)
   */
  async getToolsAuditLogs(limit = 50) {
    const response = await apiClient.get(
      `/api/admin/audit/tools?limit=${limit}`,
    );

    return response.data;
  },

  /**
   * Lấy danh sách logs sử dụng LLM Token
   */
  async getLlmUsageLogs(limit = 50) {
    const response = await apiClient.get(
      `/api/admin/audit/usage?limit=${limit}`,
    );

    return response.data;
  },
};
