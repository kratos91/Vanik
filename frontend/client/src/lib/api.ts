import { apiRequest, queryClient } from "./queryClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    fullName: string | null;
    email: string | null;
    roleId: number | null;
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiRequest("POST", "/api/login", credentials);
    const data = await response.json();
    
    // Store token in localStorage
    localStorage.setItem("auth_token", data.token);
    
    return data;
  },

  logout: async () => {
    try {
      // Call backend logout endpoint
      await apiRequest("POST", "/api/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always remove token and clear cache
      localStorage.removeItem("auth_token");
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Force page reload to reset all state
      window.location.href = "/";
    }
  },

  getStoredToken: () => {
    return localStorage.getItem("auth_token");
  }
};

// Authentication handled in queryClient.ts

export const masterDataApi = {
  getLocations: () => apiRequest("GET", "/api/locations"),
  getProducts: () => apiRequest("GET", "/api/products"),

  getSuppliers: () => apiRequest("GET", "/api/suppliers"),
  getCustomers: () => apiRequest("GET", "/api/customers"),
  getProcessors: () => apiRequest("GET", "/api/processors"),
  
  createLocation: (data: any) => apiRequest("POST", "/api/locations", data),
  createProduct: (data: any) => apiRequest("POST", "/api/products", data),

  createSupplier: (data: any) => apiRequest("POST", "/api/suppliers", data),
  createCustomer: (data: any) => apiRequest("POST", "/api/customers", data),
  createProcessor: (data: any) => apiRequest("POST", "/api/processors", data),
  
  updateLocation: (id: number, data: any) => apiRequest("PUT", `/api/locations/${id}`, data),
  updateProduct: (id: number, data: any) => apiRequest("PUT", `/api/products/${id}`, data),

  updateSupplier: (id: number, data: any) => apiRequest("PUT", `/api/suppliers/${id}`, data),
  updateCustomer: (id: number, data: any) => apiRequest("PUT", `/api/customers/${id}`, data),
  updateProcessor: (id: number, data: any) => apiRequest("PUT", `/api/processors/${id}`, data),
  
  deleteLocation: (id: number) => apiRequest("DELETE", `/api/locations/${id}`),
  deleteProduct: (id: number) => apiRequest("DELETE", `/api/products/${id}`),

  deleteSupplier: (id: number) => apiRequest("DELETE", `/api/suppliers/${id}`),
  deleteCustomer: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
  deleteProcessor: (id: number) => apiRequest("DELETE", `/api/processors/${id}`),
};

// Note: Most inventory operations now use direct apiRequest calls or query keys
// Keeping only essential functions that are still directly referenced

// Note: Report functions are now accessed via direct query keys in useRetryableQuery
// All dashboard and stock-level queries use queryKey patterns instead of these wrapper functions
