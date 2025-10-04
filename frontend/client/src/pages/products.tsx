import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError } from "@/components/LoadingStates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Local type definitions for Product
type Product = {
  id: string;
  product_name: string;
  category_id: number | null;
  category_name?: string;
  hsn_code: string | null;
  specification: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

type Category = {
  id: number;
  name: string;
  description: string;
};

type InsertProduct = {
  productName: string;
  categoryId: number | null;
  hsnCode: string;
  specification: string;
  isActive: boolean;
};

// Validation schema for product
const insertProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  categoryId: z.number().nullable(),
  hsnCode: z.string().optional(),
  specification: z.string().optional(),
  isActive: z.boolean().default(true),
});

const productColumns: DataTableColumn[] = [
  { key: "id", label: "ID", type: "text", sortable: true },
  { key: "product_name", label: "Product Name", type: "text", searchable: true, sortable: true },
  { key: "category_name", label: "Category", type: "text", searchable: true, sortable: true },
  { key: "hsn_code", label: "HSN Code", type: "text", searchable: true },
  { key: "specification", label: "Specification", type: "text", searchable: true },
  { key: "is_active", label: "Status", type: "boolean", sortable: true },
  { 
    key: "created_at", 
    label: "Created", 
    type: "date", 
    sortable: true,
    format: (value) => new Date(value).toLocaleDateString()
  }
];

export default function Products() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      productName: "",
      categoryId: null,
      hsnCode: "",
      specification: "",
      isActive: true,
    },
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Extract array from response object
  const products = productsData?.products || [];

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Extract array from response object
  const categories = categoriesData?.categories || [];

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create product: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) =>
      apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update product: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete product: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.reset({
        productName: product.product_name,
        categoryId: product.category_id,
        hsnCode: product.hsn_code || "",
        specification: product.specification || "",
        isActive: product.is_active,
      });
    } else {
      setEditingProduct(null);
      form.reset({
        productName: "",
        categoryId: null,
        hsnCode: "",
        specification: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => openDialog();
  const handleEdit = (product: Product) => openDialog(product);
  const handleDelete = (product: Product) => deleteMutation.mutate(product.id);

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Package className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog with categories, HSN codes, and specifications</p>
        </div>
      </div>

      <DataTable
        title="Products"
        data={products as Product[] || []}
        columns={productColumns}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search products by name, category, HSN code or specification..."
        enablePagination={true}
        defaultRowsPerPage={10}
        hideHeader={true}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories as Category[]).map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter HSN code (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specification</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product specifications (optional)" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Create Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}