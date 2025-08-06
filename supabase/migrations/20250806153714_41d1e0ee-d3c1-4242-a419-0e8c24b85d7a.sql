-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create raw_materials table
CREATE TABLE public.raw_materials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level NUMERIC NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendors table
CREATE TABLE public.vendors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_raw_materials join table
CREATE TABLE public.product_raw_materials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    UNIQUE(product_id, raw_material_id)
);

-- Create vendor_products join table
CREATE TABLE public.vendor_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    last_supplied TIMESTAMP WITH TIME ZONE,
    UNIQUE(vendor_id, raw_material_id)
);

-- Create purchases table
CREATE TABLE public.purchases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_items table
CREATE TABLE public.purchase_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0)
);

-- Create production_batches table
CREATE TABLE public.production_batches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    batch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    operator_id UUID REFERENCES auth.users(id),
    remarks TEXT
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    remarks TEXT
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff', 'manager')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (admin only access)
CREATE POLICY "Authenticated users can manage products" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage raw_materials" ON public.raw_materials
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage vendors" ON public.vendors
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage product_raw_materials" ON public.product_raw_materials
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage vendor_products" ON public.vendor_products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage purchases" ON public.purchases
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage purchase_items" ON public.purchase_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage production_batches" ON public.production_batches
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage sales" ON public.sales
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage expenses" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at
    BEFORE UPDATE ON public.raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_product_raw_materials_product_id ON public.product_raw_materials(product_id);
CREATE INDEX idx_product_raw_materials_raw_material_id ON public.product_raw_materials(raw_material_id);
CREATE INDEX idx_vendor_products_vendor_id ON public.vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_raw_material_id ON public.vendor_products(raw_material_id);
CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_raw_material_id ON public.purchase_items(raw_material_id);
CREATE INDEX idx_production_batches_product_id ON public.production_batches(product_id);
CREATE INDEX idx_production_batches_batch_date ON public.production_batches(batch_date);
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);