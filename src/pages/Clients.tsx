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

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientStats {
  total_orders: number;
  total_revenue: number;
  pending_invoices: number;
  pending_amount: number;
}

export default function Clients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      setClients(clientsData || []);
      
      // Fetch statistics for each client
      if (clientsData && clientsData.length > 0) {
        await fetchClientStats(clientsData);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async (clientList: Client[]) => {
    try {
      const stats: Record<string, ClientStats> = {};
      
      for (const client of clientList) {
        // Fetch orders count and total revenue
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('client_id', client.id);

        if (ordersError) throw ordersError;

        // Fetch pending invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('client_id', client.id)
          .eq('status', 'pending');

        if (invoicesError) throw invoicesError;

        stats[client.id] = {
          total_orders: ordersData?.length || 0,
          total_revenue: ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
          pending_invoices: invoicesData?.length || 0,
          pending_amount: invoicesData?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0,
        };
      }
      
      setClientStats(stats);
    } catch (error) {
      console.error('Error fetching client stats:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
          })
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client created successfully",
        });
      }

      resetForm();
      setDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setDetailsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setName("");
    setEmail("");
    setPhone("");
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
          <h1 className="text-3xl font-bold">Client Management</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Client address"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingClient ? 'Update Client' : 'Create Client'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No clients found. Add your first client!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Manage your client relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const stats = clientStats[client.id] || {
                    total_orders: 0,
                    total_revenue: 0,
                    pending_invoices: 0,
                    pending_amount: 0,
                  };

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.email && <div>{client.email}</div>}
                          {client.phone && <div>{client.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{stats.total_orders}</TableCell>
                      <TableCell>{formatCurrency(stats.total_revenue)}</TableCell>
                      <TableCell>
                        {stats.pending_amount > 0 ? (
                          <span className="text-destructive font-medium">
                            {formatCurrency(stats.pending_amount)}
                          </span>
                        ) : (
                          formatCurrency(0)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
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

      {/* Client Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm font-medium">{selectedClient.name}</p>
              </div>
              {selectedClient.email && (
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedClient.email}</p>
                </div>
              )}
              {selectedClient.phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{selectedClient.phone}</p>
                </div>
              )}
              {selectedClient.address && (
                <div>
                  <Label>Address</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedClient.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>Total Orders</Label>
                  <p className="text-lg font-semibold">
                    {clientStats[selectedClient.id]?.total_orders || 0}
                  </p>
                </div>
                <div>
                  <Label>Total Revenue</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(clientStats[selectedClient.id]?.total_revenue || 0)}
                  </p>
                </div>
                <div>
                  <Label>Pending Invoices</Label>
                  <p className="text-lg font-semibold">
                    {clientStats[selectedClient.id]?.pending_invoices || 0}
                  </p>
                </div>
                <div>
                  <Label>Pending Amount</Label>
                  <p className="text-lg font-semibold text-destructive">
                    {formatCurrency(clientStats[selectedClient.id]?.pending_amount || 0)}
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