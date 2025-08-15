import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, ShoppingCart, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Factory className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-5xl font-bold text-foreground">SA Foods</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Complete Bakery Management System
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Streamline your bakery operations with our comprehensive management platform. 
            Track inventory, manage products, monitor production, and optimize your business workflow.
          </p>
          
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-3">
              Access Admin Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <ShoppingCart className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Inventory Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track raw materials, monitor stock levels, and get low-stock alerts to never run out of essential ingredients.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Factory className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Production Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor daily production, track batch information, and maintain quality control across all your products.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Business Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate reports, analyze sales trends, and make data-driven decisions to grow your bakery business.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <div className="bg-card p-6 rounded-lg max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">Admin Access</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use the default credentials to access the system:
            </p>
            <div className="text-sm font-mono bg-muted p-3 rounded">
              <div>Email: admin@safoods.com</div>
              <div>Password: sa@foods##</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
