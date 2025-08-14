-- Fix critical security vulnerability in clients table RLS policy
-- Current policy allows any authenticated user to access all client data
-- This could lead to customer database theft by competitors or malicious users

-- First, create a security definer function to check if current user is admin
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Drop the existing weak RLS policy that allows any authenticated user to access all clients
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;

-- Create a new secure RLS policy that only allows admin users to manage client data
CREATE POLICY "Only admin users can manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;