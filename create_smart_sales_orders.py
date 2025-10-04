#!/usr/bin/env python3
"""
Smart Sales Order Creation Script
Creates sales orders based on actual available stock levels
"""

import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

class SmartSalesOrderCreator:
    def __init__(self):
        self.token = None
        self.customers = []
        self.products = []
        self.stock_levels = {}
        
    def login(self):
        try:
            response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                self.token = response.json()["token"]
                print("✅ Successfully logged in")
                return True
            else:
                print(f"❌ Login failed")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def get_stock_levels(self):
        """Get current stock levels for all products"""
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/stock-levels", headers=self.get_headers())
            if response.status_code == 200:
                stock_data = response.json()
                # Handle if it's a list of dictionaries or nested structure
                if isinstance(stock_data, list):
                    for item in stock_data:
                        if isinstance(item, dict):
                            product_id = item.get("product_id")
                            available_stock = item.get("available_stock", 0)
                        else:
                            # Handle if item is a string or other format
                            continue
                        
                        if product_id and float(available_stock) > 0:
                            self.stock_levels[product_id] = float(available_stock)
                elif isinstance(stock_data, dict):
                    # Handle nested structure
                    for key, value in stock_data.items():
                        if isinstance(value, dict) and "product_id" in value:
                            product_id = value.get("product_id")
                            available_stock = value.get("available_stock", 0)
                            if product_id and float(available_stock) > 0:
                                self.stock_levels[product_id] = float(available_stock)
                        
                print(f"✅ Found stock for {len(self.stock_levels)} products")
                if len(self.stock_levels) == 0:
                    print("⚠️ No products with stock found - will try a simpler approach")
                return True
        except Exception as e:
            print(f"❌ Error getting stock levels: {e}")
            return False
    
    def fetch_master_data(self):
        try:
            # Get customers
            response = requests.get(f"{BASE_URL}/api/customers", headers=self.get_headers())
            if response.status_code == 200:
                self.customers = response.json()
                print(f"✅ Fetched {len(self.customers)} customers")
            
            # Get products
            response = requests.get(f"{BASE_URL}/api/products", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.products = data.get("products", data) if isinstance(data, dict) else data
                print(f"✅ Fetched {len(self.products)} products")
                
            return True
        except Exception as e:
            print(f"❌ Error fetching master data: {e}")
            return False
    
    def get_products_with_stock(self, min_stock=5):
        """Get products that have sufficient stock available"""
        products_with_stock = []
        for product in self.products:
            product_id = product["id"]
            available_stock = self.stock_levels.get(product_id, 0)
            if available_stock >= min_stock:
                products_with_stock.append({
                    **product,
                    "available_stock": available_stock
                })
        return products_with_stock
    
    def create_sales_order(self, order_data):
        try:
            response = requests.post(f"{BASE_URL}/api/sales-orders", 
                                   json=order_data, headers=self.get_headers())
            
            if response.status_code == 201:
                return response.json()
            else:
                error_msg = response.text
                if "insufficient stock" in error_msg.lower():
                    print(f"    ⚠️ Stock insufficient - this is expected")
                else:
                    print(f"    ❌ API Error: {response.status_code} - {error_msg}")
                return None
                
        except Exception as e:
            print(f"    ❌ Request error: {e}")
            return None
    
    def create_smart_sales_orders(self, target_count=20):
        print(f"\n🔄 Creating {target_count} Smart Sales Orders...")
        
        # Get products with available stock
        products_with_stock = self.get_products_with_stock(min_stock=5)
        print(f"✅ Found {len(products_with_stock)} products with stock >= 5kg")
        
        # If no products with verified stock, use all products with small quantities
        if len(products_with_stock) < 3:
            print("⚠️ Using all products with very small quantities (2-10kg)")
            products_with_stock = []
            for product in self.products:
                products_with_stock.append({
                    **product,
                    "available_stock": 10  # Assume small stock
                })
        
        if len(products_with_stock) < 3:
            print("❌ Not enough products available")
            return []
        
        created_orders = []
        
        for i in range(target_count):
            try:
                # Select random customer
                customer = random.choice(self.customers)
                
                # Select 1-2 products with stock
                num_items = random.randint(1, min(2, len(products_with_stock)))
                selected_products = random.sample(products_with_stock, num_items)
                
                items = []
                total_value = 0
                
                for product in selected_products:
                    available_stock = product["available_stock"]
                    # Use 10-80% of available stock, but max 20kg to be safe
                    usage_percent = random.uniform(0.1, 0.8)
                    quantity = min(available_stock * usage_percent, 20)
                    quantity = max(quantity, 2)  # Minimum 2kg
                    
                    rate = random.randint(80, 200)  # Rate per kg
                    
                    items.append({
                        "categoryId": product["category_id"],
                        "productId": product["id"],
                        "quantityBags": max(1, int(quantity // 50)),
                        "weightKg": int(quantity),
                        "estimatedValue": int(quantity * rate),
                        "remarks": f"SO {i+1} - Product {product.get('product_name', 'item')}"
                    })
                    
                    total_value += quantity * rate
                
                # Create order date
                order_date = datetime.now() - timedelta(days=random.randint(1, 30))
                
                # Create sales order data
                so_data = {
                    "customerId": customer["id"],
                    "orderDate": order_date.strftime("%Y-%m-%d"),
                    "items": items
                }
                
                # Create the order
                result = self.create_sales_order(so_data)
                
                if result:
                    created_orders.append(result)
                    print(f"  ✅ SO {i+1}/20: {result.get('so_number', 'Unknown')} - ₹{total_value:,.0f}")
                    print(f"     Customer: {customer.get('customer_name', customer.get('name', 'Unknown'))}")
                    print(f"     Items: {len(items)} ({sum(item['weightKg'] for item in items)}kg total)")
                    
                    # Update our local stock tracking
                    for item in items:
                        product_id = item["productId"]
                        used_qty = item["weightKg"]
                        if product_id in self.stock_levels:
                            self.stock_levels[product_id] -= used_qty
                            self.stock_levels[product_id] = max(0, self.stock_levels[product_id])
                else:
                    print(f"  ❌ Failed SO {i+1}")
                    
            except Exception as e:
                print(f"  ❌ Error creating SO {i+1}: {e}")
        
        return created_orders
    
    def run(self):
        print("🚀 Smart Sales Order Creation Based on Available Stock...")
        print("=" * 60)
        
        if not self.login():
            return False
        
        if not self.fetch_master_data():
            return False
            
        if not self.get_stock_levels():
            return False
        
        if len(self.customers) < 3:
            print("❌ Need at least 3 customers")
            return False
        
        created_orders = self.create_smart_sales_orders(20)
        
        print("\n" + "=" * 60)
        print(f"✅ Smart sales order creation completed!")
        print(f"Successfully created: {len(created_orders)} out of 20 sales orders")
        print("Note: Failed orders are expected when stock is insufficient - this shows inventory control is working!")
        
        return True

if __name__ == "__main__":
    creator = SmartSalesOrderCreator()
    creator.run()