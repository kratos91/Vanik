import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";
import { Search, Plus, Edit2, Trash2, CalendarDays, TrendingUp, FileText, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, MoreHorizontal, Settings, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import GRNModal from "@/components/modals/grn-modal";

// Purchase Order Lifecycle Management Types
type AllowedAction = "edit" | "delete" | "convert_to_grn" | "mark_received" | "mark_cancelled";

const getAvailableActions = (order: PurchaseOrder): AllowedAction[] => {
  const { status, converted_to_grn } = order;
  
  const lifecycleRules: Record<string, AllowedAction[]> = {
    "Order Placed_false": ["edit", "delete", "convert_to_grn", "mark_received", "mark_cancelled"],
    "Order Received_false": ["edit", "delete", "convert_to_grn", "mark_cancelled"],
    "Order Received_true": [], // No actions allowed when converted to GRN
    "Order Cancelled_false": ["delete"], // Only delete allowed for cancelled orders
    "Order Cancelled_true": ["delete"], // Cancelled orders that were converted (edge case)
  };
  
  const key = `${status}_${converted_to_grn}`;
  return lifecycleRules[key] || [];
};

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplierName: string;
  orderDate: string;
  status: string;
  total_items: number;
  total_value: string | number; // Backend returns string from DECIMAL field
  notes?: string;
  converted_to_grn: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  items?: any[];
}

interface Supplier {
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

interface OrderItem {
  categoryId: number;
  productId: number;
  quantityBags: number;
  weightKg: number;
  estimatedValue: number;
  remarks: string;
}

const statusOptions = [
  { value: "Order Placed", label: "Order Placed", color: "bg-blue-100 text-blue-800" },
  { value: "Order Received", label: "Order Received", color: "bg-green-100 text-green-800" },
  { value: "Order Cancelled", label: "Order Cancelled", color: "bg-red-100 text-red-800" },
];

const getDisplayStatus = (status: string) => {
  // If status is "Converted to GRN", display as "Order Received"
  return status === "Converted to GRN" ? "Order Received" : status;
};

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [grnFilter, setGrnFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"po_number" | "supplierName" | "orderDate" | "status">("po_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [convertOrder, setConvertOrder] = useState<PurchaseOrder | null>(null);
  const [grnInitialData, setGrnInitialData] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    supplierId: "",
    orderDate: "",
    notes: "",
    items: [] as OrderItem[]
  });
  const [editCurrentItem, setEditCurrentItem] = useState<OrderItem>({
    categoryId: 0,
    productId: 0,
    quantityBags: 0,
    weightKg: 0,
    estimatedValue: 0,
    remarks: ""
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('purchaseOrderColumns');
    return saved ? JSON.parse(saved) : {
      poNumber: true,
      supplier: true,
      orderDate: true,
      status: true,
      convertedToGRN: true,
      items: true,
      totalValue: true,
      createdAt: false,
      createdBy: false,
      updatedAt: false,
      updatedBy: false,
      notes: false
    };
  });

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem('purchaseOrderColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const [formData, setFormData] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split('T')[0],
    notes: "",
    items: [] as OrderItem[]
  });
  const [currentItem, setCurrentItem] = useState<OrderItem>({
    categoryId: 0,
    productId: 0,
    quantityBags: 0,
    weightKg: 0,
    estimatedValue: 0,
    remarks: ""
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Refreshed",
        description: "Purchase orders data has been updated",
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

  // Enhanced queries with retry logic
  const ordersQuery = useRetryableQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const suppliersQuery = useRetryableQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
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

  const locationsQuery = useRetryableQuery<any[]>({
    queryKey: ["/api/locations"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract data with fallbacks from response objects
  const orders = ordersQuery.data?.orders || [];
  const suppliers = suppliersQuery.data?.suppliers || [];
  const categories = categoriesQuery.data?.categories || [];
  const products = productsQuery.data?.products || [];
  const locations = locationsQuery.data?.locations || [];
  const isLoading = ordersQuery.isLoading;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/purchase-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return await apiRequest("PUT", `/api/purchase-orders/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
    },
    onError: (error: any) => {
      // Parse backend validation error messages
      let errorMessage = "Failed to update purchase order";
      if (error.message) {
        // Extract user-friendly error from backend lifecycle validation
        if (error.message.includes("Cannot modify orders that have been converted to GRN")) {
          errorMessage = "This order has been converted to GRN and cannot be modified";
        } else if (error.message.includes("Only deletion is allowed for cancelled orders")) {
          errorMessage = "Cancelled orders can only be deleted";
        } else if (error.message.includes("not allowed")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Action Not Allowed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: (error: any) => {
      // Parse backend validation error messages
      let errorMessage = "Failed to delete purchase order";
      if (error.message) {
        if (error.message.includes("Cannot modify orders that have been converted to GRN")) {
          errorMessage = "This order has been converted to GRN and cannot be deleted";
        } else if (error.message.includes("not allowed")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Delete Not Allowed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create GRN mutation
  const createGRNMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/grns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create GRN",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: "",
      orderDate: new Date().toISOString().split('T')[0],
      notes: "",
      items: []
    });
    setCurrentItem({
      categoryId: 0,
      productId: 0,
      quantityBags: 0,
      weightKg: 0,
      estimatedValue: 0,
      remarks: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0) {
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
    setCurrentItem({
      categoryId: 0,
      productId: 0,
      quantityBags: 0,
      weightKg: 0,
      estimatedValue: 0,
      remarks: ""
    });
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle status filtering with display transformation
    let matchesStatus = statusFilter === "all";
    if (!matchesStatus) {
      if (statusFilter === "Order Received") {
        // Show both "Order Received" and converted orders when filtering by "Order Received"
        matchesStatus = order.status === "Order Received" || order.converted_to_grn;
      } else {
        matchesStatus = order.status === statusFilter;
      }
    }
    
    const matchesSupplier = supplierFilter === "all" || order.supplier_id.toString() === supplierFilter;
    
    // GRN conversion filter
    const matchesGrnFilter = grnFilter === "all" || 
                            (grnFilter === "yes" && order.converted_to_grn) ||
                            (grnFilter === "no" && !order.converted_to_grn);
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter !== "all") {
      const orderDate = new Date(order.orderDate);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (dateFilter) {
        case "today":
          matchesDate = orderDate.toDateString() === today.toDateString();
          break;
        case "yesterday":
          matchesDate = orderDate.toDateString() === yesterday.toDateString();
          break;
        case "lastWeek":
          matchesDate = orderDate >= lastWeek;
          break;
        case "lastMonth":
          matchesDate = orderDate >= lastMonth;
          break;
        case "custom":
          if (customDateFrom && customDateTo) {
            const fromDate = new Date(customDateFrom);
            const toDate = new Date(customDateTo);
            matchesDate = orderDate >= fromDate && orderDate <= toDate;
          }
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSupplier && matchesGrnFilter && matchesDate;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case "po_number":
        aValue = a.po_number;
        bValue = b.po_number;
        break;
      case "supplierName":
        aValue = a.supplierName || "";
        bValue = b.supplierName || "";
        break;
      case "orderDate":
        aValue = new Date(a.orderDate);
        bValue = new Date(b.orderDate);
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        aValue = a.po_number;
        bValue = b.po_number;
    }
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + rowsPerPage);

  const toggleRowExpansion = (orderId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleSort = (column: "po_number" | "supplierName" | "orderDate" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateMutation.mutate({
      id: orderId,
      updates: { status: newStatus }
    });
  };

  const handleDelete = (orderId: number) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      deleteMutation.mutate(orderId);
    }
  };

  const handleConvertToGRN = async (order: PurchaseOrder) => {
    try {
      // Fetch the purchase order items
      const response = await apiRequest('GET', `/api/purchase-orders/${order.id}`);
      const orderDetails = await response.json(); // Parse JSON from Response object
      
      // Validate items exist
      if (!orderDetails.items || !Array.isArray(orderDetails.items) || orderDetails.items.length === 0) {
        toast({
          title: "Warning", 
          description: "No items found in this purchase order",
          variant: "destructive",
        });
        return;
      }
      
      // Map purchase order items to GRN format
      const grnItems = orderDetails.items.map((item: any) => ({
        categoryId: item.category_id || 0,
        productId: item.product_id || 0, 
        quantityBags: item.quantity_bags || 0,
        weightKg: parseFloat(item.weight_kg) || 0,
        remarks: item.remarks || `From PO: ${order.po_number}`,
      }));

      // Set initial data for GRN modal
      setGrnInitialData({
        supplierId: order.supplier_id,
        items: grnItems,
      });

      setConvertOrder(order);
      setIsGRNModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load purchase order details",
        variant: "destructive",
      });
    }
  };

  const handleGRNSubmit = async (grnData: any) => {
    try {
      // Create the GRN
      await createGRNMutation.mutateAsync(grnData);
      
      // Update purchase order converted_to_grn flag and status
      if (convertOrder) {
        await updateMutation.mutateAsync({
          id: convertOrder.id,
          updates: { 
            converted_to_grn: true,
            status: "Order Received"
          }
        });
      }
      
      // Close modal and reset state
      setIsGRNModalOpen(false);
      setConvertOrder(null);
      setGrnInitialData(null);
      
      toast({
        title: "Success",
        description: "Purchase order converted to GRN successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert purchase order to GRN",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (order: PurchaseOrder) => {
    try {
      // Fetch full order details including items
      const response = await apiRequest('GET', `/api/purchase-orders/${order.id}`);
      const fullOrder = await response.json();
      
      setSelectedOrder(fullOrder);
      setEditFormData({
        supplierId: order.supplier_id.toString(),
        orderDate: order.orderDate.split('T')[0],
        notes: order.notes || "",
        items: fullOrder.items?.map((item: any) => ({
          categoryId: item.category_id || 0,
          productId: item.product_id || 0,
          quantityBags: item.quantity_bags || 0,
          weightKg: parseFloat(item.weight_kg) || 0,
          estimatedValue: parseFloat(item.estimated_value) || 0,
          remarks: item.remarks || ""
        })) || []
      });
      setEditingItemIndex(-1);
      resetEditCurrentItem();
      setIsEditDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive",
      });
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || editFormData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      id: selectedOrder.id,
      updates: {
        supplierId: parseInt(editFormData.supplierId),
        orderDate: editFormData.orderDate,
        notes: editFormData.notes,
        items: editFormData.items
      }
    });
    setIsEditDialogOpen(false);
  };

  // Edit form item management functions
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
    if (!editCurrentItem.categoryId || !editCurrentItem.productId || !editCurrentItem.quantityBags || !editCurrentItem.weightKg) {
      toast({
        title: "Error",
        description: "Please fill in all required item fields",
        variant: "destructive",
      });
      return;
    }

    if (editingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...editFormData.items];
      updatedItems[editingItemIndex] = editCurrentItem;
      setEditFormData({...editFormData, items: updatedItems});
      setEditingItemIndex(-1);
    } else {
      // Add new item
      setEditFormData({...editFormData, items: [...editFormData.items, editCurrentItem]});
    }
    
    resetEditCurrentItem();
  };

  const editItem = (index: number) => {
    const item = editFormData.items[index];
    setEditCurrentItem(item);
    setEditingItemIndex(index);
  };

  const removeEditItem = (index: number) => {
    const updatedItems = editFormData.items.filter((_, i) => i !== index);
    setEditFormData({...editFormData, items: updatedItems});
    if (editingItemIndex === index) {
      resetEditCurrentItem();
    }
  };

  const filteredProducts = products.filter(product => 
    currentItem.categoryId === 0 || product.category_id === currentItem.categoryId
  );

  const filteredEditProducts = products.filter(product => 
    editCurrentItem.categoryId === 0 || product.category_id === editCurrentItem.categoryId
  );

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.product_name || "Unknown Product";
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || "Unknown Supplier";
  };

  const totalOrders = orders.length;
  const ordersConvertedToGRN = orders.filter(order => order.converted_to_grn).length;
  const pendingOrders = orders.filter(order => order.status === "Order Placed").length;
  const receivedOrders = orders.filter(order => order.status === "Order Received").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-600">Manage your purchase orders from suppliers</p>
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
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={formData.supplierId} onValueChange={(value) => setFormData({...formData, supplierId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
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
                      value={currentItem.quantityBags === 0 ? "" : currentItem.quantityBags}
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
                      value={currentItem.weightKg === 0 ? "" : currentItem.weightKg}
                      onChange={(e) => setCurrentItem({...currentItem, weightKg: parseFloat(e.target.value) || 0})}
                      min="0.01"
                      placeholder="Enter weight in KG"
                    />
                  </div>
                  <div>
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.estimatedValue === 0 ? "" : currentItem.estimatedValue}
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
                            {item.quantityBags} bags, {item.weightKg} kg
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
                  {createMutation.isPending ? "Creating..." : "Create Purchase Order"}
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
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Orders converted to GRN</p>
                <p className="text-2xl font-bold">{ordersConvertedToGRN}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received Orders</p>
                <p className="text-2xl font-bold">{receivedOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select value={grnFilter} onValueChange={setGrnFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Converted to GRN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="yes">Converted to GRN</SelectItem>
              <SelectItem value="no">Not Converted</SelectItem>
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
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
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
                      id="poNumber"
                      checked={visibleColumns.poNumber}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, poNumber: !!checked}))}
                    />
                    <Label htmlFor="poNumber" className="text-sm">PO Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="supplier"
                      checked={visibleColumns.supplier}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, supplier: !!checked}))}
                    />
                    <Label htmlFor="supplier" className="text-sm">Supplier</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="orderDate"
                      checked={visibleColumns.orderDate}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, orderDate: !!checked}))}
                    />
                    <Label htmlFor="orderDate" className="text-sm">Order Date</Label>
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
                      id="convertedToGRN"
                      checked={visibleColumns.convertedToGRN}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, convertedToGRN: !!checked}))}
                    />
                    <Label htmlFor="convertedToGRN" className="text-sm">Converted to GRN</Label>
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
        
        {dateFilter === "custom" && (
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="customDateFrom">From Date</Label>
              <Input
                id="customDateFrom"
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="customDateTo">To Date</Label>
              <Input
                id="customDateTo"
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchase orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.poNumber && (
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("po_number")}
                    >
                      PO Number {sortBy === "po_number" && (sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />)}
                    </TableHead>
                  )}
                  {visibleColumns.supplier && (
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("supplierName")}
                    >
                      Supplier {sortBy === "supplierName" && (sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />)}
                    </TableHead>
                  )}
                  {visibleColumns.orderDate && (
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("orderDate")}
                    >
                      Order Date {sortBy === "orderDate" && (sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />)}
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("status")}
                    >
                      Status {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />)}
                    </TableHead>
                  )}
                  {visibleColumns.convertedToGRN && (
                    <TableHead>Converted to GRN</TableHead>
                  )}
                  {visibleColumns.items && (
                    <TableHead>Items</TableHead>
                  )}
                  {visibleColumns.totalValue && (
                    <TableHead>Total Value</TableHead>
                  )}
                  {visibleColumns.notes && (
                    <TableHead>Notes</TableHead>
                  )}
                  {visibleColumns.createdAt && (
                    <TableHead>Created At</TableHead>
                  )}
                  {visibleColumns.createdBy && (
                    <TableHead>Created By</TableHead>
                  )}
                  {visibleColumns.updatedAt && (
                    <TableHead>Updated At</TableHead>
                  )}
                  {visibleColumns.updatedBy && (
                    <TableHead>Updated By</TableHead>
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <>
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleRowExpansion(order.id)}
                    >
                      {visibleColumns.poNumber && (
                        <TableCell className="font-medium">{order.po_number}</TableCell>
                      )}
                      {visibleColumns.supplier && (
                        <TableCell>{order.supplierName}</TableCell>
                      )}
                      {visibleColumns.orderDate && (
                        <TableCell>{format(new Date(order.orderDate), "MMM dd, yyyy")}</TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>{getStatusBadge(getDisplayStatus(order.status))}</TableCell>
                      )}
                      {visibleColumns.convertedToGRN && (
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.converted_to_grn 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {order.converted_to_grn ? "Yes" : "No"}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.items && (
                        <TableCell>{order.total_items}</TableCell>
                      )}
                      {visibleColumns.totalValue && (
                        <TableCell>₹{parseFloat(order.total_value || 0).toFixed(2)}</TableCell>
                      )}
                      {visibleColumns.notes && (
                        <TableCell className="max-w-xs truncate">{order.notes || "-"}</TableCell>
                      )}
                      {visibleColumns.createdAt && (
                        <TableCell>{format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}</TableCell>
                      )}
                      {visibleColumns.createdBy && (
                        <TableCell>User {order.createdBy}</TableCell>
                      )}
                      {visibleColumns.updatedAt && (
                        <TableCell>{format(new Date(order.updatedAt), "MMM dd, yyyy HH:mm")}</TableCell>
                      )}
                      {visibleColumns.updatedBy && (
                        <TableCell>User {order.updatedBy}</TableCell>
                      )}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const availableActions = getAvailableActions(order);
                          
                          if (availableActions.length === 0) {
                            return (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled 
                                className="opacity-50 cursor-not-allowed"
                                title="No actions available for this order"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            );
                          }
                          
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {availableActions.includes("mark_received") && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "Order Received")}>
                                    Mark as Received
                                  </DropdownMenuItem>
                                )}
                                {availableActions.includes("mark_cancelled") && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "Order Cancelled")}>
                                    Mark as Cancelled
                                  </DropdownMenuItem>
                                )}
                                {availableActions.includes("convert_to_grn") && (
                                  <DropdownMenuItem onClick={() => handleConvertToGRN(order)}>
                                    Convert to GRN
                                  </DropdownMenuItem>
                                )}
                                {availableActions.includes("edit") && (
                                  <DropdownMenuItem onClick={() => handleEdit(order)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {availableActions.includes("delete") && (
                                  <DropdownMenuItem onClick={() => handleDelete(order.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(order.id) && (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="p-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <strong>PO Number:</strong> {order.po_number}
                              </div>
                              <div>
                                <strong>Order Date:</strong> {format(new Date(order.orderDate), "MMM dd, yyyy")}
                              </div>
                              <div>
                                <strong>Supplier:</strong> {order.supplierName}
                              </div>
                              <div>
                                <strong>Status:</strong> {order.status}
                              </div>
                              <div>
                                <strong>Created:</strong> {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
                              </div>
                              <div>
                                <strong>Created By:</strong> User {order.createdBy}
                              </div>
                              <div>
                                <strong>Total Items:</strong> {order.total_items}
                              </div>
                              <div>
                                <strong>Total Value:</strong> ₹{parseFloat(order.total_value || 0).toFixed(2)}
                              </div>
                            </div>
                            {order.notes && (
                              <div>
                                <strong>Notes:</strong> {order.notes}
                              </div>
                            )}
                            
                            {/* Items Table */}
                            {order.items && order.items.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-2">Purchase Order Items</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Category</TableHead>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Quantity (Bags)</TableHead>
                                      <TableHead>Weight (KG)</TableHead>
                                      <TableHead>Estimated Value</TableHead>
                                      <TableHead>Remarks</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.items.map((item, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{item.categoryName}</TableCell>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>{item.quantityBags}</TableCell>
                                        <TableCell>{item.weightKg}</TableCell>
                                        <TableCell>₹{parseFloat(item.estimatedValue || 0).toFixed(2)}</TableCell>
                                        <TableCell>{item.remarks || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedOrders.length} of {sortedOrders.length} Purchase Orders
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

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PO Number</Label>
                  <p className="font-medium">{selectedOrder.po_number}</p>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <p className="font-medium">{selectedOrder.supplierName}</p>
                </div>
                <div>
                  <Label>Order Date</Label>
                  <p>{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label>Total Items</Label>
                  <p>{selectedOrder.total_items}</p>
                </div>
                <div>
                  <Label>Total Value</Label>
                  <p>₹{parseFloat(selectedOrder.total_value || 0).toFixed(2)}</p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
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

      {/* Edit Purchase Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PO Number</Label>
                  <p className="font-medium text-gray-900">{selectedOrder.po_number}</p>
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={editFormData.supplierId} onValueChange={(value) => setEditFormData({...editFormData, supplierId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    type="date"
                    value={editFormData.orderDate}
                    onChange={(e) => setEditFormData({...editFormData, orderDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Manage Items</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={editCurrentItem.categoryId === 0 ? "" : editCurrentItem.categoryId.toString()} onValueChange={(value) => setEditCurrentItem({...editCurrentItem, categoryId: parseInt(value), productId: 0})}>
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
                    <Select value={editCurrentItem.productId === 0 ? "" : editCurrentItem.productId.toString()} onValueChange={(value) => setEditCurrentItem({...editCurrentItem, productId: parseInt(value)})}>
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
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editCurrentItem.estimatedValue || ""}
                      onChange={(e) => setEditCurrentItem({...editCurrentItem, estimatedValue: parseFloat(e.target.value) || 0})}
                      min="0"
                      placeholder="Enter estimated value"
                    />
                  </div>
                  <div>
                    <Label>Remarks</Label>
                    <Input
                      value={editCurrentItem.remarks}
                      onChange={(e) => setEditCurrentItem({...editCurrentItem, remarks: e.target.value})}
                      placeholder="Enter remarks..."
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="button" onClick={addEditItem} className="flex-1">
                    {editingItemIndex >= 0 ? "Update Item" : "Add Item"}
                  </Button>
                  {editingItemIndex >= 0 && (
                    <Button type="button" variant="outline" onClick={resetEditCurrentItem} className="flex-1">
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
                    No items added yet. Add items above to update the order.
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || editFormData.items.length === 0}>
                  {updateMutation.isPending ? "Updating..." : "Update Purchase Order"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* GRN Modal for conversion */}
      <GRNModal 
        open={isGRNModalOpen}
        onOpenChange={setIsGRNModalOpen}
        onSubmit={handleGRNSubmit}
        isLoading={createGRNMutation.isPending}
        initialData={grnInitialData}
      />
    </div>
  );
}