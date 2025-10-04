# Purchase Orders Database Schema & CRUD Operations

## Visual Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PURCHASE ORDER SYSTEM DATABASE SCHEMA                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   suppliers     │    │   categories    │    │   products      │    │   audit_log     │
│─────────────────│    │─────────────────│    │─────────────────│    │─────────────────│
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ name            │    │ name            │    │ product_name    │    │ action          │
│ contact_person  │    │ description     │    │ category_id(FK) │    │ entity_type     │
│ phone           │    │ created_at      │    │ hsn_code        │    │ entity_id       │
│ email           │    │ updated_at      │    │ specification   │    │ user_id         │
│ address         │    │ created_by      │    │ is_active       │    │ timestamp       │
│ gst_number      │    │ updated_by      │    │ created_by      │    │ details (JSON)  │
│ pan_number      │    │                 │    │ created_at      │    │                 │
│ is_active       │    │                 │    │ updated_by      │    │                 │
│ created_by      │    │                 │    │ updated_at      │    │                 │
│ created_at      │    │                 │    │                 │    │                 │
│ updated_by      │    │                 │    │                 │    │                 │
│ updated_at      │    │                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       │                       │                       │
         │                       │                       │                       │
         └─────────────────┬─────────────────┬─────────────────┬─────────────────┘
                           │                 │                 │
                           ▼                 ▼                 ▼
                 ┌─────────────────┐         │         ┌─────────────────┐
                 │ purchase_orders │         │         │purchase_order_  │
                 │─────────────────│         │         │     items       │
                 │ id (PK)         │         │         │─────────────────│
                 │ po_number       │         │         │ id (PK)         │
                 │ supplier_id(FK) │─────────┘         │ po_id (FK)      │
                 │ order_date      │                   │ category_id(FK) │
                 │ status          │───────────────────│ product_id(FK)  │
                 │ total_items     │                   │ quantity_bags   │
                 │ total_value     │                   │ weight_kg       │
                 │ notes           │                   │ remarks         │
                 │ created_by      │                   │ created_at      │
                 │ created_at      │                   │                 │
                 │ updated_by      │                   │                 │
                 │ updated_at      │                   │                 │
                 │ is_deleted      │                   │                 │
                 └─────────────────┘                   └─────────────────┘
                           │                                   │
                           │                                   │
                           │        CASCADE DELETE             │
                           └───────────────────────────────────┘
```

## Database Schema Structure

### 1. Main Purchase Orders Table
```sql
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,  -- Format: PO/YYYY/MMM/DD/sequential_id
    supplier_id INTEGER REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Order Placed',
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

### 2. Purchase Order Items Table
```sql
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    product_id INTEGER REFERENCES products(id),
    quantity_bags INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Related Tables Referenced by Purchase Orders

#### Suppliers Table
```sql
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
```

#### Categories Table
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    updated_by INTEGER DEFAULT 1
);
```

#### Products Table
```sql
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
```

#### Audit Log Table
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE
    entity_type VARCHAR(50) NOT NULL,  -- PURCHASE_ORDER, SUPPLIER, etc.
    entity_id VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB DEFAULT '{}'
);
```

## CRUD Operations Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PURCHASE ORDER CRUD OPERATIONS FLOW                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

CREATE Operation:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Form   │────│ API Endpoint    │────│ Database Insert │────│ Audit Log      │
│ • Supplier      │    │ POST /api/      │    │ • purchase_     │    │ • CREATE action │
│ • Items Array   │    │ purchase-orders │    │   orders        │    │ • user_id       │
│ • Date & Notes  │    │ • Validation    │    │ • purchase_     │    │ • timestamp     │
└─────────────────┘    │ • Auth Check    │    │   order_items   │    │ • JSON details  │
                       └─────────────────┘    │ • Auto PO #     │    └─────────────────┘
                                             │ • Totals calc   │
                                             └─────────────────┘

READ Operation:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Table  │────│ API Endpoint    │────│ Database Query  │────│ Response Format │
│ • Search Filter │    │ GET /api/       │    │ • JOIN suppliers│    │ • JSON Array    │
│ • Status Filter │    │ purchase-orders │    │ • WHERE active  │    │ • Pagination    │
│ • Pagination    │    │ • Auth Check    │    │ • ORDER BY date │    │ • Supplier name │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘

UPDATE Operation:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Dialog │────│ API Endpoint    │────│ Database Update │────│ Audit Log      │
│ • Modified Data │    │ PUT /api/       │    │ • purchase_     │    │ • UPDATE action │
│ • Status Change │    │ purchase-orders │    │   orders        │    │ • old/new vals  │
│ • Notes Update  │    │ • Validation    │    │ • updated_at    │    │ • user_id       │
└─────────────────┘    │ • Auth Check    │    │ • updated_by    │    └─────────────────┘
                       └─────────────────┘    └─────────────────┘

DELETE Operation:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Action │────│ API Endpoint    │────│ Database Delete │────│ Audit Log      │
│ • Confirm Dialog│    │ DELETE /api/    │    │ • Soft delete   │    │ • DELETE action │
│ • User Warning  │    │ purchase-orders │    │ • is_deleted=T  │    │ • user_id       │
│ • Reason Code   │    │ • Auth Check    │    │ • CASCADE items │    │ • JSON details  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## CRUD Operations Impact on Database Tables

### 1. CREATE Purchase Order

**Frontend Action**: User creates a new purchase order with items
**Database Tables Affected**:

1. **purchase_orders** table:
   - INSERT new record with auto-generated PO number (PO/2025/JUL/13/1)
   - Links to supplier_id (foreign key reference)
   - Calculates total_items and total_value from items array
   - Sets created_by, created_at, updated_by, updated_at

2. **purchase_order_items** table:
   - INSERT multiple records (one per item)
   - Each item links to po_id (foreign key cascade)
   - References category_id and product_id (foreign keys)
   - Stores quantity_bags, weight_kg, remarks

3. **audit_log** table:
   - INSERT audit record for CREATE action
   - Records user_id, timestamp, and purchase order details

**SQL Example**:
```sql
-- Step 1: Insert main purchase order
INSERT INTO purchase_orders (po_number, supplier_id, order_date, total_items, total_value, created_by, updated_by)
VALUES ('PO/2025/JUL/13/1', 1, '2025-07-13', 3, 15000.00, 1, 1);

-- Step 2: Insert items (multiple records)
INSERT INTO purchase_order_items (po_id, category_id, product_id, quantity_bags, weight_kg, remarks)
VALUES 
  (1, 1, 1, 10, 500.00, 'High quality cotton'),
  (1, 1, 2, 15, 750.00, 'Premium grade'),
  (1, 2, 3, 20, 1000.00, 'Synthetic blend');

-- Step 3: Insert audit log
INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
VALUES ('CREATE', 'PURCHASE_ORDER', '1', 1, '{"po_number": "PO/2025/JUL/13/1", "supplier_id": 1}');
```

### 2. READ Purchase Orders

**Frontend Action**: User views purchase orders list
**Database Tables Queried**:

1. **purchase_orders** table: Main order data
2. **suppliers** table: JOIN for supplier name
3. **purchase_order_items** table: For item counts and details

**SQL Query**:
```sql
SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name,
       po.order_date, po.status, po.total_items, po.total_value, po.notes,
       po.created_at, po.updated_at, po.created_by, po.updated_by
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
WHERE po.is_deleted = FALSE
ORDER BY po.order_date DESC;
```

### 3. UPDATE Purchase Order

**Frontend Action**: User updates purchase order details
**Database Tables Affected**:

1. **purchase_orders** table:
   - UPDATE existing record
   - Changes fields like status, notes, total_value
   - Updates updated_by and updated_at timestamps

2. **purchase_order_items** table:
   - If items are modified: DELETE existing items, INSERT new ones
   - CASCADE DELETE ensures referential integrity

3. **audit_log** table:
   - INSERT audit record for UPDATE action
   - Records old and new values

### 4. DELETE Purchase Order

**Frontend Action**: User deletes a purchase order
**Database Tables Affected**:

1. **purchase_orders** table:
   - Soft delete: UPDATE is_deleted = TRUE
   - Or hard delete: DELETE record entirely

2. **purchase_order_items** table:
   - CASCADE DELETE automatically removes all related items
   - ON DELETE CASCADE foreign key constraint handles this

3. **audit_log** table:
   - INSERT audit record for DELETE action

## Status Workflow Impact

### Purchase Order Status Changes:
1. **Order Placed** → **Order Received** → **Order Cancelled** → **Converted to GRN**

When status changes to "Converted to GRN":
- **goods_receipts** table: New GRN record created
- **goods_receipt_items** table: Items copied from purchase order
- **inventory_lots** table: New stock entries created
- **inventory_transactions** table: Stock movement recorded

## Referential Integrity Constraints

### Foreign Key Relationships:
- `purchase_orders.supplier_id` → `suppliers.id`
- `purchase_order_items.po_id` → `purchase_orders.id` (CASCADE DELETE)
- `purchase_order_items.category_id` → `categories.id`
- `purchase_order_items.product_id` → `products.id`

### Cascade Effects:
1. **Delete Supplier**: Cannot delete if referenced by purchase orders
2. **Delete Category**: Cannot delete if referenced by purchase order items
3. **Delete Product**: Cannot delete if referenced by purchase order items
4. **Delete Purchase Order**: Automatically deletes all related items

## Performance Considerations

### Database Indexes:
- Primary keys: Automatic B-tree indexes
- Foreign keys: Recommended indexes for JOIN performance
- po_number: Unique constraint with index
- order_date: Index for date range queries

### Query Optimization:
- Use JOINs instead of separate queries for related data
- Implement pagination for large result sets
- Use WHERE clauses to filter deleted records
- Consider materialized views for complex aggregations

## Data Consistency Features

### Transactional Operations:
- All CRUD operations wrapped in database transactions
- Rollback on any failure ensures data consistency
- Connection pooling prevents resource exhaustion

### Audit Trail:
- Complete audit log for all changes
- User identification and timestamps
- JSON details for complex change tracking
- Compliance and debugging capabilities