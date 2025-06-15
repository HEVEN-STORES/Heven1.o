import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  created_at: string;
  last_login?: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
}

interface AdminContextType {
  admin: Admin | null;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
  isLoading: boolean;
  dashboardStats: DashboardStats | null;
  fetchDashboardStats: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const fetchAdminProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching admin profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  };

  const adminLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // Check if user is an admin
        const adminData = await fetchAdminProfile(authData.user.id);
        
        if (!adminData) {
          await supabase.auth.signOut();
          return { success: false, error: 'Access denied. Admin privileges required.' };
        }

        // Update last login
        await supabase
          .from('admins')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authData.user.id);

        setAdmin({
          ...adminData,
          email: authData.user.email || '',
        });

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total orders and revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at');

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

      // Calculate growth (mock data for now)
      const revenueGrowth = 12.5;
      const ordersGrowth = 8.3;
      const usersGrowth = 15.2;

      setDashboardStats({
        totalRevenue,
        totalOrders,
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        revenueGrowth,
        ordersGrowth,
        usersGrowth,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Check if user is already logged in and is an admin
  useEffect(() => {
    const checkAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const adminData = await fetchAdminProfile(session.user.id);
        if (adminData) {
          setAdmin({
            ...adminData,
            email: session.user.email || '',
          });
        }
      }
    };

    checkAdminSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const adminData = await fetchAdminProfile(session.user.id);
        if (adminData) {
          setAdmin({
            ...adminData,
            email: session.user.email || '',
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (admin) {
      fetchDashboardStats();
    }
  }, [admin]);

  return (
    <AdminContext.Provider value={{
      admin,
      adminLogin,
      adminLogout,
      isLoading,
      dashboardStats,
      fetchDashboardStats,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};