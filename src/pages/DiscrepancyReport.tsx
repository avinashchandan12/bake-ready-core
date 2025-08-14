import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Discrepancy {
  id: string;
  grn_id: string;
  raw_material_id: string;
  expected_quantity: number;
  received_quantity: number;
  discrepancy_quantity: number;
  discrepancy_type: string;
  note: string;
  created_at: string;
  grns: {
    grn_number: string;
    grn_date: string;
    vendors: {
      name: string;
    };
  };
  raw_materials: {
    name: string;
    unit: string;
  };
}

export default function DiscrepancyReport() {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [filteredDiscrepancies, setFilteredDiscrepancies] = useState<Discrepancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    vendor: 'all'
  });
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscrepancies();
    fetchVendors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [discrepancies, filters]);

  const fetchDiscrepancies = async () => {
    try {
      const { data, error } = await supabase
        .from("discrepancies")
        .select(`
          *,
          grns (
            grn_number,
            grn_date,
            vendors (name)
          ),
          raw_materials (name, unit)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDiscrepancies((data as any) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch discrepancies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...discrepancies];

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.discrepancy_type === filters.type);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(item => 
        new Date(item.grns.grn_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(item => 
        new Date(item.grns.grn_date) <= new Date(filters.dateTo)
      );
    }

    // Filter by vendor
    if (filters.vendor !== 'all') {
      filtered = filtered.filter(item => 
        item.grns.vendors.name.toLowerCase().includes(filters.vendor.toLowerCase())
      );
    }

    setFilteredDiscrepancies(filtered);
  };

  const getDiscrepancyIcon = (type: string) => {
    switch (type) {
      case 'shortage':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'excess':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Package className="h-4 w-4 text-green-500" />;
    }
  };

  const getDiscrepancyBadge = (type: string) => {
    switch (type) {
      case 'shortage':
        return <Badge variant="destructive">Shortage</Badge>;
      case 'excess':
        return <Badge variant="secondary">Excess</Badge>;
      default:
        return <Badge variant="default">Match</Badge>;
    }
  };

  const getTotalDiscrepancyValue = () => {
    return filteredDiscrepancies.reduce((sum, item) => sum + item.discrepancy_quantity, 0);
  };

  const getDiscrepancyStats = () => {
    const shortage = filteredDiscrepancies.filter(d => d.discrepancy_type === 'shortage').length;
    const excess = filteredDiscrepancies.filter(d => d.discrepancy_type === 'excess').length;
    const total = filteredDiscrepancies.length;

    return { shortage, excess, total };
  };

  const stats = getDiscrepancyStats();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Discrepancy Report</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Total Discrepancies</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Shortages</p>
                <p className="text-2xl font-bold text-red-600">{stats.shortage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Excess</p>
                <p className="text-2xl font-bold text-blue-600">{stats.excess}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Total Variance</p>
                <p className="text-2xl font-bold">{getTotalDiscrepancyValue().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter discrepancies by type, date, and vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="type">Discrepancy Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shortage">Shortage</SelectItem>
                  <SelectItem value="excess">Excess</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                placeholder="Search vendor..."
                value={filters.vendor === 'all' ? '' : filters.vendor}
                onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value || 'all' }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discrepancies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discrepancy Details</CardTitle>
          <CardDescription>
            Detailed view of all material receipt discrepancies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscrepancies.map((discrepancy) => (
                  <TableRow key={discrepancy.id}>
                    <TableCell className="font-medium">
                      {discrepancy.grns.grn_number}
                    </TableCell>
                    <TableCell>
                      {discrepancy.grns.vendors.name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{discrepancy.raw_materials.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {discrepancy.raw_materials.unit}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {discrepancy.expected_quantity.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {discrepancy.received_quantity.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDiscrepancyIcon(discrepancy.discrepancy_type)}
                        <span className={
                          discrepancy.discrepancy_type === 'shortage' ? 'text-red-600' :
                          discrepancy.discrepancy_type === 'excess' ? 'text-blue-600' :
                          'text-green-600'
                        }>
                          {discrepancy.discrepancy_type === 'shortage' ? '-' : '+'}
                          {discrepancy.discrepancy_quantity.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getDiscrepancyBadge(discrepancy.discrepancy_type)}
                    </TableCell>
                    <TableCell>
                      {new Date(discrepancy.grns.grn_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDiscrepancies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No discrepancies found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}