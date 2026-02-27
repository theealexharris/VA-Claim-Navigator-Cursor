import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  FileText, 
  Bot, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  User,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Gift,
  Users,
  Mail,
  Lock,
  MessageSquare
} from "lucide-react";
import { ContactUsDialog } from "@/components/ContactUsDialog";
import { CONTACT_EMAIL_ADMIN, FEEDBACK_EMAIL } from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export function getWorkflowProgress() {
  const profileComplete = localStorage.getItem("personalInfoComplete") === "true";
  const serviceHistoryComplete = localStorage.getItem("serviceHistoryComplete") === "true";
  const medicalConditionsComplete = localStorage.getItem("medicalConditionsComplete") === "true";
  
  return {
    profileComplete,
    serviceHistoryComplete,
    medicalConditionsComplete,
    canAccessServiceHistory: profileComplete,
    canAccessMedicalConditions: profileComplete && serviceHistoryComplete,
    canAccessClaimBuilder: profileComplete && serviceHistoryComplete && medicalConditionsComplete,
  };
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState({ firstName: "", lastName: "" });
  const [userRole, setUserRole] = useState<string>("user");
  const [workflowProgress, setWorkflowProgress] = useState(getWorkflowProgress());
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(location.includes('profile') || location.includes('history'));
  const isAdmin = userRole === "admin";

  // Listen for the global session-expired event fired by AuthProvider after 60 minutes
  const handleSessionExpired = useCallback(() => {
    toast({
      title: "Session Expired",
      description: "Your session has expired after 60 minutes. Please log in again to continue.",
      variant: "destructive",
    });
    setLocation("/login");
  }, [toast, setLocation]);

  useEffect(() => {
    window.addEventListener("sessionExpired", handleSessionExpired);
    return () => window.removeEventListener("sessionExpired", handleSessionExpired);
  }, [handleSessionExpired]);

  // 10-minute session warning popup
  useEffect(() => {
    const handleSessionWarning = () => setShowSessionWarning(true);
    window.addEventListener("sessionWarning", handleSessionWarning);
    return () => window.removeEventListener("sessionWarning", handleSessionWarning);
  }, []);

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const refreshWorkflowProgress = () => {
    setWorkflowProgress(getWorkflowProgress());
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserName({ 
        firstName: capitalizeFirstLetter(profile.firstName || ""), 
        lastName: capitalizeFirstLetter(profile.lastName || "") 
      });
      setUserRole(profile.role || "user");
    }
    
    refreshWorkflowProgress();
    
    const handleStorageChange = () => {
      const updatedProfile = localStorage.getItem("userProfile");
      if (updatedProfile) {
        const profile = JSON.parse(updatedProfile);
        setUserName({ 
          firstName: capitalizeFirstLetter(profile.firstName || ""), 
          lastName: capitalizeFirstLetter(profile.lastName || "") 
        });
        setUserRole(profile.role || "user");
      }
      refreshWorkflowProgress();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('workflowProgressUpdate', refreshWorkflowProgress);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workflowProgressUpdate', refreshWorkflowProgress);
    };
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
        <img src="/favicon.png" alt="VA Claim Navigator" className="h-8 w-8 object-contain shrink-0" />
        <span className="font-serif font-bold text-lg text-white">Claim Navigator</span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={location === "/dashboard"} />
        
        {/* Profile Section */}
        <Collapsible open={isProfileOpen} onOpenChange={setIsProfileOpen} className="space-y-1">
          <CollapsibleTrigger className="flex items-center w-full px-3 py-2.5 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-md group">
            <User className="h-5 w-5 mr-3 group-hover:text-white" />
            <span className="flex-1 text-left">My Profile</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-9 space-y-1">
            <NavItem href="/dashboard/profile" label="1. Personal Info" isActive={location === "/dashboard/profile"} isSubItem />
            <NavItem 
              href="/dashboard/service-history" 
              label="2. Service History" 
              isActive={location === "/dashboard/service-history"} 
              isSubItem 
              isLocked={!workflowProgress.canAccessServiceHistory}
              lockedMessage="Complete Personal Info first"
            />
            <NavItem 
              href="/dashboard/medical-history" 
              label="3. Medical Conditions" 
              isActive={location === "/dashboard/medical-history"} 
              isSubItem 
              isLocked={!workflowProgress.canAccessMedicalConditions}
              lockedMessage="Complete Service History first"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Tools Section */}
        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Claim Tools
        </div>

        <NavItem 
          href="/dashboard/claim-builder" 
          icon={FileText} 
          label="4. Claim Builder" 
          isActive={location === "/dashboard/claim-builder"} 
          isLocked={!workflowProgress.canAccessClaimBuilder}
          lockedMessage="Complete Medical Conditions first"
        />
        
        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Support
        </div>
        
        <NavItem href="/dashboard/coach" icon={Bot} label="Warrior Coach AI" isActive={location === "/dashboard/coach"} />
        <NavItem href="/dashboard/education" icon={BookOpen} label="Education Library" isActive={location === "/dashboard/education"} />
        <NavItem href="/dashboard/referrals" icon={Gift} label="Refer a Veteran" isActive={location === "/dashboard/referrals"} />
        {isAdmin && (
          <NavItem href="/dashboard/funnel-contacts" icon={Users} label="Funnel Contacts" isActive={location === "/dashboard/funnel-contacts"} />
        )}
        <NavItem href="/dashboard/settings" icon={Settings} label="Settings" isActive={location === "/dashboard/settings"} />

        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Contact
        </div>
        <ContactUsDialog 
          trigger={
            <button className="flex items-center w-full px-3 py-2.5 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-md group">
              <Mail className="h-5 w-5 mr-3 group-hover:text-white" />
              <span>CONTACT US</span>
            </button>
          }
        />
        <a
          href={`mailto:${CONTACT_EMAIL_ADMIN}`}
          className="flex items-center gap-2 px-3 py-1.5 ml-8 text-xs text-sidebar-foreground/60 hover:text-white transition-colors truncate"
          title={CONTACT_EMAIL_ADMIN}
        >
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{CONTACT_EMAIL_ADMIN}</span>
        </a>
        {/* Feedback widget — click opens email to send feedback */}
        <div className="mt-3 mx-3 p-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30">
          <p className="text-xs font-medium text-sidebar-foreground/80 mb-2">Complaints & Feedback Appreciated</p>
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("VA Claim Navigator - Feedback")}`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-sidebar-foreground bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-md transition-colors"
            title="Send feedback to VA Claim Navigator"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            Send feedback
          </a>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );

  const getWelcomeMessage = () => {
    if (userName.lastName) {
      return `Welcome Back Veteran ${userName.lastName}`;
    }
    return "Welcome back";
  };

  const getInitials = () => {
    const first = userName.firstName?.charAt(0) || "";
    const last = userName.lastName?.charAt(0) || "";
    return first + last || "VT";
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-40 shadow-xl overflow-hidden print:hidden">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 print:ml-0 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-r-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>
            <img src="/favicon.png" alt="VA Claim Navigator" className="h-8 w-8 object-contain shrink-0" />
            <span className="font-semibold text-foreground">{getWelcomeMessage()}</span>
          </div>

          <div className="flex items-center gap-4">
            <NotificationDropdown />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src="" alt="User" />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName.firstName && userName.lastName 
                        ? `${userName.firstName} ${userName.lastName}` 
                        : "Veteran User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      veteran@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto print:overflow-visible print:p-0">
          {children}
        </main>
      </div>

      {/* 10-minute session timeout warning */}
      <Dialog open={showSessionWarning} onOpenChange={setShowSessionWarning}>
        <DialogContent className="border-4 border-red-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl">Session Timeout Warning</DialogTitle>
            <DialogDescription className="text-base text-foreground pt-2">
              You have 10 minutes remaining before automatic log-off. Please save any work in progress.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowSessionWarning(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, isActive, isSubItem, isLocked, lockedMessage }: { 
  href: string, 
  icon?: any, 
  label: string, 
  isActive: boolean, 
  isSubItem?: boolean,
  isLocked?: boolean,
  lockedMessage?: string
}) {
  if (isLocked) {
    return (
      <div 
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-md cursor-not-allowed opacity-50
          text-sidebar-foreground/50
          ${isSubItem ? "text-sm" : ""}
        `}
        title={lockedMessage}
      >
        {Icon ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
        <span>{label}</span>
        {!isSubItem && <Lock className="ml-auto h-4 w-4" />}
      </div>
    );
  }

  return (
    <Link href={href} className={`
      flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group
      ${isActive 
        ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" 
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"}
      ${isSubItem ? "text-sm" : ""}
    `}>
      {Icon && <Icon className={`h-5 w-5 ${isActive ? "text-sidebar-primary" : "group-hover:text-white"}`} />}
      <span>{label}</span>
      {isActive && !isSubItem && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
    </Link>
  );
}
