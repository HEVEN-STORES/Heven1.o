/*
  # Create Demo Admin User

  1. Insert a demo admin user for testing
  2. This admin can be used to test the admin portal login
*/

-- First, we need to create a user in auth.users (this would normally be done through Supabase Auth)
-- For demo purposes, we'll insert directly into the admins table with a known user ID
-- In production, you would create the user through Supabase Auth first, then add them to admins table

-- Insert demo admin (you'll need to create this user through Supabase Auth first)
-- Email: admin@heven.com
-- Password: admin123

-- This is just a placeholder - the actual user creation should be done through Supabase Auth
-- Then you can run this to make them an admin:

-- INSERT INTO admins (id, name, role, permissions) 
-- VALUES ('your-user-id-here', 'Demo Admin', 'admin', ARRAY['products', 'orders', 'users', 'coupons']);

-- For now, let's create a function to easily add admin privileges to any user
CREATE OR REPLACE FUNCTION make_user_admin(user_email text, admin_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert or update admin record
  INSERT INTO admins (id, name, role, permissions)
  VALUES (user_id, admin_name, 'admin', ARRAY['products', 'orders', 'users', 'coupons'])
  ON CONFLICT (id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions;
END;
$$;

-- Usage: SELECT make_user_admin('admin@heven.com', 'Demo Admin');