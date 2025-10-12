import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/contexts/AuthContext";
import Welcome from "@/pages/welcome";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminGymsPage from "@/pages/AdminGymsPage";
import AdminCollectionsPage from "@/pages/AdminCollectionsPage";
import CoursesPage from "@/pages/CoursesPage";
import MyCourseDetailPage from "@/pages/MyCourseDetailPage";
import VideoPlayerPage from "@/pages/VideoPlayerPage";
import MapPage from "@/pages/MapPage";
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
      <Route path="/watch/:id">
        <ProtectedRoute>
          <VideoPlayerPage />
        </ProtectedRoute>
      </Route>
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