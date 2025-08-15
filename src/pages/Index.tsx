import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, ShoppingCart, TrendingUp, Award, Shield, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-20">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <Factory className="h-20 w-20 text-primary mr-6 relative z-10" />
              </div>
              <div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  SA Foods
                </h1>
                <div className="h-1 w-32 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto mt-2"></div>
              </div>
            </div>
            <p className="text-2xl text-muted-foreground mb-6 font-medium">
              Complete Bakery Management System
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your bakery operations with our comprehensive management platform. 
              Track inventory with precision, manage products efficiently, monitor production in real-time, 
              and optimize your business workflow for maximum profitability.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-12 py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                  Access Admin Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-20">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-4">
              <div className="relative mx-auto mb-4">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <ShoppingCart className="h-16 w-16 text-primary mx-auto relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                Smart Inventory Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Advanced tracking of raw materials with real-time stock monitoring, intelligent low-stock alerts, 
                and automated reorder suggestions to ensure seamless operations.
              </CardDescription>
              <div className="flex items-center justify-center mt-4 gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Real-time Updates</span>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-4">
              <div className="relative mx-auto mb-4">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <Factory className="h-16 w-16 text-primary mx-auto relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                Production Excellence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Comprehensive production monitoring with batch tracking, quality control checkpoints, 
                and detailed logs to maintain consistency across all your bakery products.
              </CardDescription>
              <div className="flex items-center justify-center mt-4 gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Quality Assured</span>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-4">
              <div className="relative mx-auto mb-4">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <TrendingUp className="h-16 w-16 text-primary mx-auto relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                Business Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Advanced analytics and reporting tools to analyze performance trends, optimize operations, 
                and make data-driven decisions that drive your bakery's growth and profitability.
              </CardDescription>
              <div className="flex items-center justify-center mt-4 gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Growth Focused</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testimonial/Trust Section */}
        <div className="text-center mt-20">
          <div className="bg-gradient-to-r from-card to-card/95 p-8 rounded-2xl max-w-2xl mx-auto border shadow-lg">
            <h3 className="text-2xl font-bold mb-4 text-foreground">Trusted by Bakery Professionals</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Join hundreds of bakery owners who have transformed their operations with our comprehensive management system.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Industry Leading</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
