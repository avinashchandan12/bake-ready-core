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
import { Plus, Factory, Clock, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProductionLog {
  id: string;
  product_id: string;
  recipe_id: string;
  quantity: number;
  time_spent_mins: number;
  production_cost: number;
  operator_notes: string;
  production_date: string;
  products: { name: string; category: string };
  recipes: { time_required_mins: number };
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface Recipe {
  id: string;
  product_id: string;
  time_required_mins: number;
  yield_quantity: number;
  products: { name: string };
  recipe_ingredients: Array<{
    raw_material_id: string;
    quantity: number;
    raw_materials: { name: string; unit: string; stock_quantity: number };
  }>;
}

const ProductionLog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [quantity, setQuantity] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: productionLogs = [], isLoading } = useQuery({
    queryKey: ["production_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_logs")
        .select(`
          *,
          products (name, category),
          recipes (time_required_mins)
        `)
        .order("production_date", { ascending: false });
      if (error) throw error;
      return data as ProductionLog[];
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

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-with-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          products (name),
          recipe_ingredients (
            raw_material_id,
            quantity,
            raw_materials (name, unit, stock_quantity)
          )
        `);
      if (error) throw error;
      return data as Recipe[];
    },
  });

  const availableRecipes = recipes.filter(recipe => 
    !selectedProduct || recipe.product_id === selectedProduct
  );

  const selectedRecipeData = recipes.find(r => r.id === selectedRecipe);

  const createProductionLogMutation = useMutation({
    mutationFn: async (newLog: any) => {
      // Check stock availability
      if (selectedRecipeData) {
        for (const ingredient of selectedRecipeData.recipe_ingredients) {
          const requiredQuantity = ingredient.quantity * parseInt(quantity);
          if (ingredient.raw_materials.stock_quantity < requiredQuantity) {
            throw new Error(`Insufficient stock for ${ingredient.raw_materials.name}. Required: ${requiredQuantity} ${ingredient.raw_materials.unit}, Available: ${ingredient.raw_materials.stock_quantity} ${ingredient.raw_materials.unit}`);
          }
        }
      }

      // Create production log
      const { data: productionLog, error: logError } = await supabase
        .from("production_logs")
        .insert({
          product_id: newLog.product_id,
          recipe_id: newLog.recipe_id,
          quantity: newLog.quantity,
          time_spent_mins: newLog.time_spent_mins,
          operator_notes: newLog.operator_notes,
          production_cost: newLog.production_cost,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Deduct raw materials from stock and log material usage
      if (selectedRecipeData) {
        const materialUpdates = [];
        const materialLogs = [];

        for (const ingredient of selectedRecipeData.recipe_ingredients) {
          const usedQuantity = ingredient.quantity * parseInt(quantity);
          const newStock = ingredient.raw_materials.stock_quantity - usedQuantity;

          materialUpdates.push(
            supabase
              .from("raw_materials")
              .update({ stock_quantity: newStock })
              .eq("id", ingredient.raw_material_id)
          );

          materialLogs.push({
            production_log_id: productionLog.id,
            raw_material_id: ingredient.raw_material_id,
            quantity_used: usedQuantity,
            cost_per_unit: 0, // Would need cost tracking
          });
        }

        await Promise.all(materialUpdates);

        const { error: materialsError } = await supabase
          .from("production_log_materials")
          .insert(materialLogs);

        if (materialsError) throw materialsError;
      }

      return productionLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_logs"] });
      queryClient.invalidateQueries({ queryKey: ["raw_materials"] });
      queryClient.invalidateQueries({ queryKey: ["recipes-with-ingredients"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Production logged successfully!");
    },
    onError: (error) => {
      toast.error("Failed to log production: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedProduct("");
    setSelectedRecipe("");
    setQuantity("");
    setTimeSpent("");
    setOperatorNotes("");
  };

  const calculateEstimatedCost = () => {
    // Simple cost calculation based on time (you can enhance this)
    const hourlyRate = 15; // $15 per hour
    const hours = parseInt(timeSpent) / 60;
    return hours * hourlyRate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedRecipe || !quantity || !timeSpent) {
      toast.error("Please fill all required fields");
      return;
    }

    const estimatedCost = calculateEstimatedCost();

    createProductionLogMutation.mutate({
      product_id: selectedProduct,
      recipe_id: selectedRecipe,
      quantity: parseInt(quantity),
      time_spent_mins: parseInt(timeSpent),
      operator_notes: operatorNotes,
      production_cost: estimatedCost,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading production logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Production Log</h1>
          <p className="text-muted-foreground">Track production activities and material usage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Log Production
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Production Activity</DialogTitle>
              <DialogDescription>
                Record production details and automatically deduct raw materials
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="recipe">Recipe</Label>
                  <Select 
                    value={selectedRecipe} 
                    onValueChange={setSelectedRecipe}
                    disabled={!selectedProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.products.name} - {recipe.time_required_mins} mins
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedRecipeData && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Recipe Requirements:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedRecipeData.recipe_ingredients.map((ingredient, index) => {
                      const requiredQuantity = ingredient.quantity * (parseInt(quantity) || 1);
                      const hasEnough = ingredient.raw_materials.stock_quantity >= requiredQuantity;
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between p-2 rounded ${
                            hasEnough ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                          }`}
                        >
                          <span>{ingredient.raw_materials.name}</span>
                          <span>
                            {requiredQuantity} / {ingredient.raw_materials.stock_quantity} {ingredient.raw_materials.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity Produced</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time Spent (minutes)</Label>
                  <Input
                    id="time"
                    type="number"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value)}
                    placeholder="e.g., 120"
                  />
                </div>
              </div>

              {timeSpent && (
                <div className="bg-accent p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span>Estimated Production Cost:</span>
                    <span className="font-semibold">${calculateEstimatedCost().toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Operator Notes</Label>
                <Textarea
                  id="notes"
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  placeholder="Any notes about the production process..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProductionLogMutation.isPending}>
                  {createProductionLogMutation.isPending ? "Logging..." : "Log Production"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {productionLogs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Factory className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No production logs found</h3>
              <p className="text-muted-foreground text-center">
                Start logging production activities to track your bakery operations
              </p>
            </CardContent>
          </Card>
        ) : (
          productionLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{log.products.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mr-2">
                        {log.products.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.production_date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {log.quantity} units
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Time Spent</p>
                      <p className="text-sm text-muted-foreground">{log.time_spent_mins} mins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Cost</p>
                      <p className="text-sm text-muted-foreground">${log.production_cost?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Efficiency</p>
                      <p className="text-sm text-muted-foreground">
                        {log.recipes ? Math.round((log.recipes.time_required_mins / log.time_spent_mins) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Rate</p>
                      <p className="text-sm text-muted-foreground">
                        {(log.quantity / (log.time_spent_mins / 60)).toFixed(1)} units/hr
                      </p>
                    </div>
                  </div>
                </div>
                {log.operator_notes && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Notes:</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {log.operator_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductionLog;