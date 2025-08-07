import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface OrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

interface Order {
  id: string;
  client_id: string;
  order_date: string;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  order_items?: OrderItem[];
}

export default function Orders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch orders with client and order items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          clients (id, name, email, phone, address),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (id, name, price, category)
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      setOrders(ordersData || []);
      setClients(clientsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId || orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select a client and add at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0);

      if (editingOrder) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            client_id: clientId,
            order_date: orderDate,
            status,
            notes,
            total_amount: totalAmount,
          })
          .eq('id', editingOrder.id);

        if (orderError) throw orderError;

        // Delete existing order items
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', editingOrder.id);

        if (deleteError) throw deleteError;

        // Insert new order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            orderItems.map(item => ({
              order_id: editingOrder.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            }))
          );

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        // Create new order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            client_id: clientId,
            order_date: orderDate,
            status,
            notes,
            total_amount: totalAmount,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            orderItems.map(item => ({
              order_id: orderData.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            }))
          );

        if (itemsError) throw itemsError;

        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }

      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setClientId(order.client_id);
    setOrderDate(order.order_date.split('T')[0]);
    setStatus(order.status);
    setNotes(order.notes || "");
    setOrderItems(order.order_items?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    })) || []);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setClientId("");
    setOrderDate(new Date().toISOString().split('T')[0]);
    setStatus("pending");
    setNotes("");
    setOrderItems([]);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      product_id: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].unit_price = product.price;
        updatedItems[index].total_price = product.price * updatedItems[index].quantity;
      }
    } else if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      confirmed: "default",
      in_progress: "default",
      completed: "default",
      cancelled: "destructive"
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
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
          <h1 className="text-3xl font-bold">Order Management</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit Order' : 'Add New Order'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes..."
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" onClick={addOrderItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                {orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-end">
                    <div>
                      <Label>Product</Label>
                      <Select 
                        value={item.product_id} 
                        onValueChange={(value) => updateOrderItem(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input
                        value={formatCurrency(item.total_price)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {orderItems.length > 0 && (
                  <div className="text-right mt-4">
                    <strong>Total Amount: {formatCurrency(orderItems.reduce((sum, item) => sum + item.total_price, 0))}</strong>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No orders found. Create your first order!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Manage your customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.order_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.client?.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatCurrency(order.total_amount || 0)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}