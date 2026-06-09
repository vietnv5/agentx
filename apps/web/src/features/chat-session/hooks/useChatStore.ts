import { create } from "zustand";
import { chatService } from "../services/chat.service";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatStore {
  conversations: Conversation[];
  activeId: string | null;
  isStreaming: boolean;
  loadingConv: boolean;
  isSidebarOpen: boolean;
  setActiveId: (id: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  toggleSidebar: () => void;
  loadConversations: () => Promise<void>;
  createConversation: (tempTitle: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeId: null,
  isStreaming: false,
  loadingConv: false,
  isSidebarOpen: typeof window !== "undefined" ? localStorage.getItem("chat_sidebar_open") !== "false" : true,
  setActiveId: (id) => set({ activeId: id }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  toggleSidebar: () => {
    const nextVal = !get().isSidebarOpen;
    set({ isSidebarOpen: nextVal });
    localStorage.setItem("chat_sidebar_open", String(nextVal));
  },
  loadConversations: async () => {
    set({ loadingConv: true });
    try {
      const data = await chatService.getConversations();
      set({ conversations: data });
    } catch (err) {
      console.error("loadConversations error:", err);
    } finally {
      set({ loadingConv: false });
    }
  },
  createConversation: async (tempTitle) => {
    const data = await chatService.createConversation(tempTitle);
    await get().loadConversations();
    set({ activeId: data.id });
    return data.id;
  },
  deleteConversation: async (id) => {
    await chatService.deleteConversation(id);
    if (get().activeId === id) {
      set({ activeId: null });
    }
    await get().loadConversations();
  },
}));
