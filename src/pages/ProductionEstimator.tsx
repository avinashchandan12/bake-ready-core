import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  products: { name: string; category: string };
  recipe_ingredients: Array<{
    raw_material_id: string;
    quantity: number;
    raw_materials: { name: string; unit: string; stock_quantity: number };
  }>;
}

interface ProductionEstimate {
  can_produce: number;
  limiting_material: string;
  available_quantity: number;
  required_quantity: number;
}

const ProductionEstimator = () => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-estimator"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          products (name, category),
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

  const { data: estimate, refetch: refetchEstimate } = useQuery({
    queryKey: ["production_estimate", selectedRecipe],
    queryFn: async () => {
      if (!selectedRecipe) return null;
      
      const { data, error } = await supabase.rpc("get_production_estimate", {
        recipe_id_param: selectedRecipe,
      });
      
      if (error) throw error;
      return data?.[0] as ProductionEstimate | null;
    },
    enabled: !!selectedRecipe,
  });

  const availableRecipes = recipes.filter(recipe => 
    !selectedProduct || recipe.product_id === selectedProduct
  );

  const selectedRecipeData = recipes.find(r => r.id === selectedRecipe);

  const calculateDetailedEstimate = () => {
    if (!selectedRecipeData) return null;

    const estimates = selectedRecipeData.recipe_ingredients.map(ingredient => {
      const possibleUnits = Math.floor(ingredient.raw_materials.stock_quantity / ingredient.quantity);
      return {
        material: ingredient.raw_materials.name,
        available: ingredient.raw_materials.stock_quantity,
        required: ingredient.quantity,
        unit: ingredient.raw_materials.unit,
        possibleUnits,
        sufficient: ingredient.raw_materials.stock_quantity >= ingredient.quantity,
      };
    });

    const maxProducible = Math.min(...estimates.map(e => e.possibleUnits));
    const limitingMaterial = estimates.find(e => e.possibleUnits === maxProducible);

    return {
      estimates,
      maxProducible,
      limitingMaterial,
    };
  };

  const detailedEstimate = calculateDetailedEstimate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Production Estimator</h1>
        <p className="text-muted-foreground">
          Estimate how many units you can produce with current inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Production Calculator
          </CardTitle>
          <CardDescription>
            Select a product and recipe to see production estimates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product</label>
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
              <label className="text-sm font-medium mb-2 block">Recipe</label>
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

          {selectedRecipe && (
            <Button onClick={() => refetchEstimate()} variant="outline" size="sm">
              Refresh Estimate
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedRecipeData && detailedEstimate && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Production Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {detailedEstimate.maxProducible}
                  </div>
                  <p className="text-lg font-medium">Maximum Units Producible</p>
                </div>
                
                {detailedEstimate.limitingMaterial && (
                  <div className="bg-accent p-4 rounded-lg">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Limiting Factor</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>{detailedEstimate.limitingMaterial.material}</strong> is the limiting material
                    </p>
                    <p className="text-sm">
                      Available: {detailedEstimate.limitingMaterial.available} {detailedEstimate.limitingMaterial.unit} | 
                      Required per unit: {detailedEstimate.limitingMaterial.required} {detailedEstimate.limitingMaterial.unit}
                    </p>
                  </div>
                )}

                {selectedRecipeData && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Estimated Time</p>
                      <p className="text-muted-foreground">
                        {Math.round((selectedRecipeData.time_required_mins * detailedEstimate.maxProducible) / 60)} hours
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Recipe Yield</p>
                      <p className="text-muted-foreground">
                        {selectedRecipeData.yield_quantity} units per batch
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Material Breakdown</CardTitle>
              <CardDescription>
                Detailed analysis of each ingredient requirement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detailedEstimate.estimates.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.sufficient 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.sufficient ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{item.material}</p>
                        <p className="text-sm text-muted-foreground">
                          Required: {item.required} {item.unit} per unit
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.sufficient ? "default" : "destructive"}>
                        {item.possibleUnits} units possible
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Stock: {item.available} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedRecipe && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Recipe</h3>
            <p className="text-muted-foreground text-center">
              Choose a product and recipe to see detailed production estimates
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductionEstimator;