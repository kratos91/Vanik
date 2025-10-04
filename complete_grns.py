#!/usr/bin/env python3
"""
Complete GRN Creation - Finish remaining GRNs efficiently
"""

import requests
import json
import random
from datetime import datetime, timedelta
import time

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

def login():
    response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
    return response.json()["token"] if response.status_code == 200 else None

def get_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_current_grn_count(token):
    try:
        response = requests.get(f"{BASE_URL}/api/grns", headers=get_headers(token))
        if response.status_code == 200:
            return len(response.json())
    except:
        pass
    return 0

def get_master_data(token):
    headers = get_headers(token)
    suppliers = requests.get(f"{BASE_URL}/api/suppliers", headers=headers).json()
    products_response = requests.get(f"{BASE_URL}/api/products", headers=headers).json()
    products = products_response.get("products", products_response) if isinstance(products_response, dict) else products_response
    locations = requests.get(f"{BASE_URL}/api/locations", headers=headers).json()
    return suppliers, products, locations

def create_grn_batch(token, suppliers, products, locations, start_num, batch_size=10):
    created = 0
    
    for i in range(start_num, start_num + batch_size):
        try:
            supplier = random.choice(suppliers)
            location = random.choice(locations)
            receipt_date = datetime.now() - timedelta(days=random.randint(1, 60))
            
            # Create 1-2 items per GRN
            num_items = random.randint(1, 2)
            selected_products = random.sample(products, min(num_items, len(products)))
            
            items = []
            for product in selected_products:
                quantity_bags = random.randint(8, 25)
                weight_kg = quantity_bags * random.randint(48, 52)
                
                items.append({
                    "categoryId": product["category_id"],
                    "productId": product["id"],
                    "quantityBags": quantity_bags,
                    "weightKg": weight_kg,
                    "estimatedValue": weight_kg * random.randint(90, 160),
                    "remarks": f"Batch {i} - Quality assured"
                })
            
            grn_payload = {
                "grn": {
                    "receiptDate": receipt_date.strftime("%Y-%m-%d"),
                    "supplierId": supplier["id"],
                    "locationId": location["id"],
                    "invoiceNumber": f"INV-{random.randint(2000, 8999)}-{i:03d}",
                    "notes": f"Goods receipt #{i} - Standard quality batch"
                },
                "items": items
            }
            
            response = requests.post(f"{BASE_URL}/api/grns", 
                                   json=grn_payload, headers=get_headers(token))
            
            if response.status_code == 201:
                created += 1
                total_weight = sum(item["weightKg"] for item in items)
                print(f"  ✅ GRN {i} created - {total_weight}kg")
            else:
                print(f"  ⚠️ GRN {i} failed: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error GRN {i}: {str(e)[:50]}")
    
    return created

def main():
    print("🚀 Completing GRN Creation to reach 100 total...")
    
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    # Check current count
    current_count = get_current_grn_count(token)
    print(f"✅ Current GRNs: {current_count}")
    
    if current_count >= 100:
        print("🎉 Already have 100+ GRNs!")
        return
    
    remaining = 100 - current_count
    print(f"📝 Creating {remaining} more GRNs...")
    
    suppliers, products, locations = get_master_data(token)
    print(f"✅ Data loaded: {len(suppliers)} suppliers, {len(products)} products, {len(locations)} locations")
    
    # Create remaining GRNs in batches
    total_created = 0
    batch_size = 15  # Smaller batches for stability
    start_num = current_count + 1
    
    while total_created < remaining:
        batch_to_create = min(batch_size, remaining - total_created)
        print(f"\n📦 Creating batch: GRNs {start_num} to {start_num + batch_to_create - 1}")
        
        batch_created = create_grn_batch(token, suppliers, products, locations, 
                                       start_num, batch_to_create)
        
        total_created += batch_created
        start_num += batch_to_create
        
        print(f"   Batch completed: {batch_created}/{batch_to_create} created")
        print(f"   Progress: {current_count + total_created}/100 total GRNs")
        
        # Small delay between batches
        if total_created < remaining:
            time.sleep(2)
    
    final_count = get_current_grn_count(token)
    print(f"\n🎉 GRN Creation Complete!")
    print(f"✅ Final count: {final_count} GRNs")
    print(f"✅ Created {total_created} new GRNs in this session")

if __name__ == "__main__":
    main()