#!/usr/bin/env python3
"""
GRN Creation Script
Creates 100 realistic GRNs based on existing purchase orders
"""

import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

class GRNCreator:
    def __init__(self):
        self.token = None
        self.suppliers = []
        self.products = []
        self.locations = []
        self.purchase_orders = []
        
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
        """Fetch all master data needed for GRNs"""
        try:
            # Get suppliers
            response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.get_headers())
            if response.status_code == 200:
                self.suppliers = response.json()
                print(f"✅ Fetched {len(self.suppliers)} suppliers")
            
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
                
            # Get purchase orders
            response = requests.get(f"{BASE_URL}/api/purchase-orders", headers=self.get_headers())
            if response.status_code == 200:
                self.purchase_orders = response.json()
                print(f"✅ Fetched {len(self.purchase_orders)} purchase orders")
                
            return True
        except Exception as e:
            print(f"❌ Error fetching master data: {e}")
            return False
    
    def create_grn(self, grn_data):
        """Create a GRN via API"""
        try:
            response = requests.post(f"{BASE_URL}/api/grns", 
                                   json=grn_data, headers=self.get_headers())
            
            if response.status_code == 201:
                result = response.json()
                return result
            else:
                print(f"❌ Failed to create GRN: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating GRN: {e}")
            return None
    
    def generate_grns(self):
        """Generate 100 GRNs based on purchase orders"""
        print(f"\n🔄 Creating 100 GRNs...")
        
        created_grns = []
        
        for i in range(100):
            try:
                # Select supplier, location, and products
                supplier = random.choice(self.suppliers) if self.suppliers else None
                location = random.choice(self.locations) if self.locations else None
                
                if not supplier or not location:
                    print(f"❌ Missing supplier or location data for GRN {i+1}")
                    continue
                
                # Create receipt date (random within last 2 months)
                receipt_date = datetime.now() - timedelta(days=random.randint(1, 60))
                
                # Select 1-3 products for this GRN
                num_items = random.randint(1, 3)
                selected_products = random.sample(self.products, min(num_items, len(self.products)))
                
                # Create items
                items = []
                for product in selected_products:
                    quantity_bags = random.randint(5, 40)  # 5-40 bags
                    weight_kg = quantity_bags * random.randint(45, 55)  # 45-55 kg per bag
                    
                    items.append({
                        "categoryId": product["category_id"],
                        "productId": product["id"],
                        "quantityBags": quantity_bags,
                        "weightKg": weight_kg,
                        "estimatedValue": weight_kg * random.randint(80, 200),
                        "remarks": f"Quality {product.get('product_name', 'product')} - Batch {i+1}"
                    })
                
                # Create GRN data with nested structure as expected by backend
                grn_payload = {
                    "grn": {
                        "receiptDate": receipt_date.strftime("%Y-%m-%d"),
                        "supplierId": supplier["id"],
                        "locationId": location["id"],
                        "invoiceNumber": f"INV-{random.randint(1000, 9999)}-{i+1:03d}",
                        "notes": f"Goods receipt #{i+1} - Quality checked and approved"
                    },
                    "items": items
                }
                
                # Create the GRN
                result = self.create_grn(grn_payload)
                
                if result:
                    created_grns.append(result)
                    total_weight = sum(item["weightKg"] for item in items)
                    print(f"  ✅ Created GRN {i+1}/100: {result.get('grn_number', 'Unknown')} - {total_weight}kg")
                else:
                    print(f"  ❌ Failed to create GRN {i+1}")
                    
            except Exception as e:
                print(f"  ❌ Error creating GRN {i+1}: {e}")
        
        return created_grns
    
    def run(self):
        """Main execution function"""
        print("🚀 Starting GRN Creation...")
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
        
        # Step 3: Generate GRNs
        created_grns = self.generate_grns()
        
        print("\n" + "=" * 50)
        print(f"✅ GRN creation completed!")
        print(f"Successfully created: {len(created_grns)} out of 100 GRNs")
        
        return True

if __name__ == "__main__":
    creator = GRNCreator()
    creator.run()