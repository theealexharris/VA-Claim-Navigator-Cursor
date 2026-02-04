import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import ClaimBuilder from "@/pages/ClaimBuilder";
import Profile from "@/pages/Profile";
import ServiceHistory from "@/pages/ServiceHistory";
import MedicalHistory from "@/pages/MedicalHistory";
import LayStatement from "@/pages/LayStatement";
import BuddyStatement from "@/pages/BuddyStatement";
import Evidence from "@/pages/Evidence";
import Appeals from "@/pages/Appeals";
import TDIU from "@/pages/TDIU";
import Coach from "@/pages/Coach";
import Education from "@/pages/Education";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import ReferralProgram from "@/pages/ReferralProgram";
import FunnelContacts from "@/pages/FunnelContacts";
import Notifications from "@/pages/Notifications";
import ConsultationBooking from "@/pages/ConsultationBooking";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/book-consultation" component={ConsultationBooking} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      
      {/* Dashboard Routes - Protected */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/service-history">
        <ProtectedRoute>
          <ServiceHistory />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/medical-history">
        <ProtectedRoute>
          <MedicalHistory />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/claim-builder">
        <ProtectedRoute>
          <ClaimBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/lay-statement">
        <ProtectedRoute>
          <LayStatement />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/buddy-statement">
        <ProtectedRoute>
          <BuddyStatement />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/evidence">
        <ProtectedRoute>
          <Evidence />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/appeals">
        <ProtectedRoute>
          <Appeals />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/tdiu">
        <ProtectedRoute>
          <TDIU />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/coach">
        <ProtectedRoute>
          <Coach />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/education">
        <ProtectedRoute>
          <Education />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard/referrals">
        <ProtectedRoute>
          <ReferralProgram />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard/funnel-contacts">
        <ProtectedRoute>
          <FunnelContacts />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard/notifications">
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      </Route>
      
      {/* Admin Route */}
      <Route path="/admin">
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
