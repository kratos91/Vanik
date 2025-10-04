#!/usr/bin/env python3
"""
Fast GRN Creation Script - Creates remaining GRNs quickly
"""

import requests
import json
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

def login():
    response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
    return response.json()["token"] if response.status_code == 200 else None

def get_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_master_data(token):
    headers = get_headers(token)
    suppliers = requests.get(f"{BASE_URL}/api/suppliers", headers=headers).json()
    products = requests.get(f"{BASE_URL}/api/products", headers=headers).json()
    products = products.get("products", products) if isinstance(products, dict) else products
    locations = requests.get(f"{BASE_URL}/api/locations", headers=headers).json()
    return suppliers, products, locations

def create_grn(token, grn_data):
    try:
        response = requests.post(f"{BASE_URL}/api/grns", 
                               json=grn_data, headers=get_headers(token))
        return response.status_code == 201
    except:
        return False

def main():
    print("🚀 Fast GRN Creation - Creating remaining 78 GRNs...")
    
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    suppliers, products, locations = get_master_data(token)
    print(f"✅ Data: {len(suppliers)} suppliers, {len(products)} products, {len(locations)} locations")
    
    created = 0
    for i in range(23, 101):  # Continue from 23 to 100
        try:
            # Quick random selection
            supplier = random.choice(suppliers)
            location = random.choice(locations)
            receipt_date = datetime.now() - timedelta(days=random.randint(1, 60))
            
            # Create 1-2 items per GRN for speed
            num_items = random.randint(1, 2)
            selected_products = random.sample(products, min(num_items, len(products)))
            
            items = []
            for product in selected_products:
                quantity_bags = random.randint(10, 30)
                weight_kg = quantity_bags * random.randint(45, 55)
                
                items.append({
                    "categoryId": product["category_id"],
                    "productId": product["id"],
                    "quantityBags": quantity_bags,
                    "weightKg": weight_kg,
                    "estimatedValue": weight_kg * random.randint(100, 150),
                    "remarks": f"Quality batch {i}"
                })
            
            grn_payload = {
                "grn": {
                    "receiptDate": receipt_date.strftime("%Y-%m-%d"),
                    "supplierId": supplier["id"],
                    "locationId": location["id"],
                    "invoiceNumber": f"INV-{random.randint(1000, 9999)}-{i:03d}",
                    "notes": f"Goods receipt #{i} - Fast creation batch"
                },
                "items": items
            }
            
            if create_grn(token, grn_payload):
                created += 1
                total_weight = sum(item["weightKg"] for item in items)
                print(f"  ✅ GRN {i}/100 created - {total_weight}kg")
            else:
                print(f"  ❌ Failed GRN {i}")
                
        except Exception as e:
            print(f"  ❌ Error creating GRN {i}: {e}")
    
    print(f"\n✅ Fast creation completed! Created {created} additional GRNs")
    print(f"Total GRNs should now be: ~{22 + created} out of 100")

if __name__ == "__main__":
    main()