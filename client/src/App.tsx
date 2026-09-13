import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AdminRoute } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// Kirish nuqtasidagi sahifalar darhol kerak — qolganlari kerak bo'lganda yuklanadi.
// Ilgari barcha sahifalar bitta bundle'ga tushib, 1 MB dan oshib ketardi.
import Welcome from "@/pages/welcome";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";

const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminGymsPage = lazy(() => import("@/pages/AdminGymsPage"));
const AdminCollectionsPage = lazy(() => import("@/pages/AdminCollectionsPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/AdminAnalyticsPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const MyCourseDetailPage = lazy(() => import("@/pages/MyCourseDetailPage"));
const VideoPlayerPage = lazy(() => import("@/pages/VideoPlayerPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const GymOwnerPage = lazy(() => import("@/pages/GymOwnerPage"));
const MobilePayPage = lazy(() => import("@/pages/MobilePayPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Welcome} />
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/telegram-login">
          <LoginPage fromTelegram={true} />
        </Route>
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

        {/* Admin sahifalari — AdminRoute oddiy foydalanuvchini kiritmaydi.
            Ilgari bular faqat ProtectedRoute ostida edi, ya'ni tizimga kirgan
            har qanday foydalanuvchi admin panelini ochа olardi. */}
        <Route path="/admin">
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        </Route>
        <Route path="/admin/gyms">
          <AdminRoute>
            <AdminGymsPage />
          </AdminRoute>
        </Route>
        <Route path="/admin/collections">
          <AdminRoute>
            <AdminCollectionsPage />
          </AdminRoute>
        </Route>
        <Route path="/admin/users">
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        </Route>
        <Route path="/admin/analytics">
          <AdminRoute>
            <AdminAnalyticsPage />
          </AdminRoute>
        </Route>

        <Route path="/courses">
          <ProtectedRoute>
            <CoursesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/map" component={MapPage} />
        <Route path="/my-courses/:id">
          <ProtectedRoute>
            <MyCourseDetailPage />
          </ProtectedRoute>
        </Route>
        {/*
          /checkout marshruti olib tashlandi: u /api/create-payment-intent va
          /api/confirm-purchase endpointlariga tayanardi, lekin ular serverda
          hech qachon yaratilmagan — sahifa ochilsa 404 qaytarardi.
          Kurslar kredit bilan sotib olinadi: /api/collections/:id/purchase
        */}
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
        <Route path="/mobile-pay" component={MobilePayPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
