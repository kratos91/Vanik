import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { masterDataApi } from "@/lib/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const grnItemSchema = z.object({
  categoryId: z.number().min(1, "Category is required"),
  productId: z.number().min(1, "Product is required"),
  quantityBags: z.number().min(1, "Quantity is required"),
  weightKg: z.number().min(0.1, "Weight is required"),
  remarks: z.string().optional(),
});

const grnSchema = z.object({
  receiptDate: z.string().min(1, "Receipt date is required"),
  supplierId: z.number().min(1, "Supplier is required"),
  locationId: z.number().min(1, "Location is required"),
  items: z.array(grnItemSchema).min(1, "At least one item is required"),
});

type GRNForm = z.infer<typeof grnSchema>;

interface GRNModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
  initialData?: {
    supplierId?: number;
    items?: Array<{
      categoryId: number;
      productId: number;
      quantityBags: number;
      weightKg: number;
      remarks?: string;
    }>;
  };
}

export default function GRNModal({ open, onOpenChange, onSubmit, isLoading, initialData }: GRNModalProps) {
  const { toast } = useToast();

  const { data: suppliersData } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: open,
  });

  const { data: locationsData } = useQuery({
    queryKey: ["/api/locations"],
    enabled: open,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    enabled: open,
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products"],
    enabled: open,
  });

  // Extract arrays from response objects
  const suppliers = suppliersData?.suppliers || [];
  const locations = locationsData?.locations || [];
  const categories = categoriesData?.categories || [];
  const products = productsData?.products || [];

  const getDefaultValues = () => {
    if (initialData) {
      return {
        receiptDate: new Date().toISOString().split('T')[0],
        supplierId: initialData.supplierId || 0,
        locationId: 0,
        items: initialData.items && initialData.items.length > 0 
          ? initialData.items 
          : [
              {
                categoryId: 0,
                productId: 0,
                quantityBags: 0,
                weightKg: 0,
                remarks: "",
              }
            ],
      };
    }
    
    return {
      receiptDate: new Date().toISOString().split('T')[0],
      supplierId: 0,
      locationId: 0,
      items: [
        {
          categoryId: 0,
          productId: 0,
          quantityBags: 0,
          weightKg: 0,
          remarks: "",
        }
      ],
    };
  };

  const form = useForm<GRNForm>({
    resolver: zodResolver(grnSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when modal opens or initial data changes
  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const addItem = () => {
    append({
      categoryId: 0,
      productId: 0,
      quantityBags: 0,
      weightKg: 0,
      remarks: "",
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: "Cannot remove item",
        description: "At least one item is required",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (data: GRNForm) => {
    const formattedData = {
      grn: {
        receiptDate: data.receiptDate,
        supplierId: data.supplierId,
        locationId: data.locationId,
      },
      items: data.items,
    };

    onSubmit?.(formattedData);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "";
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    return product ? product.product_name : "";
  };

  const getProductsForCategory = (categoryId: number) => {
    return products.filter((p: any) => p.category_id === categoryId) || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            New Goods Receipt Note (GRN)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* GRN Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="receiptDate">Receipt Date</Label>
              <Input
                id="receiptDate"
                type="date"
                {...form.register("receiptDate")}
                className="form-input"
              />
              {form.formState.errors.receiptDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.receiptDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <Select
                value={form.watch("supplierId")?.toString() || ""}
                onValueChange={(value) => form.setValue("supplierId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.supplierId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.supplierId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationId">Warehouse Location</Label>
              <Select
                value={form.watch("locationId")?.toString() || ""}
                onValueChange={(value) => form.setValue("locationId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.locationId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.locationId.message}
                </p>
              )}
            </div>
          </div>

          {/* GRN Items Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={form.watch(`items.${index}.categoryId`)?.toString() || ""}
                      onValueChange={(value) => {
                        const categoryId = parseInt(value);
                        form.setValue(`items.${index}.categoryId`, categoryId);
                        // Reset product when category changes
                        form.setValue(`items.${index}.productId`, 0);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.items?.[index]?.categoryId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.categoryId?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={form.watch(`items.${index}.productId`)?.toString() || ""}
                      onValueChange={(value) => form.setValue(`items.${index}.productId`, parseInt(value))}
                      disabled={!form.watch(`items.${index}.categoryId`)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {getProductsForCategory(form.watch(`items.${index}.categoryId`)).map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.items?.[index]?.productId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.productId?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Quantity (Bags/Rolls)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(`items.${index}.quantityBags`, { valueAsNumber: true })}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                    {form.formState.errors.items?.[index]?.quantityBags && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.quantityBags?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Weight (KGs)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      {...form.register(`items.${index}.weightKg`, { valueAsNumber: true })}
                      className="h-8 text-sm"
                      placeholder="0.000"
                    />
                    {form.formState.errors.items?.[index]?.weightKg && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.weightKg?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      {...form.register(`items.${index}.remarks`)}
                      className="h-8 text-sm"
                      placeholder="Item remarks"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create GRN
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}