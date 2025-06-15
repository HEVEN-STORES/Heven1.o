/*
  # Fix infinite recursion in admin RLS policies

  1. Problem
    - The current admin RLS policy creates infinite recursion by checking the admins table from within the admins table policy
    - This affects user profile fetching and product queries that depend on admin checks

  2. Solution
    - Remove the recursive policy on admins table
    - Create a simpler policy that allows admins to view their own record
    - Update other policies to avoid circular dependencies

  3. Changes
    - Drop existing problematic admin policies
    - Create new non-recursive policies for admins table
    - Ensure other table policies work correctly with the new admin policies
*/

-- Drop the problematic recursive policy on admins table
DROP POLICY IF EXISTS "Admins can view admin data" ON admins;

-- Create a simple policy for admins to view their own record
CREATE POLICY "Admins can view own record"
  ON admins
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow admins to update their own record (for last_login updates)
CREATE POLICY "Admins can update own record"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create a function to check if a user is an admin (to be used by other policies)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE id = user_id
  );
$$;

-- Update products policies to use the function instead of direct EXISTS check
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Update user_profiles policies to use the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Update addresses policies
DROP POLICY IF EXISTS "Admins can view all addresses" ON addresses;
CREATE POLICY "Admins can view all addresses"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Update orders policies
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Update order_items policies
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
CREATE POLICY "Admins can manage all order items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Update coupons policies
DROP POLICY IF EXISTS "Admins can manage all coupons" ON coupons;
CREATE POLICY "Admins can manage all coupons"
  ON coupons
  FOR ALL
  TO authenticated
  USING (is_admin());