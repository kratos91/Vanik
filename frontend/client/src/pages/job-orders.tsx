import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";
import { Search, Plus, Edit2, Trash2, CalendarDays, TrendingUp, FileText, CheckCircle, Clock, AlertCircle, Settings, RotateCcw } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface JobOrder {
  id: number;
  jo_number: string;
  processor_id: number;
  processorName: string;
  orderDate: string;
  status: string;
  total_items: number;
  estimated_value: string | number; // Backend returns string from DECIMAL field
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

interface Processor {
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
  { value: "In-Progress", label: "In-Progress", color: "bg-yellow-100 text-yellow-800" },
  { value: "Sent for processing", label: "Sent for Processing", color: "bg-blue-100 text-blue-800" },
  { value: "Received", label: "Received", color: "bg-green-100 text-green-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function JobOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    joNumber: true,
    processor: true,
    orderDate: true,
    status: true,
    items: true,
    estimatedValue: true,
    notes: false,
    createdAt: false,
    createdBy: false,
    updatedAt: false,
    updatedBy: false,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<JobOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    processorId: "",
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
      await queryClient.invalidateQueries({ queryKey: ["/api/job-orders"] });
      toast({
        title: "Refreshed",
        description: "Job orders data has been updated",
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
  const ordersQuery = useRetryableQuery<JobOrder[]>({
    queryKey: ["/api/job-orders"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const processorsQuery = useRetryableQuery<Processor[]>({
    queryKey: ["/api/processors"],
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
  const orders = ordersQuery.data?.orders || [];
  const processors = processorsQuery.data?.processors || [];
  const categories = categoriesQuery.data?.categories || [];
  const products = productsQuery.data?.products || [];
  const isLoading = ordersQuery.isLoading;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/job-orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-orders"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Job order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      processorId: "",
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
    if (!formData.processorId || formData.items.length === 0) {
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
    const matchesSearch = order.jo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.processorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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

  const getProcessorName = (processorId: number) => {
    const processor = processors.find(p => p.id === processorId);
    return processor?.name || "Unknown Processor";
  };

  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, order) => sum + (parseFloat(order.estimated_value) || 0), 0);
  const inProgressOrders = orders.filter(order => order.status === "In-Progress").length;
  const sentForProcessingOrders = orders.filter(order => order.status === "Sent for processing").length;
  const receivedOrders = orders.filter(order => order.status === "Received").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Job Orders</h1>
            <p className="text-sm text-gray-600">Manage work orders sent to external processors</p>
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
              Create Job Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="processor">Processor *</Label>
                  <Select value={formData.processorId} onValueChange={(value) => setFormData({...formData, processorId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select processor" />
                    </SelectTrigger>
                    <SelectContent>
                      {processors.map((processor) => (
                        <SelectItem key={processor.id} value={processor.id.toString()}>
                          {processor.name}
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
                  placeholder="Enter processing instructions or additional notes..."
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Add Items</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={currentItem.categoryId.toString()} onValueChange={(value) => setCurrentItem({...currentItem, categoryId: parseInt(value), productId: 0})}>
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
                    <Select value={currentItem.productId.toString()} onValueChange={(value) => setCurrentItem({...currentItem, productId: parseInt(value)})}>
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
                    <Label>Quantity (Bags) *</Label>
                    <Input
                      type="number"
                      value={currentItem.quantityBags}
                      onChange={(e) => setCurrentItem({...currentItem, quantityBags: parseInt(e.target.value) || 0})}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Weight (KG) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.weightKg}
                      onChange={(e) => setCurrentItem({...currentItem, weightKg: parseFloat(e.target.value) || 0})}
                      min="0.01"
                    />
                  </div>
                  <div>
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.estimatedValue}
                      onChange={(e) => setCurrentItem({...currentItem, estimatedValue: parseFloat(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Remarks</Label>
                    <Input
                      value={currentItem.remarks}
                      onChange={(e) => setCurrentItem({...currentItem, remarks: e.target.value})}
                      placeholder="Processing instructions..."
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
                  {createMutation.isPending ? "Creating..." : "Create Job Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{inProgressOrders}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent for Processing</p>
                <p className="text-2xl font-bold">{sentForProcessingOrders}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold">{receivedOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by JO number or processor..."
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
                    id="joNumber"
                    checked={visibleColumns.joNumber}
                    onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, joNumber: !!checked}))}
                  />
                  <Label htmlFor="joNumber" className="text-sm">JO Number</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="processor"
                    checked={visibleColumns.processor}
                    onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, processor: !!checked}))}
                  />
                  <Label htmlFor="processor" className="text-sm">Processor</Label>
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
                    id="items"
                    checked={visibleColumns.items}
                    onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, items: !!checked}))}
                  />
                  <Label htmlFor="items" className="text-sm">Items</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estimatedValue"
                    checked={visibleColumns.estimatedValue}
                    onCheckedChange={(checked) => setVisibleColumns(prev => ({...prev, estimatedValue: !!checked}))}
                  />
                  <Label htmlFor="estimatedValue" className="text-sm">Estimated Value</Label>
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

      {/* Orders Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No job orders found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {visibleColumns.joNumber && <th className="text-left p-4">JO Number</th>}
                      {visibleColumns.processor && <th className="text-left p-4">Processor</th>}
                      {visibleColumns.orderDate && <th className="text-left p-4">Order Date</th>}
                      {visibleColumns.status && <th className="text-left p-4">Status</th>}
                      {visibleColumns.items && <th className="text-left p-4">Items</th>}
                      {visibleColumns.estimatedValue && <th className="text-left p-4">Estimated Value</th>}
                      {visibleColumns.notes && <th className="text-left p-4">Notes</th>}
                      {visibleColumns.createdAt && <th className="text-left p-4">Created At</th>}
                      {visibleColumns.createdBy && <th className="text-left p-4">Created By</th>}
                      {visibleColumns.updatedAt && <th className="text-left p-4">Updated At</th>}
                      {visibleColumns.updatedBy && <th className="text-left p-4">Updated By</th>}
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        {visibleColumns.joNumber && <td className="p-4 font-medium">{order.jo_number}</td>}
                        {visibleColumns.processor && <td className="p-4">{order.processorName}</td>}
                        {visibleColumns.orderDate && <td className="p-4">{new Date(order.orderDate).toLocaleDateString()}</td>}
                        {visibleColumns.status && <td className="p-4">{getStatusBadge(order.status)}</td>}
                        {visibleColumns.items && <td className="p-4">{order.total_items}</td>}
                        {visibleColumns.estimatedValue && <td className="p-4">₹{parseFloat(order.estimated_value || 0).toFixed(2)}</td>}
                        {visibleColumns.notes && <td className="p-4">{order.notes || '-'}</td>}
                        {visibleColumns.createdAt && <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>}
                        {visibleColumns.createdBy && <td className="p-4">User {order.createdBy}</td>}
                        {visibleColumns.updatedAt && <td className="p-4">{new Date(order.updatedAt).toLocaleDateString()}</td>}
                        {visibleColumns.updatedBy && <td className="p-4">User {order.updatedBy}</td>}
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedOrders.length} of {filteredOrders.length} Job Orders
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

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>JO Number</Label>
                  <p className="font-medium">{selectedOrder.jo_number}</p>
                </div>
                <div>
                  <Label>Processor</Label>
                  <p className="font-medium">{selectedOrder.processorName}</p>
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
                  <Label>Estimated Value</Label>
                  <p>₹{parseFloat(selectedOrder.estimated_value || 0).toFixed(2)}</p>
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
    </div>
  );
}