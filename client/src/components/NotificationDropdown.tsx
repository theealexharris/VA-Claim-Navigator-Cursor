import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bell, CheckCircle2, AlertTriangle, Clock, FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: "claim_update" | "deadline" | "reminder" | "success" | "warning";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "claim_update":
      return <FileText className="h-4 w-4 text-primary" />;
    case "deadline":
      return <Clock className="h-4 w-4 text-destructive" />;
    case "reminder":
      return <Bell className="h-4 w-4 text-secondary" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    const handleStorageChange = () => {
      loadNotifications();
    };
    
    window.addEventListener('notificationsUpdated', handleStorageChange);
    return () => window.removeEventListener('notificationsUpdated', handleStorageChange);
  }, []);

  const loadNotifications = () => {
    const saved = localStorage.getItem("notifications");
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      const defaultNotifications: Notification[] = [
        {
          id: "1",
          type: "reminder",
          title: "Complete Your Profile",
          message: "Add your service history and medical conditions to get started with your claim.",
          read: false,
          createdAt: new Date().toISOString(),
          link: "/dashboard/profile"
        },
        {
          id: "2",
          type: "deadline",
          title: "Upcoming Deadline",
          message: "VA claims typically require submission within 1 year of discharge for presumptive conditions.",
          read: false,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setNotifications(defaultNotifications);
      localStorage.setItem("notifications", JSON.stringify(defaultNotifications));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event('notificationsUpdated'));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event('notificationsUpdated'));
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event('notificationsUpdated'));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem("notifications", JSON.stringify([]));
    window.dispatchEvent(new Event('notificationsUpdated'));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full border-2 border-white text-[10px] text-white font-bold flex items-center justify-center" data-testid="badge-unread-count">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={markAllAsRead}
                data-testid="button-mark-all-read"
              >
                <Check className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="empty-notifications">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-primary/5" : ""}`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-notification-title-${notification.id}`}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 -mr-1 opacity-50 hover:opacity-100"
                          onClick={() => deleteNotification(notification.id)}
                          data-testid={`button-delete-notification-${notification.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" data-testid={`text-notification-message-${notification.id}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => markAsRead(notification.id)}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              Mark read
                            </Button>
                          )}
                          {notification.link && (
                            <Link href={notification.link}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-primary"
                                onClick={() => {
                                  markAsRead(notification.id);
                                  setIsOpen(false);
                                }}
                                data-testid={`button-view-${notification.id}`}
                              >
                                View
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/30 flex justify-between">
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsOpen(false)} data-testid="link-view-all-notifications">
                View all notifications
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={clearAll} data-testid="button-clear-all">
              Clear all
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function addNotification(notification: Omit<Notification, "id" | "createdAt" | "read">) {
  const saved = localStorage.getItem("notifications");
  const existing: Notification[] = saved ? JSON.parse(saved) : [];
  
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    read: false
  };
  
  const updated = [newNotification, ...existing];
  localStorage.setItem("notifications", JSON.stringify(updated));
  
  window.dispatchEvent(new Event('notificationsUpdated'));
}
