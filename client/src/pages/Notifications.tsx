import { useState, useEffect } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, CheckCircle2, AlertTriangle, Clock, FileText, Trash2, Check, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Notification } from "@/components/NotificationDropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "claim_update":
      return <FileText className="h-5 w-5 text-primary" />;
    case "deadline":
      return <Clock className="h-5 w-5 text-destructive" />;
    case "reminder":
      return <Bell className="h-5 w-5 text-secondary" />;
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getTypeBadge = (type: Notification["type"]) => {
  const styles: Record<Notification["type"], string> = {
    claim_update: "bg-primary/10 text-primary",
    deadline: "bg-destructive/10 text-destructive",
    reminder: "bg-secondary/10 text-secondary-foreground",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700"
  };
  
  const labels: Record<Notification["type"], string> = {
    claim_update: "Claim Update",
    deadline: "Deadline",
    reminder: "Reminder",
    success: "Success",
    warning: "Warning"
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

export default function Notifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const saved = localStorage.getItem("notifications");
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  };

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

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
    toast({
      title: "All Marked as Read",
      description: "All notifications have been marked as read."
    });
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event('notificationsUpdated'));
    toast({
      title: "Notification Deleted",
      description: "The notification has been removed."
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem("notifications", JSON.stringify([]));
    window.dispatchEvent(new Event('notificationsUpdated'));
    setShowClearDialog(false);
    toast({
      title: "Notifications Cleared",
      description: "All notifications have been removed."
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <Bell className="h-8 w-8 text-secondary" /> Notifications
            </h1>
            <p className="text-muted-foreground">Stay updated on your claims and important deadlines.</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription data-testid="text-notification-count">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button 
                  variant={filter === "all" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-none"
                  onClick={() => setFilter("all")}
                  data-testid="button-filter-all"
                >
                  All ({notifications.length})
                </Button>
                <Button 
                  variant={filter === "unread" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-none"
                  onClick={() => setFilter("unread")}
                  data-testid="button-filter-unread"
                >
                  Unread ({unreadCount})
                </Button>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead} data-testid="button-mark-all-read">
                  <Check className="mr-2 h-4 w-4" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowClearDialog(true)} data-testid="button-clear-all">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg" data-testid="empty-state-notifications">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {filter === "unread" ? "No Unread Notifications" : "No Notifications"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {filter === "unread" 
                    ? "You're all caught up! No unread notifications at this time."
                    : "You don't have any notifications yet. Notifications about claim updates and deadlines will appear here."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${!notification.read ? "bg-primary/5 border-primary/20" : "bg-background hover:bg-muted/50"}`}
                    data-testid={`notification-row-${notification.id}`}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(notification.type)}
                          {!notification.read && (
                            <span className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground" data-testid={`text-title-${notification.id}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-message-${notification.id}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")} ({formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })})
                          </span>
                          <div className="flex gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Check className="mr-1 h-3 w-3" /> Mark read
                              </Button>
                            )}
                            {notification.link && (
                              <Link href={notification.link}>
                                <Button variant="outline" size="sm" data-testid={`button-view-${notification.id}`}>
                                  View details
                                </Button>
                              </Link>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                              data-testid={`button-delete-${notification.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-clear">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
