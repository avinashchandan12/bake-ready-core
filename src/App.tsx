import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import RawMaterials from "./pages/RawMaterials";
import StockOverview from "./pages/StockOverview";
import Recipes from "./pages/Recipes";
import ProductionLog from "./pages/ProductionLog";
import ProductionEstimator from "./pages/ProductionEstimator";
import LossLog from "./pages/LossLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/" || location.pathname === "/auth";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/30">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-gradient-to-r from-card to-card/95 shadow-sm px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 hover:bg-accent rounded-lg transition-colors" />
              <div className="text-sm text-muted-foreground">
                Crafted with Quality, Served with Pride
              </div>
            </div>
            <div className="text-sm font-medium text-primary">
              S.A. Foods Management System
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <Routes>
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/products" element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                } />
                <Route path="/raw-materials" element={
                  <ProtectedRoute>
                    <RawMaterials />
                  </ProtectedRoute>
                } />
                <Route path="/stock-overview" element={
                  <ProtectedRoute>
                    <StockOverview />
                  </ProtectedRoute>
                } />
                <Route path="/recipes" element={
                  <ProtectedRoute>
                    <Recipes />
                  </ProtectedRoute>
                } />
                <Route path="/production-log" element={
                  <ProtectedRoute>
                    <ProductionLog />
                  </ProtectedRoute>
                } />
                <Route path="/production-estimator" element={
                  <ProtectedRoute>
                    <ProductionEstimator />
                  </ProtectedRoute>
                } />
                <Route path="/loss-log" element={
                  <ProtectedRoute>
                    <LossLog />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
