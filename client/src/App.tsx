import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Welcome from "@/pages/welcome";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminGymsPage from "@/pages/AdminGymsPage";
import AdminCollectionsPage from "@/pages/AdminCollectionsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import CoursesPage from "@/pages/CoursesPage";
import MyCourseDetailPage from "@/pages/MyCourseDetailPage";
import VideoPlayerPage from "@/pages/VideoPlayerPage";
import CheckoutPage from "@/pages/CheckoutPage";
import MapPage from "@/pages/MapPage";
import GymOwnerPage from "@/pages/GymOwnerPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/home">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/gyms">
        <ProtectedRoute>
          <AdminGymsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/collections">
        <ProtectedRoute>
          <AdminCollectionsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute>
          <AdminUsersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/courses">
        <ProtectedRoute>
          <CoursesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/map">
        <ProtectedRoute>
          <MapPage />
        </ProtectedRoute>
      </Route>
      <Route path="/my-courses/:id">
        <ProtectedRoute>
          <MyCourseDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout/:id">
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      </Route>
      <Route path="/watch/:id">
        <ProtectedRoute>
          <VideoPlayerPage />
        </ProtectedRoute>
      </Route>
      <Route path="/gym-owner">
        <ProtectedRoute>
          <GymOwnerPage />
        </ProtectedRoute>
      </Route>
      <Route path="/gym/:id">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;