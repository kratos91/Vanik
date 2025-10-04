#!/usr/bin/env python3
"""
Sales Order Creation Script
Creates 20 realistic sales orders using backend APIs with proper category-product relationships
"""

import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

class SalesOrderCreator:
    def __init__(self):
        self.token = None
        self.customers = []
        self.products = []
        self.categories = []
        self.locations = []
        
    def login(self):
        """Login and get authentication token"""
        try:
            response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                self.token = response.json()["token"]
                print("✅ Successfully logged in")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_headers(self):
        """Get headers with authorization token"""
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def fetch_master_data(self):
        """Fetch all master data needed for sales orders"""
        try:
            # Get customers
            response = requests.get(f"{BASE_URL}/api/customers", headers=self.get_headers())
            if response.status_code == 200:
                self.customers = response.json()
                print(f"✅ Fetched {len(self.customers)} customers")
            
            # Get categories
            response = requests.get(f"{BASE_URL}/api/categories", headers=self.get_headers())
            if response.status_code == 200:
                self.categories = response.json()
                print(f"✅ Fetched {len(self.categories)} categories")
            
            # Get products
            response = requests.get(f"{BASE_URL}/api/products", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.products = data.get("products", data) if isinstance(data, dict) else data
                print(f"✅ Fetched {len(self.products)} products")
            
            # Get locations
            response = requests.get(f"{BASE_URL}/api/locations", headers=self.get_headers())
            if response.status_code == 200:
                self.locations = response.json()
                print(f"✅ Fetched {len(self.locations)} locations")
                
            return True
        except Exception as e:
            print(f"❌ Error fetching master data: {e}")
            return False
    
    def get_products_by_category(self, category_id):
        """Get products that belong to a specific category"""
        return [p for p in self.products if p.get("category_id") == category_id]
    
    def create_sales_order(self, order_data):
        """Create a sales order via API"""
        try:
            response = requests.post(f"{BASE_URL}/api/sales-orders", 
                                   json=order_data, headers=self.get_headers())
            
            if response.status_code == 201:
                result = response.json()
                return result
            else:
                print(f"❌ Failed to create SO: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating SO: {e}")
            return None
    
    def generate_sales_orders(self):
        """Generate 20 sales orders with category-specific products"""
        print(f"\n🔄 Creating 20 Sales Orders...")
        
        sales_order_templates = [
            {
                "category_focus": "Cotton Yarn",
                "quantities": [800, 600, 400],
                "rates": [155, 145, 170],
                "delivery_days": 12,
                "priority": "high",
                "notes": "Cotton yarn order for garment manufacturing"
            },
            {
                "category_focus": "Synthetic Yarn", 
                "quantities": [1200, 400, 600],
                "rates": [95, 190, 105],
                "delivery_days": 10,
                "priority": "medium",
                "notes": "Synthetic yarn for technical textiles"
            },
            {
                "category_focus": "Wool Yarn",
                "quantities": [300, 150, 450],
                "rates": [480, 850, 350],
                "delivery_days": 18,
                "priority": "high",
                "notes": "Premium wool yarn for luxury products"
            },
            {
                "category_focus": "Blended Yarn",
                "quantities": [1000, 800, 500],
                "rates": [120, 135, 150],
                "delivery_days": 14,
                "priority": "medium",
                "notes": "Blended yarn for fashion collection"
            },
            {
                "category_focus": "Raw Cotton",
                "quantities": [3000, 2000, 2500],
                "rates": [85, 90, 88],
                "delivery_days": 8,
                "priority": "high",
                "notes": "Raw cotton for spinning operations"
            }
        ]
        
        created_orders = []
        
        for i in range(20):
            try:
                # Select template cyclically and add variations
                template = sales_order_templates[i % len(sales_order_templates)]
                
                # Find category by name (case insensitive)
                target_category = None
                for cat in self.categories:
                    if template["category_focus"].lower() in cat.get("name", "").lower():
                        target_category = cat
                        break
                
                # If exact match not found, use first category
                if not target_category and self.categories:
                    target_category = self.categories[0]
                
                if not target_category:
                    print(f"❌ No categories available for SO {i+1}")
                    continue
                
                # Get products from this category
                category_products = self.get_products_by_category(target_category["id"])
                
                if not category_products:
                    # If no products in category, use any available products
                    category_products = self.products[:3] if len(self.products) >= 3 else self.products
                
                if not category_products:
                    print(f"❌ No products available for SO {i+1}")
                    continue
                
                # Select random customer and location
                customer = random.choice(self.customers) if self.customers else None
                location = random.choice(self.locations) if self.locations else None
                
                if not customer or not location:
                    print(f"❌ Missing customer or location data for SO {i+1}")
                    continue
                
                # Create order date and delivery date
                order_date = datetime.now() - timedelta(days=random.randint(1, 15))
                delivery_date = order_date + timedelta(days=template["delivery_days"])
                
                # Create items with products from the category (smaller realistic quantities)
                items = []
                num_items = min(len(category_products), len(template["quantities"]), 2)  # Max 2 items per order
                
                for j in range(num_items):
                    product = category_products[j % len(category_products)]
                    # Use much smaller quantities to match available stock
                    base_quantity = template["quantities"][j] // 10  # Reduce by 90%
                    quantity = base_quantity + random.randint(-20, 20)
                    rate = template["rates"][j] + random.randint(-5, 5)
                    
                    if quantity < 10:
                        quantity = 10  # Minimum 10kg
                    if rate < 50:
                        rate = 50
                    
                    items.append({
                        "categoryId": product["category_id"],
                        "productId": product["id"],
                        "quantityBags": max(1, quantity // 50),  # Assume 50kg per bag
                        "weightKg": quantity,
                        "estimatedValue": quantity * rate,
                        "remarks": f"SO item {j+1} - {product.get('product_name', 'product')}"
                    })
                
                # Create sales order data with simplified structure based on API
                so_data = {
                    "customerId": customer["id"],
                    "orderDate": order_date.strftime("%Y-%m-%d"),
                    "items": items
                }
                
                # Create the sales order
                result = self.create_sales_order(so_data)
                
                if result:
                    created_orders.append(result)
                    total_value = sum(item["estimatedValue"] for item in items)
                    print(f"  ✅ Created SO {i+1}/20: {result.get('so_number', 'Unknown')} - ₹{total_value:,}")
                    print(f"     Category: {target_category['name']}")
                    print(f"     Customer: {customer.get('customer_name', customer.get('name', 'Unknown'))}")
                    print(f"     Items: {len(items)}")
                else:
                    print(f"  ❌ Failed to create SO {i+1}")
                    
            except Exception as e:
                print(f"  ❌ Error creating SO {i+1}: {e}")
        
        return created_orders
    
    def run(self):
        """Main execution function"""
        print("🚀 Starting Sales Order Creation...")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Fetch master data
        if not self.fetch_master_data():
            return False
        
        # Check if we have enough master data
        if len(self.customers) < 3 or len(self.products) < 5:
            print("❌ Insufficient master data. Please ensure you have:")
            print(f"   - At least 3 customers (found: {len(self.customers)})")
            print(f"   - At least 5 products (found: {len(self.products)})")
            return False
        
        # Step 3: Generate sales orders
        created_orders = self.generate_sales_orders()
        
        print("\n" + "=" * 50)
        print(f"✅ Sales order creation completed!")
        print(f"Successfully created: {len(created_orders)} out of 20 sales orders")
        
        return True

if __name__ == "__main__":
    creator = SalesOrderCreator()
    creator.run()