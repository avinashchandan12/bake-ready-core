-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  time_required_mins INTEGER NOT NULL DEFAULT 0,
  yield_quantity INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_recipes_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Create recipe_ingredients table (many-to-many between recipes and raw_materials)
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  raw_material_id UUID NOT NULL,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ingredients_raw_material FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE CASCADE
);

-- Create production_logs table
CREATE TABLE public.production_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  recipe_id UUID,
  quantity INTEGER NOT NULL,
  time_spent_mins INTEGER,
  production_cost NUMERIC DEFAULT 0,
  operator_notes TEXT,
  production_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_production_logs_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT fk_production_logs_recipe FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL
);

-- Create production_log_materials table (tracks raw materials used in production)
CREATE TABLE public.production_log_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_log_id UUID NOT NULL,
  raw_material_id UUID NOT NULL,
  quantity_used NUMERIC NOT NULL,
  cost_per_unit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_production_log_materials_log FOREIGN KEY (production_log_id) REFERENCES public.production_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_production_log_materials_raw_material FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE CASCADE
);

-- Create loss_logs table
CREATE TABLE public.loss_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_material_id UUID,
  product_id UUID,
  quantity_lost NUMERIC NOT NULL,
  loss_reason TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  loss_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_loss_logs_raw_material FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  CONSTRAINT fk_loss_logs_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Enable RLS on all new tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_log_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage recipes" ON public.recipes
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recipe ingredients" ON public.recipe_ingredients
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage production logs" ON public.production_logs
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage production log materials" ON public.production_log_materials
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage loss logs" ON public.loss_logs
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_recipes_product_id ON public.recipes(product_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_raw_material_id ON public.recipe_ingredients(raw_material_id);
CREATE INDEX idx_production_logs_product_id ON public.production_logs(product_id);
CREATE INDEX idx_production_logs_production_date ON public.production_logs(production_date);
CREATE INDEX idx_production_log_materials_log_id ON public.production_log_materials(production_log_id);
CREATE INDEX idx_loss_logs_loss_date ON public.loss_logs(loss_date);

-- Create function to check production feasibility
CREATE OR REPLACE FUNCTION public.get_production_estimate(recipe_id_param UUID)
RETURNS TABLE (
  can_produce INTEGER,
  limiting_material TEXT,
  available_quantity NUMERIC,
  required_quantity NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  min_possible INTEGER := 0;
  current_material RECORD;
  first_check BOOLEAN := TRUE;
BEGIN
  FOR current_material IN
    SELECT 
      rm.name,
      rm.stock_quantity,
      ri.quantity as required_per_unit
    FROM recipe_ingredients ri
    JOIN raw_materials rm ON ri.raw_material_id = rm.id
    WHERE ri.recipe_id = recipe_id_param
  LOOP
    DECLARE
      possible_from_this_material INTEGER;
    BEGIN
      IF current_material.required_per_unit > 0 THEN
        possible_from_this_material := FLOOR(current_material.stock_quantity / current_material.required_per_unit);
        
        IF first_check OR possible_from_this_material < min_possible THEN
          min_possible := possible_from_this_material;
          limiting_material := current_material.name;
          available_quantity := current_material.stock_quantity;
          required_quantity := current_material.required_per_unit;
          first_check := FALSE;
        END IF;
      END IF;
    END;
  END LOOP;
  
  can_produce := COALESCE(min_possible, 0);
  RETURN NEXT;
END;
$$;