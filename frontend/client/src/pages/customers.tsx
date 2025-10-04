import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError } from "@/components/LoadingStates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Local type definitions for Customer
type Customer = {
  id: number;
  name: string;
  code?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type InsertCustomer = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

// Validation schema for customer
const insertCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});

import { useToast } from "@/hooks/use-toast";

// Function to extract PAN from GST number
const extractPanFromGst = (gstNumber: string): string => {
  // Remove all spaces and convert to uppercase
  const cleanGst = gstNumber.replace(/\s+/g, '').toUpperCase();
  
  // Check if it's a valid 15-digit GSTIN format
  if (cleanGst.length === 15 && /^[0-9A-Z]{15}$/.test(cleanGst)) {
    // Extract PAN from positions 3-12 (0-indexed: positions 2-11)
    return cleanGst.substring(2, 12);
  }
  
  return '';
};

const customerColumns: DataTableColumn[] = [
  { key: "id", label: "ID", type: "number", sortable: true },
  { key: "name", label: "Customer Name", type: "text", searchable: true, sortable: true },
  { key: "contactPerson", label: "Contact Person", type: "text", searchable: true },
  { key: "phone", label: "Phone", type: "text", searchable: true },
  { key: "email", label: "Email", type: "text", searchable: true },
  { key: "gstNumber", label: "GST Number", type: "text", searchable: true },
  { key: "panNumber", label: "PAN Number", type: "text", searchable: true },
  { 
    key: "createdAt", 
    label: "Created", 
    type: "date", 
    sortable: true,
    format: (value) => {
      try {
        if (!value) return "N/A";
        const cleanValue = value.replace(/Z$/, '');
        const date = new Date(cleanValue);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
      } catch {
        return "N/A";
      }
    }
  },
  { 
    key: "createdBy", 
    label: "Created By", 
    type: "text", 
    sortable: true,
    format: (value) => value ? `User ${value}` : "N/A"
  },
  { 
    key: "updatedAt", 
    label: "Updated", 
    type: "date", 
    sortable: true,
    format: (value) => {
      try {
        if (!value) return "N/A";
        const cleanValue = value.replace(/Z$/, '');
        const date = new Date(cleanValue);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
      } catch {
        return "N/A";
      }
    }
  },
  { 
    key: "updatedBy", 
    label: "Updated By", 
    type: "text", 
    sortable: true,
    format: (value) => value ? `User ${value}` : "N/A"
  }
];

export default function Customers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      code: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      panNumber: "",
      isActive: true,
    },
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCustomer) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create customer: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCustomer> }) =>
      apiRequest("PUT", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update customer: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete customer: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertCustomer) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset({
        name: customer.name,
        code: customer.code || "",
        contactPerson: customer.contactPerson || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        gstNumber: customer.gstNumber || "",
        panNumber: customer.panNumber || "",
        isActive: customer.isActive !== false,
      });
    } else {
      setEditingCustomer(null);
      form.reset({
        name: "",
        code: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        panNumber: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => openDialog();
  const handleEdit = (customer: Customer) => openDialog(customer);
  const handleDelete = (customer: Customer) => deleteMutation.mutate(customer.id);

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Users className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer directory</p>
        </div>
      </div>

      <DataTable
        title="Customers"
        data={customers?.customers || []}
        columns={customerColumns}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search customers by name, contact, phone, or email..."
        enablePagination={true}
        defaultRowsPerPage={10}
        hideHeader={true}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter complete address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter GST number" 
                        {...field} 
                        onChange={(e) => {
                          const gstValue = e.target.value;
                          field.onChange(gstValue);
                          
                          // Auto-fill PAN if GST is provided and current PAN is empty
                          if (gstValue && !form.getValues('panNumber')) {
                            const extractedPan = extractPanFromGst(gstValue);
                            if (extractedPan) {
                              form.setValue('panNumber', extractedPan);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PAN number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4 border-t">
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
                    : editingCustomer
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}