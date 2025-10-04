#!/usr/bin/env python3
"""
Release Committed Stock Script
Changes all committed/reserved stock back to available status
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

def release_committed_stock(token):
    """Release all committed stock by creating release transactions"""
    try:
        # First, let's check what committed stock exists
        response = requests.get(f"{BASE_URL}/api/inventory/stock-levels", headers=get_headers(token))
        if response.status_code != 200:
            print("Failed to get stock levels")
            return False
        
        stock_data = response.json()
        print(f"Retrieved stock data for analysis")
        
        # Check for committed stock
        committed_products = []
        
        # Handle different data structures
        if isinstance(stock_data, dict):
            stock_items = []
            for key, value in stock_data.items():
                if isinstance(value, list):
                    stock_items = value
                    break
            else:
                stock_items = [stock_data] if stock_data else []
        elif isinstance(stock_data, list):
            stock_items = stock_data
        else:
            stock_items = []
        
        # Find products with committed stock
        for item in stock_items:
            if isinstance(item, dict):
                committed_stock = float(item.get('committed_stock', 0))
                if committed_stock > 0:
                    committed_products.append({
                        'product_id': item.get('product_id'),
                        'committed_stock': committed_stock,
                        'product_name': item.get('product_name', f"Product {item.get('product_id')}")
                    })
        
        print(f"Found {len(committed_products)} products with committed stock")
        
        if len(committed_products) == 0:
            print("No committed stock found to release")
            return True
        
        # Show committed stock
        print("\nCommitted stock to release:")
        for product in committed_products:
            print(f"  Product {product['product_id']}: {product['committed_stock']}kg committed")
        
        # Create release transactions for each product
        released_count = 0
        
        for product in committed_products:
            try:
                # Create a release transaction to make committed stock available
                release_data = {
                    "productId": product['product_id'],
                    "quantity": product['committed_stock'],
                    "transactionType": "RELEASE",
                    "notes": "Released committed stock back to available"
                }
                
                # Try to create release transaction
                response = requests.post(f"{BASE_URL}/api/inventory/release-stock", 
                                       json=release_data, headers=get_headers(token))
                
                if response.status_code == 201:
                    released_count += 1
                    print(f"  ✅ Released {product['committed_stock']}kg for Product {product['product_id']}")
                else:
                    print(f"  ❌ Failed to release stock for Product {product['product_id']}: {response.text}")
                    
            except Exception as e:
                print(f"  ❌ Error releasing stock for Product {product['product_id']}: {e}")
        
        print(f"\n✅ Released stock for {released_count}/{len(committed_products)} products")
        return released_count > 0
        
    except Exception as e:
        print(f"Error in release process: {e}")
        return False

def main():
    print("🔄 Releasing All Committed Stock to Available...")
    print("=" * 50)
    
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    print("✅ Logged in successfully")
    
    # Release committed stock
    success = release_committed_stock(token)
    
    if success:
        print("\n🎉 Stock release process completed!")
        print("All committed stock has been made available")
    else:
        print("\n⚠️ Stock release process had issues")
        print("Please check the inventory manually")

if __name__ == "__main__":
    main()