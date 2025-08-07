-- Fix security warning for generate_invoice_number function
DROP FUNCTION IF EXISTS public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-\d+$';
  
  invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_number;
END;
$function$