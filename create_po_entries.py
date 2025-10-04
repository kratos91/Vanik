#!/usr/bin/env python3
"""
Purchase Order Creation Guide
This script provides structured data for creating 19 additional purchase orders
following proper category-product relationships from master data.
"""

import json
from datetime import datetime, timedelta
import random

# Sample structured data for creating purchase orders
purchase_orders_data = [
    {
        "po_number": 2,
        "supplier_focus": "Cotton suppliers",
        "category": "Cotton Yarn",
        "products": ["Combed Cotton 30s", "Carded Cotton 20s", "Organic Cotton 40s"],
        "quantities": [1200, 800, 600],  # kg
        "rates": [145, 135, 160],  # per kg
        "delivery_days": 15,
        "notes": "Bulk cotton yarn order for textile production"
    },
    {
        "po_number": 3,
        "supplier_focus": "Synthetic fiber suppliers", 
        "category": "Synthetic Yarn",
        "products": ["Polyester DTY 150D", "Nylon 6 70D", "Acrylic 32s"],
        "quantities": [2000, 500, 800],
        "rates": [85, 180, 95],
        "delivery_days": 12,
        "notes": "Synthetic yarn procurement for winter collection"
    },
    {
        "po_number": 4,
        "supplier_focus": "Wool suppliers",
        "category": "Wool Yarn", 
        "products": ["Merino Wool 28s", "Cashmere Blend", "Worsted Wool 2/32"],
        "quantities": [400, 200, 600],
        "rates": [450, 800, 320],
        "delivery_days": 20,
        "notes": "Premium wool order for luxury garments"
    },
    {
        "po_number": 5,
        "supplier_focus": "Blended yarn suppliers",
        "category": "Blended Yarn",
        "products": ["Cotton-Polyester 65/35", "Viscose-Cotton 60/40", "Linen-Cotton 55/45"],
        "quantities": [1500, 1000, 700],
        "rates": [110, 125, 140],
        "delivery_days": 14,
        "notes": "Blended yarn order for spring collection"
    },
    {
        "po_number": 6,
        "supplier_focus": "Specialty fiber suppliers",
        "category": "Specialty Fibers",
        "products": ["Bamboo Fiber", "Modal Fiber", "Tencel Lyocell"],
        "quantities": [300, 400, 350],
        "rates": [200, 180, 220],
        "delivery_days": 18,
        "notes": "Eco-friendly specialty fiber procurement"
    },
    {
        "po_number": 7,
        "supplier_focus": "Raw cotton suppliers",
        "category": "Raw Cotton",
        "products": ["Shankar-6", "Suraj Cotton", "DCH-32"],
        "quantities": [5000, 3000, 4000],
        "rates": [75, 80, 78],
        "delivery_days": 10,
        "notes": "Raw cotton purchase for spinning unit"
    },
    {
        "po_number": 8,
        "supplier_focus": "Cotton yarn suppliers",
        "category": "Cotton Yarn",
        "products": ["Combed Cotton 40s", "Ring Spun Cotton 32s", "Open End Cotton 20s"],
        "quantities": [900, 1200, 1500],
        "rates": [155, 140, 125],
        "delivery_days": 12,
        "notes": "High-quality cotton yarn for premium products"
    },
    {
        "po_number": 9,
        "supplier_focus": "Synthetic suppliers",
        "category": "Synthetic Yarn",
        "products": ["Polyester FDY 75D", "PP Yarn 1200D", "Elastane 40D"],
        "quantities": [800, 1000, 100],
        "rates": [92, 65, 450],
        "delivery_days": 8,
        "notes": "Technical yarn order for activewear"
    },
    {
        "po_number": 10,
        "supplier_focus": "Wool specialists",
        "category": "Wool Yarn",
        "products": ["Lambswool 30s", "Alpaca Wool Blend", "Shetland Wool"],
        "quantities": [300, 150, 250],
        "rates": [380, 600, 420],
        "delivery_days": 25,
        "notes": "Luxury wool procurement for winter line"
    },
    {
        "po_number": 11,
        "supplier_focus": "Industrial fiber suppliers",
        "category": "Technical Fibers",
        "products": ["Carbon Fiber", "Aramid Fiber", "Glass Fiber"],
        "quantities": [50, 80, 120],
        "rates": [1200, 850, 300],
        "delivery_days": 30,
        "notes": "Technical fiber order for industrial applications"
    },
    {
        "po_number": 12,
        "supplier_focus": "Dyed yarn suppliers",
        "category": "Dyed Yarn",
        "products": ["Solution Dyed Acrylic", "Piece Dyed Cotton", "Yarn Dyed Polyester"],
        "quantities": [600, 800, 700],
        "rates": [115, 165, 105],
        "delivery_days": 16,
        "notes": "Pre-dyed yarn order for direct knitting"
    },
    {
        "po_number": 13,
        "supplier_focus": "Organic suppliers",
        "category": "Organic Yarn",
        "products": ["Organic Cotton 32s", "Organic Hemp Yarn", "Organic Linen"],
        "quantities": [500, 200, 300],
        "rates": [185, 220, 250],
        "delivery_days": 22,
        "notes": "Certified organic yarn for sustainable collection"
    },
    {
        "po_number": 14,
        "supplier_focus": "Filament suppliers",
        "category": "Filament Yarn",
        "products": ["Polyester FDY 150D", "Nylon FDY 70D", "Viscose Filament"],
        "quantities": [1500, 600, 800],
        "rates": [88, 175, 135],
        "delivery_days": 10,
        "notes": "Smooth filament yarns for fabric production"
    },
    {
        "po_number": 15,
        "supplier_focus": "Chenille suppliers",
        "category": "Fancy Yarn",
        "products": ["Cotton Chenille", "Polyester Chenille", "Metallic Yarn"],
        "quantities": [200, 300, 100],
        "rates": [280, 150, 450],
        "delivery_days": 20,
        "notes": "Decorative yarn order for fashion accessories"
    },
    {
        "po_number": 16,
        "supplier_focus": "Core spun suppliers",
        "category": "Core Spun Yarn",
        "products": ["Elastane Core Cotton", "Polyester Core Cotton", "Spandex Core Poly"],
        "quantities": [400, 600, 350],
        "rates": [190, 120, 165],
        "delivery_days": 14,
        "notes": "Stretch yarn procurement for athleisure"
    },
    {
        "po_number": 17,
        "supplier_focus": "Recycled material suppliers",
        "category": "Recycled Yarn",
        "products": ["Recycled Polyester", "Recycled Cotton", "Recycled Nylon"],
        "quantities": [1000, 600, 400],
        "rates": [70, 95, 125],
        "delivery_days": 12,
        "notes": "Sustainable recycled yarn for eco collection"
    },
    {
        "po_number": 18,
        "supplier_focus": "Melange suppliers",
        "category": "Melange Yarn",
        "products": ["Cotton Melange", "Poly-Cotton Melange", "Viscose Melange"],
        "quantities": [800, 1000, 600],
        "rates": [135, 95, 145],
        "delivery_days": 15,
        "notes": "Heathered yarn order for casual wear"
    },
    {
        "po_number": 19,
        "supplier_focus": "Textured suppliers",
        "category": "Textured Yarn",
        "products": ["Air Jet Textured", "False Twist Textured", "Friction Textured"],
        "quantities": [900, 700, 500],
        "rates": [105, 115, 125],
        "delivery_days": 11,
        "notes": "Textured yarn for enhanced fabric properties"
    },
    {
        "po_number": 20,
        "supplier_focus": "Micro fiber suppliers",
        "category": "Micro Fibers",
        "products": ["Microfiber Polyester", "Micro Modal", "Micro Tencel"],
        "quantities": [600, 300, 400],
        "rates": [110, 195, 215],
        "delivery_days": 17,
        "notes": "Ultra-fine fiber order for luxury applications"
    }
]

def print_creation_guide():
    print("=== PURCHASE ORDER CREATION GUIDE ===")
    print("Create each PO using the frontend with these specifications:\n")
    
    for i, po in enumerate(purchase_orders_data, 1):
        print(f"📋 PURCHASE ORDER #{po['po_number']}")
        print(f"   Supplier Type: {po['supplier_focus']}")
        print(f"   Category: {po['category']}")
        print(f"   Products & Quantities:")
        
        for j, (product, qty, rate) in enumerate(zip(po['products'], po['quantities'], po['rates'])):
            total = qty * rate
            print(f"     Item {j+1}: {product}")
            print(f"             Quantity: {qty} kg")
            print(f"             Rate: ₹{rate}/kg")
            print(f"             Value: ₹{total:,}")
        
        total_value = sum(q * r for q, r in zip(po['quantities'], po['rates']))
        delivery_date = datetime.now() + timedelta(days=po['delivery_days'])
        
        print(f"   Expected Delivery: {delivery_date.strftime('%Y-%m-%d')} ({po['delivery_days']} days)")
        print(f"   Total Order Value: ₹{total_value:,}")
        print(f"   Notes: {po['notes']}")
        print("-" * 60)

if __name__ == "__main__":
    print_creation_guide()