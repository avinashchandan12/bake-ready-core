import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Vendor {
  id: string;
  name: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface GRNItem {
  id?: string;
  raw_material_id: string;
  expected_quantity: number;
  received_quantity: number;
  unit_price: number;
  total_price: number;
  raw_material?: RawMaterial;
}

interface GRN {
  id?: string;
  vendor_id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  status: string;
  notes: string;
  items: GRNItem[];
  vendors?: { name: string };
}

export default function GRNEntry() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentGRN, setCurrentGRN] = useState<GRN>({
    vendor_id: "",
    grn_number: "",
    grn_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    status: "pending",
    notes: "",
    items: []
  });

  useEffect(() => {
    fetchData();
    generateGRNNumber();
  }, []);

  const fetchData = async () => {
    try {
      const [vendorsResult, materialsResult, grnsResult] = await Promise.all([
        supabase.from("vendors").select("id, name").order("name"),
        supabase.from("raw_materials").select("id, name, unit").order("name"),
        supabase.from("grns").select(`
          *,
          grn_items (
            *,
            raw_materials (id, name, unit)
          ),
          vendors (name)
        `).order("created_at", { ascending: false })
      ]);

      if (vendorsResult.data) setVendors(vendorsResult.data);
      if (materialsResult.data) setRawMaterials(materialsResult.data);
      if (grnsResult.data) {
        const formattedGRNs = grnsResult.data.map((grn: any) => ({
          ...grn,
          items: Array.isArray(grn.grn_items) ? grn.grn_items : [],
          vendors: grn.vendors || { name: 'Unknown' }
        }));
        setGRNs(formattedGRNs);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    }
  };

  const generateGRNNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_grn_number');
      if (error) throw error;
      setCurrentGRN(prev => ({ ...prev, grn_number: data }));
    } catch (error) {
      console.error("Error generating GRN number:", error);
    }
  };

  const addItem = () => {
    setCurrentGRN(prev => ({
      ...prev,
      items: [...prev.items, {
        raw_material_id: "",
        expected_quantity: 0,
        received_quantity: 0,
        unit_price: 0,
        total_price: 0
      }]
    }));
  };

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    setCurrentGRN(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      // Calculate total price for the item
      if (field === 'received_quantity' || field === 'unit_price') {
        updatedItems[index].total_price = updatedItems[index].received_quantity * updatedItems[index].unit_price;
      }
      
      // Calculate total amount for GRN
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
      
      return {
        ...prev,
        items: updatedItems,
        total_amount: totalAmount
      };
    });
  };

  const removeItem = (index: number) => {
    setCurrentGRN(prev => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
      return {
        ...prev,
        items: updatedItems,
        total_amount: totalAmount
      };
    });
  };

  const saveGRN = async () => {
    if (!currentGRN.vendor_id || currentGRN.items.length === 0) {
      toast({
        title: "Error",
        description: "Please select a vendor and add at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save GRN
      const { data: grnData, error: grnError } = await supabase
        .from("grns")
        .insert({
          vendor_id: currentGRN.vendor_id,
          grn_number: currentGRN.grn_number,
          grn_date: currentGRN.grn_date,
          total_amount: currentGRN.total_amount,
          status: currentGRN.status,
          notes: currentGRN.notes
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Save GRN Items
      const itemsToInsert = currentGRN.items.map(item => ({
        grn_id: grnData.id,
        raw_material_id: item.raw_material_id,
        expected_quantity: item.expected_quantity,
        received_quantity: item.received_quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from("grn_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Auto-detect discrepancies
      await supabase.rpc('detect_grn_discrepancies', { grn_id_param: grnData.id });

      toast({
        title: "Success",
        description: "GRN saved successfully",
      });

      // Reset form
      setCurrentGRN({
        vendor_id: "",
        grn_number: "",
        grn_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        status: "pending",
        notes: "",
        items: []
      });
      generateGRNNumber();
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save GRN",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">GRN Entry</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRN Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              New GRN Entry
            </CardTitle>
            <CardDescription>
              Record goods received from vendors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grn_number">GRN Number</Label>
                <Input
                  id="grn_number"
                  value={currentGRN.grn_number}
                  onChange={(e) => setCurrentGRN(prev => ({ ...prev, grn_number: e.target.value }))}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="grn_date">GRN Date</Label>
                <Input
                  id="grn_date"
                  type="date"
                  value={currentGRN.grn_date}
                  onChange={(e) => setCurrentGRN(prev => ({ ...prev, grn_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select 
                value={currentGRN.vendor_id} 
                onValueChange={(value) => setCurrentGRN(prev => ({ ...prev, vendor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={currentGRN.notes}
                onChange={(e) => setCurrentGRN(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>

            {/* Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentGRN.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="w-[200px]">
                          <Select
                            value={item.raw_material_id}
                            onValueChange={(value) => updateItem(index, 'raw_material_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map(material => (
                                <SelectItem key={material.id} value={material.id}>
                                  {material.name} ({material.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.expected_quantity}
                            onChange={(e) => updateItem(index, 'expected_quantity', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.received_quantity}
                            onChange={(e) => updateItem(index, 'received_quantity', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.total_price)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            onClick={() => removeItem(index)} 
                            size="sm" 
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(currentGRN.total_amount)}
              </div>
              <Button onClick={saveGRN} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save GRN
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent GRNs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent GRNs</CardTitle>
            <CardDescription>
              Latest goods receipt notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grns.slice(0, 10).map((grn) => (
                <div key={grn.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{grn.grn_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {grn.vendors?.name} • {new Date(grn.grn_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(grn.total_amount)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      grn.status === 'completed' ? 'bg-green-100 text-green-800' :
                      grn.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {grn.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}