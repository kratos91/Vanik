import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";
import { Search, Plus, Edit2, Trash2, CalendarDays, FileText, CheckCircle, Clock, XCircle, Settings, ChevronDown, ChevronRight, MoreHorizontal, Edit, RefreshCw, Trash, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React from "react";

interface SalesChallan {
  id: number;
  scNumber: string;
  customerId: number;
  customerName: string;
  challanDate: string;
  status: string;
  totalItems: number;
  totalValue: string | number; // Backend returns string from DECIMAL field
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  items?: SalesChallanItem[];
}

interface SalesChallanItem {
  id: number;
  scId: number;
  categoryId: number;
  productId: number;
  categoryName: string;
  productName: string;
  quantityBags: number;
  weightKg: number;
  estimatedValue: number;
  remarks?: string;
  createdAt: string;
}

interface Customer {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  panNumber: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Product {
  id: number;
  product_name: string;
  category_id: number;
  categoryName: string;
  hsn_code: string;
  specification: string;
}

interface ChallanItem {
  categoryId: number;
  productId: number;
  quantityBags: number;
  weightKg: number;
  estimatedValue: number;
  remarks: string;
}

const statusOptions = [
  { value: "New", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "Delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function SalesChallansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<SalesChallan | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerId: "",
    challanDate: "",
    notes: "",
    items: [] as ChallanItem[]
  });
  const [editCurrentItem, setEditCurrentItem] = useState<ChallanItem>({
    categoryId: 0,
    productId: 0,
    quantityBags: 0,
    weightKg: 0,
    estimatedValue: 0,
    remarks: ""
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [visibleColumns, setVisibleColumns] = useState({
    scNumber: true,
    customer: true,
    challanDate: true,
    status: true,
    items: true,
    totalValue: true,
    notes: false,
    createdAt: false,
    createdBy: false,
    updatedAt: false,
    updatedBy: false,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    challanDate: new Date().toISOString().split('T')[0],
    notes: "",
    items: [] as ChallanItem[]
  });
  const [currentItem, setCurrentItem] = useState<ChallanItem>({
    categoryId: 0,
    productId: 0,
    quantityBags: 0,
    weightKg: 0,
    estimatedValue: 0,
    remarks: ""
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resetCurrentItem = () => {
    setCurrentItem({
      categoryId: 0,
      productId: 0,
      quantityBags: 0,
      weightKg: 0,
      estimatedValue: 0,
      remarks: ""
    });
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/sales-challans"] });
      toast({
        title: "Refreshed",
        description: "Sales challans data has been updated",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check for pending challan data from conversion
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openCreate = urlParams.get('openCreate');
    
    if (openCreate === 'true') {
      const pendingData = sessionStorage.getItem('pendingChallanData');
      if (pendingData) {
        try {
          const challanData = JSON.parse(pendingData);
          console.log("📋 Loading pending challan data:", challanData);
          
          setFormData(challanData);
          setIsCreateDialogOpen(true);
          
          // Clean up
          sessionStorage.removeItem('pendingChallanData');
          
          // Remove the query parameter from URL
          window.history.replaceState({}, '', '/sales-challans');
          
          toast({
            title: "Order Converted",
            description: "Sales order data has been pre-filled. Review and complete the challan creation.",
          });
        } catch (error) {
          console.error("Failed to parse pending challan data:", error);
          sessionStorage.removeItem('pendingChallanData');
        }
      }
    }
  }, []);

  // Enhanced queries with retry logic
  const challansQuery = useRetryableQuery<SalesChallan[]>({
    queryKey: ["/api/sales-challans"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const customersQuery = useRetryableQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60 * 1000, // 1 minute
  });

  const categoriesQuery = useRetryableQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const productsQuery = useRetryableQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract data with fallbacks from response objects
  const challans = challansQuery.data?.challans || [];
  const customers = customersQuery.data?.customers || [];
  const categories = categoriesQuery.data?.categories || [];
  const products = productsQuery.data?.products || [];
  const isLoading = challansQuery.isLoading;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/sales-challans", data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-challans"] });
      
      // Check if this challan was created from a sales order conversion
      const convertingOrderId = sessionStorage.getItem('convertingOrderId');
      if (convertingOrderId) {
        try {
          // Update the sales order's converted_to_challan flag
          await apiRequest("PUT", `/api/sales-orders/${convertingOrderId}`, {
            converted_to_challan: true,
            status: "Delivered"
          });
          
          // Clean up
          sessionStorage.removeItem('convertingOrderId');
          
          // Invalidate sales orders cache too
          queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
          
          toast({
            title: "Success",
            description: "Sales challan created and sales order converted successfully",
          });
        } catch (error) {
          console.error("Failed to update sales order:", error);
          toast({
            title: "Partial Success",
            description: "Sales challan created but failed to update sales order status",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Sales challan created successfully",
        });
      }
      
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales challan",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest("PUT", `/api/sales-challans/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-challans"] });
      toast({
        title: "Success",
        description: "Sales challan updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sales challan",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales-challans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-challans"] });
      toast({
        title: "Success",
        description: "Sales challan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sales challan",
        variant: "destructive",
      });
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => 
      apiRequest('PUT', `/api/sales-challans/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-challans'] });
      toast({
        title: "Success",
        description: "Challan status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update challan status",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      customerId: "",
      challanDate: new Date().toISOString().split('T')[0],
      notes: "",
      items: []
    });
    resetCurrentItem();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one item",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const addItem = () => {
    if (!currentItem.categoryId || !currentItem.productId || !currentItem.quantityBags || !currentItem.weightKg) {
      toast({
        title: "Error",
        description: "Please fill in all item fields",
        variant: "destructive",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, currentItem]
    }));
    resetCurrentItem();
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusOption?.color || "bg-gray-100 text-gray-800"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const toggleRowExpansion = (challanId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(challanId)) {
      newExpandedRows.delete(challanId);
    } else {
      newExpandedRows.add(challanId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleStatusUpdate = (challanId: number, newStatus: string) => {
    updateMutation.mutate({
      id: challanId,
      updates: { status: newStatus }
    });
  };

  const handleDelete = (challanId: number) => {
    if (confirm("Are you sure you want to delete this sales challan?")) {
      deleteMutation.mutate(challanId);
    }
  };

  const handleEdit = (challan: SalesChallan) => {
    setSelectedChallan(challan);
    // Convert existing items to edit format
    const editItems = challan.items ? challan.items.map(item => ({
      categoryId: item.categoryId,
      productId: item.productId,
      quantityBags: item.quantityBags,
      weightKg: item.weightKg,
      estimatedValue: item.estimatedValue,
      remarks: item.remarks || ""
    })) : [];
    
    setEditFormData({
      customerId: challan.customerId.toString(),
      challanDate: challan.challanDate.split('T')[0],
      notes: challan.notes || "",
      items: editItems
    });
    resetEditCurrentItem();
    setIsEditDialogOpen(true);
  };

  const resetEditCurrentItem = () => {
    setEditCurrentItem({
      categoryId: 0,
      productId: 0,
      quantityBags: 0,
      weightKg: 0,
      estimatedValue: 0,
      remarks: ""
    });
    setEditingItemIndex(-1);
  };

  const addEditItem = () => {
    if (editCurrentItem.categoryId && editCurrentItem.productId && editCurrentItem.quantityBags > 0 && editCurrentItem.weightKg > 0) {
      if (editingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...editFormData.items];
        updatedItems[editingItemIndex] = editCurrentItem;
        setEditFormData({...editFormData, items: updatedItems});
      } else {
        // Add new item
        setEditFormData({
          ...editFormData,
          items: [...editFormData.items, editCurrentItem]
        });
      }
      resetEditCurrentItem();
    }
  };

  const editItem = (index: number) => {
    setEditCurrentItem(editFormData.items[index]);
    setEditingItemIndex(index);
  };

  const removeEditItem = (index: number) => {
    const updatedItems = editFormData.items.filter((_, i) => i !== index);
    setEditFormData({...editFormData, items: updatedItems});
  };

  const filteredEditProducts = products.filter(product => 
    editCurrentItem.categoryId === 0 || product.category_id === editCurrentItem.categoryId
  );

  // Status lifecycle helper functions
  const getAvailableStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'New':
        return ['Delivered', 'Cancelled'];
      case 'Delivered':
        return [];
      case 'Cancelled':
        return [];
      default:
        return [];
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      // Remove 'Z' suffix if present and create date
      const cleanDateString = dateString.replace(/Z$/, '');
      const date = new Date(cleanDateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return '-';
    }
  };

  const canEdit = (status: string) => {
    return status === 'New'; // Only New status allows editing
  };

  const canDelete = (status: string) => {
    return status === 'New' || status === 'Cancelled'; // New and Cancelled allow delete
  };

  const canChangeStatus = (status: string) => {
    return status === 'New'; // Only New status allows status changes
  };

  const handleStatusChange = (challanId: number, newStatus: string) => {
    statusMutation.mutate({ id: challanId, status: newStatus });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;

    // Calculate totals
    const totalItems = editFormData.items.length;
    const totalValue = editFormData.items.reduce((sum, item) => sum + item.estimatedValue, 0);

    updateMutation.mutate({
      id: selectedChallan.id,
      updates: {
        customerId: parseInt(editFormData.customerId),
        challanDate: editFormData.challanDate,
        notes: editFormData.notes,
        items: editFormData.items,
        totalItems: totalItems,
        totalValue: totalValue
      }
    });
    setIsEditDialogOpen(false);
  };

  const filteredChallans = challans.filter(challan => {
    const matchesSearch = challan.scNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         challan.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || challan.status === statusFilter;
    const matchesCustomer = customerFilter === "all" || challan.customerId.toString() === customerFilter;
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter !== "all") {
      const challanDate = new Date(challan.challanDate);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (dateFilter) {
        case "today":
          matchesDate = challanDate.toDateString() === today.toDateString();
          break;
        case "yesterday":
          matchesDate = challanDate.toDateString() === yesterday.toDateString();
          break;
        case "lastWeek":
          matchesDate = challanDate >= lastWeek;
          break;
        case "lastMonth":
          matchesDate = challanDate >= lastMonth;
          break;
        case "custom":
          if (customDateFrom && customDateTo) {
            const fromDate = new Date(customDateFrom);
            const toDate = new Date(customDateTo);
            matchesDate = challanDate >= fromDate && challanDate <= toDate;
          }
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedChallans = filteredChallans.slice(startIndex, startIndex + rowsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, customerFilter, dateFilter, customDateFrom, customDateTo]);

  const filteredProducts = products.filter(product => 
    currentItem.categoryId === 0 || product.category_id === currentItem.categoryId
  );

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.product_name || "Unknown Product";
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Unknown Customer";
  };

  const totalChallans = challans.length;
  const newChallans = challans.filter(challan => challan.status === "New").length;
  const cancelledChallans = challans.filter(challan => challan.status === "Cancelled").length;
  const deliveredChallans = challans.filter(challan => challan.status === "Delivered").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Sales Challans</h1>
            <p className="text-sm text-gray-600">Manage dispatch documents and delivery tracking</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Sales Challan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Sales Challan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={formData.customerId} onValueChange={(value) => setFormData({...formData, customerId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="challanDate">Challan Date *</Label>
                  <Input
                    type="date"
                    value={formData.challanDate}
                    onChange={(e) => setFormData({...formData, challanDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Enter any additional notes..."
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Add Items</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={currentItem.categoryId === 0 ? "" : currentItem.categoryId.toString()} onValueChange={(value) => setCurrentItem({...currentItem, categoryId: parseInt(value), productId: 0})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Product *</Label>
                    <Select value={currentItem.productId === 0 ? "" : currentItem.productId.toString()} onValueChange={(value) => setCurrentItem({...currentItem, productId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity (Bags/Rolls) *</Label>
                    <Input
                      type="number"
                      value={currentItem.quantityBags || ""}
                      onChange={(e) => setCurrentItem({...currentItem, quantityBags: parseInt(e.target.value) || 0})}
                      min="1"
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <Label>Weight (KG) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.weightKg || ""}
                      onChange={(e) => setCurrentItem({...currentItem, weightKg: parseFloat(e.target.value) || 0})}
                      min="0.01"
                      placeholder="Enter weight"
                    />
                  </div>
                  <div>
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.estimatedValue || ""}
                      onChange={(e) => setCurrentItem({...currentItem, estimatedValue: parseFloat(e.target.value) || 0})}
                      min="0"
                      placeholder="Enter estimated value"
                    />
                  </div>
                  <div>
                    <Label>Remarks</Label>
                    <Input
                      value={currentItem.remarks}
                      onChange={(e) => setCurrentItem({...currentItem, remarks: e.target.value})}
                      placeholder="Enter remarks..."
                    />
                  </div>
                </div>
                <Button type="button" onClick={addItem} className="w-full">
                  Add Item
                </Button>
              </div>

              {formData.items.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Items Added ({formData.items.length})</h3>
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{getCategoryName(item.categoryId)} - {getProductName(item.productId)}</span>
                          <div className="text-sm text-gray-600">
                            {item.quantityBags} bags/rolls, {item.weightKg} kg
                            {item.estimatedValue > 0 && ` - ₹${item.estimatedValue.toFixed(2)}`}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Sales Challan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Challans</p>
                <p className="text-2xl font-bold">{totalChallans}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New</p>
                <p className="text-2xl font-bold">{newChallans}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold">{cancelledChallans}</p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{deliveredChallans}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Main filter row */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by challan number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="lastWeek">Last 7 Days</SelectItem>
              <SelectItem value="lastMonth">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="default">
                <Settings className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="font-medium">Select Columns to Display</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scNumber"
                      checked={visibleColumns.scNumber}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, scNumber: !!checked}))}
                    />
                    <Label htmlFor="scNumber" className="text-sm">Challan Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customer"
                      checked={visibleColumns.customer}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, customer: !!checked}))}
                    />
                    <Label htmlFor="customer" className="text-sm">Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="challanDate"
                      checked={visibleColumns.challanDate}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, challanDate: !!checked}))}
                    />
                    <Label htmlFor="challanDate" className="text-sm">Challan Date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status"
                      checked={visibleColumns.status}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, status: !!checked}))}
                    />
                    <Label htmlFor="status" className="text-sm">Status</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="items"
                      checked={visibleColumns.items}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, items: !!checked}))}
                    />
                    <Label htmlFor="items" className="text-sm">Items</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="totalValue"
                      checked={visibleColumns.totalValue}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, totalValue: !!checked}))}
                    />
                    <Label htmlFor="totalValue" className="text-sm">Total Value</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notes"
                      checked={visibleColumns.notes}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, notes: !!checked}))}
                    />
                    <Label htmlFor="notes" className="text-sm">Notes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createdAt"
                      checked={visibleColumns.createdAt}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, createdAt: !!checked}))}
                    />
                    <Label htmlFor="createdAt" className="text-sm">Created At</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createdBy"
                      checked={visibleColumns.createdBy}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, createdBy: !!checked}))}
                    />
                    <Label htmlFor="createdBy" className="text-sm">Created By</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="updatedAt"
                      checked={visibleColumns.updatedAt}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, updatedAt: !!checked}))}
                    />
                    <Label htmlFor="updatedAt" className="text-sm">Updated At</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="updatedBy"
                      checked={visibleColumns.updatedBy}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, updatedBy: !!checked}))}
                    />
                    <Label htmlFor="updatedBy" className="text-sm">Updated By</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Custom date range row (only shown when custom is selected) */}
        {dateFilter === "custom" && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="date"
              placeholder="From date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="w-full sm:w-48"
            />
            <Input
              type="date"
              placeholder="To date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        )}
      </div>

      {/* Challans Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : filteredChallans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sales challans found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {visibleColumns.scNumber && <th className="text-left p-4">Challan Number</th>}
                      {visibleColumns.customer && <th className="text-left p-4">Customer</th>}
                      {visibleColumns.challanDate && <th className="text-left p-4">Challan Date</th>}
                      {visibleColumns.status && <th className="text-left p-4">Status</th>}
                      {visibleColumns.items && <th className="text-left p-4">Items</th>}
                      {visibleColumns.totalValue && <th className="text-left p-4">Total Value</th>}
                      {visibleColumns.notes && <th className="text-left p-4">Notes</th>}
                      {visibleColumns.createdAt && <th className="text-left p-4">Created At</th>}
                      {visibleColumns.createdBy && <th className="text-left p-4">Created By</th>}
                      {visibleColumns.updatedAt && <th className="text-left p-4">Updated At</th>}
                      {visibleColumns.updatedBy && <th className="text-left p-4">Updated By</th>}
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChallans.map((challan) => (
                      <React.Fragment key={challan.id}>
                        <tr 
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleRowExpansion(challan.id)}
                        >
                          {visibleColumns.scNumber && (
                            <td className="p-4 font-medium">
                              <div className="flex items-center gap-2">
                                {expandedRows.has(challan.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                {challan.scNumber}
                              </div>
                            </td>
                          )}
                          {visibleColumns.customer && <td className="p-4">{challan.customerName}</td>}
                          {visibleColumns.challanDate && <td className="p-4">{formatDate(challan.challanDate)}</td>}
                          {visibleColumns.status && <td className="p-4">{getStatusBadge(challan.status)}</td>}
                          {visibleColumns.items && <td className="p-4">{challan.totalItems}</td>}
                          {visibleColumns.totalValue && <td className="p-4">₹{parseFloat(challan.totalValue || 0).toFixed(2)}</td>}
                          {visibleColumns.notes && <td className="p-4">{challan.notes || '-'}</td>}
                          {visibleColumns.createdAt && <td className="p-4">{formatDate(challan.createdAt)}</td>}
                          {visibleColumns.createdBy && <td className="p-4">User {challan.createdBy}</td>}
                          {visibleColumns.updatedAt && <td className="p-4">{formatDate(challan.updatedAt)}</td>}
                          {visibleColumns.updatedBy && <td className="p-4">User {challan.updatedBy}</td>}
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            {/* Always show three dots, but disable for delivered status */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0" 
                                  disabled={challan.status === 'Delivered'}
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className={`h-4 w-4 ${challan.status === 'Delivered' ? 'text-gray-300' : ''}`} />
                                </Button>
                              </DropdownMenuTrigger>
                              {challan.status !== 'Delivered' && (
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {canEdit(challan.status) && (
                                    <DropdownMenuItem onClick={() => handleEdit(challan)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Challan
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {/* Status Change Options */}
                                  {canChangeStatus(challan.status) && getAvailableStatuses(challan.status).length > 0 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <RefreshCw className="mr-2 h-4 w-4" />
                                          Change Status
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {getAvailableStatuses(challan.status).map((status) => (
                                            <DropdownMenuItem
                                              key={status}
                                              onClick={() => handleStatusChange(challan.id, status)}
                                              className={status === 'Cancelled' ? 'text-red-600' : ''}
                                            >
                                              {status}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    </>
                                  )}
                                  
                                  {canDelete(challan.status) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDelete(challan.id)}
                                        className="text-red-600"
                                      >
                                        <Trash className="mr-2 h-4 w-4" />
                                        Delete Challan
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              )}
                            </DropdownMenu>
                          </td>
                        </tr>
                        
                        {/* Expandable row content */}
                        {expandedRows.has(challan.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="p-6">
                              <div className="space-y-6">
                                <div className="font-medium text-lg">Challan Details</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Challan Number:</span>
                                    <div className="font-medium">{challan.scNumber}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Customer:</span>
                                    <div className="font-medium">{challan.customerName}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Challan Date:</span>
                                    <div className="font-medium">{formatDate(challan.challanDate)}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Status:</span>
                                    <div className="font-medium">{getStatusBadge(challan.status)}</div>
                                  </div>
                                </div>
                                
                                {challan.notes && (
                                  <div>
                                    <span className="text-gray-600">Notes:</span>
                                    <div className="mt-1 text-sm">{challan.notes}</div>
                                  </div>
                                )}

                                {/* Order Items */}
                                <div>
                                  <div className="font-medium text-lg mb-3">Challan Items</div>
                                  {challan.items && challan.items.length > 0 ? (
                                    <div className="bg-white rounded-lg border overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="text-left p-3 font-medium">Category</th>
                                            <th className="text-left p-3 font-medium">Product</th>
                                            <th className="text-left p-3 font-medium">Quantity (Bags/Rolls)</th>
                                            <th className="text-left p-3 font-medium">Weight (KG)</th>
                                            <th className="text-left p-3 font-medium">Remarks</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {challan.items.map((item: any, index: number) => (
                                            <tr key={index} className="border-t">
                                              <td className="p-3">{item.categoryName || '-'}</td>
                                              <td className="p-3">{item.productName || '-'}</td>
                                              <td className="p-3">{item.quantityBags || 0}</td>
                                              <td className="p-3">{item.weightKg || 0}</td>
                                              <td className="p-3">{item.remarks || '-'}</td>
                                            </tr>
                                          ))}
                                          {/* Total Weight Row */}
                                          <tr className="border-t bg-gray-50 font-semibold">
                                            <td className="p-3" colSpan={3}>Total Weight:</td>
                                            <td className="p-3">
                                              {challan.items.reduce((total: number, item: any) => total + (parseFloat(item.weightKg) || 0), 0).toFixed(2)} KG
                                            </td>
                                            <td className="p-3"></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-sm">No items found for this challan.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredChallans.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedChallans.length} of {filteredChallans.length} Sales Challans
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Select value={rowsPerPage.toString()} onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* View Challan Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sales Challan Details</DialogTitle>
          </DialogHeader>
          {selectedChallan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Challan Number</Label>
                  <p className="font-medium">{selectedChallan.scNumber}</p>
                </div>
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{selectedChallan.customerName}</p>
                </div>
                <div>
                  <Label>Challan Date</Label>
                  <p>{formatDate(selectedChallan.challanDate)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedChallan.status)}</div>
                </div>
                <div>
                  <Label>Total Items</Label>
                  <p>{selectedChallan.totalItems}</p>
                </div>
                <div>
                  <Label>Total Value</Label>
                  <p>₹{parseFloat(selectedChallan.totalValue || 0).toFixed(2)}</p>
                </div>
              </div>
              {selectedChallan.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-gray-600">{selectedChallan.notes}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Challan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sales Challan</DialogTitle>
          </DialogHeader>
          {selectedChallan && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Challan Number</Label>
                  <p className="font-medium text-lg">{selectedChallan.scNumber}</p>
                </div>
                <div>
                  <Label htmlFor="editCustomer">Customer *</Label>
                  <Select 
                    value={editFormData.customerId} 
                    onValueChange={(value) => setEditFormData({...editFormData, customerId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editChallanDate">Challan Date *</Label>
                  <Input
                    id="editChallanDate"
                    type="date"
                    value={editFormData.challanDate}
                    onChange={(e) => setEditFormData({...editFormData, challanDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea
                    id="editNotes"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    placeholder="Add notes..."
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold">Challan Items</h3>
                
                {/* Add Item Form */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium">Add Item</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select 
                        value={editCurrentItem.categoryId === 0 ? "" : editCurrentItem.categoryId.toString()} 
                        onValueChange={(value) => setEditCurrentItem({...editCurrentItem, categoryId: parseInt(value), productId: 0})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Product *</Label>
                      <Select 
                        value={editCurrentItem.productId === 0 ? "" : editCurrentItem.productId.toString()} 
                        onValueChange={(value) => setEditCurrentItem({...editCurrentItem, productId: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEditProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.product_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity (Bags/Rolls) *</Label>
                      <Input
                        type="number"
                        value={editCurrentItem.quantityBags || ""}
                        onChange={(e) => setEditCurrentItem({...editCurrentItem, quantityBags: parseInt(e.target.value) || 0})}
                        min="1"
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div>
                      <Label>Weight (KG) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editCurrentItem.weightKg || ""}
                        onChange={(e) => setEditCurrentItem({...editCurrentItem, weightKg: parseFloat(e.target.value) || 0})}
                        min="0.01"
                        placeholder="Enter weight"
                      />
                    </div>
                    <div>
                      <Label>Estimated Value *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editCurrentItem.estimatedValue || ""}
                        onChange={(e) => setEditCurrentItem({...editCurrentItem, estimatedValue: parseFloat(e.target.value) || 0})}
                        min="0"
                        placeholder="Enter value"
                      />
                    </div>
                    <div>
                      <Label>Remarks</Label>
                      <Input
                        value={editCurrentItem.remarks}
                        onChange={(e) => setEditCurrentItem({...editCurrentItem, remarks: e.target.value})}
                        placeholder="Enter remarks"
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addEditItem} className="w-full">
                    {editingItemIndex >= 0 ? "Update Item" : "Add Item to Challan"}
                  </Button>
                  {editingItemIndex >= 0 && (
                    <Button type="button" variant="outline" onClick={resetEditCurrentItem} className="w-full">
                      Cancel Edit
                    </Button>
                  )}
                </div>

                {/* Items List */}
                {editFormData.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Added Items ({editFormData.items.length})</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 border-b">Category</th>
                            <th className="text-left p-3 border-b">Product</th>
                            <th className="text-left p-3 border-b">Qty (Bags/Rolls)</th>
                            <th className="text-left p-3 border-b">Weight (KG)</th>
                            <th className="text-left p-3 border-b">Value</th>
                            <th className="text-left p-3 border-b">Remarks</th>
                            <th className="text-left p-3 border-b">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editFormData.items.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-3">{getCategoryName(item.categoryId)}</td>
                              <td className="p-3">{getProductName(item.productId)}</td>
                              <td className="p-3">{item.quantityBags}</td>
                              <td className="p-3">{item.weightKg}</td>
                              <td className="p-3">₹{item.estimatedValue.toFixed(2)}</td>
                              <td className="p-3">{item.remarks || '-'}</td>
                              <td className="p-3">
                                <div className="flex space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editItem(index)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEditItem(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={2} className="p-3 font-medium">Total:</td>
                            <td className="p-3 font-medium">{editFormData.items.reduce((sum, item) => sum + item.quantityBags, 0)}</td>
                            <td className="p-3 font-medium">{editFormData.items.reduce((sum, item) => sum + item.weightKg, 0).toFixed(2)}</td>
                            <td className="p-3 font-medium">₹{editFormData.items.reduce((sum, item) => sum + item.estimatedValue, 0).toFixed(2)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {editFormData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items added yet. Add items above to create the challan.
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || editFormData.items.length === 0}>
                  {updateMutation.isPending ? "Updating..." : "Update Sales Challan"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}