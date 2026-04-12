import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: { label: string; href: string };
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  add: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const SEED: Omit<AppNotification, "id" | "timestamp" | "read">[] = [
  {
    type: "warning",
    title: "Ollama not detected",
    message: "Ollama is not running or not installed. Start it from the Components page.",
    action: { label: "View Components", href: "/stack" },
  },
  {
    type: "info",
    title: "Updates available",
    message: "New versions of winget packages and pip tools are ready to install.",
    action: { label: "View Updates", href: "/updates" },
  },
  {
    type: "success",
    title: "Continue config loaded",
    message: "Your ~/.continue/config.json was loaded successfully.",
  },
];

let idCounter = 0;
const mkId = () => `notif-${++idCounter}-${Date.now()}`;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    SEED.map((n) => ({ ...n, id: mkId(), timestamp: new Date(Date.now() - Math.random() * 3_600_000), read: false }))
  );

  const add = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    setNotifications((prev) => [{ ...n, id: mkId(), timestamp: new Date(), read: false }, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, add, markRead, markAllRead, remove, clear }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
