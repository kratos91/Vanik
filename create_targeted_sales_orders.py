#!/usr/bin/env python3
"""
Targeted Sales Order Creation
Creates sales orders only for products that actually have stock
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

def get_products_with_stock(token):
    """Get products that actually have stock available"""
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/stock-levels", headers=get_headers(token))
        if response.status_code == 200:
            stock_data = response.json()
            products_with_stock = []
            
            for item in stock_data:
                if isinstance(item, dict):
                    available_stock = float(item.get('available_stock', 0))
                    if available_stock > 5:  # At least 5kg available
                        products_with_stock.append({
                            'product_id': item.get('product_id'),
                            'available_stock': available_stock,
                            'category_id': item.get('category_id'),
                            'product_name': item.get('product_name', f"Product {item.get('product_id')}")
                        })
            
            # Sort by available stock (highest first)
            products_with_stock.sort(key=lambda x: x['available_stock'], reverse=True)
            return products_with_stock
    except Exception as e:
        print(f"Error getting stock data: {e}")
        return []

def get_customers(token):
    response = requests.get(f"{BASE_URL}/api/customers", headers=get_headers(token))
    return response.json() if response.status_code == 200 else []

def create_sales_order(token, order_data):
    try:
        response = requests.post(f"{BASE_URL}/api/sales-orders", 
                               json=order_data, headers=get_headers(token))
        return response.json() if response.status_code == 201 else None
    except:
        return None

def main():
    print("🚀 Creating Targeted Sales Orders for Products with Stock...")
    print("=" * 60)
    
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    print("✅ Logged in successfully")
    
    # Get products with stock
    products_with_stock = get_products_with_stock(token)
    print(f"✅ Found {len(products_with_stock)} products with stock > 5kg")
    
    if len(products_with_stock) < 3:
        print("❌ Not enough products with stock available")
        return
    
    # Show top products with stock
    print("\nTop products with stock:")
    for i, product in enumerate(products_with_stock[:10]):
        print(f"  {i+1}. Product {product['product_id']}: {product['available_stock']:.1f}kg - {product['product_name']}")
    
    # Get customers
    customers = get_customers(token)
    print(f"✅ Found {len(customers)} customers")
    
    if len(customers) < 3:
        print("❌ Not enough customers available")
        return
    
    print(f"\n🔄 Creating 20 Sales Orders using products with actual stock...")
    
    created_orders = []
    
    for i in range(20):
        try:
            # Select random customer
            customer = random.choice(customers)
            
            # Select 1-2 products with the highest stock
            num_items = random.randint(1, min(2, len(products_with_stock)))
            selected_products = random.sample(products_with_stock[:15], num_items)  # Use top 15 products
            
            items = []
            
            for product in selected_products:
                available_stock = product['available_stock']
                # Use 5-50% of available stock, maximum 100kg
                usage_percent = random.uniform(0.05, 0.5)
                quantity = min(available_stock * usage_percent, 100)
                quantity = max(quantity, 3)  # Minimum 3kg
                quantity = int(quantity)
                
                rate = random.randint(100, 250)  # Rate per kg
                
                items.append({
                    "categoryId": product['category_id'],
                    "productId": product['product_id'],
                    "quantityBags": max(1, quantity // 50),
                    "weightKg": quantity,
                    "estimatedValue": quantity * rate,
                    "remarks": f"Sales order {i+1} - {product['product_name'][:30]}"
                })
            
            # Create order date
            order_date = datetime.now() - timedelta(days=random.randint(1, 20))
            
            # Create sales order
            so_data = {
                "customerId": customer["id"],
                "orderDate": order_date.strftime("%Y-%m-%d"),
                "items": items
            }
            
            result = create_sales_order(token, so_data)
            
            if result:
                created_orders.append(result)
                total_weight = sum(item['weightKg'] for item in items)
                total_value = sum(item['estimatedValue'] for item in items)
                print(f"  ✅ SO {i+1}/20: {result.get('so_number', 'Unknown')} - {total_weight}kg, ₹{total_value:,}")
                print(f"     Customer: {customer.get('customer_name', 'Unknown')}")
                
                # Update local stock tracking
                for item, product in zip(items, selected_products):
                    for p in products_with_stock:
                        if p['product_id'] == product['product_id']:
                            p['available_stock'] -= item['weightKg']
                            break
            else:
                print(f"  ❌ Failed SO {i+1}")
                
        except Exception as e:
            print(f"  ❌ Error creating SO {i+1}: {e}")
    
    print("\n" + "=" * 60)
    print(f"✅ Targeted sales order creation completed!")
    print(f"Successfully created: {len(created_orders)} out of 20 sales orders")
    
    if len(created_orders) >= 15:
        print("🎉 Excellent! Created most orders successfully")
    elif len(created_orders) >= 10:
        print("👍 Good progress! More than half created")
    else:
        print("⚠️ Some orders failed - this shows inventory validation is working")

if __name__ == "__main__":
    main()