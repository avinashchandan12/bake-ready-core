import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
