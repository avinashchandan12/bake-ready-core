import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
  created_at: string;
}

const RawMaterials = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    stock_quantity: '',
    reorder_level: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleSave = async () => {
    try {
      const materialData = {
        name: formData.name,
        unit: formData.unit,
        stock_quantity: parseFloat(formData.stock_quantity),
        reorder_level: parseFloat(formData.reorder_level),
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('raw_materials')
          .update(materialData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast({ title: "Success", description: "Raw material updated successfully" });
      } else {
        const { error } = await supabase
          .from('raw_materials')
          .insert([materialData]);

        if (error) throw error;
        toast({ title: "Success", description: "Raw material created successfully" });
      }

      setDialogOpen(false);
      setEditingMaterial(null);
      setFormData({ name: '', unit: '', stock_quantity: '', reorder_level: '' });
      fetchRawMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      stock_quantity: material.stock_quantity.toString(),
      reorder_level: material.reorder_level.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return;

    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Raw material deleted successfully" });
      fetchRawMaterials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', unit: '', stock_quantity: '', reorder_level: '' });
    setEditingMaterial(null);
  };

  const isLowStock = (material: RawMaterial) => {
    return material.stock_quantity <= material.reorder_level;
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
              <h1 className="text-3xl font-bold">Raw Materials Management</h1>
              <p className="text-muted-foreground">Manage your inventory and stock levels</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Raw Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}
                </DialogTitle>
                <DialogDescription>
                  {editingMaterial ? 'Update raw material details' : 'Add a new raw material to your inventory'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Material Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Flour, Sugar, Eggs"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit of Measurement</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., kg, litre, pieces"
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Current Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    step="0.01"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingMaterial ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Raw Materials ({rawMaterials.length})</CardTitle>
            <CardDescription>
              All raw materials in your inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>{material.stock_quantity}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>{material.reorder_level}</TableCell>
                    <TableCell>
                      {isLowStock(material) ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(material.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rawMaterials.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No raw materials found. Add your first raw material to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RawMaterials;