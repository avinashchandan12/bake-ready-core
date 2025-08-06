import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
}

const StockOverview = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');

      if (error) throw error;
      setRawMaterials(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch raw materials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (material: RawMaterial) => {
    return material.stock_quantity <= material.reorder_level;
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Stock Quantity', 'Unit', 'Reorder Level', 'Status'];
    const csvContent = [
      headers.join(','),
      ...rawMaterials.map(material => [
        `"${material.name}"`,
        material.stock_quantity,
        `"${material.unit}"`,
        material.reorder_level,
        isLowStock(material) ? 'Low Stock' : 'In Stock'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `raw_materials_stock_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Success",
      description: "Stock report exported successfully",
    });
  };

  const lowStockItems = rawMaterials.filter(isLowStock);
  const totalValue = rawMaterials.reduce((sum, material) => sum + material.stock_quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Stock Overview</h1>
              <p className="text-muted-foreground">Complete inventory status and reports</p>
            </div>
          </div>
          
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawMaterials.length}</div>
              <p className="text-xs text-muted-foreground">Raw materials tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Stock Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rawMaterials.length > 0 ? 
                  Math.round(((rawMaterials.length - lowStockItems.length) / rawMaterials.length) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Items in good stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                The following items are at or below their reorder level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="destructive">{item.stock_quantity} {item.unit}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Stock Report</CardTitle>
            <CardDescription>
              All raw materials with current stock levels and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawMaterials.map((material) => {
                  const stockPercentage = material.reorder_level > 0 
                    ? Math.round((material.stock_quantity / material.reorder_level) * 100)
                    : 100;
                  
                  return (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{material.stock_quantity}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>{material.reorder_level}</TableCell>
                      <TableCell>
                        {isLowStock(material) ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                stockPercentage <= 100 ? 'bg-destructive' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[40px]">
                            {stockPercentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {rawMaterials.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No raw materials found. Add some raw materials to see the stock overview.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockOverview;