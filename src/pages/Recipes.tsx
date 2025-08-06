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
import { Trash2, Plus, Clock, Package } from "lucide-react";
import { toast } from "sonner";

interface Recipe {
  id: string;
  product_id: string;
  time_required_mins: number;
  yield_quantity: number;
  instructions: string;
  products: { name: string; category: string };
  recipe_ingredients: Array<{
    id: string;
    quantity: number;
    raw_materials: { name: string; unit: string };
  }>;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
}

interface RecipeIngredient {
  raw_material_id: string;
  quantity: number;
}

const Recipes = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [timeRequired, setTimeRequired] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          products (name, category),
          recipe_ingredients (
            id,
            quantity,
            raw_materials (name, unit)
          )
        `);
      if (error) throw error;
      return data as Recipe[];
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

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["raw_materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("raw_materials").select("*");
      if (error) throw error;
      return data as RawMaterial[];
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (newRecipe: {
      product_id: string;
      time_required_mins: number;
      yield_quantity: number;
      instructions: string;
      ingredients: RecipeIngredient[];
    }) => {
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          product_id: newRecipe.product_id,
          time_required_mins: newRecipe.time_required_mins,
          yield_quantity: newRecipe.yield_quantity,
          instructions: newRecipe.instructions,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      if (newRecipe.ingredients.length > 0) {
        const ingredientsData = newRecipe.ingredients.map((ing: RecipeIngredient) => ({
          recipe_id: recipe.id,
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity,
        }));

        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;
      }

      return recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Recipe created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create recipe: " + error.message);
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete recipe: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedProduct("");
    setTimeRequired("");
    setYieldQuantity("1");
    setInstructions("");
    setIngredients([]);
    setEditingRecipe(null);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: "", quantity: 0 }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients];
    (updated[index] as any)[field] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !timeRequired || ingredients.length === 0) {
      toast.error("Please fill all required fields and add at least one ingredient");
      return;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.raw_material_id && ing.quantity > 0
    );

    if (validIngredients.length === 0) {
      toast.error("Please add at least one valid ingredient");
      return;
    }

    createRecipeMutation.mutate({
      product_id: selectedProduct,
      time_required_mins: parseInt(timeRequired),
      yield_quantity: parseInt(yieldQuantity),
      instructions,
      ingredients: validIngredients,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recipe Management</h1>
          <p className="text-muted-foreground">Create and manage product recipes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
              <DialogDescription>
                Define ingredients and instructions for a product
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
                  <Label htmlFor="time">Time Required (minutes)</Label>
                  <Input
                    id="time"
                    type="number"
                    value={timeRequired}
                    onChange={(e) => setTimeRequired(e.target.value)}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="yield">Yield Quantity</Label>
                <Input
                  id="yield"
                  type="number"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Detailed recipe instructions..."
                  rows={3}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Ingredients</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Ingredient
                  </Button>
                </div>
                <div className="space-y-3">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={ingredient.raw_material_id}
                        onValueChange={(value) => updateIngredient(index, "raw_material_id", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} ({material.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder="Quantity"
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRecipeMutation.isPending}>
                  {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
              <p className="text-muted-foreground text-center">
                Create your first recipe to get started with production planning
              </p>
            </CardContent>
          </Card>
        ) : (
          recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{recipe.products.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mr-2">
                        {recipe.products.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {recipe.time_required_mins} mins
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRecipeMutation.mutate(recipe.id)}
                    disabled={deleteRecipeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Ingredients:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {recipe.recipe_ingredients.map((ingredient) => (
                        <div
                          key={ingredient.id}
                          className="flex justify-between items-center bg-muted p-2 rounded"
                        >
                          <span className="font-medium">{ingredient.raw_materials.name}</span>
                          <Badge variant="outline">
                            {ingredient.quantity} {ingredient.raw_materials.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Yield:</h4>
                    <p className="text-sm text-muted-foreground">
                      {recipe.yield_quantity} unit(s)
                    </p>
                  </div>
                  {recipe.instructions && (
                    <div>
                      <h4 className="font-semibold mb-2">Instructions:</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {recipe.instructions}
                      </p>
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

export default Recipes;