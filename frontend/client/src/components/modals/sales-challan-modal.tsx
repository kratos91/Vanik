import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SalesChallanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
  initialData?: {
    customerId?: number;
    notes?: string;
    items?: Array<{
      categoryId: number;
      productId: number;
      quantityBags: number;
      weightKg: number;
      estimatedValue: number;
      remarks?: string;
    }>;
  };
}

export default function SalesChallanModal({ open, onOpenChange, onSubmit, isLoading, initialData }: SalesChallanModalProps) {
  const { toast } = useToast();

  // Load required data when modal opens
  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    enabled: open,
  });

  // Form state
  const [formData, setFormData] = useState({
    challanDate: new Date().toISOString().split('T')[0],
    customerId: "",
    notes: "",
    items: [] as Array<{
      categoryId: number;
      productId: number;
      quantityBags: number;
      weightKg: number;
      estimatedValue: number;
      remarks: string;
    }>
  });

  // Reset form when modal opens or initial data changes
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        challanDate: new Date().toISOString().split('T')[0],
        customerId: initialData.customerId?.toString() || "",
        notes: initialData.notes || "",
        items: initialData.items || []
      });
    } else if (open) {
      // Reset to empty form
      setFormData({
        challanDate: new Date().toISOString().split('T')[0],
        customerId: "",
        notes: "",
        items: []
      });
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customerId) {
      toast({
        title: "Error",
        description: "Customer is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: "Error", 
        description: "At least one item is required",
        variant: "destructive",
      });
      return;
    }

    // Validate all items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.categoryId || !item.productId || !item.quantityBags || !item.weightKg) {
        toast({
          title: "Error",
          description: `Item ${i + 1}: All fields are required`,
          variant: "destructive",
        });
        return;
      }
    }

    const submitData = {
      challanDate: formData.challanDate,
      customerId: parseInt(formData.customerId),
      notes: formData.notes,
      items: formData.items.map(item => ({
        categoryId: item.categoryId,
        productId: item.productId,
        quantityBags: item.quantityBags,
        weightKg: item.weightKg,
        estimatedValue: item.estimatedValue,
        remarks: item.remarks || ""
      }))
    };

    if (onSubmit) {
      onSubmit(submitData);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        categoryId: 0,
        productId: 0,
        quantityBags: 0,
        weightKg: 0,
        estimatedValue: 0,
        remarks: ""
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Filter products by category
  const getFilteredProducts = (categoryId: number) => {
    if (!products || !categoryId) return [];
    return products.filter((product: any) => product.category_id === categoryId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <DialogTitle>New Sales Challan</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Fields - 3 columns like GRN */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="challanDate">Challan Date</Label>
              <Input
                id="challanDate"
                type="date"
                value={formData.challanDate}
                onChange={(e) => setFormData({...formData, challanDate: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => setFormData({...formData, customerId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add notes..."
              />
            </div>
          </div>

          {/* Items Section - Table format like GRN */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <Button type="button" onClick={addItem} size="sm" className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Headers */}
                <div className="grid grid-cols-15 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                  <div className="col-span-3">Category</div>
                  <div className="col-span-3">Product</div>
                  <div className="col-span-2">Quantity (Bags/Rolls)</div>
                  <div className="col-span-2">Weight (KGs)</div>
                  <div className="col-span-2">Estimated Value</div>
                  <div className="col-span-2">Remarks</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items Rows */}
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-15 gap-2 items-center py-2 border-b border-gray-100">
                    {/* Category */}
                    <div className="col-span-3">
                      <Select 
                        value={item.categoryId ? item.categoryId.toString() : ""} 
                        onValueChange={(value) => {
                          updateItem(index, 'categoryId', parseInt(value));
                          updateItem(index, 'productId', 0); // Reset product when category changes
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Product */}
                    <div className="col-span-3">
                      <Select 
                        value={item.productId ? item.productId.toString() : ""} 
                        onValueChange={(value) => updateItem(index, 'productId', parseInt(value))}
                        disabled={!item.categoryId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredProducts(item.categoryId).map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.product_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantityBags || ""}
                        onChange={(e) => updateItem(index, 'quantityBags', parseInt(e.target.value) || 0)}
                        min="1"
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Weight */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.weightKg || ""}
                        onChange={(e) => updateItem(index, 'weightKg', parseFloat(e.target.value) || 0)}
                        min="0.01"
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Estimated Value */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.estimatedValue || ""}
                        onChange={(e) => updateItem(index, 'estimatedValue', parseFloat(e.target.value) || 0)}
                        min="0"
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="col-span-2">
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className="h-8"
                      />
                    </div>

                    {/* Delete Button */}
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || formData.items.length === 0}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? "Creating..." : "Create Challan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}