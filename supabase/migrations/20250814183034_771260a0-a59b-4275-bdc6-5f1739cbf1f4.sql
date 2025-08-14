-- Create tables for GRN, Discrepancy Detection & Transport Logs

-- Create GRNs (Good Receipt Notes) table
CREATE TABLE public.grns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  grn_number TEXT NOT NULL UNIQUE,
  grn_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create GRN Items table (materials received in each GRN)
CREATE TABLE public.grn_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID NOT NULL,
  raw_material_id UUID NOT NULL,
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Discrepancies table
CREATE TABLE public.discrepancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID NOT NULL,
  raw_material_id UUID NOT NULL,
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  discrepancy_quantity NUMERIC NOT NULL DEFAULT 0,
  discrepancy_type TEXT NOT NULL DEFAULT 'shortage', -- 'shortage', 'excess', 'damage'
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Transport Logs table
CREATE TABLE public.transport_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_no TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  transport_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  driver_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Transport Clients table (many-to-many relationship)
CREATE TABLE public.transport_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transport_log_id UUID NOT NULL,
  client_id UUID NOT NULL,
  delivery_address TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage GRNs" 
ON public.grns 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage GRN items" 
ON public.grn_items 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage discrepancies" 
ON public.discrepancies 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage transport logs" 
ON public.transport_logs 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage transport clients" 
ON public.transport_clients 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- Create updated_at triggers
CREATE TRIGGER update_grns_updated_at
BEFORE UPDATE ON public.grns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transport_logs_updated_at
BEFORE UPDATE ON public.transport_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-detect discrepancies
CREATE OR REPLACE FUNCTION public.detect_grn_discrepancies(grn_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete existing discrepancies for this GRN
  DELETE FROM public.discrepancies WHERE grn_id = grn_id_param;
  
  -- Insert new discrepancies where received != expected
  INSERT INTO public.discrepancies (grn_id, raw_material_id, expected_quantity, received_quantity, discrepancy_quantity, discrepancy_type)
  SELECT 
    grn_id_param,
    raw_material_id,
    expected_quantity,
    received_quantity,
    ABS(received_quantity - expected_quantity) as discrepancy_quantity,
    CASE 
      WHEN received_quantity < expected_quantity THEN 'shortage'
      WHEN received_quantity > expected_quantity THEN 'excess'
      ELSE 'match'
    END as discrepancy_type
  FROM public.grn_items
  WHERE grn_id = grn_id_param
    AND received_quantity != expected_quantity;
END;
$$;

-- Create function to generate GRN number
CREATE OR REPLACE FUNCTION public.generate_grn_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number INTEGER;
  grn_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 'GRN-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.grns
  WHERE grn_number ~ '^GRN-\d+$';
  
  grn_number := 'GRN-' || LPAD(next_number::TEXT, 6, '0');
  RETURN grn_number;
END;
$$;