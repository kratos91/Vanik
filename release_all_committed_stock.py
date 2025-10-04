#!/usr/bin/env python3
"""
Release All Committed Stock Script
Direct database approach to release committed inventory
"""

import requests
import json

BASE_URL = "http://localhost:5000"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

def login():
    response = requests.post(f"{BASE_URL}/api/login", json=ADMIN_CREDENTIALS)
    return response.json()["token"] if response.status_code == 200 else None

def get_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def release_committed_via_api(token):
    """Try to release committed stock via API endpoint"""
    try:
        # Create a bulk release request
        release_data = {
            "action": "release_all_committed",
            "reason": "Release all committed stock back to available inventory"
        }
        
        response = requests.post(f"{BASE_URL}/api/inventory/release-committed-stock", 
                               json=release_data, headers=get_headers(token))
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully released committed stock via API")
            return True
        else:
            print(f"❌ API release failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API release error: {e}")
        return False

def main():
    print("🔄 Releasing All Committed Stock to Available...")
    print("=" * 50)
    
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    print("✅ Logged in successfully")
    
    # Get current stock status first
    print("\n📊 Checking current stock status...")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/stock-levels", headers=get_headers(token))
        if response.status_code == 200:
            stock_data = response.json()
            
            # Parse stock data to find committed stock
            total_committed = 0
            products_with_committed = 0
            
            # Handle different data structures
            if isinstance(stock_data, list):
                items = stock_data
            elif isinstance(stock_data, dict):
                items = []
                for key, value in stock_data.items():
                    if isinstance(value, list):
                        items = value
                        break
                if not items:
                    items = [stock_data]
            else:
                items = []
            
            for item in items:
                if isinstance(item, dict):
                    committed = float(item.get('committed_stock', 0))
                    if committed > 0:
                        total_committed += committed
                        products_with_committed += 1
                        if products_with_committed <= 5:
                            print(f"  Product {item.get('product_id')}: {committed}kg committed")
            
            print(f"\n📈 Found {total_committed}kg committed stock across {products_with_committed} products")
            
            if total_committed == 0:
                print("✅ No committed stock found - all inventory is already available!")
                return
            
        else:
            print(f"❌ Failed to get stock data: {response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ Error checking stock: {e}")
        return
    
    # Try to release committed stock via API
    print(f"\n🔧 Attempting to release {total_committed}kg of committed stock...")
    
    success = release_committed_via_api(token)
    
    if success:
        print("\n🎉 Successfully released all committed stock!")
        print("All inventory is now available for sales orders")
    else:
        print("\n⚠️ API release method not available")
        print("Manual database intervention may be required")
        print(f"Total committed stock to release: {total_committed}kg")

if __name__ == "__main__":
    main()