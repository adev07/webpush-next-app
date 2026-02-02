"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL, WIDGETS_API_URL } from "@/lib/api-config";

interface UserData {
  _id: string;
  email: string;
  role: string;
  type: string;
  tags: string[];
  isVerified: boolean;
  subscriptionPlan: string;
  domain: string;
  name: string;
  apiAccessToken: string;
  shopDomain?: string;
}

interface User {
  token: string;
  user: UserData;
  isOnboarded: boolean;
}

interface Widget {
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  widgets: Widget[] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchWidgets: () => Promise<{ success: boolean; data?: Widget[]; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const storedUser = localStorage.getItem("auth_user");
    const storedWidgets = localStorage.getItem("auth_widgets");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("auth_user");
      }
    }
    if (storedWidgets) {
      try {
        setWidgets(JSON.parse(storedWidgets));
      } catch (e) {
        localStorage.removeItem("auth_widgets");
      }
    }
    setIsLoading(false);
  }, []);

  const fetchWidgets = async (): Promise<{ success: boolean; data?: Widget[]; error?: string }> => {
    if (!user?.token) {
      return { success: false, error: "No authentication token available" };
    }

    try {
      const response = await fetch(WIDGETS_API_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || "Failed to fetch widgets",
        };
      }

      const widgetsData = data.data || data;
      setWidgets(widgetsData);
      localStorage.setItem("auth_widgets", JSON.stringify(widgetsData));

      return { success: true, data: widgetsData };
    } catch (error) {
      console.error("Fetch widgets error:", error);
      return {
        success: false,
        error: "Network error while fetching widgets",
      };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: responseData.message || responseData.error || "Login failed. Please try again." 
        };
      }

      // Extract user data from response.data
      const userData: User = {
        token: responseData.data.token,
        user: responseData.data.user,
        isOnboarded: responseData.data.isOnboarded,
      };

      setUser(userData);
      localStorage.setItem("auth_user", JSON.stringify(userData));

      // Fetch widgets after successful login
      try {
        const widgetsResponse = await fetch(WIDGETS_API_URL, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${userData.token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        });

        const widgetsData = await widgetsResponse.json();

        if (widgetsResponse.ok) {
          const widgetsList = widgetsData.data || widgetsData;
          setWidgets(widgetsList);
          localStorage.setItem("auth_widgets", JSON.stringify(widgetsList));
        }
      } catch (widgetError) {
        console.error("Failed to fetch widgets after login:", widgetError);
        // Don't fail login if widgets fetch fails
      }
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        error: "Network error. Please check your connection and try again." 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setWidgets(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_widgets");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        widgets,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        fetchWidgets,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
