# YarnFlow Inventory Management System - Context File

## 1. Project Overview

**YarnFlow** is a comprehensive full-stack inventory management system designed specifically for trading businesses dealing in natural and man-made yarns and fibers. The system manages large-scale inventory operations across multiple warehouse locations, providing end-to-end solutions for inventory management, sales processing, and work-in-progress (WIP) tracking.

### Core Business Purpose
- **Primary Users**: Trading businesses, warehouse managers, inventory controllers, sales teams
- **Target Industry**: Textile and fiber trading companies
- **Scale**: Multi-location operations with complex inventory tracking

### Key Problems Solved
1. **Real-time Inventory Tracking**: Maintains accurate stock levels across multiple warehouses with lot-based tracking supporting FIFO/LIFO methodologies
2. **Sales Order to Delivery Flow**: Complete order management from creation through stock reservation to challan generation and shipment
3. **Purchase Order Lifecycle**: End-to-end purchase management from order placement through GRN (Goods Receipt Note) to inventory integration
4. **WIP Processing**: Tracks goods sent to external processors and manages inbound/outbound processing workflows
5. **Audit and Compliance**: Complete audit trails for all transactions, ensuring regulatory compliance and operational transparency
6. **Master Data Management**: Centralized management of products, suppliers, customers, processors, and warehouse locations

### Business Flows
- **Procurement**: Purchase Orders → GRN → Inventory Lots → Stock Levels
- **Sales**: Sales Orders → Stock Reservation → Sales Challans → Inventory Reduction
- **Processing**: Job Orders → WIP Challans → External Processing → Return Processing
- **Reporting**: Real-time dashboards, stock alerts, transaction histories

## 2. Technology Stack

### Frontend Stack
- **Framework**: React 18.3.1 with TypeScript 5.6.3
- **Routing**: Wouter 3.3.5 (lightweight SPA routing)
- **State Management**: TanStack Query 5.60.5 (server state management)
- **UI Components**: 
  - Radix UI primitives (modals, dropdowns, tooltips, etc.)
  - Shadcn/ui component system
  - Material Design-inspired theming
- **Forms**: React Hook Form 7.55.0 with Zod 3.24.2 validation
- **Styling**: Tailwind CSS 3.4.17 with custom CSS variables
- **Icons**: Lucide React 0.453.0
- **Build Tool**: Vite 5.4.19
- **Charts**: Recharts 2.15.2

### Backend Stack
- **Runtime**: Python with Django framework
- **Database**: PostgreSQL (Neon serverless hosting)
- **Authentication**: JWT tokens with bcrypt password hashing
- **ORM**: Raw SQL with connection pooling via psycopg2
- **API Design**: RESTful endpoints with structured JSON responses
- **Session Management**: In-memory token storage (scalable to Redis/database)

### Database & Infrastructure
- **Database**: PostgreSQL with schema-based organization
- **Connection Pooling**: 2-25 connections with auto-reconnection
- **Schemas**: `core`, `master_data`, `inventory`, `sales`, `wip`
- **Hosting**: Replit environment with Neon PostgreSQL
- **Environment**: Development and production configurations

### Development Tools
- **Package Management**: npm (Node.js), pip (Python)
- **Type Checking**: TypeScript strict mode
- **Code Quality**: ESLint, Prettier configurations
- **Build Tools**: esbuild for backend, Vite for frontend
- **Database Tools**: Raw SQL migrations and queries

## 3. System & Project Architecture
- **Monorepo Structure**: Shared types and utilities
- **API-First Design**: RESTful endpoints with standardized responses
- **Component-Based Frontend**: Reusable UI components with consistent patterns
- **Controller-Based Backend**: Layered architecture with specialized controllers
- **Schema Organization**: PostgreSQL schemas for logical separation

### Project Structure (Monorepo)
```
inventory-management/
├── frontend/client/src/          # React TypeScript frontend
│   ├── components/               # Reusable UI components
│   │   ├── ui/                  # Shadcn/UI components  
│   │   ├── layout/              # Sidebar, Header
│   │   └── modals/              # Business-specific modals
│   ├── pages/                   # Route components
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utilities and configurations
│   └── App.tsx                  # Main application component
├── backend/                     # Python Django backend
│   ├── simple_server.py         # Main server with URL routing
│   ├── base_controllers.py      # Base CRUD controller classes
│   ├── specialized_controllers.py # Entity-specific controllers
│   ├── business_logic_controllers.py # Complex business logic
│   ├── database_storage.py      # Database connection manager
│   ├── auth_utils.py           # Authentication utilities
│   └── models.py files         # Django model definitions
├── server/                     # Node.js Express server (proxy)
└── package.json               # Node.js dependencies
├── pyproject.toml               # Python dependencies
└── replit.md                    # Replit preferences
```

### Build System
- **Frontend Build**: Vite with React TypeScript, outputs to `dist/`
- **Backend Execution**: Direct Python execution via `simple_server.py`
- **Development**: `npm run dev` starts both frontend (Vite) and backend (Python)
- **Production**: Separate builds for frontend static files and backend server

### Package Managers
- **Frontend**: npm with package.json dependency management
- **Backend**: pip with requirements in package.json devDependencies (Python packages)
- **Shared Types**: TypeScript interfaces shared between frontend/backend

## 4. API Documentation

### Authentication Endpoints

#### POST /api/login
**Purpose**: User authentication and token generation
**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response Body**:
```json
{
  "message": "Login successful",
  "token": "uuid-token-string",
  "user": {
    "id": 1,
    "username": "admin",
    "fullName": "System Administrator", 
    "role": "admin"
  }
}
```
**Authorization**: None (public endpoint)

#### GET /api/me
**Purpose**: Get current user information
**Request Body**: None
**Response Body**:
```json
{
  "id": 1,
  "username": "admin",
  "fullName": "System Administrator",
  "role": "admin"
}
```
**Authorization**: Bearer token required

### Master Data Endpoints

#### GET /api/customers
**Purpose**: Retrieve all customers
**Request Body**: None
**Response Body**:
```json
{
  "customers": [
    {
      "id": 1,
      "name": "ABC Textiles Ltd",
      "contactPerson": "John Doe",
      "phone": "+91-9876543210",
      "email": "contact@abctextiles.com",
      "address": "123 Business District",
      "gstNumber": "29ABCDE1234F1Z5",
      "panNumber": "ABCDE1234F",
      "isActive": true,
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ]
}
```
**Authorization**: Bearer token required

#### POST /api/customers
**Purpose**: Create new customer
**Request Body**:
```json
{
  "name": "XYZ Traders",
  "contactPerson": "Jane Smith",
  "phone": "+91-9876543211", 
  "email": "xyz@traders.com",
  "address": "456 Trade Avenue",
  "gstNumber": "29XYZAB5678G1H2",
  "panNumber": "XYZAB5678G"
}
```
**Response Body**:
```json
{
  "message": "Customer created successfully",
  "customer": { /* customer object */ }
}
```
**Authorization**: Bearer token required

#### PUT /api/customers/{id}
**Purpose**: Update existing customer
**Request Body**: Same as POST (partial updates allowed)
**Response Body**: Updated customer object
**Authorization**: Bearer token required

#### DELETE /api/customers/{id} 
**Purpose**: Soft delete customer
**Request Body**: None
**Response Body**:
```json
{
  "message": "Customer deleted successfully"
}
```
**Authorization**: Bearer token required

### Inventory Endpoints

#### GET /api/grns
**Purpose**: Retrieve all Goods Receipt Notes
**Request Body**: None
**Response Body**:
```json
{
  "grns": [
    {
      "id": 1,
      "grnNumber": "GRN/2025/JAN/01/1",
      "supplierName": "Cotton Suppliers Ltd",
      "receivedDate": "2025-01-01",
      "totalItems": 5,
      "totalValue": 25000.50,
      "status": "Received",
      "items": [
        {
          "categoryName": "Cotton",
          "productName": "Premium Cotton 40s",
          "quantityBags": 10,
          "weightKg": 500.0,
          "receivedWeight": 498.5,
          "lotNumber": "LOT/2025/01/01/1"
        }
      ]
    }
  ]
}
```
**Authorization**: Bearer token required

#### POST /api/grns
**Purpose**: Create new GRN from purchase order or standalone
**Request Body**:
```json
{
  "supplierName": "Cotton Suppliers Ltd",
  "receivedDate": "2025-01-01",
  "items": [
    {
      "categoryName": "Cotton",
      "productName": "Premium Cotton 40s", 
      "quantityBags": 10,
      "weightKg": 500.0,
      "receivedWeight": 498.5,
      "remarks": "Good quality received"
    }
  ]
}
```
**Response Body**:
```json
{
  "message": "GRN created successfully",
  "grnNumber": "GRN/2025/JAN/01/1",
  "totalValue": 25000.50
}
```
**Authorization**: Bearer token required

### Sales Endpoints

#### GET /api/sales-orders
**Purpose**: Retrieve all sales orders
**Request Body**: None  
**Response Body**:
```json
{
  "orders": [
    {
      "id": 1,
      "so_number": "SO/2025/JAN/01/1",
      "customer_id": 1,
      "customerName": "ABC Textiles Ltd",
      "orderDate": "2025-01-01",
      "status": "Order Placed",
      "total_items": 3,
      "total_value": "15000.00",
      "notes": "Rush order",
      "converted_to_challan": false,
      "items": [
        {
          "categoryName": "Cotton", 
          "productName": "Premium Cotton 40s",
          "quantityBags": 5,
          "weightKg": 250.0,
          "estimatedValue": 12500.00
        }
      ]
    }
  ]
}
```
**Authorization**: Bearer token required

#### POST /api/sales-orders
**Purpose**: Create sales order with stock validation and reservation
**Request Body**:
```json
{
  "customerId": 1,
  "orderDate": "2025-01-01",
  "notes": "Rush order",
  "items": [
    {
      "categoryId": 1,
      "productId": 1,
      "quantityBags": 5,
      "weightKg": 250.0,
      "estimatedValue": 12500.00,
      "remarks": "Premium quality required"
    }
  ]
}
```
**Response Body**:
```json
{
  "message": "Sales order created successfully",
  "so_number": "SO/2025/JAN/01/1",
  "stockAllocations": [
    {
      "productName": "Premium Cotton 40s",
      "allocatedWeight": 250.0,
      "fromLots": ["LOT/2025/01/01/1"]
    }
  ]
}
```
**Authorization**: Bearer token required

#### POST /api/sales-challans
**Purpose**: Create sales challan (can convert from sales order)
**Request Body**:
```json
{
  "customerId": 1,
  "challanDate": "2025-01-01", 
  "salesOrderId": 1,  // Optional: converts from sales order
  "items": [
    {
      "categoryId": 1,
      "productId": 1,
      "quantityBags": 5,
      "weightKg": 250.0,
      "value": 12500.00,
      "remarks": "Dispatched via truck"
    }
  ]
}
```
**Response Body**:
```json
{
  "message": "Sales challan created successfully",
  "sc_number": "SC/2025/JAN/01/1",
  "inventoryTransactions": [
    {
      "type": "OUTBOUND",
      "productName": "Premium Cotton 40s", 
      "weight": 250.0,
      "fromLots": ["LOT/2025/01/01/1"]
    }
  ]
}
```
**Authorization**: Bearer token required

### Dashboard Endpoints

#### GET /api/dashboard/stats
**Purpose**: Get dashboard statistics
**Response Body**:
```json
{
  "totalProducts": 45,
  "totalSuppliers": 12,
  "totalCustomers": 28,
  "totalStock": 15750.5,
  "pendingOrders": 8,
  "lowStockAlerts": 3
}
```

#### GET /api/dashboard/transactions  
**Purpose**: Get recent transactions for dashboard
**Response Body**:
```json
{
  "transactions": [
    {
      "id": "GRN-123",
      "type": "INBOUND",
      "entity": "goods_receipts",
      "timestamp": "2025-01-01T14:30:00Z",
      "userId": 1
    }
  ]
}
```

## 5. Database Schema

### Schema Organization
The database uses PostgreSQL schemas for logical separation:

#### Core Schema (Authentication & Users)
```sql
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table  
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Table
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    page_id INTEGER REFERENCES pages(id),
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(role_id, page_id)
);
```

#### Master Data Schema
```sql
-- Locations (Warehouses) Table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_name VARCHAR(200) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    hsn_code VARCHAR(20),
    specification TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(20),
    pan_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processors Table
CREATE TABLE processors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    processing_charges DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Inventory Schema
```sql
-- Purchase Orders Table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Order Placed',
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    converted_to_grn BOOLEAN DEFAULT FALSE,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Purchase Order Items Table  
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    product_id INTEGER REFERENCES products(id),
    quantity_bags INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    estimated_value DECIMAL(15,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goods Receipt Notes Table
CREATE TABLE goods_receipts (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    received_date DATE NOT NULL,
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Received',
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- GRN Items Table
CREATE TABLE goods_receipt_items (
    id SERIAL PRIMARY KEY,
    grn_id INTEGER REFERENCES goods_receipts(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity_bags INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    received_weight DECIMAL(10,2) NOT NULL,
    lot_number VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Lots Table (lot-based tracking)
CREATE TABLE inventory_lots (
    id SERIAL PRIMARY KEY,
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    category_id INTEGER REFERENCES categories(id),
    location_id INTEGER REFERENCES locations(id),
    received_weight DECIMAL(10,2) NOT NULL,
    current_weight DECIMAL(10,2) NOT NULL,
    reserved_weight DECIMAL(10,2) DEFAULT 0,
    available_weight DECIMAL(10,2) NOT NULL,
    grn_id INTEGER REFERENCES goods_receipts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions Table (audit trail)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL,
    lot_id INTEGER REFERENCES inventory_lots(id),
    product_id INTEGER REFERENCES products(id), 
    location_id INTEGER REFERENCES locations(id),
    quantity_change DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    reservation_type VARCHAR(20),
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN'))
);
```

#### Sales Schema
```sql
-- Sales Orders Table
CREATE TABLE sales_orders (
    id SERIAL PRIMARY KEY,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    order_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Order Placed',
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    converted_to_challan BOOLEAN DEFAULT FALSE,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Sales Order Items Table
CREATE TABLE sales_order_items (
    id SERIAL PRIMARY KEY,
    so_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    product_id INTEGER REFERENCES products(id),
    quantity_bags INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    estimated_value DECIMAL(15,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Challans Table
CREATE TABLE sales_challans (
    id SERIAL PRIMARY KEY,
    sc_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    challan_date DATE NOT NULL,
    sales_order_id INTEGER REFERENCES sales_orders(id),
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Sales Challan Items Table
CREATE TABLE sales_challan_items (
    id SERIAL PRIMARY KEY,
    sc_id INTEGER REFERENCES sales_challans(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    product_id INTEGER REFERENCES products(id),
    quantity_bags INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    value DECIMAL(15,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### WIP Schema
```sql
-- Job Orders Table (WIP Processing)
CREATE TABLE job_orders (
    id SERIAL PRIMARY KEY,
    jo_number VARCHAR(50) UNIQUE NOT NULL,
    processor_id INTEGER REFERENCES processors(id),
    order_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Order Placed',
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    processing_charges DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

#### Audit Schema
```sql
-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Relationships
- **Foreign Key Cascades**: Purchase/Sales order items cascade delete with parent orders
- **Inventory Lots**: Reference products, categories, locations, and source GRNs
- **Transactions**: Link to lots and maintain audit trail for all stock movements
- **Role-Based Access**: Users → Roles → Permissions → Pages

### Indexing Strategy
```sql
-- Performance Indexes
CREATE INDEX idx_inventory_lots_product ON inventory_lots(product_id);
CREATE INDEX idx_inventory_lots_location ON inventory_lots(location_id);  
CREATE INDEX idx_inventory_transactions_lot ON inventory_transactions(lot_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_products_category ON products(category_id);
```

## 6. Frontend Architecture

### Component Structure
```
components/
├── ui/                    # Base UI components (Shadcn/ui)
├── layout/               # Layout components (Sidebar, Header)
├── modals/               # Dialog/modal components
├── stats-card.tsx        # Dashboard statistics display
├── ErrorBoundary.tsx     # Error handling wrapper
└── LoadingStates.tsx     # Loading and error states
```

### Routing Structure
```typescript
// App.tsx - Main routing configuration
<Switch>
  {!isAuthenticated ? (
    <Route path="/login" component={Login} />
  ) : (
    <AuthenticatedLayout>
      <Route path="/" component={Dashboard} />
      <Route path="/grn" component={GRN} />
      <Route path="/sales-orders" component={SalesOrders} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/sales-challans" component={SalesChallans} />
      <Route path="/stock-levels" component={StockLevels} />
      <Route path="/master-data" component={MasterData} />
      <Route path="/customers" component={Customers} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/products" component={Products} />
      <Route path="/settings" component={Settings} />
    </AuthenticatedLayout>
  )}
</Switch>
```

### Protected Routes
- All routes except `/login` require authentication
- Authentication check via `useAuth()` hook
- Token-based authentication with JWT
- Automatic redirect to login if unauthorized

### Component Architecture

#### Layout Components
- **`AuthenticatedLayout`**: Main wrapper with sidebar and header
- **`Sidebar`**: Navigation menu with collapsible sections
- **`Header`**: Top bar with user info and actions

#### UI Component Categories

1. **Shadcn/UI Base Components** (`components/ui/`)
   - `Button`, `Input`, `Dialog`, `Table`, `Card`, `Badge`
   - `Select`, `Checkbox`, `Textarea`, `Tabs`, `Accordion`
   - `Popover`, `DropdownMenu`, `Toast`, `Skeleton`

2. **Business Components** (`components/modals/`)
   - `GRNModal`: Goods receipt note creation/editing
   - `SalesChallanModal`: Sales challan management
   - Form validation and submission logic

3. **Data Display Components**
   - `DataTable`: Reusable table with sorting, filtering, pagination
   - `StatsCard`: Dashboard statistics display
   - `LoadingStates`: Skeletons, spinners, error states

### State Management Patterns

#### TanStack Query Usage
```typescript
// Standard data fetching pattern
const { data: ordersResponse, isLoading } = useQuery({
  queryKey: ["/api/sales-orders"],
});
const orders = ordersResponse?.orders || [];

// Mutation with optimistic updates
const createOrderMutation = useMutation({
  mutationFn: async (orderData) => {
    const response = await apiRequest("POST", "/api/sales-orders", orderData);
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
    toast({ title: "Order created successfully" });
  },
  onError: (error) => {
    toast({ title: "Error creating order", variant: "destructive" });
  }
});
```

#### Query Configuration
- **Stale Time**: Infinity (manual invalidation)
- **Refetch on Window Focus**: Disabled
- **Retry Logic**: Disabled (handled by retryable query hook)
- **Error Handling**: Custom error boundaries and toast notifications

### API Client Layer

#### Core API Function
```typescript
// lib/queryClient.ts
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}
```

#### Authentication Integration
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
```

### Form Handling Patterns

#### React Hook Form with Zod
```typescript
// Typical form setup
const form = useForm<OrderFormData>({
  resolver: zodResolver(orderSchema),
  defaultValues: {
    customerId: "",
    orderDate: new Date().toISOString().split('T')[0],
    items: []
  }
});

// Form submission
const handleSubmit = async (data: OrderFormData) => {
  try {
    await createOrderMutation.mutateAsync(data);
    form.reset();
    setIsDialogOpen(false);
  } catch (error) {
    // Error handling via toast
  }
};
```

### Data Table Implementation
```typescript
// Reusable data table pattern
<DataTable
  columns={columns}
  data={filteredData}
  pagination={{
    pageIndex: currentPage - 1,
    pageSize: rowsPerPage,
    totalRows: filteredData.length
  }}
  sorting={sorting}
  onSortingChange={setSorting}
  expandable={{
    getRowCanExpand: () => true,
    renderExpandedRow: (row) => <ExpandedRowContent row={row} />
  }}
/>
```

### Performance Patterns
- **Lazy Loading**: Route-based code splitting
- **Memoization**: React.memo for expensive renders
- **Virtual Scrolling**: For large data tables
- **Optimistic Updates**: Immediate UI updates with rollback on error
- **Background Refetching**: Silent data updates

## 7. Backend Architecture

### Controller Hierarchy

```
Controllers/
├── MasterDataController        # Base CRUD operations
├── SpecializedControllers      # Entity-specific logic
│   ├── SupplierController
│   ├── CustomerController
│   ├── ProcessorController
│   └── ProductController
└── BusinessLogicControllers    # Complex workflows
    ├── GRNController
    ├── OrderController
    ├── ChallanController
    └── DashboardController
```

#### 1. Base CRUD Controller (`base_controllers.py`)
```python
class BaseCRUDController:
    """Base controller with common CRUD operations"""
    
    def __init__(self, entity_name: str):
        self.entity_name = entity_name
        self.config = CRUDConfig()
        self.db_manager = DatabaseManager()
    
    def handle_get_list(self, get_method: Callable) -> JsonResponse:
        """Standard GET list operation"""
        
    def handle_create(self, request, create_method: Callable, 
                     required_fields: List[str]) -> JsonResponse:
        """Standard POST operation with validation"""
        
    def handle_update(self, request, update_method: Callable, 
                     entity_id: int) -> JsonResponse:
        """Standard PUT operation"""
        
    def handle_delete(self, request, delete_method: Callable, 
                     entity_id: int) -> JsonResponse:
        """Standard DELETE operation (soft delete)"""
```

#### 2. Master Data Controller (`base_controllers.py`)
```python
class MasterDataController(BaseCRUDController):
    """Specialized controller for master data entities"""
    
    def handle_standard_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Routes to appropriate CRUD operation based on HTTP method"""
        method_map = {
            'locations': {
                'get_list': self.db_manager.get_locations,
                'create': self.db_manager.create_location,
                'update': self.db_manager.update_location,
                'delete': self.db_manager.delete_location,
                'required_fields': ['name'],
                'field_mapping': {'contactPerson': 'contact_person'}
            }
            # Similar configuration for categories, products
        }
```

#### 3. Specialized Controllers (`specialized_controllers.py`)
- **SupplierController**: Enhanced supplier management with GST validation
- **CustomerController**: Customer-specific business logic
- **ProcessorController**: Processor management with processing charges
- **ProductController**: Product management with category relationships

#### 4. Business Logic Controllers (`business_logic_controllers.py`)
- **GRNController**: Complex GRN creation with inventory integration
- **OrderController**: Purchase and sales order management
- **ChallanController**: Sales challan with inventory reduction
- **DashboardController**: Statistics and reporting logic

### Database Interaction Pattern

#### Connection Pooling
```python
class DatabaseManager:
    """Singleton database manager with connection pooling"""
    
    def __init__(self):
        self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=25, dsn=DATABASE_URL
        )
        self.retry_config = {
            'max_retries': 3,
            'backoff_factor': 0.5,
            'exceptions': (psycopg2.OperationalError, psycopg2.InterfaceError)
        }
    
    def execute_query(self, query: str, params=None, fetch_one=False, fetch_all=False):
        """Execute query with connection pooling and retry logic"""
        for attempt in range(self.retry_config['max_retries']):
            try:
                conn = self.connection_pool.getconn()
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params)
                    if fetch_one:
                        return cursor.fetchone()
                    elif fetch_all:
                        return cursor.fetchall()
                    else:
                        conn.commit()
                        return cursor.rowcount
            except Exception as e:
                if attempt < self.retry_config['max_retries'] - 1:
                    time.sleep(self.retry_config['backoff_factor'] * (2 ** attempt))
                    continue
                raise e
            finally:
                if 'conn' in locals():
                    self.connection_pool.putconn(conn)
```

### API Response Pattern

#### Standardized Response Wrappers
```python
# All list responses follow this pattern:
return JsonResponse({'entityName': data_array})

# Examples:
return JsonResponse({'customers': customers})
return JsonResponse({'orders': orders})  
return JsonResponse({'grns': grns})

# Single entity responses:
return JsonResponse(entity_object)

# Error responses:
return JsonResponse({'error': 'Error message'}, status=error_code)
```

### Authentication & Authorization Flow

#### JWT Token Management
```python
class AuthManager:
    """Token-based authentication manager"""
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Validate credentials against configured users"""
        if username == 'admin' and password == 'admin123':
            return {
                'id': 1,
                'username': username,
                'fullName': 'System Administrator',
                'role': 'admin'
            }
        return None
    
    def create_session(self, user_data: Dict) -> str:
        """Generate UUID token and store in memory"""
        token = str(uuid.uuid4())
        self.valid_tokens[token] = user_data
        return token
    
    def get_user_from_token(self, request) -> Optional[Dict]:
        """Extract and validate Bearer token"""
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            return self.valid_tokens.get(token)
        return None
```

#### Middleware Integration
```python
@csrf_exempt
def protected_view(request):
    """Pattern for protected endpoints"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    # Business logic here
    return JsonResponse(result)
```

### Business Logic Patterns

#### Complex Operations Example
```python
def create_sales_order_with_inventory_validation(self, customer_id, items, user_id):
    """Multi-step business operation"""
    try:
        # Step 1: Validate customer
        customer = self.get_customer_by_id(customer_id)
        if not customer:
            return {'error': 'Customer not found'}
        
        # Step 2: Check inventory availability
        allocation_results = []
        for item in items:
            available = self.check_inventory_availability(
                item['productId'], item['weightKg']
            )
            if not available:
                return {'error': f'Insufficient inventory for product {item["productId"]}'}
            allocation_results.append(available)
        
        # Step 3: Create sales order
        so_number = self.generate_so_number()
        order_id = self.insert_sales_order(so_number, customer_id, items, user_id)
        
        # Step 4: Reserve inventory
        for item, allocation in zip(items, allocation_results):
            self.reserve_inventory(order_id, item, allocation)
        
        # Step 5: Create audit log
        self.create_audit_log('CREATE', 'SALES_ORDER', order_id, user_id)
        
        return {'success': True, 'so_number': so_number, 'order_id': order_id}
        
    except Exception as e:
        # Rollback logic would go here in production
        return {'error': f'Order creation failed: {str(e)}'}
```

### Error Handling Strategy

#### Centralized Error Processing
```python
def _handle_database_error(self, error: Exception, operation: str) -> JsonResponse:
    """Centralized database error handling"""
    error_message = f'Database error during {operation}: {str(error)}'
    
    # Log error for debugging
    print(f"❌ {error_message}")
    
    # Return user-friendly error
    return JsonResponse({
        'error': f'Operation failed: {operation}',
        'details': str(error) if settings.DEBUG else 'Please try again'
    }, status=500)
```

### Scalability Considerations

#### Connection Pool Management
- **Min Connections**: 2 (always available)
- **Max Connections**: 25 (prevents resource exhaustion)  
- **Connection Retry**: 3 attempts with exponential backoff
- **Thread Safety**: ThreadedConnectionPool for concurrent requests

#### Query Optimization
- **Prepared Statements**: Parameterized queries prevent SQL injection
- **Connection Reuse**: Pool management reduces connection overhead
- **Lazy Loading**: Related data loaded on-demand
- **Batch Operations**: Multiple inserts in single transaction

## 8. Key Business Workflows

### 1. Inventory Management Flow (Purchase → GRN → Lots)

#### Step-by-Step Process:

**Step 1: Purchase Order Creation**
```
Frontend Action: User creates purchase order
API Endpoint: POST /api/purchase-orders
Request Body: {
  "supplierId": 1,
  "orderDate": "2025-01-01",
  "items": [
    {
      "categoryId": 1,
      "productId": 1, 
      "quantityBags": 10,
      "weightKg": 500.0,
      "estimatedValue": 25000.00
    }
  ]
}

Database Changes:
1. INSERT into purchase_orders (po_number: "PO/2025/JAN/01/1")
2. INSERT into purchase_order_items (multiple records)
3. INSERT into audit_logs (CREATE operation)

Response: {
  "message": "Purchase order created successfully",
  "po_number": "PO/2025/JAN/01/1"
}
```

**Step 2: GRN Creation (Goods Received)**
```
Frontend Action: User creates GRN from purchase order
API Endpoint: POST /api/grns  
Request Body: {
  "supplierName": "Cotton Suppliers Ltd",
  "receivedDate": "2025-01-05",
  "purchaseOrderId": 1,  // Optional reference
  "items": [
    {
      "categoryName": "Cotton",
      "productName": "Premium Cotton 40s",
      "quantityBags": 10,
      "weightKg": 500.0,
      "receivedWeight": 498.5,  // Actual received weight
      "remarks": "Good quality"
    }
  ]
}

Database Changes:
1. INSERT into goods_receipts (grn_number: "GRN/2025/JAN/05/1")
2. INSERT into goods_receipt_items
3. INSERT into inventory_lots (lot_number: "LOT/2025/01/05/1")
4. INSERT into inventory_transactions (INBOUND transaction)
5. UPDATE purchase_orders SET converted_to_grn = TRUE

Business Logic:
- Auto-generate lot numbers for each item
- Create inventory transactions for stock tracking
- Update available inventory levels
- Mark purchase order as received

Response: {
  "message": "GRN created successfully", 
  "grn_number": "GRN/2025/JAN/05/1",
  "lots_created": ["LOT/2025/01/05/1", "LOT/2025/01/05/2"]
}
```

**Step 3: Stock Availability Check**
```
Frontend Action: View stock levels
API Endpoint: GET /api/stock-levels
Database Query:
SELECT 
    p.product_name,
    c.name as category_name,
    l.name as location_name,
    SUM(il.available_weight) as available_stock,
    SUM(il.reserved_weight) as reserved_stock,
    COUNT(il.id) as lot_count
FROM inventory_lots il
JOIN products p ON il.product_id = p.id  
JOIN categories c ON il.category_id = c.id
JOIN locations l ON il.location_id = l.id
WHERE il.current_weight > 0
GROUP BY p.id, c.id, l.id

Response Structure:
{
  "stockLevels": [
    {
      "productName": "Premium Cotton 40s",
      "categoryName": "Cotton", 
      "locationName": "Main Warehouse",
      "availableStock": 1250.5,
      "reservedStock": 250.0,
      "lotCount": 3,
      "lots": [
        {
          "lotNumber": "LOT/2025/01/05/1",
          "currentWeight": 498.5,
          "availableWeight": 248.5,
          "reservedWeight": 250.0
        }
      ]
    }
  ]
}
```

### 2. Sales Flow (Order → Reservation → Challan → Shipment)

#### Step-by-Step Process:

**Step 1: Sales Order Creation with Stock Validation**
```
Frontend Action: User creates sales order
API Endpoint: POST /api/sales-orders
Request Body: {
  "customerId": 1,
  "orderDate": "2025-01-10", 
  "items": [
    {
      "categoryId": 1,
      "productId": 1,
      "quantityBags": 5,
      "weightKg": 250.0,
      "estimatedValue": 12500.00
    }
  ]
}

Backend Processing:
1. Validate customer exists
2. Check inventory availability:
   - Query inventory_lots for available_weight >= requested_weight
   - Apply FIFO logic (oldest lots first)
   - Calculate allocation across multiple lots if needed

3. Reserve inventory:
   - UPDATE inventory_lots SET reserved_weight += allocated_weight
   - UPDATE inventory_lots SET available_weight -= allocated_weight
   - INSERT inventory_transactions (ADJUSTMENT, reservation_type='RESERVE')

4. Create sales order:
   - INSERT sales_orders (so_number: "SO/2025/JAN/10/1")
   - INSERT sales_order_items
   - INSERT audit_logs

Response: {
  "message": "Sales order created successfully",
  "so_number": "SO/2025/JAN/10/1", 
  "stockAllocations": [
    {
      "productName": "Premium Cotton 40s",
      "requestedWeight": 250.0,
      "allocatedWeight": 250.0,
      "fromLots": [
        {"lotNumber": "LOT/2025/01/05/1", "allocatedWeight": 250.0}
      ]
    }
  ]
}
```

**Step 2: Sales Challan Creation (Order Conversion)**
```
Frontend Action: Convert sales order to challan
API Endpoint: POST /api/sales-challans
Request Body: {
  "salesOrderId": 1,
  "challanDate": "2025-01-12",
  "items": [
    {
      "categoryId": 1,
      "productId": 1,
      "quantityBags": 5,
      "weightKg": 250.0,
      "value": 12500.00,
      "remarks": "Dispatched via truck ABC123"
    }
  ]
}

Backend Processing:
1. Validate sales order exists and not already converted
2. Release reserved inventory:
   - UPDATE inventory_lots SET reserved_weight -= released_weight
   - INSERT inventory_transactions (ADJUSTMENT, reservation_type='UNRESERVE')

3. Perform outbound transactions:
   - UPDATE inventory_lots SET current_weight -= shipped_weight
   - UPDATE inventory_lots SET available_weight calculation
   - INSERT inventory_transactions (OUTBOUND transaction)

4. Create sales challan:
   - INSERT sales_challans (sc_number: "SC/2025/JAN/12/1")  
   - INSERT sales_challan_items
   - UPDATE sales_orders SET converted_to_challan = TRUE

Response: {
  "message": "Sales challan created successfully",
  "sc_number": "SC/2025/JAN/12/1",
  "inventoryTransactions": [
    {
      "type": "OUTBOUND", 
      "productName": "Premium Cotton 40s",
      "weight": 250.0,
      "fromLots": ["LOT/2025/01/05/1"],
      "balanceAfter": 248.5
    }
  ]
}
```

### 3. WIP (Work-in-Progress) Processing Flow

#### Job Order → WIP Challan → Processing → Return

**Step 1: Job Order Creation**
```
Frontend Action: Create job order for external processing
API Endpoint: POST /api/job-orders
Request Body: {
  "processorId": 1,
  "orderDate": "2025-01-15",
  "processingCharges": 5.00,  // per kg
  "items": [
    {
      "categoryId": 2,
      "productId": 3,
      "quantityBags": 8, 
      "weightKg": 400.0,
      "processingType": "Dyeing"
    }
  ]
}

Backend Processing:
1. Check inventory availability for raw materials
2. Reserve inventory for WIP processing
3. Create job order with processing charges calculation
4. Generate job order number: "JO/2025/JAN/15/1"

Response: {
  "message": "Job order created successfully",
  "jo_number": "JO/2025/JAN/15/1",
  "totalProcessingCharges": 2000.00
}
```

**Step 2: WIP Challan (Send to Processor)**
```
Frontend Action: Create challan to send goods to processor
API Endpoint: POST /api/wip-challans
Request Body: {
  "jobOrderId": 1,
  "processorId": 1,
  "challanDate": "2025-01-16",
  "type": "OUTBOUND",  // Sending to processor
  "items": [
    {
      "categoryId": 2,
      "productId": 3,
      "weightKg": 400.0,
      "remarks": "Sent for dyeing process"
    }
  ]
}

Backend Processing:
1. Create WIP outbound transaction (goods leaving for processing)
2. Track WIP inventory separately from regular sales inventory
3. Update job order status to "In Processing"

Response: {
  "message": "WIP challan created - goods sent to processor",
  "wc_number": "WC/2025/JAN/16/1"
}
```

**Step 3: WIP Return Processing**
```
Frontend Action: Receive processed goods back
API Endpoint: POST /api/wip-challans  
Request Body: {
  "jobOrderId": 1,
  "processorId": 1,
  "challanDate": "2025-01-25",
  "type": "INBOUND",  // Receiving from processor
  "items": [
    {
      "categoryId": 2,
      "productId": 4,  // Different product ID for processed goods
      "weightKg": 390.0,  // Weight loss during processing
      "remarks": "Dyed cotton returned - 2.5% processing loss"
    }
  ]
}

Backend Processing:
1. Create new inventory lots for processed goods
2. Record processing loss/gain
3. Update job order status to "Completed" 
4. Calculate final processing charges

Response: {
  "message": "Processed goods received successfully",
  "wc_number": "WC/2025/JAN/25/1", 
  "processingLoss": 10.0,
  "newLotsCreated": ["LOT/2025/01/25/1"]
}
```

### Request/Response Sequence Examples

#### Complete Purchase-to-Stock Flow
```
1. POST /api/purchase-orders
   → Creates PO/2025/JAN/01/1
   → Status: "Order Placed"

2. POST /api/grns  
   → Creates GRN/2025/JAN/05/1
   → Creates LOT/2025/01/05/1
   → Updates PO status: "Order Received"
   → Inventory Transaction: +500kg INBOUND

3. GET /api/stock-levels
   → Shows 500kg available stock
   → Lot details with FIFO ordering
```

#### Complete Sales Flow
```  
1. POST /api/sales-orders
   → Creates SO/2025/JAN/10/1
   → Reserves 250kg from LOT/2025/01/05/1
   → Available stock: 250kg, Reserved: 250kg

2. POST /api/sales-challans (convert from SO)
   → Creates SC/2025/JAN/12/1
   → Releases 250kg reservation
   → Ships 250kg OUTBOUND
   → Final stock: 250kg available, 0kg reserved
```

## 9. Code Style & Development Guidelines

### TypeScript Conventions

#### Interface Definitions
```typescript
// Use descriptive, domain-specific interface names
interface SalesOrder {
  id: number;
  so_number: string;  // Match backend field names exactly
  customer_id: number;
  customerName: string;  // Derived fields use camelCase
  orderDate: string;     // ISO date strings
  status: string;
  total_items: number;
  total_value: string | number;  // Handle Decimal fields from backend
  converted_to_challan: boolean;
  items?: SalesOrderItem[];  // Optional related data
}

// Form data interfaces separate from API interfaces
interface OrderFormData {
  customerId: string;    // Form fields often use string for selects
  orderDate: string;
  notes: string;
  items: OrderItem[];
}
```

#### Type Safety Patterns
```typescript
// Strict typing for API responses
type APIResponse<T> = {
  [K in keyof T]: T[K];
} | {
  error: string;
};

// Discriminated unions for status
type OrderStatus = 'Order Placed' | 'Order Received' | 'Order Cancelled';

// Utility types for partial updates
type UpdateOrderData = Partial<Pick<SalesOrder, 'status' | 'notes'>>;
```

### Python Conventions

#### Function Documentation
```python
def create_sales_order(self, customer_id: int, items: List[Dict[str, Any]], 
                      user_id: int) -> Dict[str, Any]:
    """
    Create a new sales order with inventory validation and reservation.
    
    Args:
        customer_id: ID of the customer placing the order
        items: List of order items with category_id, product_id, weight_kg, etc.
        user_id: ID of the user creating the order (for audit trail)
    
    Returns:
        Dict containing success message and order details, or error message
        
    Raises:
        DatabaseError: If database operation fails
        ValidationError: If inventory insufficient or customer not found
    """
```

#### Error Handling Pattern
```python
def handle_database_operation(self, operation_name: str, operation_func: Callable) -> JsonResponse:
    """Standard error handling pattern for database operations"""
    try:
        result = operation_func()
        return JsonResponse(result)
    except psycopg2.OperationalError as e:
        return self._handle_database_error(e, operation_name)
    except ValidationError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Unexpected error in {operation_name}'}, status=500)
```

#### SQL Query Style
```python
# Use parameterized queries with clear formatting
query = """
    SELECT so.id, so.so_number, c.name as customer_name,
           so.order_date, so.status, so.total_value
    FROM sales_orders so
    LEFT JOIN customers c ON so.customer_id = c.id  
    WHERE so.is_deleted = FALSE
        AND so.status = %s
        AND so.order_date >= %s
    ORDER BY so.order_date DESC, so.id DESC
    LIMIT %s OFFSET %s
"""

result = self.db_manager.execute_query(
    query, 
    (status_filter, date_from, page_size, offset),
    fetch_all=True
)
```

### Frontend Component Patterns

#### React Component Structure
```typescript
// Standard component file structure
export default function SalesOrdersPage() {
  // 1. State declarations (grouped by purpose)
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "all", customer: "all" });
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  
  // 2. Hooks (data fetching, mutations)
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["/api/sales-orders"]
  });
  
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => apiRequest("POST", "/api/sales-orders", orderData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] })
  });
  
  // 3. Derived state and computations
  const orders = useMemo(() => ordersResponse?.orders || [], [ordersResponse]);
  const filteredOrders = useMemo(() => 
    orders.filter(order => 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [orders, searchQuery]
  );
  
  // 4. Event handlers
  const handleCreateOrder = useCallback(async (formData: OrderFormData) => {
    try {
      await createOrderMutation.mutateAsync(formData);
      toast({ title: "Order created successfully" });
    } catch (error) {
      toast({ title: "Error creating order", variant: "destructive" });
    }
  }, [createOrderMutation]);
  
  // 5. Render
  return (
    <div className="container mx-auto py-6">
      {/* Component JSX */}
    </div>
  );
}
```

#### Accessibility Guidelines
```typescript
// Use semantic HTML and ARIA labels
<Button
  variant="outline" 
  size="sm"
  onClick={handleEditOrder}
  aria-label={`Edit order ${order.so_number}`}
>
  <Edit className="h-4 w-4" />
</Button>

// Form accessibility
<Label htmlFor="customer-select">Customer *</Label>
<Select
  name="customerId"
  aria-describedby="customer-error"
  aria-invalid={!!errors.customerId}
>
  <SelectTrigger id="customer-select">
    <SelectValue placeholder="Select customer" />
  </SelectTrigger>
</Select>
{errors.customerId && (
  <span id="customer-error" className="text-sm text-destructive">
    {errors.customerId.message}
  </span>
)}
```

### API Design Principles

#### Consistent Naming Conventions
```python
# URL patterns
/api/sales-orders          # Kebab-case for URLs
/api/purchase-orders/{id}  # RESTful resource naming
/api/dashboard/stats       # Nested resources with slash

# JSON field naming
{
  "customerName": "ABC Ltd",     # Frontend: camelCase
  "customer_name": "ABC Ltd"     # Backend: snake_case
}
```

#### HTTP Status Code Usage
```python
# Success responses
200: GET requests (data retrieval)
201: POST requests (resource creation)
204: DELETE requests (no content)

# Client error responses  
400: Bad Request (validation errors, malformed JSON)
401: Unauthorized (missing/invalid authentication)
404: Not Found (resource doesn't exist)
409: Conflict (duplicate resources, constraint violations)

# Server error responses
500: Internal Server Error (database errors, unexpected exceptions)
503: Service Unavailable (temporary issues, maintenance)
```

#### Request/Response Validation
```python
# Input validation pattern
def validate_order_request(self, data: Dict[str, Any]) -> Optional[JsonResponse]:
    """Validate order creation request data"""
    required_fields = ['customerId', 'items']
    
    for field in required_fields:
        if field not in data or not data[field]:
            return JsonResponse({
                'error': f'{field} is required'
            }, status=400)
    
    if not isinstance(data['items'], list) or len(data['items']) == 0:
        return JsonResponse({
            'error': 'At least one order item is required'
        }, status=400)
    
    for idx, item in enumerate(data['items']):
        if item.get('weightKg', 0) <= 0:
            return JsonResponse({
                'error': f'Item {idx + 1}: Weight must be greater than 0'
            }, status=400)
    
    return None  # No validation errors
```

## 10. Performance & Optimization Considerations

### Current Bottlenecks & Known Issues

#### Database Performance Issues
1. **N+1 Query Problem**: 
   - **Issue**: Loading order items separately for each order
   - **Solution**: Use JOINs to fetch related data in single query
   ```python
   # Instead of multiple queries:
   orders = get_orders()
   for order in orders:
       order.items = get_order_items(order.id)  # N+1 problem
   
   # Use single query with JOIN:
   query = """
       SELECT o.*, oi.*, c.name as customer_name 
       FROM sales_orders o
       LEFT JOIN sales_order_items oi ON o.id = oi.so_id
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.is_deleted = FALSE
   """
   ```

2. **Lack of Indexes on Frequent Queries**:
   - **Issue**: Slow queries on date ranges and status filters
   - **Solution**: Add composite indexes
   ```sql
   CREATE INDEX idx_sales_orders_date_status ON sales_orders(order_date, status);
   CREATE INDEX idx_inventory_lots_product_location ON inventory_lots(product_id, location_id);
   CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
   ```

3. **Large Table Scans**:
   - **Issue**: Full table scans on inventory_transactions for reporting
   - **Solution**: Implement partitioning by date
   ```sql
   -- Partition inventory_transactions by month
   CREATE TABLE inventory_transactions_2025_01 PARTITION OF inventory_transactions
   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
   ```

### Query Optimization Strategies

#### Inventory Stock Calculation Optimization
```python
# Inefficient: Calculate stock for each product separately
def get_stock_levels_slow():
    products = get_all_products()
    for product in products:
        stock = calculate_stock_for_product(product.id)  # Separate query each time
        
# Optimized: Single query with aggregation
def get_stock_levels_optimized():
    query = """
        SELECT 
            p.id as product_id,
            p.product_name,
            c.name as category_name,
            l.name as location_name,
            COALESCE(SUM(il.current_weight), 0) as current_stock,
            COALESCE(SUM(il.available_weight), 0) as available_stock,
            COALESCE(SUM(il.reserved_weight), 0) as reserved_stock,
            COUNT(il.id) as lot_count
        FROM products p
        CROSS JOIN locations l
        LEFT JOIN inventory_lots il ON p.id = il.product_id AND l.id = il.location_id
        JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = TRUE
        GROUP BY p.id, p.product_name, c.name, l.name
        HAVING COALESCE(SUM(il.current_weight), 0) > 0
        ORDER BY p.product_name, l.name
    """
```

#### Batch Insert Operations
```python
# Inefficient: Insert order items one by one
def create_order_items_slow(order_id, items):
    for item in items:
        self.execute_query(
            "INSERT INTO sales_order_items (...) VALUES (...)",
            (order_id, item['category_id'], item['product_id'], ...)
        )

# Optimized: Batch insert with VALUES clause
def create_order_items_optimized(order_id, items):
    if not items:
        return
        
    values_clause = ",".join([
        f"({order_id}, %s, %s, %s, %s, %s, %s)"
        for _ in items
    ])
    
    params = []
    for item in items:
        params.extend([
            item['category_id'], item['product_id'], 
            item['quantity_bags'], item['weight_kg'],
            item['estimated_value'], item.get('remarks', '')
        ])
    
    query = f"""
        INSERT INTO sales_order_items 
        (so_id, category_id, product_id, quantity_bags, weight_kg, estimated_value, remarks)
        VALUES {values_clause}
    """
    
    self.execute_query(query, params)
```

### Frontend Performance Optimizations

#### Lazy Loading Implementation
```typescript
// Route-based code splitting
const Dashboard = lazy(() => import("@/pages/dashboard"));
const SalesOrders = lazy(() => import("@/pages/sales-orders"));

// Component lazy loading with Suspense
<Suspense fallback={<DashboardCardSkeleton />}>
  <Route path="/dashboard" component={Dashboard} />
</Suspense>
```

#### Optimistic Updates Pattern
```typescript
// Optimistic updates for better UX
const updateOrderMutation = useMutation({
  mutationFn: async (updateData) => {
    const response = await apiRequest("PUT", `/api/sales-orders/${updateData.id}`, updateData);
    return response.json();
  },
  onMutate: async (updateData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["/api/sales-orders"] });
    
    // Snapshot previous value
    const previousOrders = queryClient.getQueryData(["/api/sales-orders"]);
    
    // Optimistically update
    queryClient.setQueryData(["/api/sales-orders"], (old: any) => ({
      ...old,
      orders: old.orders.map((order: SalesOrder) => 
        order.id === updateData.id ? { ...order, ...updateData } : order
      )
    }));
    
    return { previousOrders };
  },
  onError: (err, updateData, context) => {
    // Rollback on error
    if (context?.previousOrders) {
      queryClient.setQueryData(["/api/sales-orders"], context.previousOrders);
    }
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
  },
});
```

#### Virtual Scrolling for Large Tables
```typescript
// For large datasets (1000+ rows), implement virtual scrolling
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeDataTable({ data }: { data: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Row height
    overscan: 10, // Render extra items for smooth scrolling
  });
  
  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <TableRow data={data[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Memory Management Guidelines

#### Connection Pool Tuning
```python
# Optimal connection pool configuration
class DatabaseManager:
    def __init__(self):
        self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,      # Always keep 2 connections open
            maxconn=25,     # Maximum 25 concurrent connections
            dsn=DATABASE_URL,
            
            # Connection parameters for performance
            options="-c statement_timeout=30s -c idle_in_transaction_session_timeout=60s"
        )
        
        # Monitor pool health
        self.pool_stats = {
            'total_requests': 0,
            'active_connections': 0,
            'pool_exhausted_count': 0
        }
```

#### React Query Cache Management
```typescript
// Optimize cache configuration for memory usage
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,       // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,   // Disable excessive refetching
      retry: false,                  // Let custom retry logic handle it
    },
  },
});

// Cache cleanup for large datasets
useEffect(() => {
  const cleanup = () => {
    // Remove old query data for memory management
    queryClient.removeQueries({ 
      queryKey: ["/api/sales-orders"], 
      predicate: (query) => {
        return Date.now() - (query.dataUpdatedAt || 0) > 30 * 60 * 1000; // 30 minutes
      }
    });
  };
  
  const interval = setInterval(cleanup, 10 * 60 * 1000); // Run every 10 minutes
  return () => clearInterval(interval);
}, []);
```

### Caching Strategies

#### API Response Caching
```python
# Simple in-memory cache for frequently accessed data
from functools import lru_cache
import time

class CachedDataManager:
    def __init__(self):
        self.cache_timeout = 300  # 5 minutes
        self.cache = {}
    
    @lru_cache(maxsize=100)
    def get_categories(self):
        """Cache categories as they rarely change"""
        return self.db_manager.get_categories()
    
    def get_stock_levels_cached(self):
        """Cache stock levels with timeout"""
        cache_key = 'stock_levels'
        now = time.time()
        
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if now - timestamp < self.cache_timeout:
                return data
        
        # Cache expired, refresh data
        stock_data = self.calculate_stock_levels()
        self.cache[cache_key] = (stock_data, now)
        return stock_data
```

## 11. Common Bugs & Fixes

### Data Structure Mismatches

#### Issue: "data.filter is not a function" Error
**Problem**: Backend returning raw arrays, frontend expecting wrapped objects
```typescript
// Backend returns: [{ id: 1, name: "Customer 1" }]
// Frontend expects: { customers: [{ id: 1, name: "Customer 1" }] }
```

**Solution**: Standardize response wrapping
```python
# Backend fix - always wrap arrays in named objects
return JsonResponse({'customers': customers})  # ✅ Correct
return JsonResponse(customers, safe=False)     # ❌ Incorrect

# Frontend fix - handle both patterns defensively  
const customers = data?.customers || data || [];
```

### Authentication Token Issues

#### Issue: JWT Token Expiry Not Handled
**Problem**: Users get stuck with expired tokens, no automatic refresh
```typescript
// Problem: 401 errors not handled gracefully
const { data } = useQuery(["/api/orders"]);  // Fails silently on 401
```

**Solution**: Implement token refresh and logout logic
```typescript
// Enhanced error handling with automatic logout
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const response = await fetch(queryKey[0] as string, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        
        if (response.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      }
    }
  }
});
```

### State Management Issues

#### Issue: Stale Data After Mutations
**Problem**: UI not updating after create/update operations
```typescript
// Problem: Create order but table doesn't refresh
const createOrderMutation = useMutation({
  mutationFn: (data) => apiRequest("POST", "/api/sales-orders", data),
  // Missing onSuccess invalidation
});
```

**Solution**: Proper cache invalidation strategy
```typescript
// Solution: Invalidate relevant queries after mutations
const createOrderMutation = useMutation({
  mutationFn: (data) => apiRequest("POST", "/api/sales-orders", data),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    
    // Optional: Optimistic update
    queryClient.setQueryData(["/api/sales-orders"], (old: any) => ({
      ...old,
      orders: [newOrder, ...(old?.orders || [])]
    }));
  }
});
```

### Database Connection Issues

#### Issue: Connection Pool Exhaustion
**Problem**: High traffic causes "connection pool exhausted" errors
```python
# Problem: Connections not returned to pool
def database_operation():
    conn = connection_pool.getconn()
    cursor = conn.cursor()
    cursor.execute(query)
    # Missing: connection_pool.putconn(conn)
```

**Solution**: Proper connection lifecycle management
```python
# Solution: Use context managers and try/finally
def execute_query_safely(self, query, params=None):
    conn = None
    try:
        conn = self.connection_pool.getconn()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            conn.commit()
            return cursor.fetchall() if cursor.description else cursor.rowcount
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            self.connection_pool.putconn(conn)
```

### Inventory Calculation Errors

#### Issue: Negative Stock Levels
**Problem**: Race conditions in concurrent stock updates
```python
# Problem: Two orders reserving same inventory simultaneously
# Order A: Check stock (100kg available) ✓
# Order B: Check stock (100kg available) ✓  
# Order A: Reserve 80kg (20kg remaining)
# Order B: Reserve 80kg (-60kg remaining) ❌
```

**Solution**: Use database transactions with row locking
```python
# Solution: Atomic stock reservation with SELECT FOR UPDATE
def reserve_inventory_atomic(self, product_id, required_weight, location_id):
    conn = None
    try:
        conn = self.connection_pool.getconn()
        with conn.cursor() as cursor:
            # Lock rows to prevent concurrent modifications
            cursor.execute("""
                SELECT id, available_weight, reserved_weight, current_weight
                FROM inventory_lots 
                WHERE product_id = %s AND location_id = %s 
                    AND available_weight > 0
                ORDER BY created_at ASC  -- FIFO
                FOR UPDATE
            """, (product_id, location_id))
            
            lots = cursor.fetchall()
            allocations = []
            remaining_needed = required_weight
            
            for lot in lots:
                if remaining_needed <= 0:
                    break
                    
                available = lot['available_weight']
                allocated = min(available, remaining_needed)
                
                # Update within same transaction
                cursor.execute("""
                    UPDATE inventory_lots 
                    SET available_weight = available_weight - %s,
                        reserved_weight = reserved_weight + %s
                    WHERE id = %s
                """, (allocated, allocated, lot['id']))
                
                allocations.append({
                    'lot_id': lot['id'], 
                    'allocated_weight': allocated
                })
                remaining_needed -= allocated
            
            if remaining_needed > 0:
                conn.rollback()
                return {'error': f'Insufficient inventory: {remaining_needed}kg short'}
            
            conn.commit()
            return {'success': True, 'allocations': allocations}
            
    except Exception as e:
        if conn:
            conn.rollback()
        return {'error': f'Reservation failed: {str(e)}'}
    finally:
        if conn:
            self.connection_pool.putconn(conn)
```

### Form Validation Issues

#### Issue: Missing Client-Side Validation
**Problem**: Invalid data reaches backend, poor user experience
```typescript
// Problem: No validation before submission
const handleSubmit = async (data) => {
  await createOrderMutation.mutateAsync(data);  // May fail with validation errors
};
```

**Solution**: Comprehensive Zod validation schema
```typescript
// Solution: Client-side validation with Zod
const orderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  items: z.array(z.object({
    categoryId: z.number().positive("Category is required"),
    productId: z.number().positive("Product is required"), 
    quantityBags: z.number().positive("Quantity must be positive"),
    weightKg: z.number().positive("Weight must be positive").max(10000, "Weight too large"),
    estimatedValue: z.number().nonnegative("Value cannot be negative"),
    remarks: z.string().max(500, "Remarks too long")
  })).min(1, "At least one item is required")
});

const form = useForm<OrderFormData>({
  resolver: zodResolver(orderSchema),
  defaultValues: { /* defaults */ }
});

const handleSubmit = async (data: OrderFormData) => {
  // Data is already validated by Zod resolver
  try {
    await createOrderMutation.mutateAsync(data);
  } catch (error) {
    // Handle server-side validation errors
    if (error.status === 400) {
      toast({ title: "Validation Error", description: error.message });
    }
  }
};
```

## 12. Testing Guidelines

### Frontend Test Patterns

#### Component Unit Tests
```typescript
// tests/components/SalesOrderCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SalesOrderCard from '@/components/SalesOrderCard';

const mockOrder: SalesOrder = {
  id: 1,
  so_number: "SO/2025/JAN/01/1",
  customerName: "Test Customer",
  total_value: "1000.00",
  status: "Order Placed"
};

describe('SalesOrderCard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });
  
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };
  
  it('displays order information correctly', () => {
    renderWithProviders(<SalesOrderCard order={mockOrder} />);
    
    expect(screen.getByText("SO/2025/JAN/01/1")).toBeInTheDocument();
    expect(screen.getByText("Test Customer")).toBeInTheDocument();
    expect(screen.getByText("₹1,000.00")).toBeInTheDocument();
  });
  
  it('handles edit button click', async () => {
    const mockOnEdit = jest.fn();
    renderWithProviders(
      <SalesOrderCard order={mockOrder} onEdit={mockOnEdit} />
    );
    
    fireEvent.click(screen.getByLabelText('Edit order'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockOrder);
  });
});
```

#### API Integration Tests
```typescript
// tests/api/salesOrders.test.ts
import { apiRequest } from '@/lib/queryClient';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/sales-orders', (req, res, ctx) => {
    return res(
      ctx.json({
        message: "Sales order created successfully",
        so_number: "SO/2025/JAN/01/1"
      })
    );
  }),
  
  rest.get('/api/sales-orders', (req, res, ctx) => {
    return res(
      ctx.json({
        orders: [
          {
            id: 1,
            so_number: "SO/2025/JAN/01/1",
            customerName: "Test Customer"
          }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Sales Orders API', () => {
  it('creates sales order successfully', async () => {
    const orderData = {
      customerId: 1,
      orderDate: "2025-01-01",
      items: [
        { categoryId: 1, productId: 1, weightKg: 100 }
      ]
    };
    
    const response = await apiRequest("POST", "/api/sales-orders", orderData);
    const data = await response.json();
    
    expect(data.message).toBe("Sales order created successfully");
    expect(data.so_number).toBe("SO/2025/JAN/01/1");
  });
});
```

### Backend Test Strategies

#### Unit Tests for Controllers
```python
# tests/test_sales_controllers.py
import pytest
import json
from unittest.mock import Mock, patch
from backend.business_logic_controllers import OrderController
from django.test import RequestFactory
from django.http import JsonResponse

class TestOrderController:
    def setup_method(self):
        self.controller = OrderController()
        self.factory = RequestFactory()
    
    @patch('backend.business_logic_controllers.get_user_from_token')
    @patch.object(OrderController, 'db_manager')
    def test_create_sales_order_success(self, mock_db_manager, mock_get_user):
        # Setup mocks
        mock_get_user.return_value = {'id': 1, 'username': 'testuser'}
        mock_db_manager.create_sales_order.return_value = {
            'success': True, 
            'so_number': 'SO/2025/JAN/01/1'
        }
        
        # Create request
        order_data = {
            'customerId': 1,
            'items': [
                {'categoryId': 1, 'productId': 1, 'weightKg': 100}
            ]
        }
        request = self.factory.post(
            '/api/sales-orders',
            data=json.dumps(order_data),
            content_type='application/json'
        )
        
        # Execute
        response = self.controller.handle_sales_orders(request)
        
        # Assert
        assert response.status_code == 201
        response_data = json.loads(response.content)
        assert response_data['so_number'] == 'SO/2025/JAN/01/1'
        mock_db_manager.create_sales_order.assert_called_once()
    
    @patch('backend.business_logic_controllers.get_user_from_token')
    def test_create_sales_order_unauthorized(self, mock_get_user):
        mock_get_user.return_value = None
        
        request = self.factory.post('/api/sales-orders')
        response = self.controller.handle_sales_orders(request)
        
        assert response.status_code == 401
        response_data = json.loads(response.content)
        assert 'error' in response_data
```

#### Database Integration Tests
```python
# tests/test_database_integration.py
import pytest
import psycopg2
from decimal import Decimal
from backend.database_storage import DatabaseManager

@pytest.fixture
def db_manager():
    """Create test database manager with test database"""
    test_db_url = "postgresql://test:test@localhost/inventory_test"
    manager = DatabaseManager(test_db_url)
    
    # Setup test data
    yield manager
    
    # Cleanup test data
    manager.execute_query("DELETE FROM sales_orders WHERE created_by = 999")

class TestDatabaseIntegration:
    def test_create_and_retrieve_sales_order(self, db_manager):
        # Create test customer
        customer_data = {
            'name': 'Test Customer',
            'contact_person': 'John Doe',
            'created_by': 999
        }
        customer_id = db_manager.create_customer(**customer_data)['id']
        
        # Create sales order
        order_data = {
            'customer_id': customer_id,
            'items': [
                {
                    'category_id': 1,
                    'product_id': 1, 
                    'quantity_bags': 10,
                    'weight_kg': Decimal('500.00'),
                    'estimated_value': Decimal('25000.00')
                }
            ],
            'user_id': 999
        }
        
        result = db_manager.create_sales_order(**order_data)
        assert 'error' not in result
        assert 'so_number' in result
        
        # Retrieve and verify
        orders = db_manager.get_sales_orders()
        created_order = next(
            (o for o in orders if o['so_number'] == result['so_number']), 
            None
        )
        
        assert created_order is not None
        assert created_order['customer_id'] == customer_id
        assert created_order['total_value'] == Decimal('25000.00')
    
    def test_inventory_reservation_atomic(self, db_manager):
        """Test that inventory reservation is atomic"""
        # Create test inventory lot
        lot_data = {
            'lot_number': 'TEST/LOT/001',
            'product_id': 1,
            'category_id': 1,
            'location_id': 1,
            'received_weight': Decimal('1000.00'),
            'current_weight': Decimal('1000.00'),
            'available_weight': Decimal('1000.00')
        }
        db_manager.create_inventory_lot(**lot_data)
        
        # Test successful reservation
        reservation_result = db_manager.reserve_inventory_atomic(
            product_id=1, 
            required_weight=Decimal('500.00'), 
            location_id=1
        )
        
        assert 'error' not in reservation_result
        assert len(reservation_result['allocations']) == 1
        
        # Verify inventory updated correctly
        lots = db_manager.get_inventory_lots(product_id=1)
        test_lot = lots[0]
        assert test_lot['available_weight'] == Decimal('500.00')
        assert test_lot['reserved_weight'] == Decimal('500.00')
```

### Performance Testing

#### Load Testing with Locust
```python
# tests/performance/locustfile.py
from locust import HttpUser, task, between
import json

class InventoryUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login and get auth token"""
        response = self.client.post("/api/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            self.client.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
    
    @task(3)
    def view_sales_orders(self):
        """Most common operation - viewing orders"""
        self.client.get("/api/sales-orders")
    
    @task(2)  
    def view_stock_levels(self):
        """Check inventory levels"""
        self.client.get("/api/stock-levels")
    
    @task(1)
    def create_sales_order(self):
        """Less frequent but important operation"""
        order_data = {
            "customerId": 1,
            "orderDate": "2025-01-01",
            "items": [
                {
                    "categoryId": 1,
                    "productId": 1,
                    "quantityBags": 5,
                    "weightKg": 250.0,
                    "estimatedValue": 12500.0
                }
            ]
        }
        
        response = self.client.post(
            "/api/sales-orders", 
            json=order_data,
            name="Create Sales Order"
        )
        
        if response.status_code != 201:
            print(f"Create order failed: {response.status_code} - {response.text}")

# Run with: locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

#### Database Query Performance Tests
```python
# tests/performance/test_query_performance.py
import time
import pytest
from backend.database_storage import DatabaseManager

def test_stock_levels_query_performance():
    """Ensure stock levels query completes within acceptable time"""
    db_manager = DatabaseManager()
    
    start_time = time.time()
    stock_levels = db_manager.get_stock_levels()
    execution_time = time.time() - start_time
    
    # Should complete within 2 seconds for up to 1000 products
    assert execution_time < 2.0, f"Stock levels query took {execution_time:.2f}s"
    assert len(stock_levels) > 0, "Should return stock data"

def test_sales_orders_pagination_performance():
    """Test large dataset pagination performance"""
    db_manager = DatabaseManager()
    
    # Test various page sizes
    for page_size in [10, 50, 100]:
        start_time = time.time()
        orders = db_manager.get_sales_orders_paginated(
            page=1, 
            page_size=page_size
        )
        execution_time = time.time() - start_time
        
        # Should be fast regardless of page size
        assert execution_time < 1.0, f"Pagination query took {execution_time:.2f}s for page size {page_size}"
```

## 13. Deployment & Environment Setup

### Environment Variables

#### Required Environment Variables
```bash
# .env.example - Sample environment configuration

# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database_name"
PGHOST="your-database-host"
PGPORT="5432" 
PGDATABASE="inventory_db"
PGUSER="your-username"
PGPASSWORD="your-password"

# Authentication
DEMO_USERNAME="admin"
DEMO_PASSWORD="admin123"
JWT_SECRET_KEY="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Application Settings
NODE_ENV="development"  # or "production"
DEBUG="true"           # Set to "false" in production
ALLOWED_HOSTS="localhost,127.0.0.1,your-domain.com"

# External Services (if applicable)
REDIS_URL="redis://localhost:6379"  # For session storage in production
SENTRY_DSN="https://your-sentry-dsn"  # For error tracking

# File Upload Settings
MAX_UPLOAD_SIZE="10485760"  # 10MB in bytes
ALLOWED_FILE_TYPES="pdf,xlsx,csv,jpg,png"
```

### Development vs Production Configuration

#### Development Setup
```json
// package.json - Development scripts
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "dev:frontend": "vite",
    "dev:backend": "cd backend && python simple_server.py",
    "dev:full": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "vite build",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

```python
# backend/settings/development.py
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Development database with local PostgreSQL
DATABASE_CONFIG = {
    'min_connections': 2,
    'max_connections': 10,  # Lower for development
    'connection_timeout': 30,
    'retry_attempts': 3
}

# Logging configuration for development
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

#### Production Configuration
```python
# backend/settings/production.py
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'api.your-domain.com']

# Production database with connection pooling
DATABASE_CONFIG = {
    'min_connections': 5,
    'max_connections': 25,  # Higher for production traffic
    'connection_timeout': 10,
    'retry_attempts': 3
}

# SSL and security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Logging to file and external service
import logging
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.FileHandler('/var/log/inventory/app.log'),
        logging.StreamHandler()
    ]
)
```

### Deployment Scripts

#### Docker Configuration
```dockerfile
# Dockerfile - Multi-stage build for production
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/client/package*.json ./
RUN npm ci --only=production
COPY frontend/client ./
RUN npm run build

FROM python:3.11-slim AS backend-build  
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./

FROM python:3.11-slim AS production
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend-build /app/backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user
RUN useradd --create-home --shell /bin/bash inventory
USER inventory

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

EXPOSE 8000
CMD ["python", "backend/simple_server.py"]
```

```yaml
# docker-compose.yml - Development environment
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: inventory_dev
      POSTGRES_USER: inventory_user
      POSTGRES_PASSWORD: inventory_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://inventory_user:inventory_pass@postgres:5432/inventory_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app/backend
      - ./frontend:/app/frontend
    command: ["python", "backend/simple_server.py"]

volumes:
  postgres_data:
  redis_data:
```

### Replit Deployment

#### Replit Configuration Files
```toml
# pyproject.toml - Python dependencies
[build-system]
requires = ["setuptools", "wheel"]

[project]
name = "inventory-management"
version = "1.0.0"
dependencies = [
    "django==4.2.7",
    "psycopg2-binary==2.9.7",
    "python-decouple==3.8",
    "bcrypt==4.0.1",
    "requests==2.31.0"
]
```

```bash
# .replit - Replit configuration
run = "npm run dev"
entrypoint = "backend/simple_server.py"

[languages.python]
pattern = "**/*.py"
syntax = "python"

[languages.typescript]
pattern = "**/*.{ts,tsx}"
syntax = "typescript"

[env]
PYTHONPATH = "/home/runner/inventory-management/backend"
NODE_ENV = "development"

[gitHubImport]
requiredFiles = [".replit", "pyproject.toml", "package.json"]

[deployment]
run = ["sh", "-c", "cd backend && python simple_server.py"]
deploymentTarget = "cloudrun"
```

### Database Migrations

#### Initial Database Setup
```sql
-- sql/01_initial_schema.sql
-- Core tables setup script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_by INTEGER DEFAULT 1
);

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description) VALUES 
    ('Cotton', 'Natural cotton fibers'),
    ('Synthetic', 'Man-made synthetic fibers'),
    ('Blends', 'Cotton-synthetic blended fibers');

-- [Additional table creation SQL...]
```

#### Migration Script
```python
# scripts/migrate_database.py
import os
import psycopg2
from decouple import config

def run_migration(migration_file):
    """Execute SQL migration file"""
    DATABASE_URL = config('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        with open(migration_file, 'r') as f:
            sql_commands = f.read()
            cursor.execute(sql_commands)
        
        conn.commit()
        print(f"✅ Migration {migration_file} completed successfully")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Migration {migration_file} failed: {str(e)}")
        raise e
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def main():
    """Run all pending migrations"""
    migrations_dir = 'sql/migrations'
    migration_files = sorted([
        f for f in os.listdir(migrations_dir) 
        if f.endswith('.sql')
    ])
    
    for migration_file in migration_files:
        file_path = os.path.join(migrations_dir, migration_file)
        run_migration(file_path)

if __name__ == "__main__":
    main()
```

### Monitoring & Health Checks

#### Application Health Check
```python
# backend/health_check.py
import psycopg2
import time
from django.http import JsonResponse
from database_storage import DatabaseManager

def health_check_view(request):
    """Comprehensive health check endpoint"""
    start_time = time.time()
    health_status = {
        'status': 'healthy',
        'timestamp': time.time(),
        'checks': {}
    }
    
    # Database connectivity check
    try:
        db_manager = DatabaseManager()
        db_start = time.time()
        db_manager.execute_query("SELECT 1", fetch_one=True)
        db_time = time.time() - db_start
        
        health_status['checks']['database'] = {
            'status': 'healthy',
            'response_time_ms': round(db_time * 1000, 2),
            'connection_pool_active': db_manager.get_connection_health()
        }
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
    
    # Memory and performance check
    import psutil
    health_status['checks']['system'] = {
        'memory_percent': psutil.virtual_memory().percent,
        'cpu_percent': psutil.cpu_percent(interval=0.1),
        'disk_usage': psutil.disk_usage('/').percent
    }
    
    # Response time check
    total_time = time.time() - start_time
    health_status['response_time_ms'] = round(total_time * 1000, 2)
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)
```

#### Logging Configuration
```python
# backend/logging_config.py
import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Configure application logging"""
    log_level = logging.DEBUG if os.getenv('DEBUG', 'false').lower() == 'true' else logging.INFO
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Console handler
            logging.StreamHandler(),
            
            # File handler with rotation
            RotatingFileHandler(
                'logs/app.log',
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            
            # Error-only file handler
            RotatingFileHandler(
                'logs/error.log',
                maxBytes=5*1024*1024,   # 5MB
                backupCount=3
            )
        ]
    )
    
    # Configure specific loggers
    db_logger = logging.getLogger('database')
    db_logger.setLevel(logging.INFO)
    
    api_logger = logging.getLogger('api')  
    api_logger.setLevel(logging.INFO)
```

### Production Checklist

#### Security Configuration
- [ ] Change default admin credentials
- [ ] Generate secure JWT secret key
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for specific domains
- [ ] Enable database connection SSL
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable audit logging

#### Performance Optimization
- [ ] Optimize database indexes
- [ ] Configure connection pooling
- [ ] Enable query caching
- [ ] Set up CDN for static assets
- [ ] Configure compression (gzip)
- [ ] Implement proper caching headers
- [ ] Monitor memory usage
- [ ] Set up database query monitoring

#### Monitoring & Alerting
- [ ] Configure error tracking (Sentry)
- [ ] Set up performance monitoring
- [ ] Configure database monitoring
- [ ] Create health check alerts
- [ ] Set up log aggregation
- [ ] Configure backup verification
- [ ] Monitor disk usage
- [ ] Set up uptime monitoring

---