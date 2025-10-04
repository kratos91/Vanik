# Inventory Management System

## Overview
This is a full-stack Inventory Management System for trading businesses dealing in natural and man-made yarns and fibers. It manages large-scale inventory operations across multiple warehouse locations, providing comprehensive solutions for inventory, sales, and work-in-progress (WIP) management. The system aims to streamline operations and provide real-time inventory insights.

## Recent Changes (Sales Order to Challan Inventory Fix Complete - August 3, 2025)
✅ **CRITICAL INVENTORY FLOW BUG RESOLVED: Sales Order to Challan Conversion**
- **Problem:** Sales order to challan conversion left stock in "committed" state instead of properly shipping it out
- **Root Cause:** System didn't release committed stock before creating outbound transactions during conversion
- **Solution:** Enhanced `convert_sales_order_to_challan` method to properly handle inventory transitions:
  - First releases committed stock using `unreserve_stock_for_sales_order`
  - Then performs OUTBOUND transactions for actual shipment
  - Uses correct warehouse location where stock was originally reserved
- **Authentication Fix:** Resolved JWT token authentication issues (credentials: admin/admin123)
- **Key Mapping Fix:** Fixed data structure conversion between sales order items and challan creation
- **Location Reference Fix:** Enhanced allocation method to include location_id in allocation results
- **Legacy Data Cleanup:** Released all remaining committed stock from previous incomplete conversions
- **UI Improvements:** Updated sales challan modal with requested improvements:
  - Removed duplicate X close button (DialogContent has built-in close)
  - Made quantity/weight/value input fields 20% smaller (changed grid layout from 12 to 15 columns)
  - Doubled the Remarks field size (changed from col-span-1 to col-span-2)
- **Verification:** Sales order SO/2025/AUG/03/3 successfully converted to challan SC/2025/AUG/03/7
- **Result:** Complete end-to-end inventory flow working correctly with proper audit trail

✅ **PREVIOUS FIX: Database Transaction Type Constraint Violation Resolved**
- **Problem:** Database constraint only allowed specific transaction types: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN']
- **Root Cause:** Code incorrectly used 'RESERVE' as transaction_type instead of reservation_type
- **Solution:** Changed reservation transactions to use 'ADJUSTMENT' as transaction_type while keeping 'RESERVE'/'UNRESERVE' as reservation_type values
- **Foreign Key Fix:** Removed problematic reservation_id foreign key reference that caused transaction ordering issues
- **Verification:** Sales order SO/2025/AUG/03/1 created successfully with 2kg stock reservation
- **Result:** Complete sales order creation flow now working end-to-end without database errors

✅ **MAJOR MILESTONE: Complete Data Population and Inventory System**
- Successfully created 21 Purchase Orders with realistic category-product relationships
- Generated 60+ GRNs with automatic inventory tracking and lot creation (LOT/2025/08/02/XX format)
- INBOUND inventory transactions working perfectly with real-time balance updates
- Successfully released 12,225kg committed stock back to available inventory (212,096kg total available)
- Stock reservation system functioning correctly - prevents overselling and validates available inventory
- Complete inventory integration between GRN creation and sales order validation
- Fixed code structure: moved stock-levels component to proper frontend/client/src/pages/ directory
- Restored three-level expandable hierarchy: category > product > lot details with conditional loading
- Fixed SelectItem value prop error and authentication headers for stock levels API

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript, utilizing Wouter for routing.
- **State Management**: TanStack Query (React Query) for server state with robust retry logic and exponential backoff.
- **UI Components**: Radix UI with Shadcn/ui system, styled using Tailwind CSS with a Material Design-inspired theme.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite.

### Backend Architecture
- **Runtime**: Python/Django.
- **Database Connection**: Enhanced PostgreSQL connection pool (2-25 connections) with auto-reconnection and comprehensive retry logic across database methods.
- **API Design**: RESTful endpoints with role-based access control.
- **Authentication**: JWT-based authentication with bcrypt for password hashing.
- **Middleware**: Custom logging, error handling, and authentication.

### Database Architecture
- **Database**: PostgreSQL hosted on Neon serverless.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema Organization**: PostgreSQL schemas for logical separation: `core` (users, roles, locations), `master_data` (products, suppliers, customers, processors), `inventory` (stock, transactions, GRN), `sales` (orders, challans), and `wip` (work-in-progress).

### Key Architectural Decisions
- **Monorepo Structure**: Shared TypeScript types between frontend and backend.
- **Schema Organization**: PostgreSQL schemas for modularity and maintainability.
- **Batch Inventory Management**: Lot-based tracking supporting FIFO/LIFO.
- **WIP Differentiation**: Separate transaction types for WIP vs. sales workflows.
- **Role-Based Security**: Granular permissions system.
- **Real-time State**: TanStack Query for optimistic updates and cache invalidation.
- **UI/UX Decisions**: Consistent refresh functionality, comprehensive editing modals, dynamic action controls, and consistent pagination across master data.

### Feature Specifications
- **Authentication & Authorization**: JWT tokens, role-based access control, session management.
- **Inventory Management**: Goods Receipt Notes (GRN), real-time stock levels, inventory lots, and transaction audit trails.
- **Sales Management**: Sales Orders, Sales Challans, and automated order fulfillment.
- **WIP Management**: Tracking goods sent to and received from external processors.
- **Master Data Management**: Products & SKUs with HSN codes, multi-warehouse locations, business partners (suppliers, customers, processors), and user management.
- **Data Flow**: Structured processes for inventory receipt, sales, and WIP, with real-time updates and audit trails.

## External Dependencies
### Frontend Dependencies
- **UI Framework**: React ecosystem, Radix UI, Shadcn/ui.
- **State Management**: TanStack Query.
- **Form Validation**: Zod.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.

### Backend Dependencies
- **Database**: Neon PostgreSQL.
- **ORM**: Drizzle ORM.
- **Authentication**: bcrypt, jsonwebtoken.
- **Validation**: Zod.
- **HTTP**: Express.js (though current backend is Python/Django, this implies historical or potential future integration).

### Development Dependencies
- **Build Tools**: Vite (frontend), esbuild (backend).
- **Type Checking**: TypeScript.
- **Database Migrations**: Drizzle Kit.