import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Calendar, DollarSign, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LossLog {
  id: string;
  raw_material_id: string;
  product_id: string;
  quantity_lost: number;
  loss_reason: string;
  estimated_cost: number;
  loss_date: string;
  raw_materials?: { name: string; unit: string };
  products?: { name: string; category: string };
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

const LossLog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lossType, setLossType] = useState<"raw_material" | "product">("raw_material");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantityLost, setQuantityLost] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const queryClient = useQueryClient();

  const { data: lossLogs = [], isLoading } = useQuery({
    queryKey: ["loss_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loss_logs")
        .select(`
          *,
          raw_materials (name, unit),
          products (name, category)
        `)
        .order("loss_date", { ascending: false });
      if (error) throw error;
      return data as LossLog[];
    },
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["raw_materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("raw_materials").select("*");
      if (error) throw error;
      return data as RawMaterial[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data as Product[];
    },
  });

  const createLossLogMutation = useMutation({
    mutationFn: async (newLoss: any) => {
      const { data, error } = await supabase.from("loss_logs").insert(newLoss).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss_logs"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Loss logged successfully!");
    },
    onError: (error) => {
      toast.error("Failed to log loss: " + error.message);
    },
  });

  const deleteLossLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loss_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss_logs"] });
      toast.success("Loss log deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete loss log: " + error.message);
    },
  });

  const resetForm = () => {
    setLossType("raw_material");
    setSelectedItem("");
    setQuantityLost("");
    setLossReason("");
    setEstimatedCost("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem || !quantityLost || !lossReason) {
      toast.error("Please fill all required fields");
      return;
    }

    const lossData = {
      quantity_lost: parseFloat(quantityLost),
      loss_reason: lossReason,
      estimated_cost: parseFloat(estimatedCost) || 0,
      [lossType === "raw_material" ? "raw_material_id" : "product_id"]: selectedItem,
    };

    createLossLogMutation.mutate(lossData);
  };

  const totalLossValue = lossLogs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading loss logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Loss & Waste Log</h1>
          <p className="text-muted-foreground">Track production losses and waste</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Log Loss
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Production Loss</DialogTitle>
              <DialogDescription>
                Record material waste or product loss with details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Loss Type</Label>
                <Select value={lossType} onValueChange={(value: "raw_material" | "product") => {
                  setLossType(value);
                  setSelectedItem("");
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="product">Finished Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="item">
                  {lossType === "raw_material" ? "Raw Material" : "Product"}
                </Label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${lossType === "raw_material" ? "material" : "product"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(lossType === "raw_material" ? rawMaterials : products).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} {lossType === "raw_material" && `(${(item as RawMaterial).unit})`}
                        {lossType === "product" && `(${(item as Product).category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity Lost</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantityLost}
                  onChange={(e) => setQuantityLost(e.target.value)}
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <Label htmlFor="reason">Loss Reason</Label>
                <Textarea
                  id="reason"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  placeholder="Describe the reason for loss..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="cost">Estimated Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="e.g., 15.00"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLossLogMutation.isPending}>
                  {createLossLogMutation.isPending ? "Logging..." : "Log Loss"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lossLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Loss Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">${totalLossValue.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Loss Value</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{lossLogs.length}</div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${lossLogs.length > 0 ? (totalLossValue / lossLogs.length).toFixed(2) : "0.00"}
                </div>
                <p className="text-sm text-muted-foreground">Average per Incident</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {lossLogs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loss logs found</h3>
              <p className="text-muted-foreground text-center">
                Start logging production losses to track waste and improve efficiency
              </p>
            </CardContent>
          </Card>
        ) : (
          lossLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      {log.raw_materials?.name || log.products?.name}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant={log.raw_material_id ? "secondary" : "outline"} className="mr-2">
                        {log.raw_material_id ? "Raw Material" : "Product"}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.loss_date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-lg px-3 py-1">
                      {log.quantity_lost} {log.raw_materials?.unit || "units"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLossLogMutation.mutate(log.id)}
                      disabled={deleteLossLogMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1">Reason:</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {log.loss_reason}
                    </p>
                  </div>
                  {log.estimated_cost > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-red-600">
                        Estimated Loss: ${log.estimated_cost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LossLog;