import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Define user type
type UserRole = 'admin' | 'student' | 'hostel_manager' | 'super_admin' | 'vendor' | 'vendor_employee';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  permissions?: any;
  vendorId?: string;
  vendorIds?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  SocialLogin: (response: any) => Promise<boolean>;
  registerUser: (name: string, phone: string, email: string, password: string, gender: string, role: string) => Promise<boolean>;
  logout: () => void;
  changeUserName: (newName: string) => Promise<boolean>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateUserName: (newName: string) => Promise<boolean>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateUserProfile: (data: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  authChecked: false,
  isLoading: true,
  login: async () => ({ success: false }),
  SocialLogin: async () => false,
  registerUser: async () => false,
  logout: () => {},
  changeUserName: async () => false,
  changeUserPassword: async () => false,
  updateUserName: async () => false,
  updateUserPassword: async () => false,
  updateUserProfile: async () => false
});

// Cache to prevent duplicate fetchUserRole calls
const roleCache = new Map<string, UserRole>();

const fetchUserRole = async (userId: string): Promise<UserRole> => {
  const cached = roleCache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.warn('No role found for user, defaulting to student');
    return 'student';
  }

  const role = data.role as UserRole;
  roleCache.set(userId, role);
  return role;
};

const buildUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  const role = await fetchUserRole(supabaseUser.id);
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role,
    profileImage: supabaseUser.user_metadata?.avatar_url,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Set up auth state listener BEFORE calling getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Defer Supabase calls to avoid deadlock in onAuthStateChange
        setTimeout(async () => {
          const appUser = await buildUser(session.user);
          setUser(appUser);
          setIsLoading(false);
          setAuthChecked(true);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
        setAuthChecked(true);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setIsLoading(false);
        setAuthChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Check if user is active
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
        }

        // Build user immediately instead of waiting for onAuthStateChange
        const appUser = await buildUser(data.user);
        setUser(appUser);
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'An error occurred during login.' };
    }
  };

  const SocialLogin = async (response: any): Promise<boolean> => {
    try {
      if (response.success && response.token && response.user) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Social login error:', error);
      return false;
    }
  };

  const registerUser = async (name: string, phone: string, email: string, password: string, gender: string, role: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone, gender }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const changeUserName = async (newName: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({ data: { name: newName } });
      if (error) return false;
      if (user) {
        setUser({ ...user, name: newName });
      }
      return true;
    } catch {
      return false;
    }
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return !error;
    } catch {
      return false;
    }
  };

  const updateUserName = async (newName: string): Promise<boolean> => changeUserName(newName);
  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<boolean> => changeUserPassword(currentPassword, newPassword);

  const updateUserProfile = async (data: unknown): Promise<boolean> => {
    if (user) {
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authChecked,
        isLoading,
        login,
        SocialLogin,
        registerUser,
        logout,
        changeUserName,
        changeUserPassword,
        updateUserName,
        updateUserPassword,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
