import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, TrendingUp, Users, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DashboardStats {
  totalProducts: number;
  totalRawMaterials: number;
  todayProduction: number;
  lowStockItems: number;
}

interface ChartData {
  weeklyProduction: Array<{ day: string; production: number }>;
  stockDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrends: Array<{ month: string; orders: number; production: number }>;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalRawMaterials: 0,
    todayProduction: 0,
    lowStockItems: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    weeklyProduction: [],
    stockDistribution: [],
    monthlyTrends: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    generateChartData();
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

  const generateChartData = () => {
    // Generate sample data - in real app, this would come from Supabase
    const weeklyProduction = [
      { day: 'Mon', production: 120 },
      { day: 'Tue', production: 98 },
      { day: 'Wed', production: 135 },
      { day: 'Thu', production: 110 },
      { day: 'Fri', production: 145 },
      { day: 'Sat', production: 180 },
      { day: 'Sun', production: 95 }
    ];

    const stockDistribution = [
      { name: 'High Stock', value: 45, color: 'hsl(var(--primary))' },
      { name: 'Medium Stock', value: 35, color: 'hsl(var(--secondary))' },
      { name: 'Low Stock', value: 15, color: 'hsl(var(--destructive))' },
      { name: 'Out of Stock', value: 5, color: 'hsl(var(--muted))' }
    ];

    const monthlyTrends = [
      { month: 'Jan', orders: 45, production: 120 },
      { month: 'Feb', orders: 52, production: 135 },
      { month: 'Mar', orders: 48, production: 128 },
      { month: 'Apr', orders: 61, production: 155 },
      { month: 'May', orders: 55, production: 142 },
      { month: 'Jun', orders: 67, production: 168 }
    ];

    setChartData({ weeklyProduction, stockDistribution, monthlyTrends });
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Production</CardTitle>
              <CardDescription>Production output for the current week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.weeklyProduction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Bar dataKey="production" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution</CardTitle>
              <CardDescription>Current inventory status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.stockDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.stockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4">
                {chartData.stockDistribution.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Orders vs Production comparison over last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="production" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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