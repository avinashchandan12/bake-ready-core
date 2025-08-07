import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus, ArrowLeft, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  created_at: string;
}

interface VendorStats {
  total_purchases: number;
  total_spent: number;
  materials_supplied: number;
}

export default function Vendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (vendorsError) throw vendorsError;

      setVendors(vendorsData || []);
      
      // Fetch statistics for each vendor
      if (vendorsData && vendorsData.length > 0) {
        await fetchVendorStats(vendorsData);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorStats = async (vendorList: Vendor[]) => {
    try {
      const stats: Record<string, VendorStats> = {};
      
      for (const vendor of vendorList) {
        // Fetch purchases count and total spent
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select('total_amount')
          .eq('vendor_id', vendor.id);

        if (purchasesError) throw purchasesError;

        // Fetch vendor products count
        const { data: productsData, error: productsError } = await supabase
          .from('vendor_products')
          .select('id')
          .eq('vendor_id', vendor.id);

        if (productsError) throw productsError;

        stats[vendor.id] = {
          total_purchases: purchasesData?.length || 0,
          total_spent: purchasesData?.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0) || 0,
          materials_supplied: productsData?.length || 0,
        };
      }
      
      setVendorStats(stats);
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update({
            name: name.trim(),
            contact: contact.trim() || null,
            address: address.trim() || null,
          })
          .eq('id', editingVendor.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vendor updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert({
            name: name.trim(),
            contact: contact.trim() || null,
            address: address.trim() || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vendor created successfully",
        });
      }

      resetForm();
      setDialogOpen(false);
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast({
        title: "Error",
        description: "Failed to save vendor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setContact(vendor.contact || "");
    setAddress(vendor.address || "");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;

    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingVendor(null);
    setName("");
    setContact("");
    setAddress("");
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone, email, or other contact info"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Vendor address"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No vendors found. Add your first vendor!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
            <CardDescription>Manage your supplier relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Materials Supplied</TableHead>
                  <TableHead>Total Purchases</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => {
                  const stats = vendorStats[vendor.id] || {
                    total_purchases: 0,
                    total_spent: 0,
                    materials_supplied: 0,
                  };

                  return (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contact || 'N/A'}</TableCell>
                      <TableCell>{stats.materials_supplied}</TableCell>
                      <TableCell>{stats.total_purchases}</TableCell>
                      <TableCell>{formatCurrency(stats.total_spent)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(vendor)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(vendor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Vendor Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm font-medium">{selectedVendor.name}</p>
              </div>
              {selectedVendor.contact && (
                <div>
                  <Label>Contact</Label>
                  <p className="text-sm">{selectedVendor.contact}</p>
                </div>
              )}
              {selectedVendor.address && (
                <div>
                  <Label>Address</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedVendor.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Materials Supplied</Label>
                  <p className="text-lg font-semibold">
                    {vendorStats[selectedVendor.id]?.materials_supplied || 0}
                  </p>
                </div>
                <div>
                  <Label>Total Purchases</Label>
                  <p className="text-lg font-semibold">
                    {vendorStats[selectedVendor.id]?.total_purchases || 0}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Total Spent</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(vendorStats[selectedVendor.id]?.total_spent || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}