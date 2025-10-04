#!/usr/bin/env python3
"""
Purchase Order Creation Script
Creates 20 realistic purchase orders using backend APIs with proper category-product relationships
"""

import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

class PurchaseOrderCreator:
    def __init__(self):
        self.token = None
        self.suppliers = []
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
        """Fetch all master data needed for purchase orders"""
        try:
            # Get suppliers
            response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.get_headers())
            if response.status_code == 200:
                self.suppliers = response.json()
                print(f"✅ Fetched {len(self.suppliers)} suppliers")
            
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
    
    def create_purchase_order(self, order_data):
        """Create a purchase order via API"""
        try:
            response = requests.post(f"{BASE_URL}/api/purchase-orders", 
                                   json=order_data, headers=self.get_headers())
            
            if response.status_code == 201:
                result = response.json()
                return result
            else:
                print(f"❌ Failed to create PO: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating PO: {e}")
            return None
    
    def generate_purchase_orders(self):
        """Generate 20 purchase orders with category-specific products"""
        print(f"\n🔄 Creating 20 Purchase Orders...")
        
        purchase_order_templates = [
            {
                "category_focus": "Cotton Yarn",
                "quantities": [1200, 800, 600],
                "rates": [145, 135, 160],
                "delivery_days": 15,
                "notes": "Bulk cotton yarn order for textile production"
            },
            {
                "category_focus": "Synthetic Yarn", 
                "quantities": [2000, 500, 800],
                "rates": [85, 180, 95],
                "delivery_days": 12,
                "notes": "Synthetic yarn procurement for winter collection"
            },
            {
                "category_focus": "Wool Yarn",
                "quantities": [400, 200, 600],
                "rates": [450, 800, 320],
                "delivery_days": 20,
                "notes": "Premium wool order for luxury garments"
            },
            {
                "category_focus": "Blended Yarn",
                "quantities": [1500, 1000, 700],
                "rates": [110, 125, 140],
                "delivery_days": 14,
                "notes": "Blended yarn order for spring collection"
            },
            {
                "category_focus": "Raw Cotton",
                "quantities": [5000, 3000, 4000],
                "rates": [75, 80, 78],
                "delivery_days": 10,
                "notes": "Raw cotton purchase for spinning unit"
            }
        ]
        
        created_orders = []
        
        for i in range(20):
            try:
                # Select template cyclically and add variations
                template = purchase_order_templates[i % len(purchase_order_templates)]
                
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
                    print(f"❌ No categories available for PO {i+1}")
                    continue
                
                # Get products from this category
                category_products = self.get_products_by_category(target_category["id"])
                
                if not category_products:
                    # If no products in category, use any available products
                    category_products = self.products[:3] if len(self.products) >= 3 else self.products
                
                if not category_products:
                    print(f"❌ No products available for PO {i+1}")
                    continue
                
                # Select random supplier and location
                supplier = random.choice(self.suppliers) if self.suppliers else None
                location = random.choice(self.locations) if self.locations else None
                
                if not supplier or not location:
                    print(f"❌ Missing supplier or location data for PO {i+1}")
                    continue
                
                # Create order date and delivery date
                order_date = datetime.now() - timedelta(days=random.randint(1, 30))
                delivery_date = order_date + timedelta(days=template["delivery_days"])
                
                # Create items with products from the category
                items = []
                num_items = min(len(category_products), len(template["quantities"]))
                
                for j in range(num_items):
                    product = category_products[j % len(category_products)]
                    quantity = template["quantities"][j] + random.randint(-100, 100)
                    rate = template["rates"][j] + random.randint(-10, 10)
                    
                    if quantity < 0:
                        quantity = 100
                    if rate < 0:
                        rate = 50
                    
                    items.append({
                        "categoryId": product["category_id"],
                        "productId": product["id"],
                        "quantityBags": max(1, quantity // 50),  # Assume 50kg per bag
                        "weightKg": quantity,
                        "estimatedValue": quantity * rate,
                        "remarks": f"Standard {product.get('product_name', 'product')} procurement"
                    })
                
                # Create purchase order data (using camelCase field names)
                po_data = {
                    "supplierId": supplier["id"],
                    "locationId": location["id"],
                    "orderDate": order_date.strftime("%Y-%m-%d"),
                    "expectedDeliveryDate": delivery_date.strftime("%Y-%m-%d"),
                    "status": "confirmed",
                    "notes": f"{template['notes']} - Order {i+1}",
                    "items": items
                }
                
                # Create the purchase order
                result = self.create_purchase_order(po_data)
                
                if result:
                    created_orders.append(result)
                    total_value = sum(item["amount"] for item in items)
                    print(f"  ✅ Created PO {i+1}/20: {result.get('po_number', 'Unknown')} - ₹{total_value:,}")
                    print(f"     Category: {target_category['name']}")
                    print(f"     Supplier: {supplier.get('supplier_name', supplier.get('name', 'Unknown'))}")
                    print(f"     Items: {len(items)}")
                else:
                    print(f"  ❌ Failed to create PO {i+1}")
                    
            except Exception as e:
                print(f"  ❌ Error creating PO {i+1}: {e}")
        
        return created_orders
    
    def run(self):
        """Main execution function"""
        print("🚀 Starting Purchase Order Creation...")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Fetch master data
        if not self.fetch_master_data():
            return False
        
        # Check if we have enough master data
        if len(self.suppliers) < 3 or len(self.products) < 5:
            print("❌ Insufficient master data. Please ensure you have:")
            print(f"   - At least 3 suppliers (found: {len(self.suppliers)})")
            print(f"   - At least 5 products (found: {len(self.products)})")
            return False
        
        # Step 3: Generate purchase orders
        created_orders = self.generate_purchase_orders()
        
        print("\n" + "=" * 50)
        print(f"✅ Purchase order creation completed!")
        print(f"Successfully created: {len(created_orders)} out of 20 purchase orders")
        
        return True

if __name__ == "__main__":
    creator = PurchaseOrderCreator()
    creator.run()