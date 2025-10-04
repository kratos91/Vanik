#!/usr/bin/env python3
"""
Data Population Script for YarnFlow Inventory Management System
This script populates the system with realistic data using the REST API endpoints.
"""

import requests
import json
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration
BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

# Data generation parameters
PURCHASE_ORDERS_COUNT = 20
GRNS_COUNT = 100
SALES_ORDERS_COUNT = 20
SALES_CHALLANS_COUNT = 20

class DataPopulator:
    def __init__(self):
        self.token = None
        self.suppliers = []
        self.customers = []
        self.products = []
        self.locations = []
        self.purchase_orders = []
        self.grns = []
        self.sales_orders = []
        
    def login(self):
        """Login and get authentication token"""
        response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            self.token = response.json()["token"]
            print("✅ Successfully logged in")
            return True
        else:
            print(f"❌ Login failed: {response.text}")
            return False
    
    def get_headers(self):
        """Get headers with authorization token"""
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def fetch_master_data(self):
        """Fetch all master data needed for transactions"""
        try:
            # Get suppliers
            response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.get_headers())
            if response.status_code == 200:
                self.suppliers = response.json()
                print(f"✅ Fetched {len(self.suppliers)} suppliers")
            
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
            
            # Get locations
            response = requests.get(f"{BASE_URL}/api/locations", headers=self.get_headers())
            if response.status_code == 200:
                self.locations = response.json()
                print(f"✅ Fetched {len(self.locations)} locations")
                
            return True
        except Exception as e:
            print(f"❌ Error fetching master data: {e}")
            return False
    
    def generate_purchase_orders(self):
        """Generate purchase orders"""
        print(f"\n🔄 Creating {PURCHASE_ORDERS_COUNT} Purchase Orders...")
        
        for i in range(PURCHASE_ORDERS_COUNT):
            try:
                supplier = random.choice(self.suppliers)
                location = random.choice(self.locations)
                
                # Create order date (random within last 3 months)
                order_date = datetime.now() - timedelta(days=random.randint(1, 90))
                expected_date = order_date + timedelta(days=random.randint(7, 30))
                
                # Generate 1-5 items per order
                items = []
                for _ in range(random.randint(1, 5)):
                    product = random.choice(self.products)
                    quantity = random.randint(500, 5000)  # 500kg to 5 tons
                    rate = round(random.uniform(80, 200), 2)  # Rate per kg
                    
                    items.append({
                        "product_id": product["id"],
                        "quantity": quantity,
                        "rate": rate,
                        "amount": quantity * rate
                    })
                
                po_data = {
                    "supplier_id": supplier["id"],
                    "location_id": location["id"],
                    "order_date": order_date.strftime("%Y-%m-%d"),
                    "expected_delivery_date": expected_date.strftime("%Y-%m-%d"),
                    "status": "confirmed",
                    "notes": f"Purchase order for {supplier['supplier_name']} - Batch {i+1}",
                    "items": items
                }
                
                response = requests.post(f"{BASE_URL}/api/purchase-orders", 
                                       json=po_data, headers=self.get_headers())
                
                if response.status_code == 201:
                    po = response.json()
                    self.purchase_orders.append(po)
                    print(f"  ✅ Created PO {i+1}/20: PO-{po.get('id', 'Unknown')}")
                else:
                    print(f"  ❌ Failed to create PO {i+1}: {response.text}")
                    
            except Exception as e:
                print(f"  ❌ Error creating PO {i+1}: {e}")
    
    def generate_grns(self):
        """Generate GRNs based on purchase orders"""
        print(f"\n🔄 Creating {GRNS_COUNT} GRNs...")
        
        for i in range(GRNS_COUNT):
            try:
                # Use purchase orders cyclically
                if self.purchase_orders:
                    po = self.purchase_orders[i % len(self.purchase_orders)]
                else:
                    # Fallback: create GRN without PO reference
                    po = None
                
                supplier = random.choice(self.suppliers)
                location = random.choice(self.locations)
                
                # Create GRN date (random within last 2 months)
                grn_date = datetime.now() - timedelta(days=random.randint(1, 60))
                
                # Generate 1-3 items per GRN
                items = []
                for _ in range(random.randint(1, 3)):
                    product = random.choice(self.products)
                    quantity = random.randint(200, 2000)  # 200kg to 2 tons
                    rate = round(random.uniform(80, 200), 2)
                    
                    items.append({
                        "product_id": product["id"],
                        "quantity": quantity,
                        "rate": rate,
                        "amount": quantity * rate
                    })
                
                grn_data = {
                    "supplier_id": supplier["id"],
                    "location_id": location["id"],
                    "grn_date": grn_date.strftime("%Y-%m-%d"),
                    "purchase_order_id": po.get("id") if po else None,
                    "invoice_number": f"INV-{random.randint(1000, 9999)}-{i+1}",
                    "notes": f"GRN for {supplier['supplier_name']} - Batch {i+1}",
                    "items": items
                }
                
                response = requests.post(f"{BASE_URL}/api/grns", 
                                       json=grn_data, headers=self.get_headers())
                
                if response.status_code == 201:
                    grn = response.json()
                    self.grns.append(grn)
                    print(f"  ✅ Created GRN {i+1}/100: GRN-{grn.get('id', 'Unknown')}")
                else:
                    print(f"  ❌ Failed to create GRN {i+1}: {response.text}")
                    
            except Exception as e:
                print(f"  ❌ Error creating GRN {i+1}: {e}")
    
    def generate_sales_orders(self):
        """Generate sales orders"""
        print(f"\n🔄 Creating {SALES_ORDERS_COUNT} Sales Orders...")
        
        for i in range(SALES_ORDERS_COUNT):
            try:
                customer = random.choice(self.customers)
                location = random.choice(self.locations)
                
                # Create order date (random within last month)
                order_date = datetime.now() - timedelta(days=random.randint(1, 30))
                delivery_date = order_date + timedelta(days=random.randint(3, 15))
                
                # Generate 1-4 items per order
                items = []
                for _ in range(random.randint(1, 4)):
                    product = random.choice(self.products)
                    quantity = random.randint(100, 1000)  # 100kg to 1 ton
                    rate = round(random.uniform(90, 220), 2)  # Slightly higher than purchase rate
                    
                    items.append({
                        "product_id": product["id"],
                        "quantity": quantity,
                        "rate": rate,
                        "amount": quantity * rate
                    })
                
                so_data = {
                    "customer_id": customer["id"],
                    "location_id": location["id"],
                    "order_date": order_date.strftime("%Y-%m-%d"),
                    "delivery_date": delivery_date.strftime("%Y-%m-%d"),
                    "status": "confirmed",
                    "notes": f"Sales order for {customer['customer_name']} - Order {i+1}",
                    "items": items
                }
                
                response = requests.post(f"{BASE_URL}/api/sales-orders", 
                                       json=so_data, headers=self.get_headers())
                
                if response.status_code == 201:
                    so = response.json()
                    self.sales_orders.append(so)
                    print(f"  ✅ Created SO {i+1}/20: SO-{so.get('id', 'Unknown')}")
                else:
                    print(f"  ❌ Failed to create SO {i+1}: {response.text}")
                    
            except Exception as e:
                print(f"  ❌ Error creating SO {i+1}: {e}")
    
    def generate_sales_challans(self):
        """Generate sales challans based on sales orders"""
        print(f"\n🔄 Creating {SALES_CHALLANS_COUNT} Sales Challans...")
        
        for i in range(SALES_CHALLANS_COUNT):
            try:
                # Use sales orders cyclically
                if self.sales_orders:
                    so = self.sales_orders[i % len(self.sales_orders)]
                    customer_id = so.get("customer_id")
                    location_id = so.get("location_id")
                else:
                    # Fallback: create challan without SO reference
                    so = None
                    customer_id = random.choice(self.customers)["id"]
                    location_id = random.choice(self.locations)["id"]
                
                # Create challan date (random within last 2 weeks)
                challan_date = datetime.now() - timedelta(days=random.randint(1, 14))
                
                # Generate 1-3 items per challan
                items = []
                for _ in range(random.randint(1, 3)):
                    product = random.choice(self.products)
                    quantity = random.randint(50, 500)  # 50kg to 500kg
                    rate = round(random.uniform(90, 220), 2)
                    
                    items.append({
                        "product_id": product["id"],
                        "quantity": quantity,
                        "rate": rate,
                        "amount": quantity * rate
                    })
                
                challan_data = {
                    "customer_id": customer_id,
                    "location_id": location_id,
                    "challan_date": challan_date.strftime("%Y-%m-%d"),
                    "sales_order_id": so.get("id") if so else None,
                    "vehicle_number": f"GJ-{random.randint(10, 99)}-{random.choice(['AB', 'CD', 'EF'])}-{random.randint(1000, 9999)}",
                    "driver_name": random.choice(["Ravi Kumar", "Suresh Patel", "Mukesh Shah", "Jitendra Singh", "Ramesh Yadav"]),
                    "notes": f"Delivery challan {i+1}",
                    "items": items
                }
                
                response = requests.post(f"{BASE_URL}/api/sales-challans", 
                                       json=challan_data, headers=self.get_headers())
                
                if response.status_code == 201:
                    challan = response.json()
                    print(f"  ✅ Created Challan {i+1}/20: SC-{challan.get('id', 'Unknown')}")
                else:
                    print(f"  ❌ Failed to create Challan {i+1}: {response.text}")
                    
            except Exception as e:
                print(f"  ❌ Error creating Challan {i+1}: {e}")
    
    def run(self):
        """Main execution function"""
        print("🚀 Starting YarnFlow Data Population...")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Fetch master data
        if not self.fetch_master_data():
            return False
        
        # Check if we have enough master data
        if len(self.suppliers) < 5 or len(self.customers) < 5 or len(self.products) < 10:
            print("❌ Insufficient master data. Please ensure you have:")
            print(f"   - At least 5 suppliers (found: {len(self.suppliers)})")
            print(f"   - At least 5 customers (found: {len(self.customers)})")
            print(f"   - At least 10 products (found: {len(self.products)})")
            return False
        
        # Step 3: Generate transactional data in logical order
        self.generate_purchase_orders()
        self.generate_grns()
        self.generate_sales_orders()
        self.generate_sales_challans()
        
        print("\n" + "=" * 50)
        print("✅ Data population completed successfully!")
        print(f"Created: {len(self.purchase_orders)} POs, {len(self.grns)} GRNs, {len(self.sales_orders)} SOs, 20 Challans")
        
        return True

if __name__ == "__main__":
    populator = DataPopulator()
    populator.run()