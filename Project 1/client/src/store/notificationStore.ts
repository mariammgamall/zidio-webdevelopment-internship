import { create } from 'zustand';

interface NotificationAlert {
  id: string;
  type: 'meeting_invite' | 'action_item_assigned' | 'mention' | 'meeting_summary_ready' | 'task_status_changed';
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationAlert[];
  unreadCount: number;
  fetchNotifications: (token: string) => Promise<void>;
  addNotification: (n: NotificationAlert) => void;
  markAsRead: (token: string, id: string) => Promise<void>;
  markAllRead: (token: string) => Promise<void>;
  clearAll: (token: string) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (token) => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const list = data.notifications.map((n: any) => ({
          id: n._id,
          type: n.type,
          message: n.message,
          read: n.read,
          metadata: n.metadata,
          createdAt: n.createdAt
        }));
        const count = list.filter((n: any) => !n.read).length;
        set({ notifications: list, unreadCount: count });
      }
    } catch (err) {
      // fail silently
    }
  },

  addNotification: (n) => set((state) => {
    // Avoid double inserts
    if (state.notifications.some(existing => existing.id === n.id)) return {};
    const updated = [n, ...state.notifications];
    return {
      notifications: updated,
      unreadCount: updated.filter(item => !item.read).length
    };
  }),

  markAsRead: async (token, id) => {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        set((state) => {
          const list = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
          return {
            notifications: list,
            unreadCount: list.filter(n => !n.read).length
          };
        });
      }
    } catch (err) {
      // ignore
    }
  },

  markAllRead: async (token) => {
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        }));
      }
    } catch (err) {
      // ignore
    }
  },

  clearAll: async (token) => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        set({ notifications: [], unreadCount: 0 });
      }
    } catch (err) {
      // ignore
    }
  }
}));
