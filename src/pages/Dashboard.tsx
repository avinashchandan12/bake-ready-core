import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, TrendingUp, Users, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalProducts: number;
  totalRawMaterials: number;
  todayProduction: number;
  lowStockItems: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalRawMaterials: 0,
    todayProduction: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [productsResult, rawMaterialsResult, productionResult, lowStockResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('raw_materials').select('id', { count: 'exact' }),
        supabase.from('production_batches').select('quantity').gte('batch_date', new Date().toISOString().split('T')[0]),
        supabase.from('raw_materials').select('id, stock_quantity, reorder_level')
      ]);

      const todayProductionTotal = productionResult.data?.reduce((sum, batch) => sum + (batch.quantity || 0), 0) || 0;
      const lowStockCount = lowStockResult.data?.filter(item => item.stock_quantity <= item.reorder_level).length || 0;

      setStats({
        totalProducts: productsResult.count || 0,
        totalRawMaterials: rawMaterialsResult.count || 0,
        todayProduction: todayProductionTotal,
        lowStockItems: lowStockCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SA Foods Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Admin</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active product catalog</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRawMaterials}</div>
              <p className="text-xs text-muted-foreground">In inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Production</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayProduction}</div>
              <p className="text-xs text-muted-foreground">Units produced</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lowStockItems}
                {stats.lowStockItems > 0 && (
                  <Badge variant="destructive" className="ml-2">Alert</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Items need reorder</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/products">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Management
                </CardTitle>
                <CardDescription>
                  Add, edit, and manage your bakery products
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/orders">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Management
                </CardTitle>
                <CardDescription>
                  Manage client orders and track deliveries
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/clients">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Management
                </CardTitle>
                <CardDescription>
                  Manage client relationships and billing
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/raw-materials">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Raw Materials
                </CardTitle>
                <CardDescription>
                  Manage inventory and stock levels
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/vendors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Vendor Management
                </CardTitle>
                <CardDescription>
                  Manage supplier relationships and purchases
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/stock-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Stock Overview
                </CardTitle>
                <CardDescription>
                  View and export stock reports
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;