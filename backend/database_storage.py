#!/usr/bin/env python3
"""
Database storage implementation for persistent data
Properly implemented with connection pooling and error handling
"""

import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from datetime import datetime, timezone
import json
import time
from typing import Optional, Dict, List, Any, Union

class DatabaseConfig:
    """Configuration class for database settings"""
    # Connection pool settings
    MIN_CONNECTIONS = int(os.environ.get('DB_MIN_CONNECTIONS', '2'))
    MAX_CONNECTIONS = int(os.environ.get('DB_MAX_CONNECTIONS', '25'))
    CONNECTION_TIMEOUT = int(os.environ.get('DB_CONNECTION_TIMEOUT', '10'))
    
    # Retry settings
    MAX_RETRY_ATTEMPTS = int(os.environ.get('DB_MAX_RETRY_ATTEMPTS', '3'))
    RETRY_DELAY_BASE = float(os.environ.get('DB_RETRY_DELAY_BASE', '0.5'))
    
    # Application settings
    APP_NAME = os.environ.get('DB_APP_NAME', 'YarnFlow_Inventory_System')
    
    # Connection error patterns
    CONNECTION_ERROR_PATTERNS = [
        'ssl connection has been closed',
        'connection already closed', 
        'server closed the connection',
        'connection reset',
        'connection refused'
    ]


class DatabaseManager:
    """Optimized database manager with configurable settings and improved error handling"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern to ensure single instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.connection_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None
        self.connection_stats = {
            'total_queries': 0,
            'failed_queries': 0,
            'retry_attempts': 0,
            'pool_recreations': 0
        }
        self.config = DatabaseConfig()
        self.create_connection_pool()
        self.init_tables()
        self._initialized = True
    
    def create_connection_pool(self) -> None:
        """Create optimized connection pool with configurable settings"""
        try:
            # Close existing pool if it exists
            if self.connection_pool:
                try:
                    self.connection_pool.closeall()
                    print("🔄 Closed existing connection pool")
                except Exception:
                    pass
            
            self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                self.config.MIN_CONNECTIONS,
                self.config.MAX_CONNECTIONS,
                host=os.environ.get('PGHOST', 'localhost'),
                database=os.environ.get('PGDATABASE', 'postgres'),
                user=os.environ.get('PGUSER', 'postgres'),
                password=os.environ.get('PGPASSWORD', ''),
                port=os.environ.get('PGPORT', '5432'),
                connect_timeout=self.config.CONNECTION_TIMEOUT,
                application_name=self.config.APP_NAME
            )
            print(f"✅ Database connection pool created ({self.config.MIN_CONNECTIONS}-{self.config.MAX_CONNECTIONS} connections)")
            self.connection_stats['pool_recreations'] += 1
        except Exception as e:
            print(f"❌ Database connection pool creation failed: {e}")
            self.connection_pool = None
    
    def get_connection(self) -> Optional[psycopg2.extensions.connection]:
        """Get connection from pool with optimized retry logic"""
        if not self.connection_pool:
            self.create_connection_pool()
            if not self.connection_pool:
                return None
        
        try:
            return self.connection_pool.getconn()
        except Exception as e:
            print(f"❌ Failed to get connection from pool: {e}")
            self.create_connection_pool()
            if self.connection_pool:
                try:
                    return self.connection_pool.getconn()
                except Exception:
                    return None
            return None
    
    def return_connection(self, connection: Optional[psycopg2.extensions.connection]) -> None:
        """Return connection to pool safely"""
        if self.connection_pool and connection:
            try:
                self.connection_pool.putconn(connection)
            except Exception as e:
                print(f"❌ Failed to return connection to pool: {e}")
    
    def execute_query(self, query: str, params: Optional[tuple] = None, 
                     fetch_all: bool = False, fetch_one: bool = False) -> Optional[Any]:
        """Execute query with optimized retry logic and connection recovery"""
        self.connection_stats['total_queries'] += 1
        
        for attempt in range(self.config.MAX_RETRY_ATTEMPTS):
            connection = None
            cursor = None
            try:
                # Exponential backoff for retry attempts
                if attempt > 0:
                    delay = self.config.RETRY_DELAY_BASE * attempt
                    print(f"♻️ Retrying query (attempt {attempt + 1}/{self.config.MAX_RETRY_ATTEMPTS})")
                    time.sleep(delay)
                    self.connection_stats['retry_attempts'] += 1
                    self.create_connection_pool()
                
                connection = self.get_connection()
                if not connection:
                    if attempt == self.config.MAX_RETRY_ATTEMPTS - 1:
                        print(f"❌ Failed to get database connection after {self.config.MAX_RETRY_ATTEMPTS} attempts")
                        return None
                    continue
                
                # Optimized connection health check
                if not self._is_connection_healthy(connection):
                    self.return_connection(connection)
                    self.create_connection_pool()
                    connection = self.get_connection()
                    if not connection:
                        continue
                
                cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cursor.execute(query, params)
                
                # Optimize result fetching
                result = self._fetch_result(cursor, fetch_all, fetch_one)
                
                connection.commit()
                
                if attempt > 0:
                    print(f"✅ Query succeeded on attempt {attempt + 1}")
                
                return result
                
            except Exception as e:
                self._handle_query_error(e, connection, attempt)
                
                # Check if should retry
                if self._should_retry_error(e, attempt):
                    continue
                
                # Last attempt failed
                if attempt == self.config.MAX_RETRY_ATTEMPTS - 1:
                    print(f"❌ Query failed after {self.config.MAX_RETRY_ATTEMPTS} attempts")
                    self.connection_stats['failed_queries'] += 1
                    return None
                    
            finally:
                if cursor:
                    try:
                        cursor.close()
                    except Exception:
                        pass
                if connection:
                    self.return_connection(connection)
        
        return None
    
    def _is_connection_healthy(self, connection: psycopg2.extensions.connection) -> bool:
        """Check if connection is healthy and ready for use"""
        try:
            # Simple health check - access connection properties
            connection.isolation_level
            return True
        except Exception:
            print("⚠️ Stale connection detected")
            return False
    
    def _fetch_result(self, cursor: psycopg2.extras.RealDictCursor, 
                     fetch_all: bool, fetch_one: bool) -> Any:
        """Optimized result fetching based on fetch type"""
        if fetch_all:
            return cursor.fetchall()
        elif fetch_one:
            return cursor.fetchone()
        else:
            return cursor.rowcount
    
    def _handle_query_error(self, error: Exception, connection: Optional[psycopg2.extensions.connection], 
                           attempt: int) -> None:
        """Handle query execution errors with proper cleanup"""
        print(f"❌ Database query failed (attempt {attempt + 1}/{self.config.MAX_RETRY_ATTEMPTS}): {error}")
        
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass  # Connection might be dead
    
    def _should_retry_error(self, error: Exception, attempt: int) -> bool:
        """Determine if error should trigger a retry"""
        if attempt >= self.config.MAX_RETRY_ATTEMPTS - 1:
            return False
            
        error_msg = str(error).lower()
        is_connection_error = any(pattern in error_msg for pattern in self.config.CONNECTION_ERROR_PATTERNS)
        
        if is_connection_error:
            print("🔄 Connection error detected, will retry with fresh connection")
            return True
        
        return False
    
    def get_connection_health(self) -> Dict[str, Any]:
        """Get optimized connection pool health statistics"""
        total = self.connection_stats['total_queries']
        failed = self.connection_stats['failed_queries'] 
        success_rate = ((total - failed) / total * 100) if total > 0 else 100
        
        return {
            'total_queries': total,
            'failed_queries': failed,
            'success_rate': f"{success_rate:.1f}%",
            'retry_attempts': self.connection_stats['retry_attempts'],
            'pool_recreations': self.connection_stats['pool_recreations'],
            'pool_status': 'healthy' if self.connection_pool else 'failed',
            'config': {
                'min_connections': self.config.MIN_CONNECTIONS,
                'max_connections': self.config.MAX_CONNECTIONS,
                'max_retries': self.config.MAX_RETRY_ATTEMPTS
            }
        }
    
    def init_tables(self):
        """Initialize database tables if they don't exist"""
        connection = self.get_connection()
        if not connection:
            return
        
        try:
            cursor = connection.cursor()
            
            # Categories table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER DEFAULT 1,
                    updated_by INTEGER DEFAULT 1
                )
            """)
            
            # Drop existing products table if it has UUID primary key and recreate with BIGSERIAL
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'products' AND column_name = 'id'
            """)
            existing_column = cursor.fetchone()
            
            if existing_column and existing_column[1] == 'uuid':
                print("🔄 Converting products table from UUID to BIGSERIAL...")
                cursor.execute("DROP TABLE IF EXISTS products CASCADE")
            
            # Products table with BIGSERIAL primary key
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id BIGSERIAL PRIMARY KEY,
                    product_name VARCHAR(200) UNIQUE NOT NULL,
                    category_id INTEGER REFERENCES categories(id),
                    hsn_code VARCHAR(20),
                    specification TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Audit log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id SERIAL PRIMARY KEY,
                    action VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(100) NOT NULL,
                    user_id INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    details JSONB DEFAULT '{}'
                )
            """)

            # Purchase Orders table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id SERIAL PRIMARY KEY,
                    po_number VARCHAR(50) UNIQUE NOT NULL,
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
                )
            """)

            # Purchase Order Items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS purchase_order_items (
                    id SERIAL PRIMARY KEY,
                    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
                    category_id INTEGER REFERENCES categories(id),
                    product_id INTEGER REFERENCES products(id),
                    quantity_bags INTEGER NOT NULL,
                    weight_kg DECIMAL(10,2) NOT NULL,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Sales Orders table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sales_orders (
                    id SERIAL PRIMARY KEY,
                    so_number VARCHAR(50) UNIQUE NOT NULL,
                    customer_id INTEGER REFERENCES customers(id),
                    order_date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'New',
                    total_items INTEGER DEFAULT 0,
                    total_value DECIMAL(15,2) DEFAULT 0,
                    notes TEXT,
                    converted_to_challan BOOLEAN DEFAULT FALSE,
                    created_by INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER DEFAULT 1,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_deleted BOOLEAN DEFAULT FALSE
                )
            """)
            
            # Add converted_to_challan column if it doesn't exist (for existing installations)
            try:
                cursor.execute("""
                    ALTER TABLE sales_orders 
                    ADD COLUMN IF NOT EXISTS converted_to_challan BOOLEAN DEFAULT FALSE
                """)
            except Exception as e:
                print(f"Note: Column converted_to_challan might already exist: {e}")
                
            # Drop existing constraint first, then update data
            try:
                # Drop any existing status constraints first
                cursor.execute("""
                    ALTER TABLE sales_orders 
                    DROP CONSTRAINT IF EXISTS sales_orders_status_check
                """)
                cursor.execute("""
                    ALTER TABLE sales_orders 
                    DROP CONSTRAINT IF EXISTS chk_sales_order_status
                """)
                print("✅ Dropped existing status constraints")
                
                # Update existing invalid statuses to valid ones
                cursor.execute("""
                    UPDATE sales_orders 
                    SET status = CASE 
                        WHEN status IN ('Processing', 'Dispatched') THEN 'Delivered'
                        WHEN status = 'Pending' THEN 'New'
                        WHEN status NOT IN ('New', 'Delivered', 'Cancelled') THEN 'New'
                        ELSE status 
                    END
                    WHERE status NOT IN ('New', 'Delivered', 'Cancelled')
                """)
                print("✅ Updated invalid sales order statuses to valid values")
                
                # Add new status constraint
                cursor.execute("""
                    ALTER TABLE sales_orders 
                    ADD CONSTRAINT sales_orders_status_check 
                    CHECK (status IN ('New', 'Delivered', 'Cancelled'))
                """)
                print("✅ Added status constraint for sales orders")
            except Exception as e:
                print(f"Note: Status constraint handling: {e}")

            # Sales Order Items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sales_order_items (
                    id SERIAL PRIMARY KEY,
                    so_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
                    category_id INTEGER REFERENCES categories(id),
                    product_id INTEGER REFERENCES products(id),
                    quantity_bags INTEGER NOT NULL,
                    weight_kg DECIMAL(10,2) NOT NULL,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Job Orders table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS job_orders (
                    id SERIAL PRIMARY KEY,
                    jo_number VARCHAR(50) UNIQUE NOT NULL,
                    processor_id INTEGER REFERENCES processors(id),
                    order_date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'In-Progress',
                    total_items INTEGER DEFAULT 0,
                    estimated_value DECIMAL(15,2) DEFAULT 0,
                    notes TEXT,
                    created_by INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER DEFAULT 1,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_deleted BOOLEAN DEFAULT FALSE
                )
            """)

            # Job Order Items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS job_order_items (
                    id SERIAL PRIMARY KEY,
                    jo_id INTEGER REFERENCES job_orders(id) ON DELETE CASCADE,
                    category_id INTEGER REFERENCES categories(id),
                    product_id INTEGER REFERENCES products(id),
                    quantity_bags INTEGER NOT NULL,
                    weight_kg DECIMAL(10,2) NOT NULL,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Sales Challans table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sales_challans (
                    id SERIAL PRIMARY KEY,
                    sc_number VARCHAR(50) UNIQUE NOT NULL,
                    customer_id INTEGER REFERENCES customers(id),
                    challan_date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'New',
                    total_items INTEGER DEFAULT 0,
                    total_value DECIMAL(15,2) DEFAULT 0,
                    notes TEXT,
                    created_by INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER DEFAULT 1,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_deleted BOOLEAN DEFAULT FALSE
                )
            """)

            # Sales Challan Items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sales_challan_items (
                    id SERIAL PRIMARY KEY,
                    sc_id INTEGER REFERENCES sales_challans(id) ON DELETE CASCADE,
                    category_id INTEGER REFERENCES categories(id),
                    product_id INTEGER REFERENCES products(id),
                    quantity_bags INTEGER NOT NULL,
                    weight_kg DECIMAL(10,2) NOT NULL,
                    estimated_value DECIMAL(15,2) DEFAULT 0,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            connection.commit()
            
            # Skip automatic initial data loading - let users add their own data
            # cursor.execute("SELECT COUNT(*) FROM categories")
            # count = cursor.fetchone()[0]
            
            # if count == 0:
            #     initial_categories = [
            #         ("Cotton Yarn", "High-quality cotton yarn for textile manufacturing"),
            #         ("Synthetic Fibers", "Polyester and nylon synthetic fibers for various applications"),
            #         ("Wool Products", "Natural wool fibers and woolen products")
            #     ]
            #     
            #     for name, description in initial_categories:
            #         cursor.execute("""
            #             INSERT INTO categories (name, description, created_at, updated_at, created_by, updated_by)
            #             VALUES (%s, %s, %s, %s, %s, %s)
            #         """, (name, description, '2025-06-29T12:00:00Z', '2025-06-29T12:00:00Z', 1, 1))
            #     
            #     connection.commit()
            #     print("✅ Initial category data loaded")
            
            cursor.close()
            
        except Exception as e:
            print(f"❌ Table initialization failed: {e}")
            if connection:
                connection.rollback()
        finally:
            self.return_connection(connection)
    
    def get_categories(self):
        """Get all categories from database with enhanced retry logic"""
        print("🔍 Getting categories...")
        
        # Try with retry mechanism - leverages enhanced execute_query
        for attempt in range(3):
            try:
                categories = self.execute_query("""
                    SELECT id, name, description, 
                           created_at as "createdAt", 
                           updated_at as "updatedAt",
                           created_by as "createdBy",
                           updated_by as "updatedBy"
                    FROM categories 
                    ORDER BY id
                """, fetch_all=True)
                
                if categories is None:
                    if attempt == 2:  # Last attempt
                        print("⚠️ No categories found after all retries")
                        return []
                    continue
                
                # Convert to list of dicts and format timestamps
                result = []
                for cat in categories:
                    cat_dict = dict(cat)
                    if cat_dict['createdAt']:
                        cat_dict['createdAt'] = cat_dict['createdAt'].isoformat() + 'Z'
                    if cat_dict['updatedAt']:
                        cat_dict['updatedAt'] = cat_dict['updatedAt'].isoformat() + 'Z'
                    result.append(cat_dict)
                
                print(f"✅ Retrieved {len(result)} categories successfully")
                return result
                
            except Exception as e:
                print(f"❌ Failed to get categories (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    return []
                continue
        
        return []  # Return empty list instead of fallback data
    
    def create_category(self, name, description, user_id):
        """Create a new category"""
        try:
            # Check for duplicate names first
            existing = self.execute_query(
                "SELECT id FROM categories WHERE LOWER(name) = LOWER(%s)",
                (name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A category with this name already exists'}
            
            # Insert new category
            current_time = datetime.utcnow().isoformat() + 'Z'
            result = self.execute_query("""
                INSERT INTO categories (name, description, created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt", 
                         created_by as "createdBy", updated_by as "updatedBy"
            """, (name, description, current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                category = dict(result)
                category['createdAt'] = category['createdAt'].isoformat() + 'Z'
                category['updatedAt'] = category['updatedAt'].isoformat() + 'Z'
                
                # Log audit event
                self.log_audit_event('CREATE', 'CATEGORY', category['id'], user_id, {
                    'name': category['name'],
                    'description': category['description']
                })
                
                return category
            else:
                return {'error': 'Failed to create category'}
                
        except Exception as e:
            print(f"❌ Failed to create category: {e}")
            return {'error': 'Database error occurred'}
    
    def update_category(self, category_id, name, description, user_id):
        """Update an existing category"""
        try:
            # Get existing category
            existing = self.execute_query(
                "SELECT * FROM categories WHERE id = %s",
                (category_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Category not found'}
            
            # Store old values for audit
            old_values = {'name': existing['name'], 'description': existing['description']}
            
            # Check for duplicate names (exclude current category)
            if name:
                duplicate = self.execute_query(
                    "SELECT id FROM categories WHERE LOWER(name) = LOWER(%s) AND id != %s",
                    (name, category_id),
                    fetch_one=True
                )
                if duplicate:
                    return {'error': 'A category with this name already exists'}
            
            # Update category
            current_time = datetime.utcnow().isoformat() + 'Z'
            
            # Prepare update fields
            update_name = name if name is not None else existing['name']
            update_description = description if description is not None else existing['description']
            
            result = self.execute_query("""
                UPDATE categories 
                SET name = %s, description = %s, updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, name, description, created_at as "createdAt", updated_at as "updatedAt",
                         created_by as "createdBy", updated_by as "updatedBy"
            """, (update_name, update_description, current_time, user_id, category_id), fetch_one=True)
            
            if result:
                category = dict(result)
                category['createdAt'] = category['createdAt'].isoformat() + 'Z'
                category['updatedAt'] = category['updatedAt'].isoformat() + 'Z'
                
                # Log audit event
                self.log_audit_event('UPDATE', 'CATEGORY', category_id, user_id, {
                    'oldValues': old_values,
                    'newValues': {'name': category['name'], 'description': category['description']}
                })
                
                return category
            else:
                return {'error': 'Failed to update category'}
                
        except Exception as e:
            print(f"❌ Failed to update category: {e}")
            return {'error': 'Database error occurred'}
    
    def delete_category(self, category_id, user_id):
        """Delete a category"""
        try:
            # Get category details for audit before deletion
            category = self.execute_query(
                "SELECT * FROM categories WHERE id = %s",
                (category_id,),
                fetch_one=True
            )
            
            if not category:
                return {'error': 'Category not found'}
            
            # Delete category
            result = self.execute_query(
                "DELETE FROM categories WHERE id = %s",
                (category_id,)
            )
            
            if result and result > 0:
                # Log audit event
                self.log_audit_event('DELETE', 'CATEGORY', category_id, user_id, {
                    'deletedCategory': {
                        'name': category['name'],
                        'description': category['description']
                    }
                })
                
                return {'message': 'Category deleted successfully'}
            else:
                return {'error': 'Failed to delete category'}
                
        except Exception as e:
            print(f"❌ Failed to delete category: {e}")
            return {'error': 'Database error occurred'}
    
    def log_audit_event(self, action, entity_type, entity_id, user_id, details=None):
        """Log an audit event to the database"""
        try:
            self.execute_query("""
                INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
                VALUES (%s, %s, %s, %s, %s)
            """, (action, entity_type, entity_id, user_id, json.dumps(details or {})))
            
        except Exception as e:
            print(f"❌ Failed to log audit event: {e}")
    
    def get_products(self):
        """Get all products from database with enhanced retry logic"""
        print("🔍 Getting products...")
        
        for attempt in range(3):
            try:
                products = self.execute_query("""
                    SELECT p.id, p.product_name, p.category_id, c.name as category_name,
                           p.hsn_code, p.specification, p.is_active,
                           p.created_at as "createdAt", 
                           p.updated_at as "updatedAt",
                           p.created_by as "createdBy",
                           p.updated_by as "updatedBy"
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.is_active = true
                    ORDER BY p.product_name
                """, fetch_all=True)
                
                if products is None:
                    if attempt == 2:
                        print("⚠️ No products found after all retries")
                        return []
                    continue
                
                # Format timestamps
                result = []
                for product in products:
                    product_dict = dict(product)
                    product_dict['createdAt'] = product_dict['createdAt'].isoformat() + 'Z' if product_dict['createdAt'] else None
                    product_dict['updatedAt'] = product_dict['updatedAt'].isoformat() + 'Z' if product_dict['updatedAt'] else None
                    result.append(product_dict)
                
                print(f"✅ Retrieved {len(result)} products successfully")
                return result
                
            except Exception as e:
                print(f"❌ Failed to get products (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    return []
                continue
        
        return []
    
    def create_product(self, product_name, category_id, hsn_code, specification, user_id):
        """Create a new product"""
        try:
            # Check for duplicate names first
            existing = self.execute_query(
                "SELECT id FROM products WHERE LOWER(product_name) = LOWER(%s)",
                (product_name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A product with this name already exists'}
            
            # Insert new product
            current_time = datetime.utcnow().isoformat() + 'Z'
            result = self.execute_query("""
                INSERT INTO products (product_name, category_id, hsn_code, specification, created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, product_name, category_id, hsn_code, specification, created_at as "createdAt", updated_at as "updatedAt", 
                         created_by as "createdBy", updated_by as "updatedBy"
            """, (product_name, category_id, hsn_code, specification, current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                product = dict(result)
                product['createdAt'] = product['createdAt'].isoformat() + 'Z'
                product['updatedAt'] = product['updatedAt'].isoformat() + 'Z'
                
                # Log audit event
                self.log_audit_event('CREATE', 'PRODUCT', product['id'], user_id, {
                    'product_name': product['product_name'],
                    'category_id': product['category_id'],
                    'hsn_code': product['hsn_code']
                })
                
                return product
            else:
                return {'error': 'Failed to create product'}
                
        except Exception as e:
            print(f"❌ Failed to create product: {e}")
            return {'error': 'Database error occurred'}
    
    def update_product(self, product_id, product_name, category_id, hsn_code, specification, user_id):
        """Update an existing product"""
        try:
            # Get existing product
            existing = self.execute_query(
                "SELECT id FROM products WHERE id = %s AND is_active = true",
                (product_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Product not found'}
            
            # Check for duplicate names (excluding current product)
            duplicate = self.execute_query(
                "SELECT id FROM products WHERE LOWER(product_name) = LOWER(%s) AND id != %s",
                (product_name, product_id),
                fetch_one=True
            )
            
            if duplicate:
                return {'error': 'A product with this name already exists'}
            
            # Update product
            current_time = datetime.utcnow().isoformat() + 'Z'
            result = self.execute_query("""
                UPDATE products 
                SET product_name = %s, category_id = %s, hsn_code = %s, specification = %s, 
                    updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, product_name, category_id, hsn_code, specification, updated_at as "updatedAt", updated_by as "updatedBy"
            """, (product_name, category_id, hsn_code, specification, current_time, user_id, product_id), fetch_one=True)
            
            if result:
                product = dict(result)
                product['updatedAt'] = product['updatedAt'].isoformat() + 'Z'
                
                # Log audit event
                self.log_audit_event('UPDATE', 'PRODUCT', product_id, user_id, {
                    'product_name': product_name,
                    'category_id': category_id,
                    'hsn_code': hsn_code
                })
                
                return product
            else:
                return {'error': 'Failed to update product'}
                
        except Exception as e:
            print(f"❌ Failed to update product: {e}")
            return {'error': 'Database error occurred'}
    
    def delete_product(self, product_id, user_id):
        """Delete a product (soft delete)"""
        try:
            # Check if product exists
            existing = self.execute_query(
                "SELECT product_name FROM products WHERE id = %s AND is_active = true",
                (product_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Product not found'}
            
            # Soft delete
            current_time = datetime.utcnow().isoformat() + 'Z'
            rowcount = self.execute_query("""
                UPDATE products 
                SET is_active = false, updated_at = %s, updated_by = %s
                WHERE id = %s
            """, (current_time, user_id, product_id))
            
            if rowcount and rowcount > 0:
                # Log audit event
                self.log_audit_event('DELETE', 'PRODUCT', str(product_id), user_id, {
                    'product_name': existing['product_name']
                })
                
                return {'message': 'Product deleted successfully'}
            else:
                return {'error': 'Failed to delete product'}
                
        except Exception as e:
            print(f"❌ Failed to delete product: {e}")
            return {'error': 'Database error occurred'}

    def get_audit_logs(self):
        """Get all audit logs"""
        try:
            logs = self.execute_query("""
                SELECT id, action, entity_type, entity_id, user_id, timestamp, details
                FROM audit_log 
                ORDER BY timestamp DESC 
                LIMIT 100
            """, fetch_all=True)
            
            if logs is None:
                return []
            
            # Format timestamps and parse details
            result = []
            for log in logs:
                log_dict = dict(log)
                log_dict['timestamp'] = log_dict['timestamp'].isoformat() + 'Z'
                if isinstance(log_dict['details'], str):
                    try:
                        log_dict['details'] = json.loads(log_dict['details'])
                    except:
                        log_dict['details'] = {}
                result.append(log_dict)
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get audit logs: {e}")
            return []
    
    def _get_fallback_categories(self):
        """Fallback in-memory categories if database is not available"""
        return [
            {
                'id': 1,
                'name': 'Cotton Yarn',
                'description': 'High-quality cotton yarn for textile manufacturing',
                'createdAt': '2025-06-29T12:00:00Z',
                'updatedAt': '2025-06-29T12:00:00Z',
                'createdBy': 1,
                'updatedBy': 1
            },
            {
                'id': 2,
                'name': 'Synthetic Fibers',
                'description': 'Polyester and nylon synthetic fibers for various applications',
                'createdAt': '2025-06-29T12:00:00Z',
                'updatedAt': '2025-06-29T12:00:00Z',
                'createdBy': 1,
                'updatedBy': 1
            },
            {
                'id': 3,
                'name': 'Wool Products',
                'description': 'Natural wool fibers and woolen products',
                'createdAt': '2025-06-29T12:00:00Z',
                'updatedAt': '2025-06-29T12:00:00Z',
                'createdBy': 1,
                'updatedBy': 1
            }
        ]

    # ========== SUPPLIERS METHODS ==========
    def get_suppliers(self):
        """Get all suppliers from database"""
        try:
            result = self.execute_query("""
                SELECT id, name, contact_person, phone, email, address, gst_number, pan_number,
                       is_active, created_at, updated_at, created_by, updated_by
                FROM suppliers
                WHERE is_active = true
                ORDER BY name
            """, fetch_all=True)
            
            if result is None:
                return []
            
            # Convert to list of dicts (result is already dict objects from RealDictCursor)
            suppliers = []
            for row in result:
                suppliers.append({
                    'id': row['id'],
                    'name': row['name'],
                    'contactPerson': row['contact_person'],
                    'phone': row['phone'],
                    'email': row['email'],
                    'address': row['address'],
                    'gstNumber': row['gst_number'],
                    'panNumber': row['pan_number'],
                    'isActive': row['is_active'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedBy': row['updated_by']
                })
            
            return suppliers
            
        except Exception as e:
            print(f"❌ Failed to get suppliers: {e}")
            return []

    def create_supplier(self, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Create a new supplier"""
        try:
            print(f"🔍 Creating supplier: name={name}, contact_person={contact_person}, user_id={user_id}")
            
            # Check for duplicate names
            existing = self.execute_query(
                "SELECT id FROM suppliers WHERE LOWER(name) = LOWER(%s)",
                (name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A supplier with this name already exists'}
            
            # Insert new supplier
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                INSERT INTO suppliers (name, contact_person, phone, email, address, gst_number, pan_number, 
                                     created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                supplier = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('CREATE', 'SUPPLIER', supplier['id'], user_id, {
                    'name': supplier['name']
                })
                
                return supplier
            else:
                return {'error': 'Failed to create supplier'}
                
        except Exception as e:
            print(f"❌ Failed to create supplier: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    def update_supplier(self, supplier_id, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Update an existing supplier"""
        try:
            # Get existing supplier
            existing = self.execute_query(
                "SELECT id FROM suppliers WHERE id = %s AND is_active = true",
                (supplier_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Supplier not found'}
            
            # Check for duplicate names (excluding current supplier)
            duplicate = self.execute_query(
                "SELECT id FROM suppliers WHERE LOWER(name) = LOWER(%s) AND id != %s",
                (name, supplier_id),
                fetch_one=True
            )
            
            if duplicate:
                return {'error': 'A supplier with this name already exists'}
            
            # Update supplier
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE suppliers 
                SET name = %s, contact_person = %s, phone = %s, email = %s, address = %s, 
                    gst_number = %s, pan_number = %s, updated_at = %s, updated_by = %s
                WHERE id = %s AND is_active = true
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, user_id, supplier_id), fetch_one=True)
            
            if result:
                supplier = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('UPDATE', 'SUPPLIER', supplier['id'], user_id, {
                    'name': supplier['name']
                })
                
                return supplier
            else:
                return {'error': 'Failed to update supplier'}
                
        except Exception as e:
            print(f"❌ Failed to update supplier: {e}")
            return {'error': 'Database error occurred'}

    def delete_supplier(self, supplier_id, user_id):
        """Delete a supplier (soft delete)"""
        try:
            # Get existing supplier
            existing = self.execute_query(
                "SELECT id, name FROM suppliers WHERE id = %s AND is_active = true",
                (supplier_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Supplier not found'}
            
            # Soft delete supplier
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE suppliers 
                SET is_active = false, updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, name
            """, (current_time, user_id, supplier_id), fetch_one=True)
            
            if result:
                # Log audit event
                self.log_audit_event('DELETE', 'SUPPLIER', result['id'], user_id, {
                    'name': result['name']
                })
                
                return {'message': 'Supplier deleted successfully'}
            else:
                return {'error': 'Failed to delete supplier'}
                
        except Exception as e:
            print(f"❌ Failed to delete supplier: {e}")
            return {'error': 'Database error occurred'}

    # ========== CUSTOMERS METHODS ==========
    def get_customers(self):
        """Get all customers from database"""
        try:
            result = self.execute_query("""
                SELECT id, name, contact_person, phone, email, address, gst_number, pan_number,
                       is_active, created_at, updated_at, created_by, updated_by
                FROM customers
                WHERE is_active = true
                ORDER BY name
            """, fetch_all=True)
            
            if result is None:
                return []
            
            # Convert to list of dicts (result is already dict objects from RealDictCursor)
            customers = []
            for row in result:
                customers.append({
                    'id': row['id'],
                    'name': row['name'],
                    'contactPerson': row['contact_person'],
                    'phone': row['phone'],
                    'email': row['email'],
                    'address': row['address'],
                    'gstNumber': row['gst_number'],
                    'panNumber': row['pan_number'],
                    'isActive': row['is_active'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedBy': row['updated_by']
                })
            
            return customers
            
        except Exception as e:
            print(f"❌ Failed to get customers: {e}")
            return []

    def create_customer(self, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Create a new customer"""
        try:
            # Check for duplicate names
            existing = self.execute_query(
                "SELECT id FROM customers WHERE LOWER(name) = LOWER(%s)",
                (name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A customer with this name already exists'}
            
            # Insert new customer
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                INSERT INTO customers (name, contact_person, phone, email, address, gst_number, pan_number, 
                                     created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                customer = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('CREATE', 'CUSTOMER', customer['id'], user_id, {
                    'name': customer['name']
                })
                
                return customer
            else:
                return {'error': 'Failed to create customer'}
                
        except Exception as e:
            print(f"❌ Failed to create customer: {e}")
            return {'error': 'Database error occurred'}

    def update_customer(self, customer_id, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Update an existing customer"""
        try:
            # Get existing customer
            existing = self.execute_query(
                "SELECT id FROM customers WHERE id = %s AND is_active = true",
                (customer_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Customer not found'}
            
            # Check for duplicate names (excluding current customer)
            duplicate = self.execute_query(
                "SELECT id FROM customers WHERE LOWER(name) = LOWER(%s) AND id != %s",
                (name, customer_id),
                fetch_one=True
            )
            
            if duplicate:
                return {'error': 'A customer with this name already exists'}
            
            # Update customer
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE customers 
                SET name = %s, contact_person = %s, phone = %s, email = %s, address = %s, 
                    gst_number = %s, pan_number = %s, updated_at = %s, updated_by = %s
                WHERE id = %s AND is_active = true
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, user_id, customer_id), fetch_one=True)
            
            if result:
                customer = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('UPDATE', 'CUSTOMER', customer['id'], user_id, {
                    'name': customer['name']
                })
                
                return customer
            else:
                return {'error': 'Failed to update customer'}
                
        except Exception as e:
            print(f"❌ Failed to update customer: {e}")
            return {'error': 'Database error occurred'}

    def delete_customer(self, customer_id, user_id):
        """Delete a customer (soft delete)"""
        try:
            # Get existing customer
            existing = self.execute_query(
                "SELECT id, name FROM customers WHERE id = %s AND is_active = true",
                (customer_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Customer not found'}
            
            # Soft delete customer
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE customers 
                SET is_active = false, updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, name
            """, (current_time, user_id, customer_id), fetch_one=True)
            
            if result:
                # Log audit event
                self.log_audit_event('DELETE', 'CUSTOMER', result['id'], user_id, {
                    'name': result['name']
                })
                
                return {'message': 'Customer deleted successfully'}
            else:
                return {'error': 'Failed to delete customer'}
                
        except Exception as e:
            print(f"❌ Failed to delete customer: {e}")
            return {'error': 'Database error occurred'}

    # ========== PROCESSORS METHODS ==========
    def get_processors(self):
        """Get all processors from database"""
        try:
            result = self.execute_query("""
                SELECT id, name, contact_person, phone, email, address, gst_number, pan_number,
                       is_active, created_at, updated_at, created_by, updated_by
                FROM processors
                WHERE is_active = true
                ORDER BY name
            """, fetch_all=True)
            
            if result is None:
                return []
            
            # Convert to list of dicts (result is already dict objects from RealDictCursor)
            processors = []
            for row in result:
                processors.append({
                    'id': row['id'],
                    'name': row['name'],
                    'contactPerson': row['contact_person'],
                    'phone': row['phone'],
                    'email': row['email'],
                    'address': row['address'],
                    'gstNumber': row['gst_number'],
                    'panNumber': row['pan_number'],
                    'isActive': row['is_active'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedBy': row['updated_by']
                })
            
            return processors
            
        except Exception as e:
            print(f"❌ Failed to get processors: {e}")
            return []

    def create_processor(self, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Create a new processor"""
        try:
            # Check for duplicate names
            existing = self.execute_query(
                "SELECT id FROM processors WHERE LOWER(name) = LOWER(%s)",
                (name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A processor with this name already exists'}
            
            # Insert new processor
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                INSERT INTO processors (name, contact_person, phone, email, address, gst_number, pan_number, 
                                      created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                processor = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('CREATE', 'PROCESSOR', processor['id'], user_id, {
                    'name': processor['name']
                })
                
                return processor
            else:
                return {'error': 'Failed to create processor'}
                
        except Exception as e:
            print(f"❌ Failed to create processor: {e}")
            return {'error': 'Database error occurred'}

    def update_processor(self, processor_id, name, contact_person, phone, email, address, gst_number, pan_number, user_id):
        """Update an existing processor"""
        try:
            print(f"🔍 Updating processor: id={processor_id}, name={name}, user_id={user_id}")
            
            # Get existing processor
            existing = self.execute_query(
                "SELECT id FROM processors WHERE id = %s AND is_active = true",
                (processor_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Processor not found'}
            
            # Check for duplicate names (excluding current processor)
            duplicate = self.execute_query(
                "SELECT id FROM processors WHERE LOWER(name) = LOWER(%s) AND id != %s",
                (name, processor_id),
                fetch_one=True
            )
            
            if duplicate:
                return {'error': 'A processor with this name already exists'}
            
            # Update processor
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE processors 
                SET name = %s, contact_person = %s, phone = %s, email = %s, address = %s, 
                    gst_number = %s, pan_number = %s, updated_at = %s, updated_by = %s
                WHERE id = %s AND is_active = true
                RETURNING id, name, contact_person, phone, email, address, gst_number, pan_number,
                         created_at, updated_at, created_by, updated_by
            """, (name, contact_person, phone, email, address, gst_number, pan_number,
                  current_time, user_id, processor_id), fetch_one=True)
            
            if result:
                processor = {
                    'id': result['id'],
                    'name': result['name'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'email': result['email'],
                    'address': result['address'],
                    'gstNumber': result['gst_number'],
                    'panNumber': result['pan_number'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('UPDATE', 'PROCESSOR', processor['id'], user_id, {
                    'name': processor['name']
                })
                
                print(f"✅ Processor updated successfully: {processor['name']}")
                return processor
            else:
                return {'error': 'Failed to update processor'}
                
        except Exception as e:
            print(f"❌ Failed to update processor: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    def delete_processor(self, processor_id, user_id):
        """Delete a processor (soft delete)"""
        try:
            # Get existing processor
            existing = self.execute_query(
                "SELECT id, name FROM processors WHERE id = %s AND is_active = true",
                (processor_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Processor not found'}
            
            # Soft delete processor
            current_time = datetime.utcnow().isoformat() + 'Z'
            result = self.execute_query("""
                UPDATE processors 
                SET is_active = false, updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, name
            """, (current_time, user_id, processor_id), fetch_one=True)
            
            if result:
                # Log audit event
                self.log_audit_event('DELETE', 'PROCESSOR', result[0], user_id, {
                    'name': result[1]
                })
                
                return {'message': 'Processor deleted successfully'}
            else:
                return {'error': 'Failed to delete processor'}
                
        except Exception as e:
            print(f"❌ Failed to delete processor: {e}")
            return {'error': 'Database error occurred'}

    # ========== LOCATIONS METHODS ==========
    def get_locations(self):
        """Get all locations from database"""
        try:
            result = self.execute_query("""
                SELECT id, name, address, contact_person, phone, is_active, created_at, updated_at, created_by, updated_by
                FROM locations
                WHERE is_active = true
                ORDER BY name
            """, fetch_all=True)
            
            if result is None:
                return []
            
            # Convert to list of dicts (result is already dict objects from RealDictCursor)
            locations = []
            for row in result:
                locations.append({
                    'id': row['id'],
                    'name': row['name'],
                    'address': row['address'],
                    'contactPerson': row['contact_person'],
                    'phone': row['phone'],
                    'isActive': row['is_active'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedBy': row['updated_by']
                })
            
            return locations
            
        except Exception as e:
            print(f"❌ Failed to get locations: {e}")
            return []

    def create_location(self, name, address, contact_person, phone, user_id):
        """Create a new location"""
        try:
            # Check for duplicate names
            existing = self.execute_query(
                "SELECT id FROM locations WHERE LOWER(name) = LOWER(%s)",
                (name,),
                fetch_one=True
            )
            
            if existing:
                return {'error': 'A location with this name already exists'}
            
            # Insert new location
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                INSERT INTO locations (name, address, contact_person, phone, created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, address, contact_person, phone, created_at, updated_at, created_by, updated_by
            """, (name, address, contact_person, phone, current_time, current_time, user_id, user_id), fetch_one=True)
            
            if result:
                location = {
                    'id': result['id'],
                    'name': result['name'],
                    'address': result['address'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('CREATE', 'LOCATION', location['id'], user_id, {
                    'name': location['name'],
                    'address': location['address']
                })
                
                return location
            else:
                return {'error': 'Failed to create location'}
                
        except Exception as e:
            print(f"❌ Failed to create location: {e}")
            return {'error': 'Database error occurred'}

    def update_location(self, location_id, name, address, contact_person, phone, user_id):
        """Update an existing location"""
        try:
            print(f"🔍 Updating location: id={location_id}, name={name}, user_id={user_id}")
            
            # Get existing location
            existing = self.execute_query(
                "SELECT id FROM locations WHERE id = %s AND is_active = true",
                (location_id,),
                fetch_one=True
            )
            
            if not existing:
                return {'error': 'Location not found'}
            
            # Check for duplicate names (excluding current location)
            duplicate = self.execute_query(
                "SELECT id FROM locations WHERE LOWER(name) = LOWER(%s) AND id != %s",
                (name, location_id),
                fetch_one=True
            )
            
            if duplicate:
                return {'error': 'A location with this name already exists'}
            
            # Update location
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE locations 
                SET name = %s, address = %s, contact_person = %s, phone = %s, updated_at = %s, updated_by = %s
                WHERE id = %s AND is_active = true
                RETURNING id, name, address, contact_person, phone, created_at, updated_at, created_by, updated_by
            """, (name, address, contact_person, phone, current_time, user_id, location_id), fetch_one=True)
            
            if result:
                location = {
                    'id': result['id'],
                    'name': result['name'],
                    'address': result['address'],
                    'contactPerson': result['contact_person'],
                    'phone': result['phone'],
                    'createdAt': result['created_at'].isoformat() + 'Z',
                    'updatedAt': result['updated_at'].isoformat() + 'Z',
                    'createdBy': result['created_by'],
                    'updatedBy': result['updated_by']
                }
                
                # Log audit event
                self.log_audit_event('UPDATE', 'LOCATION', location['id'], user_id, {
                    'name': location['name'],
                    'address': location['address']
                })
                
                return location
            else:
                return {'error': 'Failed to update location'}
                
        except Exception as e:
            print(f"❌ Failed to update location: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    def delete_location(self, location_id, user_id):
        """Delete a location (soft delete)"""
        try:
            print(f"🔍 Deleting location: id={location_id}, user_id={user_id}")
            
            # Get existing location
            existing = self.execute_query(
                "SELECT id, name FROM locations WHERE id = %s AND is_active = true",
                (location_id,),
                fetch_one=True
            )
            
            if not existing:
                print(f"❌ Location not found: {location_id}")
                return {'error': 'Location not found'}
            
            # Soft delete location
            current_time = datetime.now(timezone.utc)
            result = self.execute_query("""
                UPDATE locations 
                SET is_active = false, updated_at = %s, updated_by = %s
                WHERE id = %s
                RETURNING id, name
            """, (current_time, user_id, location_id), fetch_one=True)
            
            if result:
                # Log audit event
                self.log_audit_event('DELETE', 'LOCATION', result['id'], user_id, {
                    'name': result['name']
                })
                
                print(f"✅ Location deleted successfully: {result['name']}")
                return {'message': 'Location deleted successfully'}
            else:
                return {'error': 'Failed to delete location'}
                
        except Exception as e:
            print(f"❌ Failed to delete location: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    def get_grns(self):
        """Get all GRNs from database with enhanced retry logic"""
        print("🔍 Getting GRNs...")
        
        for attempt in range(3):
            try:
                query = """
                    SELECT gr.id, gr.grn_number, gr.supplier_id, gr.location_id, 
                           gr.receipt_date, gr.created_at, gr.updated_at, gr.created_by, gr.updated_by,
                           s.name as supplier_name, l.name as location_name
                    FROM goods_receipts gr
                    LEFT JOIN suppliers s ON gr.supplier_id = s.id
                    LEFT JOIN locations l ON gr.location_id = l.id
                    ORDER BY gr.created_at DESC
                """
                
                rows = self.execute_query(query, fetch_all=True)
                
                if rows is None:
                    if attempt == 2:
                        print("⚠️ No GRNs found after all retries")
                        return []
                    continue
                
                grns = []
                for row in rows:
                    # Get items for this GRN
                    items = self.get_grn_items(row['id'])
                    grns.append({
                        'id': row['id'],
                        'grnNumber': row['grn_number'],
                        'supplierId': row['supplier_id'],
                        'supplierName': row['supplier_name'],
                        'locationId': row['location_id'],
                        'locationName': row['location_name'],
                        'receiptDate': row['receipt_date'].isoformat() + 'Z' if row['receipt_date'] else None,
                        'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                        'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                        'createdBy': row['created_by'],
                        'updatedBy': row['updated_by'],
                        'items': items
                    })
                
                print(f"✅ Retrieved {len(grns)} GRNs successfully")
                return grns
                
            except Exception as e:
                print(f"❌ Failed to get GRNs (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    return []
                continue
        
        return []

    def create_grn(self, receipt_date, supplier_id, location_id, items, user_id):
        """Create a new GRN with items"""
        try:
            print(f"🔍 Creating GRN: supplier_id={supplier_id}, location_id={location_id}, items={len(items)}")
            
            # Generate GRN number in format: GRN/year/month/date/sequential_id
            current_time = datetime.now(timezone.utc)
            year = current_time.year
            month = current_time.strftime('%b').upper()  # JAN, FEB, etc.
            day = current_time.strftime('%d')
            
            # Get next sequential number for today (check all existing GRNs to avoid duplicates)
            existing_query = """
                SELECT grn_number FROM goods_receipts 
                WHERE grn_number LIKE %s
                ORDER BY grn_number DESC
            """
            existing_grns = self.execute_query(existing_query, (f"GRN/{year}/{month}/{day}/%",), fetch_all=True)
            
            # Extract sequential IDs from existing GRN numbers to find next available
            used_ids = set()
            for row in existing_grns:
                try:
                    # Extract number from format: GRN/2025/JUL/20/1
                    parts = row['grn_number'].split('/')
                    if len(parts) == 5:
                        used_ids.add(int(parts[4]))
                except (ValueError, IndexError):
                    continue
            
            # Find the next available sequential ID
            sequential_id = 1
            while sequential_id in used_ids:
                sequential_id += 1
            
            grn_number = f"GRN/{year}/{month}/{day}/{sequential_id}"
            
            # Calculate total value (for now we'll set to 0 since rate is removed)
            total_value = 0
            
            # Insert GRN header
            current_time = datetime.now(timezone.utc)
            grn_result = self.execute_query("""
                INSERT INTO goods_receipts (grn_number, supplier_id, location_id, receipt_date, 
                                          created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, grn_number
            """, (grn_number, supplier_id, location_id, receipt_date, 
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if not grn_result:
                return {'error': 'Failed to create GRN'}
            
            grn_id = grn_result['id']
            
            # Insert GRN items and create inventory lots
            for item in items:
                item_result = self.execute_query("""
                    INSERT INTO goods_receipt_items (grn_id, category_id, product_id, quantity_bags, 
                                                   weight_kg, remarks, created_at, created_by, updated_at, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (grn_id, item['categoryId'], item['productId'], item['quantityBags'],
                      item['weightKg'], item.get('remarks', ''), current_time, user_id, current_time, user_id), fetch_one=True)
                
                if not item_result:
                    return {'error': 'Failed to create GRN item'}
                
                grn_item_id = item_result['id']
                
                # Create inventory lot for this GRN item
                lot_result = self.create_inventory_lot(
                    product_id=item['productId'],
                    category_id=item['categoryId'],
                    location_id=location_id,
                    supplier_id=supplier_id,
                    grn_item_id=grn_item_id,
                    quantity_bags=item['quantityBags'],
                    weight_kg=item['weightKg'],
                    user_id=user_id
                )
                
                if 'error' in lot_result:
                    print(f"⚠️ Warning: Failed to create inventory lot for GRN item {grn_item_id}: {lot_result['error']}")
                    # Continue with GRN creation even if inventory lot creation fails
                else:
                    # Link the inventory lot back to the GRN item
                    self.execute_query("""
                        UPDATE goods_receipt_items 
                        SET inventory_lot_id = %s 
                        WHERE id = %s
                    """, (lot_result['id'], grn_item_id))
                    print(f"✅ Created inventory lot {lot_result['lotNumber']} for GRN item")
            
            # Log audit event
            self.log_audit_event('CREATE', 'GRN', grn_id, user_id, {
                'grn_number': grn_number,
                'supplier_id': supplier_id,
                'items_count': len(items)
            })
            
            print(f"✅ GRN created successfully: {grn_number}")
            return {
                'id': grn_id,
                'grnNumber': grn_number,
                'message': 'GRN created successfully'
            }
            
        except Exception as e:
            print(f"❌ Failed to create GRN: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    def get_grn_items(self, grn_id):
        """Get items for a specific GRN"""
        try:
            query = """
                SELECT gri.id, gri.grn_id, gri.category_id, gri.product_id, 
                       gri.quantity_bags, gri.weight_kg, gri.remarks,
                       gri.created_at, gri.created_by, gri.updated_at, gri.updated_by,
                       c.name as category_name, p.product_name
                FROM goods_receipt_items gri
                LEFT JOIN categories c ON gri.category_id = c.id
                LEFT JOIN products p ON gri.product_id = p.id
                WHERE gri.grn_id = %s
                ORDER BY gri.id
            """
            
            rows = self.execute_query(query, (grn_id,), fetch_all=True)
            items = []
            
            for row in rows:
                items.append({
                    'id': row['id'],
                    'grnId': row['grn_id'],
                    'categoryId': row['category_id'],
                    'categoryName': row['category_name'],
                    'productId': row['product_id'],
                    'productName': row['product_name'],
                    'quantityBags': row['quantity_bags'],
                    'weightKg': float(row['weight_kg']) if row['weight_kg'] else 0,
                    'remarks': row['remarks'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'updatedBy': row['updated_by']
                })
            
            return items
            
        except Exception as e:
            print(f"❌ Failed to get GRN items: {e}")
            return []

    def delete_grn(self, grn_id, user_id):
        """Delete a GRN and its items"""
        try:
            print(f"🔍 Deleting GRN: id={grn_id}, user_id={user_id}")
            
            # Get existing GRN
            existing = self.execute_query(
                "SELECT id, grn_number FROM goods_receipts WHERE id = %s",
                (grn_id,),
                fetch_one=True
            )
            
            if not existing:
                print(f"❌ GRN not found: {grn_id}")
                return {'error': 'GRN not found'}
            
            # Delete GRN items first
            self.execute_query("DELETE FROM goods_receipt_items WHERE grn_id = %s", (grn_id,))
            
            # Delete GRN
            result = self.execute_query("DELETE FROM goods_receipts WHERE id = %s RETURNING id, grn_number", (grn_id,), fetch_one=True)
            
            if result:
                # Log audit event
                self.log_audit_event('DELETE', 'GRN', result['id'], user_id, {
                    'grn_number': result['grn_number']
                })
                
                print(f"✅ GRN deleted successfully: {result['grn_number']}")
                return {'message': 'GRN deleted successfully'}
            else:
                return {'error': 'Failed to delete GRN'}
                
        except Exception as e:
            print(f"❌ Failed to delete GRN: {e}")
            print(f"❌ Error details: {str(e)}")
            return {'error': 'Database error occurred'}

    # Purchase Orders CRUD methods
    def get_purchase_orders(self):
        """Get all purchase orders from database"""
        try:
            print("🔍 Getting purchase orders...")
            orders = self.execute_query("""
                SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name,
                       po.order_date, po.status, po.total_items, po.total_value, po.notes,
                       po.converted_to_grn, po.created_at, po.updated_at, po.created_by, po.updated_by
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.is_deleted = FALSE
                ORDER BY po.order_date DESC
            """, fetch_all=True)
            
            print(f"🔍 Found {len(orders) if orders else 0} purchase orders")
            
            if orders is None:
                print("❌ Orders is None")
                return []
            
            result = []
            for order in orders:
                order_dict = dict(order)
                order_dict['orderDate'] = order_dict['order_date'].isoformat() if order_dict['order_date'] else None
                order_dict['supplierName'] = order_dict['supplier_name']
                order_dict['createdAt'] = order_dict['created_at'].isoformat() + 'Z' if order_dict['created_at'] else None
                order_dict['updatedAt'] = order_dict['updated_at'].isoformat() + 'Z' if order_dict['updated_at'] else None
                
                # Get items for this purchase order
                items = self.get_purchase_order_items(order_dict['id'])
                order_dict['items'] = items
                
                result.append(order_dict)
            
            print(f"✅ Returning {len(result)} purchase orders")
            return result
            
        except Exception as e:
            print(f"❌ Failed to get purchase orders: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_purchase_order_items(self, purchase_order_id):
        """Get items for a specific purchase order"""
        try:
            items = self.execute_query("""
                SELECT poi.id, poi.category_id, poi.product_id, poi.quantity_bags, poi.weight_kg, poi.estimated_value, poi.remarks,
                       c.name as category_name, p.product_name
                FROM purchase_order_items poi
                LEFT JOIN categories c ON poi.category_id = c.id
                LEFT JOIN products p ON poi.product_id = p.id
                WHERE poi.po_id = %s
                ORDER BY poi.id
            """, (purchase_order_id,), fetch_all=True)
            
            if items is None:
                return []
            
            result = []
            for item in items:
                item_dict = dict(item)
                item_dict['categoryName'] = item_dict['category_name']
                item_dict['productName'] = item_dict['product_name']
                item_dict['quantityBags'] = item_dict['quantity_bags']
                item_dict['weightKg'] = item_dict['weight_kg']
                item_dict['estimatedValue'] = item_dict['estimated_value']
                result.append(item_dict)
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get purchase order items: {e}")
            return []

    def create_purchase_order(self, supplier_id, order_date, items, user_id):
        """Create a new purchase order with items"""
        connection = None
        try:
            # Get a fresh connection for this operation
            connection = self.get_connection()
            if not connection:
                return {'error': 'Database connection failed'}
                
            # Generate PO number
            today = datetime.now()
            month_name = today.strftime("%b").upper()
            date_str = today.strftime("%d")
            year = today.year
            
            # Get next sequential number for today (including soft-deleted to avoid duplicates)
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT po_number FROM purchase_orders 
                    WHERE po_number LIKE %s
                    ORDER BY po_number DESC
                """, (f"PO/{year}/{month_name}/{date_str}/%",))
                
                existing_numbers = cursor.fetchall()
                
                # Extract sequential IDs from existing PO numbers to find next available
                used_ids = set()
                for row in existing_numbers:
                    try:
                        # Extract number from format: PO/2025/JUL/20/1
                        parts = row[0].split('/')
                        if len(parts) == 5:
                            used_ids.add(int(parts[4]))
                    except (ValueError, IndexError):
                        continue
                
                # Find the next available sequential ID
                sequential_id = 1
                while sequential_id in used_ids:
                    sequential_id += 1
                
                po_number = f"PO/{year}/{month_name}/{date_str}/{sequential_id}"
                
                # Calculate totals
                total_items = len(items)
                total_value = sum(item.get('estimatedValue', 0) for item in items)
                
                # Insert purchase order
                current_time = datetime.now(timezone.utc)
                cursor.execute("""
                    INSERT INTO purchase_orders (po_number, supplier_id, order_date, total_items, total_value, 
                                               created_at, updated_at, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, po_number
                """, (po_number, supplier_id, order_date, total_items, total_value,
                      current_time, current_time, user_id, user_id))
                
                po_result = cursor.fetchone()
                if not po_result:
                    return {'error': 'Failed to create purchase order'}
                
                po_id = po_result[0]
                
                # Insert items
                for item in items:
                    cursor.execute("""
                        INSERT INTO purchase_order_items (po_id, category_id, product_id, quantity_bags, weight_kg, estimated_value, remarks)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (po_id, item['categoryId'], item['productId'], item['quantityBags'], item['weightKg'], item.get('estimatedValue', 0), item.get('remarks', '')))
                
                connection.commit()
                print(f"✅ Purchase order created successfully: {po_number}")
                return {'message': 'Purchase order created successfully', 'poNumber': po_number, 'id': po_id}
            
        except Exception as e:
            if connection:
                connection.rollback()
            print(f"❌ Failed to create purchase order: {e}")
            return {'error': 'Database error occurred'}
        finally:
            if connection:
                self.return_connection(connection)

    # Sales Orders CRUD methods
    def get_sales_orders(self):
        """Get all sales orders from database with retry logic"""
        print("🔍 Getting sales orders...")
        
        # Try with fresh connection and retry on failure
        for attempt in range(3):
            try:
                # Force fresh connection pool if previous attempts failed
                if attempt > 0:
                    print(f"♻️ Retrying sales orders query (attempt {attempt + 1})")
                    self.create_connection_pool()
                
                orders = self.execute_query("""
                    SELECT so.id, so.so_number, so.customer_id, c.name as customer_name,
                           so.order_date, so.status, so.total_items, so.total_value, so.notes,
                           so.converted_to_challan, so.created_at, so.updated_at, so.created_by, so.updated_by
                    FROM sales_orders so
                    LEFT JOIN customers c ON so.customer_id = c.id
                    WHERE so.is_deleted = FALSE
                    ORDER BY so.order_date DESC
                """, fetch_all=True)
                
                if orders is None:
                    print("⚠️ No sales orders found")
                    return []
                
                print(f"🔍 Found {len(orders)} sales orders")
                result = []
                for order in orders:
                    order_dict = dict(order)
                    order_dict['orderDate'] = order_dict['order_date'].isoformat() if order_dict['order_date'] else None
                    order_dict['customerName'] = order_dict['customer_name']
                    order_dict['createdAt'] = order_dict['created_at'].isoformat() + 'Z' if order_dict['created_at'] else None
                    order_dict['updatedAt'] = order_dict['updated_at'].isoformat() + 'Z' if order_dict['updated_at'] else None
                    
                    # Get items for this sales order
                    items = self.get_sales_order_items(order_dict['id'])
                    order_dict['items'] = items
                    
                    result.append(order_dict)
                
                print(f"✅ Returning {len(result)} sales orders")
                return result
                
            except Exception as e:
                print(f"❌ Failed to get sales orders (attempt {attempt + 1}): {e}")
                if attempt == 2:  # Last attempt
                    return []
                continue
        
        return []

    def create_sales_order(self, customer_id, order_date, items, user_id, location_id=None):
        """Create a new sales order with items and automatic stock reservation"""
        connection = None
        try:
            # Use default location if not provided (get first available location)
            if not location_id:
                first_location = self.execute_query("SELECT id FROM locations WHERE is_active = true ORDER BY id LIMIT 1", fetch_one=True)
                if not first_location:
                    return {'error': 'No active locations found'}
                location_id = first_location['id']
            
            # Generate SO number
            today = datetime.now()
            month_name = today.strftime("%b").upper()
            date_str = today.strftime("%d")
            year = today.year
            
            # Get next sequential number for today (including soft-deleted to avoid duplicates)
            existing_query = """
                SELECT so_number FROM sales_orders 
                WHERE so_number LIKE %s
                ORDER BY so_number DESC
            """
            existing_orders = self.execute_query(existing_query, (f"SO/{year}/{month_name}/{date_str}/%",), fetch_all=True)
            
            # Extract sequential IDs from existing SO numbers to find next available
            used_ids = set()
            for row in existing_orders:
                try:
                    # Extract number from format: SO/2025/JUL/20/1
                    parts = row['so_number'].split('/')
                    if len(parts) == 5:
                        used_ids.add(int(parts[4]))
                except (ValueError, IndexError):
                    continue
            
            # Find the next available sequential ID
            sequential_id = 1
            while sequential_id in used_ids:
                sequential_id += 1
            
            so_number = f"SO/{year}/{month_name}/{date_str}/{sequential_id}"
            
            # Calculate totals
            total_items = len(items)
            total_value = sum(item.get('estimatedValue', 0) for item in items)
            
            # Start transaction for atomicity
            connection = self.get_connection()
            if not connection:
                return {'error': 'Database connection failed'}
            
            try:
                # Insert sales order
                current_time = datetime.now(timezone.utc)
                cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                
                cursor.execute("""
                    INSERT INTO sales_orders (so_number, customer_id, order_date, status, total_items, total_value, 
                                            created_at, updated_at, created_by, updated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, so_number
                """, (so_number, customer_id, order_date, 'New', total_items, total_value,
                      current_time, current_time, user_id, user_id))
                
                so_result = cursor.fetchone()
                if not so_result:
                    return {'error': 'Failed to create sales order'}
                
                so_id = so_result['id']
                
                # Insert items and reserve stock for each
                reservation_errors = []
                total_reserved = 0
                
                for item in items:
                    # Insert sales order item
                    cursor.execute("""
                        INSERT INTO sales_order_items (so_id, category_id, product_id, quantity_bags, weight_kg, 
                                                      remarks, estimated_value, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (so_id, item['categoryId'], item['productId'], item['quantityBags'], 
                          item['weightKg'], item.get('remarks', ''), item.get('estimatedValue', 0), current_time))
                    
                    # Reserve stock for this item (search across all locations)
                    reservation_result = self.reserve_stock_for_sales_order_any_location(
                        so_id, item['productId'], item['weightKg'], user_id
                    )
                    
                    if 'error' in reservation_result:
                        reservation_errors.append({
                            'product_id': item['productId'],
                            'error': reservation_result['error']
                        })
                    else:
                        total_reserved += item['weightKg']
                
                # If any reservations failed, rollback and return error
                if reservation_errors:
                    connection.rollback()
                    error_details = '; '.join([f"Product {err['product_id']}: {err['error']}" for err in reservation_errors])
                    return {'error': f'Stock reservation failed: {error_details}'}
                
                # Commit transaction
                connection.commit()
                
                print(f"✅ Sales order created with stock reservation: {so_number} (Reserved: {total_reserved}kg)")
                return {
                    'message': 'Sales order created successfully with stock reservation',
                    'soNumber': so_number,
                    'id': so_id,
                    'totalReserved': total_reserved
                }
                
            except Exception as e:
                if connection:
                    connection.rollback()
                raise e
                
        except Exception as e:
            print(f"❌ Failed to create sales order: {e}")
            return {'error': 'Database error occurred'}
        finally:
            if connection:
                self.return_connection(connection)

    def get_sales_order_items(self, sales_order_id):
        """Get items for a specific sales order"""
        try:
            items = self.execute_query("""
                SELECT soi.id, soi.so_id, soi.category_id, soi.product_id, soi.quantity_bags, 
                       soi.weight_kg, soi.remarks, soi.estimated_value, soi.created_at,
                       p.product_name, c.name as category_name
                FROM sales_order_items soi
                LEFT JOIN products p ON soi.product_id = p.id
                LEFT JOIN categories c ON soi.category_id = c.id
                WHERE soi.so_id = %s
                ORDER BY soi.id
            """, (sales_order_id,), fetch_all=True)
            
            if items is None:
                return []
            
            result = []
            for item in items:
                item_dict = dict(item)
                item_dict['categoryName'] = item_dict['category_name']
                item_dict['productName'] = item_dict['product_name']
                item_dict['quantityBags'] = item_dict['quantity_bags']
                item_dict['weightKg'] = float(item_dict['weight_kg']) if item_dict['weight_kg'] else 0
                item_dict['estimatedValue'] = float(item_dict['estimated_value']) if item_dict['estimated_value'] else 0
                item_dict['createdAt'] = item_dict['created_at'].isoformat() + 'Z' if item_dict['created_at'] else None
                result.append(item_dict)
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get sales order items: {e}")
            return []

    def update_sales_order(self, sales_order_id, updates, user_id):
        """Update a sales order including items"""
        try:
            # Build dynamic update query based on provided updates
            update_fields = []
            params = []
            
            if 'customer_id' in updates:
                update_fields.append("customer_id = %s")
                params.append(updates['customer_id'])
            
            if 'orderDate' in updates:
                update_fields.append("order_date = %s")
                params.append(updates['orderDate'])
            
            if 'status' in updates:
                update_fields.append("status = %s")
                params.append(updates['status'])
            
            if 'notes' in updates:
                update_fields.append("notes = %s")
                params.append(updates['notes'])
            
            if 'total_items' in updates:
                update_fields.append("total_items = %s")
                params.append(updates['total_items'])
                
            if 'total_value' in updates:
                update_fields.append("total_value = %s")
                params.append(updates['total_value'])
            
            if 'converted_to_challan' in updates:
                update_fields.append("converted_to_challan = %s")
                params.append(updates['converted_to_challan'])
            
            if not update_fields and 'items' not in updates:
                return {'error': 'No fields to update'}
            
            # Update sales order basic fields if any changes
            if update_fields:
                # Add updated_by and updated_at
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = %s")
                params.extend([user_id, datetime.now(timezone.utc)])
                
                # Add sales_order_id for WHERE clause
                params.append(sales_order_id)
                
                query = f"""
                    UPDATE sales_orders 
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND is_deleted = FALSE
                    RETURNING id, so_number
                """
                
                result = self.execute_query(query, params, fetch_one=True)
                
                if not result:
                    return {'error': 'Sales order not found or could not be updated'}
            
            # Update items if provided
            if 'items' in updates:
                # Delete existing items
                self.execute_query("""
                    DELETE FROM sales_order_items 
                    WHERE so_id = %s
                """, (sales_order_id,))
                
                # Insert new items
                current_time = datetime.now(timezone.utc)
                for item in updates['items']:
                    self.execute_query("""
                        INSERT INTO sales_order_items (so_id, category_id, product_id, quantity_bags, weight_kg, 
                                                      remarks, estimated_value, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (sales_order_id, item['categoryId'], item['productId'], item['quantityBags'], 
                          item['weightKg'], item.get('remarks', ''), item.get('estimatedValue', 0), current_time))
            
            return {'message': 'Sales order updated successfully', 'id': sales_order_id}
            
        except Exception as e:
            print(f"❌ Failed to update sales order: {e}")
            return {'error': 'Database error occurred'}

    # Sales Challan CRUD Operations
    def get_sales_challans(self):
        """Get all sales challans with customer details"""
        try:
            query = """
                SELECT sc.id, sc.sc_number, sc.customer_id, sc.challan_date, sc.status,
                       sc.total_items, sc.total_value, sc.notes,
                       sc.created_at, sc.created_by, sc.updated_at, sc.updated_by,
                       c.name as customer_name
                FROM sales_challans sc
                LEFT JOIN customers c ON sc.customer_id = c.id
                WHERE sc.is_deleted = FALSE
                ORDER BY sc.created_at DESC
            """
            
            rows = self.execute_query(query, fetch_all=True)
            sales_challans = []
            
            for row in rows:
                # Get items for this sales challan
                items = self.get_sales_challan_items(row['id'])
                
                sales_challans.append({
                    'id': row['id'],
                    'scNumber': row['sc_number'],
                    'customerId': row['customer_id'],
                    'customerName': row['customer_name'],
                    'challanDate': row['challan_date'].isoformat() if row['challan_date'] else None,
                    'status': row['status'],
                    'totalItems': row['total_items'],
                    'totalValue': str(row['total_value']) if row['total_value'] else '0',
                    'notes': row['notes'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                    'createdBy': row['created_by'],
                    'updatedAt': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                    'updatedBy': row['updated_by'],
                    'items': items
                })
            
            return sales_challans
            
        except Exception as e:
            print(f"❌ Failed to get sales challans: {e}")
            return []

    def get_sales_challan_items(self, sales_challan_id):
        """Get items for a specific sales challan"""
        try:
            query = """
                SELECT sci.id, sci.sc_id, sci.category_id, sci.product_id,
                       sci.quantity_bags, sci.weight_kg, sci.estimated_value, sci.remarks,
                       sci.created_at,
                       c.name as category_name, p.product_name
                FROM sales_challan_items sci
                LEFT JOIN categories c ON sci.category_id = c.id
                LEFT JOIN products p ON sci.product_id = p.id
                WHERE sci.sc_id = %s
                ORDER BY sci.created_at
            """
            
            rows = self.execute_query(query, (sales_challan_id,), fetch_all=True)
            items = []
            
            for row in rows:
                items.append({
                    'id': row['id'],
                    'scId': row['sc_id'],
                    'categoryId': row['category_id'],
                    'categoryName': row['category_name'],
                    'productId': row['product_id'],
                    'productName': row['product_name'],
                    'quantityBags': row['quantity_bags'],
                    'weightKg': float(row['weight_kg']) if row['weight_kg'] else 0,
                    'estimatedValue': float(row['estimated_value']) if row['estimated_value'] else 0,
                    'remarks': row['remarks'],
                    'createdAt': row['created_at'].isoformat() + 'Z' if row['created_at'] else None
                })
            
            return items
            
        except Exception as e:
            print(f"❌ Failed to get sales challan items: {e}")
            return []

    def create_sales_challan(self, customer_id, challan_date, items, user_id, location_id=1, source_sales_order_id=None):
        """Create a new sales challan with items and deduct from inventory
        If source_sales_order_id is provided, this is a conversion from sales order to challan"""
        try:
            # Generate SC number
            today = datetime.now()
            month_name = today.strftime("%b").upper()
            date_str = today.strftime("%d")
            year = today.year
            
            # Get next sequential number for today (including soft-deleted to avoid duplicates)
            existing_query = """
                SELECT sc_number FROM sales_challans 
                WHERE sc_number LIKE %s
                ORDER BY sc_number DESC
            """
            existing_challans = self.execute_query(existing_query, (f"SC/{year}/{month_name}/{date_str}/%",), fetch_all=True)
            
            # Extract sequential IDs from existing SC numbers to find next available
            used_ids = set()
            for row in existing_challans:
                try:
                    # Extract number from format: SC/2025/JUL/20/1
                    parts = row['sc_number'].split('/')
                    if len(parts) == 5:
                        used_ids.add(int(parts[4]))
                except (ValueError, IndexError):
                    continue
            
            # Find the next available sequential ID
            sequential_id = 1
            while sequential_id in used_ids:
                sequential_id += 1
            
            sc_number = f"SC/{year}/{month_name}/{date_str}/{sequential_id}"
            
            # Calculate totals
            total_items = len(items)
            total_value = sum(item.get('estimatedValue', 0) for item in items)
            
            # Insert sales challan
            current_time = datetime.now(timezone.utc)
            sc_result = self.execute_query("""
                INSERT INTO sales_challans (sc_number, customer_id, challan_date, status, total_items, total_value, 
                                          created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, sc_number
            """, (sc_number, customer_id, challan_date, 'New', total_items, total_value,
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if not sc_result:
                return {'error': 'Failed to create sales challan'}
            
            sc_id = sc_result['id']
            
            # If converting from sales order, first release committed stock
            if source_sales_order_id:
                print(f"🔄 Converting sales order {source_sales_order_id} to sales challan")
                unreserve_result = self.unreserve_stock_for_sales_order(source_sales_order_id, user_id)
                if 'error' in unreserve_result:
                    return {'error': f'Failed to release reserved stock: {unreserve_result["error"]}'}
                print(f"✅ Released {unreserve_result.get('quantity_unreserved', 0)}kg committed stock")
            
            # Insert items and deduct from inventory
            for item in items:
                # Insert sales challan item first
                challan_item_result = self.execute_query("""
                    INSERT INTO sales_challan_items (sc_id, category_id, product_id, quantity_bags, weight_kg, 
                                                   remarks, estimated_value, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (sc_id, item['categoryId'], item['productId'], item['quantityBags'], 
                      item['weightKg'], item.get('remarks', ''), item.get('estimatedValue', 0), current_time), fetch_one=True)
                
                if not challan_item_result:
                    print(f"⚠️ Warning: Failed to create sales challan item")
                    continue
                
                challan_item_id = challan_item_result['id']
                
                # For sales order conversion, find the specific location where stock was committed
                if source_sales_order_id:
                    # Find the location(s) where stock was reserved for this product
                    reserved_locations = self.execute_query("""
                        SELECT DISTINCT il.location_id, l.name as location_name
                        FROM inventory_transactions it
                        JOIN inventory_lots il ON it.lot_id = il.id
                        JOIN locations l ON il.location_id = l.id
                        WHERE it.reference_type = 'SALES_ORDER' 
                        AND it.reference_id = %s 
                        AND it.reservation_type = 'RESERVE'
                        AND il.product_id = %s
                    """, (source_sales_order_id, item['productId']), fetch_all=True)
                    
                    if reserved_locations:
                        location_id = reserved_locations[0]['location_id']  # Use the first location where stock was reserved
                        print(f"📍 Using reserved stock location: {reserved_locations[0]['location_name']}")
                
                # Allocate and deduct stock from inventory
                allocation_result = self.allocate_stock_for_outbound(
                    product_id=item['productId'],
                    location_id=location_id,
                    required_quantity=item['weightKg']
                )
                
                if 'error' in allocation_result:
                    print(f"⚠️ Warning: Stock allocation failed for product {item['productId']}: {allocation_result['error']}")
                    # Continue with challan creation but log the issue
                    continue
                
                # Process each allocation and create outbound transactions
                for allocation in allocation_result['allocations']:
                    transaction_result = self.record_inventory_transaction(
                        lot_id=allocation['lot_id'],
                        transaction_type='OUTBOUND',
                        quantity=allocation['allocated_quantity'],
                        weight_kg=allocation['allocated_quantity'],
                        location_id=allocation['location_id'],  # Use the location from the allocation
                        reference_type='SALES_CHALLAN',
                        reference_id=challan_item_id,
                        description=f'Sales dispatch - {item["quantityBags"]} bags',
                        user_id=user_id
                    )
                    
                    if 'error' in transaction_result:
                        print(f"⚠️ Warning: Failed to record inventory transaction: {transaction_result['error']}")
                    else:
                        print(f"✅ Deducted {allocation['allocated_quantity']}kg from lot {allocation['lot_number']}")
                
                # Link the first transaction to the sales challan item (for reference)
                if allocation_result['allocations']:
                    first_allocation = allocation_result['allocations'][0]
                    # Note: We'll use the lot_id as a reference since we might have multiple transactions per item
                    self.execute_query("""
                        UPDATE sales_challan_items 
                        SET inventory_transaction_id = %s 
                        WHERE id = %s
                    """, (first_allocation['lot_id'], challan_item_id))
            
            return {'message': 'Sales challan created successfully', 'scNumber': sc_number, 'id': sc_id}
            
        except Exception as e:
            print(f"❌ Failed to create sales challan: {e}")
            return {'error': 'Database error occurred'}

    def update_sales_challan(self, sales_challan_id, updates, user_id):
        """Update an existing sales challan and its items"""
        try:
            print(f"🔄 Updating sales challan {sales_challan_id} with updates: {list(updates.keys())}")
            
            # Build dynamic update query for sales challan basic fields
            update_fields = []
            params = []
            
            if 'customerId' in updates:
                update_fields.append("customer_id = %s")
                params.append(updates['customerId'])
            
            if 'challanDate' in updates:
                update_fields.append("challan_date = %s")
                params.append(updates['challanDate'])
            
            if 'status' in updates:
                update_fields.append("status = %s")
                params.append(updates['status'])
            
            if 'notes' in updates:
                update_fields.append("notes = %s")
                params.append(updates['notes'])
            
            # Update sales challan basic fields if any changes
            if update_fields:
                # Add updated_by and updated_at
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = %s")
                params.extend([user_id, datetime.now(timezone.utc)])
                
                # Add sales_challan_id for WHERE clause
                params.append(sales_challan_id)
                
                query = f"""
                    UPDATE sales_challans 
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND is_deleted = FALSE
                    RETURNING id, sc_number
                """
                
                result = self.execute_query(query, params, fetch_one=True)
                
                if not result:
                    return {'error': 'Sales challan not found or could not be updated'}
            
            # Update items if provided
            if 'items' in updates:
                # Delete existing items
                self.execute_query("""
                    DELETE FROM sales_challan_items 
                    WHERE sc_id = %s
                """, (sales_challan_id,))
                
                # Insert new items
                current_time = datetime.now(timezone.utc)
                for item in updates['items']:
                    self.execute_query("""
                        INSERT INTO sales_challan_items (sc_id, category_id, product_id, quantity_bags, weight_kg, 
                                                       remarks, estimated_value, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (sales_challan_id, item['categoryId'], item['productId'], item['quantityBags'], 
                          item['weightKg'], item.get('remarks', ''), item.get('estimatedValue', 0), current_time))
            
            return {'message': 'Sales challan updated successfully', 'id': sales_challan_id}
            
        except Exception as e:
            print(f"❌ Failed to update sales challan: {e}")
            return {'error': 'Database error occurred'}
    
    def update_sales_challan_status(self, sales_challan_id, new_status, user_id):
        """Update sales challan status"""
        try:
            # Validate status
            valid_statuses = ['New', 'Delivered', 'Cancelled']
            if new_status not in valid_statuses:
                return {'error': 'Invalid status'}
            
            result = self.execute_query("""
                UPDATE sales_challans 
                SET status = %s, updated_by = %s, updated_at = %s
                WHERE id = %s AND is_deleted = FALSE
                RETURNING id, sc_number, status
            """, (new_status, user_id, datetime.now(timezone.utc), sales_challan_id), fetch_one=True)
            
            if not result:
                return {'error': 'Sales challan not found or could not be updated'}
            
            return {'message': 'Sales challan status updated successfully', 'status': result['status']}
            
        except Exception as e:
            print(f"❌ Failed to update sales challan status: {e}")
            return {'error': 'Database error occurred'}

    def delete_sales_challan(self, sales_challan_id, user_id):
        """Soft delete a sales challan"""
        try:
            # Update is_deleted flag instead of actual deletion
            result = self.execute_query("""
                UPDATE sales_challans 
                SET is_deleted = TRUE, updated_by = %s, updated_at = %s
                WHERE id = %s AND is_deleted = FALSE
                RETURNING id, sc_number
            """, (user_id, datetime.now(timezone.utc), sales_challan_id), fetch_one=True)
            
            if not result:
                return {'error': 'Sales challan not found or already deleted'}
            
            return {'message': 'Sales challan deleted successfully'}
            
        except Exception as e:
            print(f"❌ Failed to delete sales challan: {e}")
            return {'error': 'Database error occurred'}
    
    def update_sales_order_status(self, sales_order_id, new_status, user_id):
        """Update sales order status with automatic stock reservation management"""
        try:
            # Validate status
            valid_statuses = ['New', 'Delivered', 'Cancelled']
            if new_status not in valid_statuses:
                return {'error': 'Invalid status'}
            
            # Get current status to determine stock operation
            current_order = self.execute_query("""
                SELECT id, so_number, status 
                FROM sales_orders 
                WHERE id = %s AND is_deleted = FALSE
            """, (sales_order_id,), fetch_one=True)
            
            if not current_order:
                return {'error': 'Sales order not found'}
            
            current_status = current_order['status']
            
            # Handle stock reservations based on status change
            inventory_action_message = ""
            
            if new_status == 'Cancelled' and current_status != 'Cancelled':
                # Release reserved stock back to available
                unreserve_result = self.unreserve_stock_for_sales_order(sales_order_id, user_id)
                if 'error' in unreserve_result:
                    return {'error': f'Failed to unreserve stock: {unreserve_result["error"]}'}
                inventory_action_message = f" (Released {unreserve_result.get('quantity_unreserved', 0)}kg back to available stock)"
                
            elif new_status == 'Delivered' and current_status == 'New':
                # Convert reserved stock to actual deduction using existing sales challan logic
                # Get sales order items to deduct from inventory
                items = self.get_sales_order_items(sales_order_id)
                if items:
                    # Use the existing FIFO deduction logic from sales challan
                    for item in items:
                        # First unreserve the stock
                        unreserve_result = self.unreserve_stock_for_sales_order(sales_order_id, user_id)
                        
                        # Then deduct using normal outbound allocation
                        # Get location from the sales order's inventory lots (where stock is actually reserved)
                        lot_location = self.execute_query("""
                            SELECT DISTINCT il.location_id 
                            FROM inventory_transactions it
                            JOIN inventory_lots il ON it.lot_id = il.id
                            WHERE it.reference_type = 'SALES_ORDER' 
                            AND it.reference_id = %s 
                            AND it.reservation_type = 'RESERVE'
                            LIMIT 1
                        """, (sales_order_id,), fetch_one=True)
                        
                        if lot_location:
                            location_id = lot_location['location_id']
                        else:
                            # Fallback to first active location
                            first_location = self.execute_query("SELECT id FROM locations WHERE is_active = true ORDER BY id LIMIT 1", fetch_one=True)
                            if first_location:
                                location_id = first_location['id']
                            else:
                                print("❌ No active locations found")
                                continue
                        
                        # Use existing deduction logic
                        allocation_result = self.allocate_stock_for_outbound(
                            item['product_id'], location_id, item['weightKg']
                        )
                        
                        if 'error' not in allocation_result:
                            # Process the allocation and create outbound transactions
                            for allocation in allocation_result['allocations']:
                                lot_id = allocation['lot_id']
                                quantity = allocation['allocated_quantity']
                                
                                # Update lot quantities
                                self.execute_query("""
                                    UPDATE inventory_lots 
                                    SET available_quantity = available_quantity - %s,
                                        updated_at = %s, updated_by = %s
                                    WHERE id = %s
                                """, (quantity, datetime.now(timezone.utc), user_id, lot_id))
                                
                                # Record outbound transaction
                                self.execute_query("""
                                    INSERT INTO inventory_transactions (lot_id, transaction_type, transaction_date, 
                                                                      quantity, weight_kg, location_id, reference_type, 
                                                                      reference_id, description, balance_quantity, 
                                                                      created_by, created_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 
                                            (SELECT available_quantity FROM inventory_lots WHERE id = %s), %s, %s)
                                """, (lot_id, 'OUTBOUND', datetime.now(timezone.utc), quantity, quantity, 
                                      location_id, 'SALES_ORDER_DELIVERY', sales_order_id,
                                      f'Stock deducted for delivered sales order {sales_order_id}',
                                      lot_id, user_id, datetime.now(timezone.utc)))
                
                inventory_action_message = " (Stock deducted from inventory)"
            
            # Update the sales order status
            result = self.execute_query("""
                UPDATE sales_orders 
                SET status = %s, updated_by = %s, updated_at = %s
                WHERE id = %s AND is_deleted = FALSE
                RETURNING id, so_number, status
            """, (new_status, user_id, datetime.now(timezone.utc), sales_order_id), fetch_one=True)
            
            if not result:
                return {'error': 'Sales order not found or could not be updated'}
            
            print(f"✅ Sales order {result['so_number']} status updated: {current_status} → {new_status}{inventory_action_message}")
            return {
                'message': f'Status updated to {new_status}{inventory_action_message}', 
                'id': result['id'], 
                'status': result['status']
            }
            
        except Exception as e:
            print(f"❌ Failed to update sales order status: {e}")
            return {'error': 'Database error occurred'}

    def delete_sales_order(self, sales_order_id, user_id):
        """Delete a sales order (soft delete)"""
        try:
            # Check if sales order exists
            existing = self.execute_query("""
                SELECT id FROM sales_orders 
                WHERE id = %s AND is_deleted = FALSE
            """, (sales_order_id,), fetch_one=True)
            
            if not existing:
                return {'error': 'Sales order not found'}
            
            # Soft delete the sales order
            result = self.execute_query("""
                UPDATE sales_orders 
                SET is_deleted = TRUE, updated_by = %s, updated_at = %s
                WHERE id = %s
                RETURNING id
            """, (user_id, datetime.now(timezone.utc), sales_order_id), fetch_one=True)
            
            if not result:
                return {'error': 'Failed to delete sales order'}
            
            return {'message': 'Sales order deleted successfully'}
            
        except Exception as e:
            print(f"❌ Failed to delete sales order: {e}")
            return {'error': 'Database error occurred'}

    def convert_sales_order_to_challan(self, sales_order_id, user_id):
        """Convert a sales order to sales challan with proper inventory handling"""
        try:
            # Get the sales order details first
            sales_order = self.execute_query("""
                SELECT id, so_number, customer_id, order_date, notes, status
                FROM sales_orders 
                WHERE id = %s AND is_deleted = FALSE AND converted_to_challan = FALSE
            """, (sales_order_id,), fetch_one=True)
            
            if not sales_order:
                return {'error': 'Sales order not found or already converted'}
            
            # Get the sales order items
            items = self.get_sales_order_items(sales_order_id)
            if not items:
                return {'error': 'No items found for sales order'}
            
            # Convert item keys to match challan creation format
            converted_items = []
            for item in items:
                converted_item = {
                    'categoryId': item['category_id'],
                    'productId': item['product_id'],
                    'quantityBags': item['quantityBags'],
                    'weightKg': item['weightKg'],
                    'estimatedValue': item['estimatedValue'],
                    'remarks': item.get('remarks', '')
                }
                converted_items.append(converted_item)
            
            # Create the sales challan with source sales order reference
            challan_result = self.create_sales_challan(
                customer_id=sales_order['customer_id'],
                challan_date=sales_order['order_date'],
                items=converted_items,
                user_id=user_id,
                location_id=1,  # Default location - will be overridden by reserved stock location
                source_sales_order_id=sales_order_id
            )
            
            if 'error' in challan_result:
                return {'error': f'Failed to create sales challan: {challan_result["error"]}'}
            
            # Mark the sales order as converted and delivered
            update_result = self.execute_query("""
                UPDATE sales_orders 
                SET converted_to_challan = TRUE, status = 'Delivered', 
                    updated_by = %s, updated_at = %s
                WHERE id = %s
                RETURNING id, so_number
            """, (user_id, datetime.now(timezone.utc), sales_order_id), fetch_one=True)
            
            if not update_result:
                return {'error': 'Failed to update sales order status'}
            
            print(f"✅ Sales order {sales_order['so_number']} converted to challan {challan_result.get('scNumber')}")
            
            return {
                'message': 'Sales order successfully converted to sales challan',
                'sales_order': {
                    'id': sales_order['id'],
                    'so_number': sales_order['so_number']
                },
                'sales_challan': {
                    'id': challan_result.get('id'),
                    'sc_number': challan_result.get('scNumber')
                }
            }
            
        except Exception as e:
            print(f"❌ Failed to convert sales order to challan: {e}")
            return {'error': 'Database error occurred'}

    # Job Orders CRUD methods
    def get_job_orders(self):
        """Get all job orders from database"""
        try:
            orders = self.execute_query("""
                SELECT jo.id, jo.jo_number, jo.processor_id, p.name as processor_name,
                       jo.order_date, jo.status, jo.total_items, jo.estimated_value, jo.notes,
                       jo.created_at, jo.updated_at, jo.created_by, jo.updated_by
                FROM job_orders jo
                LEFT JOIN processors p ON jo.processor_id = p.id
                WHERE jo.is_deleted = FALSE
                ORDER BY jo.order_date DESC
            """, fetch_all=True)
            
            if orders is None:
                return []
            
            result = []
            for order in orders:
                order_dict = dict(order)
                order_dict['orderDate'] = order_dict['order_date'].isoformat() if order_dict['order_date'] else None
                order_dict['processorName'] = order_dict['processor_name']
                order_dict['createdAt'] = order_dict['created_at'].isoformat() + 'Z' if order_dict['created_at'] else None
                order_dict['updatedAt'] = order_dict['updated_at'].isoformat() + 'Z' if order_dict['updated_at'] else None
                result.append(order_dict)
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get job orders: {e}")
            return []

    def create_job_order(self, processor_id, order_date, items, user_id):
        """Create a new job order with items"""
        try:
            # Generate JO number
            today = datetime.now()
            month_name = today.strftime("%b").upper()
            date_str = today.strftime("%d")
            year = today.year
            
            # Get next sequential number for today
            count_query = """
                SELECT COUNT(*) as count FROM job_orders 
                WHERE jo_number LIKE %s AND is_deleted = FALSE
            """
            count_result = self.execute_query(count_query, (f"JO/{year}/{month_name}/{date_str}/%",), fetch_one=True)
            sequential_id = (count_result['count'] if count_result else 0) + 1
            
            jo_number = f"JO/{year}/{month_name}/{date_str}/{sequential_id}"
            
            # Calculate totals
            total_items = len(items)
            estimated_value = sum(item.get('estimatedValue', 0) for item in items)
            
            # Insert job order
            current_time = datetime.now(timezone.utc)
            jo_result = self.execute_query("""
                INSERT INTO job_orders (jo_number, processor_id, order_date, total_items, estimated_value, 
                                      created_at, updated_at, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, jo_number
            """, (jo_number, processor_id, order_date, total_items, estimated_value,
                  current_time, current_time, user_id, user_id), fetch_one=True)
            
            if not jo_result:
                return {'error': 'Failed to create job order'}
            
            jo_id = jo_result['id']
            
            # Insert items
            for item in items:
                self.execute_query("""
                    INSERT INTO job_order_items (jo_id, category_id, product_id, quantity_bags, weight_kg, remarks)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (jo_id, item['categoryId'], item['productId'], item['quantityBags'], item['weightKg'], item.get('remarks', '')))
            
            return {'message': 'Job order created successfully', 'joNumber': jo_number, 'id': jo_id}
            
        except Exception as e:
            print(f"❌ Failed to create job order: {e}")
            return {'error': 'Database error occurred'}

    # ========== INVENTORY MANAGEMENT METHODS ==========
    
    def create_inventory_lot(self, product_id, category_id, location_id, supplier_id, grn_item_id, quantity_bags, weight_kg, user_id):
        """Create a new inventory lot from GRN item"""
        try:
            # Generate unique lot number: LOT/YYYY/MM/DD/SEQ
            current_time = datetime.now(timezone.utc)
            year = current_time.year
            month = current_time.strftime('%m')
            day = current_time.strftime('%d')
            
            # Get next sequential number for today
            existing_query = """
                SELECT lot_number FROM inventory_lots 
                WHERE lot_number LIKE %s
                ORDER BY lot_number DESC
            """
            existing_lots = self.execute_query(existing_query, (f"LOT/{year}/{month}/{day}/%",), fetch_all=True)
            
            # Extract sequential IDs to find next available
            used_ids = set()
            for row in existing_lots:
                try:
                    parts = row['lot_number'].split('/')
                    if len(parts) == 5:
                        used_ids.add(int(parts[4]))
                except (ValueError, IndexError):
                    continue
            
            # Find next available sequential ID
            sequential_id = 1
            while sequential_id in used_ids:
                sequential_id += 1
            
            lot_number = f"LOT/{year}/{month}/{day}/{sequential_id}"
            
            # Insert inventory lot
            lot_result = self.execute_query("""
                INSERT INTO inventory_lots (lot_number, product_id, category_id, location_id, supplier_id, 
                                          grn_item_id, available_quantity, committed_quantity, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, lot_number
            """, (lot_number, product_id, category_id, location_id, supplier_id, grn_item_id, 
                  weight_kg, 0, user_id, user_id), fetch_one=True)
            
            if not lot_result:
                return {'error': 'Failed to create inventory lot'}
            
            lot_id = lot_result['id']
            
            # Record INBOUND inventory transaction
            self.record_inventory_transaction(
                lot_id=lot_id,
                transaction_type='INBOUND',
                quantity=weight_kg,
                weight_kg=weight_kg,
                location_id=location_id,
                reference_type='GRN',
                reference_id=grn_item_id,
                description=f'Initial stock from GRN - {quantity_bags} bags',
                user_id=user_id
            )
            
            print(f"✅ Created inventory lot: {lot_number} with {weight_kg}kg")
            return {
                'id': lot_id,
                'lotNumber': lot_number,
                'availableQuantity': weight_kg
            }
            
        except Exception as e:
            print(f"❌ Failed to create inventory lot: {e}")
            return {'error': 'Database error occurred'}
    
    def record_inventory_transaction(self, lot_id, transaction_type, quantity, weight_kg, location_id, 
                                   reference_type=None, reference_id=None, description=None, user_id=None):
        """Record an inventory transaction and update lot balance"""
        try:
            # Get current balance for this lot
            current_balance_query = """
                SELECT available_quantity FROM inventory_lots WHERE id = %s
            """
            current_lot = self.execute_query(current_balance_query, (lot_id,), fetch_one=True)
            
            if not current_lot:
                return {'error': 'Inventory lot not found'}
            
            current_balance = float(current_lot['available_quantity'])
            
            # Calculate new balance based on transaction type
            if transaction_type == 'INBOUND':
                new_balance = current_balance + quantity
            elif transaction_type == 'OUTBOUND':
                if current_balance < quantity:
                    return {'error': f'Insufficient stock. Available: {current_balance}kg, Requested: {quantity}kg'}
                new_balance = current_balance - quantity
            elif transaction_type == 'ADJUSTMENT':
                new_balance = current_balance + quantity  # quantity can be negative for adjustments
            else:
                new_balance = current_balance
            
            # Insert transaction record
            transaction_result = self.execute_query("""
                INSERT INTO inventory_transactions (lot_id, transaction_type, transaction_date, quantity, 
                                                  weight_kg, location_id, reference_type, reference_id, 
                                                  description, balance_quantity, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (lot_id, transaction_type, datetime.now(timezone.utc), quantity, weight_kg, 
                  location_id, reference_type, reference_id, description, new_balance, user_id), fetch_one=True)
            
            if not transaction_result:
                return {'error': 'Failed to record inventory transaction'}
            
            # Update lot balance
            update_result = self.execute_query("""
                UPDATE inventory_lots 
                SET available_quantity = %s, updated_by = %s, updated_at = %s
                WHERE id = %s
            """, (new_balance, user_id, datetime.now(timezone.utc), lot_id))
            
            if update_result is None:
                return {'error': 'Failed to update lot balance'}
            
            print(f"✅ Recorded {transaction_type} transaction: {quantity}kg, new balance: {new_balance}kg")
            return {
                'transactionId': transaction_result['id'],
                'newBalance': new_balance
            }
            
        except Exception as e:
            print(f"❌ Failed to record inventory transaction: {e}")
            return {'error': 'Database error occurred'}
    
    def allocate_stock_for_outbound(self, product_id, location_id, required_quantity):
        """Allocate stock from available lots using FIFO method"""
        try:
            # Get available lots for this product at this location, ordered by creation date (FIFO)
            available_lots_query = """
                SELECT id, lot_number, available_quantity, created_at
                FROM inventory_lots 
                WHERE product_id = %s AND location_id = %s AND available_quantity > 0
                ORDER BY created_at ASC
            """
            available_lots = self.execute_query(available_lots_query, (product_id, location_id), fetch_all=True)
            
            if not available_lots:
                return {'error': f'No stock available for product {product_id} at location {location_id}'}
            
            # Calculate total available quantity
            total_available = sum(float(lot['available_quantity']) for lot in available_lots)
            
            if total_available < required_quantity:
                return {
                    'error': f'Insufficient stock. Available: {total_available}kg, Required: {required_quantity}kg'
                }
            
            # Allocate from lots using FIFO
            allocations = []
            remaining_quantity = required_quantity
            
            for lot in available_lots:
                if remaining_quantity <= 0:
                    break
                
                lot_available = float(lot['available_quantity'])
                
                if lot_available >= remaining_quantity:
                    # This lot has enough to fulfill remaining requirement
                    allocations.append({
                        'lot_id': lot['id'],
                        'lot_number': lot['lot_number'],
                        'allocated_quantity': remaining_quantity,
                        'location_id': location_id
                    })
                    remaining_quantity = 0
                else:
                    # Use entire lot and continue to next
                    allocations.append({
                        'lot_id': lot['id'],
                        'lot_number': lot['lot_number'],
                        'allocated_quantity': lot_available,
                        'location_id': location_id
                    })
                    remaining_quantity -= lot_available
            
            return {
                'allocations': allocations,
                'total_allocated': required_quantity
            }
            
        except Exception as e:
            print(f"❌ Failed to allocate stock: {e}")
            return {'error': 'Database error occurred'}

    def reserve_stock_for_sales_order_any_location(self, sales_order_id, product_id, required_quantity, user_id):
        """Reserve stock for sales order by moving from available to committed (search across all locations)"""
        try:
            # Get product name for better error messages
            product_info = self.execute_query("""
                SELECT id, product_name FROM products WHERE id = %s
            """, (product_id,), fetch_one=True)
            
            product_name = product_info['product_name'] if product_info else f"Product {product_id}"
            
            # Find available stock across all locations using FIFO
            available_stock = self.execute_query("""
                SELECT il.id, il.lot_number, il.location_id, l.name as location_name,
                       il.available_quantity, il.created_at
                FROM inventory_lots il
                JOIN locations l ON il.location_id = l.id
                WHERE il.product_id = %s 
                AND il.available_quantity > 0
                AND l.is_active = true
                ORDER BY il.created_at ASC
            """, (product_id,), fetch_all=True)
            
            if not available_stock:
                return {'error': f'No stock available for {product_name} in any location'}
            
            # Calculate total available stock
            total_available = sum(lot['available_quantity'] for lot in available_stock)
            
            if total_available < required_quantity:
                return {'error': f'Insufficient stock for {product_name}. Required: {required_quantity}kg, Available: {total_available}kg'}
            
            # Allocate stock using FIFO across locations
            remaining_quantity = required_quantity
            reservations = []
            
            for lot in available_stock:
                if remaining_quantity <= 0:
                    break
                
                allocate_from_lot = min(lot['available_quantity'], remaining_quantity)
                reservations.append({
                    'lot_id': lot['id'],
                    'lot_number': lot['lot_number'],
                    'location_id': lot['location_id'],
                    'location_name': lot['location_name'],
                    'allocated_quantity': allocate_from_lot
                })
                remaining_quantity -= allocate_from_lot
            
            # Reserve stock by updating committed quantities
            for reservation in reservations:
                lot_id = reservation['lot_id']
                reserved_quantity = reservation['allocated_quantity']
                location_id = reservation['location_id']
                
                # Update lot: reduce available, increase committed
                update_result = self.execute_query("""
                    UPDATE inventory_lots 
                    SET available_quantity = available_quantity - %s,
                        committed_quantity = committed_quantity + %s,
                        updated_at = %s, updated_by = %s
                    WHERE id = %s AND available_quantity >= %s
                    RETURNING id, lot_number, available_quantity, committed_quantity
                """, (reserved_quantity, reserved_quantity, datetime.now(timezone.utc), user_id, 
                      lot_id, reserved_quantity), fetch_one=True)
                
                if not update_result:
                    return {'error': f'Failed to reserve stock from lot {reservation["lot_number"]} at {reservation["location_name"]}'}
                
                # Record reservation transaction
                self.execute_query("""
                    INSERT INTO inventory_transactions (lot_id, transaction_type, transaction_date, quantity, 
                                                      weight_kg, location_id, reference_type, reference_id, 
                                                      reservation_type, description, 
                                                      balance_quantity, created_by, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (lot_id, 'ADJUSTMENT', datetime.now(timezone.utc), reserved_quantity, reserved_quantity, 
                      location_id, 'SALES_ORDER', sales_order_id, 'RESERVE',
                      f'Stock reserved for sales order {sales_order_id} from {reservation["location_name"]}', 
                      update_result['available_quantity'], user_id, datetime.now(timezone.utc)))
            
            location_summary = ', '.join([f"{res['allocated_quantity']}kg from {res['location_name']}" for res in reservations])
            print(f"✅ Reserved {required_quantity}kg for sales order {sales_order_id} from: {location_summary}")
            return {'message': 'Stock reserved successfully', 'quantity_reserved': required_quantity, 'locations': location_summary}
            
        except Exception as e:
            print(f"❌ Failed to reserve stock: {e}")
            return {'error': 'Database error occurred'}

    def unreserve_stock_for_sales_order(self, sales_order_id, user_id):
        """Release reserved stock back to available when sales order is cancelled"""
        try:
            # Get all reservation transactions for this sales order
            reservation_transactions = self.execute_query("""
                SELECT lot_id, quantity 
                FROM inventory_transactions 
                WHERE reference_id = %s AND reservation_type = 'RESERVE' AND transaction_type = 'ADJUSTMENT' AND reference_type = 'SALES_ORDER'
            """, (sales_order_id,), fetch_all=True)
            
            if not reservation_transactions:
                return {'message': 'No reservations found for this sales order'}
            
            total_unreserved = 0
            for transaction in reservation_transactions:
                lot_id = transaction['lot_id']
                reserved_quantity = float(transaction['quantity'])
                
                # Update lot: increase available, decrease committed
                update_result = self.execute_query("""
                    UPDATE inventory_lots 
                    SET available_quantity = available_quantity + %s,
                        committed_quantity = committed_quantity - %s,
                        updated_at = %s, updated_by = %s
                    WHERE id = %s AND committed_quantity >= %s
                    RETURNING id, lot_number, available_quantity, committed_quantity
                """, (reserved_quantity, reserved_quantity, datetime.now(timezone.utc), user_id, 
                      lot_id, reserved_quantity), fetch_one=True)
                
                if update_result:
                    # Record unreservation transaction
                    self.execute_query("""
                        INSERT INTO inventory_transactions (lot_id, transaction_type, transaction_date, quantity, 
                                                          weight_kg, location_id, reference_type, reference_id, 
                                                          reservation_type, description, 
                                                          balance_quantity, created_by, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (lot_id, 'ADJUSTMENT', datetime.now(timezone.utc), reserved_quantity, reserved_quantity, 
                          update_result['id'], 'SALES_ORDER', sales_order_id, 'UNRESERVE',
                          f'Stock unreserved from cancelled sales order {sales_order_id}', 
                          update_result['available_quantity'], user_id, datetime.now(timezone.utc)))
                    
                    total_unreserved += reserved_quantity
            
            print(f"✅ Unreserved {total_unreserved}kg from sales order {sales_order_id}")
            return {'message': 'Stock unreserved successfully', 'quantity_unreserved': total_unreserved}
            
        except Exception as e:
            print(f"❌ Failed to unreserve stock: {e}")
            return {'error': 'Database error occurred'}
    
    def get_stock_levels(self, location_id=None, product_id=None):
        """Get current stock levels by location and/or product"""
        try:
            # Build dynamic query based on filters
            where_conditions = ["(il.available_quantity > 0 OR il.committed_quantity > 0)"]
            params = []
            
            if location_id:
                where_conditions.append("il.location_id = %s")
                params.append(location_id)
            
            if product_id:
                where_conditions.append("il.product_id = %s")
                params.append(product_id)
                print(f"🔍 Filtering by product_id: {product_id}")
            
            query = f"""
                SELECT il.id, il.lot_number, il.product_id, p.product_name, 
                       il.category_id, c.name as category_name,
                       il.location_id, l.name as location_name,
                       il.supplier_id, s.name as supplier_name,
                       il.available_quantity, il.committed_quantity, il.created_at
                FROM inventory_lots il
                LEFT JOIN products p ON il.product_id = p.id
                LEFT JOIN categories c ON il.category_id = c.id
                LEFT JOIN locations l ON il.location_id = l.id
                LEFT JOIN suppliers s ON il.supplier_id = s.id
                WHERE {' AND '.join(where_conditions)}
                ORDER BY il.created_at ASC
            """
            
            print(f"🔍 Executing query with params: {params}")
            print(f"🔍 Query: {query}")
            lots = self.execute_query(query, params, fetch_all=True)
            
            if not lots:
                return []
            
            result = []
            for lot in lots:
                result.append({
                    'id': lot['id'],
                    'lotNumber': lot['lot_number'],
                    'productId': lot['product_id'],
                    'productName': lot['product_name'],
                    'categoryId': lot['category_id'],
                    'categoryName': lot['category_name'],
                    'locationId': lot['location_id'],
                    'locationName': lot['location_name'],
                    'supplierId': lot['supplier_id'],
                    'supplierName': lot['supplier_name'],
                    'availableQuantity': float(lot['available_quantity']),
                    'committedQuantity': float(lot['committed_quantity']),
                    'createdAt': lot['created_at'].isoformat() if lot['created_at'] else None
                })
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get stock levels: {e}")
            return []

    def get_stock_levels_by_category(self, location_id=None):
        """Get stock levels grouped by category with product details"""
        try:
            # Build dynamic query based on filters
            where_conditions = ["il.available_quantity > 0 OR il.committed_quantity > 0"]
            params = []
            
            if location_id:
                where_conditions.append("il.location_id = %s")
                params.append(location_id)
            
            query = f"""
                SELECT 
                    c.id as category_id,
                    c.name as category_name,
                    SUM(il.available_quantity) as total_available,
                    SUM(il.committed_quantity) as total_committed,
                    COUNT(DISTINCT il.product_id) as product_count
                FROM inventory_lots il
                LEFT JOIN categories c ON il.category_id = c.id
                WHERE {' AND '.join(where_conditions)} AND c.id IS NOT NULL
                GROUP BY c.id, c.name
                ORDER BY c.name ASC
            """
            
            categories = self.execute_query(query, params, fetch_all=True)
            
            if not categories:
                return []
            
            result = []
            for category in categories:
                # Get product details for this category
                product_query = f"""
                    SELECT 
                        p.id as product_id,
                        p.product_name,
                        SUM(il.available_quantity) as available_quantity,
                        SUM(il.committed_quantity) as committed_quantity,
                        COUNT(il.id) as lot_count
                    FROM inventory_lots il
                    LEFT JOIN products p ON il.product_id = p.id
                    WHERE il.category_id = %s
                    AND (il.available_quantity > 0 OR il.committed_quantity > 0)
                    {' AND il.location_id = %s' if location_id else ''}
                    GROUP BY p.id, p.product_name
                    ORDER BY p.product_name ASC
                """
                
                product_params = [category['category_id']]
                if location_id:
                    product_params.append(location_id)
                
                products = self.execute_query(product_query, product_params, fetch_all=True)
                
                product_details = []
                for product in products or []:
                    product_details.append({
                        'productId': product['product_id'],
                        'productName': product['product_name'],
                        'availableQuantity': float(product['available_quantity'] or 0),
                        'committedQuantity': float(product['committed_quantity'] or 0),
                        'totalQuantity': float((product['available_quantity'] or 0) + (product['committed_quantity'] or 0)),
                        'lotCount': product['lot_count']
                    })
                
                result.append({
                    'categoryId': category['category_id'],
                    'categoryName': category['category_name'],
                    'totalAvailable': float(category['total_available'] or 0),
                    'totalCommitted': float(category['total_committed'] or 0),
                    'totalQuantity': float((category['total_available'] or 0) + (category['total_committed'] or 0)),
                    'productCount': category['product_count'],
                    'products': product_details
                })
            
            return result
            
        except Exception as e:
            print(f"❌ Failed to get stock levels by category: {e}")
            return []

# Create global instance
db_manager = DatabaseManager()