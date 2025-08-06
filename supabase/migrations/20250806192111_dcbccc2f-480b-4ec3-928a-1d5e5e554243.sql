-- Fix function security issues by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix the production estimate function security
CREATE OR REPLACE FUNCTION public.get_production_estimate(recipe_id_param UUID)
RETURNS TABLE (
  can_produce INTEGER,
  limiting_material TEXT,
  available_quantity NUMERIC,
  required_quantity NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    FROM public.recipe_ingredients ri
    JOIN public.raw_materials rm ON ri.raw_material_id = rm.id
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