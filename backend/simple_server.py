#!/usr/bin/env python3
"""
Clean Django server for inventory management system
Standardized to use DatabaseManager for all master data operations
"""

import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import psycopg2
from decouple import config
import datetime
import uuid

# Import optimized modules
from database_storage import DatabaseManager
from auth_utils import auth_manager, get_user_from_token, require_authentication
from base_controllers import MasterDataController
from specialized_controllers import supplier_controller, customer_controller, processor_controller, product_controller
from business_logic_controllers import grn_controller, order_controller, challan_controller, dashboard_controller

# Database configuration
DATABASE_URL = config('DATABASE_URL')

# Initialize database manager
db_manager = DatabaseManager()

# Initialize optimized controllers
locations_controller = MasterDataController('locations')
categories_controller = MasterDataController('categories')
products_controller = MasterDataController('products')
suppliers_controller = MasterDataController('suppliers')
customers_controller = MasterDataController('customers')
processors_controller = MasterDataController('processors')

@csrf_exempt
def login_view(request):
    """Optimized login view using AuthManager"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        # Authenticate using optimized auth manager
        user_data = auth_manager.authenticate_user(username, password)
        if user_data:
            token = auth_manager.create_session(user_data)
            return JsonResponse({
                'message': 'Login successful',
                'token': token,
                'user': user_data
            })
        else:
            return JsonResponse({'message': 'Invalid credentials'}, status=401)
    except Exception as e:
        return JsonResponse({'message': 'Login failed', 'error': str(e)}, status=500)

@csrf_exempt
def me_view(request):
    """Optimized me view using AuthManager"""
    user = auth_manager.get_user_from_token(request)
    if user:
        return JsonResponse(user)
    else:
        return JsonResponse({'message': 'Unauthorized'}, status=401)

@csrf_exempt
def locations_view(request):
    """Optimized location management using base controller"""
    return locations_controller.handle_standard_crud(request)

@csrf_exempt
def location_detail_view(request, location_id):
    """Optimized individual location operations using base controller"""
    return locations_controller.handle_standard_crud(request, int(location_id))

@csrf_exempt
def categories_view(request):
    """Optimized categories management using base controller"""
    return categories_controller.handle_standard_crud(request)

@csrf_exempt
def category_detail_view(request, category_id):
    """Optimized individual category operations using base controller"""
    return categories_controller.handle_standard_crud(request, int(category_id))

@csrf_exempt
def products_view(request):
    """Optimized products management using specialized controller"""
    return product_controller.handle_crud(request)

@csrf_exempt
def product_detail_view(request, product_id):
    """Optimized individual product operations using specialized controller"""
    return product_controller.handle_crud(request, int(product_id))

@csrf_exempt
def suppliers_view(request):
    """Optimized supplier management using specialized controller"""
    return supplier_controller.handle_crud(request)

@csrf_exempt
def supplier_detail_view(request, supplier_id):
    """Optimized individual supplier operations using specialized controller"""
    return supplier_controller.handle_crud(request, int(supplier_id))

@csrf_exempt
def customers_view(request):
    """Optimized customer management using specialized controller"""
    return customer_controller.handle_crud(request)

@csrf_exempt
def customer_detail_view(request, customer_id):
    """Handle individual customer operations using DatabaseManager"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    db_manager = DatabaseManager()
    
    if request.method == 'GET':
        try:
            customers = db_manager.get_customers()
            customer = None
            for c in customers:
                if str(c['id']) == str(customer_id):
                    customer = c
                    break
            
            if not customer:
                return JsonResponse({'error': 'Customer not found'}, status=404)
            
            return JsonResponse(customer)
        except Exception as e:
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            if not data.get('name', '').strip():
                return JsonResponse({'error': 'Customer name is required'}, status=400)
            
            # Auto-fill PAN from GST if provided
            gst_number = data.get('gstNumber', '')
            pan_number = data.get('panNumber', '')
            if gst_number and len(gst_number) >= 12 and not pan_number:
                pan_number = gst_number[2:12]  # Characters 3-12 of GST number
            
            result = db_manager.update_customer(
                customer_id=customer_id,
                name=data['name'],
                contact_person=data.get('contactPerson', ''),
                phone=data.get('phone', ''),
                email=data.get('email', ''),
                address=data.get('address', ''),
                gst_number=gst_number,
                pan_number=pan_number,
                user_id=user['id']
            )
            
            if 'error' in result:
                return JsonResponse(result, status=400 if result['error'] != 'Customer not found' else 404)
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    elif request.method == 'DELETE':
        try:
            result = db_manager.delete_customer(customer_id, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=404)
            
            return JsonResponse(result)
            
        except Exception as e:
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def processors_view(request):
    """Optimized processor management using specialized controller"""
    return processor_controller.handle_crud(request)

@csrf_exempt
def processor_detail_view(request, processor_id):
    """Optimized individual processor operations using specialized controller"""
    return processor_controller.handle_crud(request, int(processor_id))

# Dashboard endpoints with real database integration
@csrf_exempt
def dashboard_stats_view(request):
    """Optimized dashboard statistics using business logic controller"""
    return dashboard_controller.get_dashboard_stats(request)

@csrf_exempt
def dashboard_alerts_view(request):
    """Optimized dashboard alerts using business logic controller"""
    return dashboard_controller.get_dashboard_alerts(request)

@csrf_exempt
def dashboard_transactions_view(request):
    """Get recent transactions from database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        db_manager = DatabaseManager()
        
        for attempt in range(3):
            try:
                # Get recent audit logs as transactions
                recent_logs = db_manager.execute_query("""
                    SELECT operation, table_name, record_id, created_at, created_by
                    FROM audit_logs 
                    ORDER BY created_at DESC 
                    LIMIT 10
                """, fetch_all=True)
                
                if recent_logs is not None:
                    transactions = []
                    for log in recent_logs:
                        transactions.append({
                            'id': log['record_id'],
                            'type': log['operation'],
                            'entity': log['table_name'],
                            'timestamp': log['created_at'].isoformat() + 'Z' if log['created_at'] else None,
                            'userId': log['created_by']
                        })
                    return JsonResponse({'transactions': transactions})
                elif attempt == 2:
                    return JsonResponse({'transactions': []})
                continue
                    
            except Exception as e:
                print(f"❌ Dashboard transactions attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    return JsonResponse({'transactions': []})
                continue
                
    except Exception as e:
        return JsonResponse({'transactions': []})

@csrf_exempt
def dashboard_orders_view(request):
    """Get pending orders data from database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        db_manager = DatabaseManager()
        
        for attempt in range(3):
            try:
                # Get pending sales orders
                pending_orders = db_manager.execute_query("""
                    SELECT so.id, so.so_number, c.name as customer_name, so.total_value, so.order_date
                    FROM sales_orders so
                    LEFT JOIN customers c ON so.customer_id = c.id
                    WHERE so.status = 'Order Placed' AND so.is_deleted = false
                    ORDER BY so.order_date DESC
                    LIMIT 5
                """, fetch_all=True)
                
                if pending_orders is not None:
                    orders = []
                    for order in pending_orders:
                        orders.append({
                            'id': order['id'],
                            'orderNumber': order['so_number'],
                            'customerName': order['customer_name'],
                            'totalValue': float(order['total_value']) if order['total_value'] else 0,
                            'orderDate': order['order_date'].isoformat() + 'Z' if order['order_date'] else None
                        })
                    return JsonResponse({'orders': orders})
                elif attempt == 2:
                    return JsonResponse({'orders': []})
                continue
                    
            except Exception as e:
                print(f"❌ Dashboard orders attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    return JsonResponse({'orders': []})
                continue
                
    except Exception as e:
        return JsonResponse({'orders': []})

@csrf_exempt
def logout_view(request):
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        if token in valid_tokens:
            invalidated_tokens.add(token)
            del valid_tokens[token]
    return JsonResponse({'message': 'Logged out successfully'})

@csrf_exempt
def audit_logs_view(request):
    """View audit logs using DatabaseManager"""
    try:
        db_manager = DatabaseManager()
        logs = db_manager.get_audit_logs()
        return JsonResponse({'logs': logs})
    except Exception as e:
        return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)

@csrf_exempt
def connection_health_view(request):
    """Get database connection health statistics"""
    try:
        db_manager = DatabaseManager()
        health = db_manager.get_connection_health()
        return JsonResponse(health)
    except Exception as e:
        return JsonResponse({'error': f'Health check failed: {str(e)}'}, status=500)

# GRN endpoints
@csrf_exempt
def grns_view(request):
    """GRN management using DatabaseManager"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'GET':
        try:
            db_manager = DatabaseManager()
            grns = db_manager.get_grns()
            return JsonResponse({'grns': grns})
        except Exception as e:
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    else:
        return grn_controller.handle_grn_operations(request)

@csrf_exempt
def grn_detail_view(request, grn_id):
    """Optimized individual GRN operations using business logic controller"""
    return grn_controller.handle_grn_operations(request, int(grn_id))

@csrf_exempt
def purchase_orders_view(request):
    """Optimized purchase orders management using business logic controller"""
    return order_controller.handle_purchase_orders(request)

# Purchase Order Lifecycle Management
def get_allowed_actions(status, converted_to_grn):
    """Get list of allowed actions based on order status and GRN conversion state"""
    lifecycle_rules = {
        ("Order Placed", False): ["edit", "delete", "convert_to_grn", "mark_received", "mark_cancelled"],
        ("Order Received", False): ["edit", "delete", "convert_to_grn", "mark_cancelled"],
        ("Order Received", True): [],  # No actions allowed when converted to GRN
        ("Order Cancelled", False): ["delete"],  # Only delete allowed for cancelled orders
        ("Order Cancelled", True): ["delete"],  # Cancelled orders that were converted (edge case)
    }
    
    return lifecycle_rules.get((status, converted_to_grn), [])

def validate_action(status, converted_to_grn, action):
    """Validate if an action is allowed for the current order state"""
    allowed_actions = get_allowed_actions(status, converted_to_grn)
    return action in allowed_actions

def get_lifecycle_error_message(status, converted_to_grn, action):
    """Get user-friendly error message for disallowed actions"""
    if converted_to_grn and status == "Order Received":
        return "Cannot modify orders that have been converted to GRN"
    elif status == "Order Cancelled" and action != "delete":
        return "Only deletion is allowed for cancelled orders"
    else:
        return f"Action '{action}' is not allowed for orders with status '{status}'"

@csrf_exempt
def purchase_order_detail_view(request, order_id):
    """Handle individual purchase order operations"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'GET':
        try:
            db_manager = DatabaseManager()
            
            # Get purchase order details
            order = db_manager.execute_query(
                """
                SELECT po.*, s.name as supplier_name
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = %s AND po.is_deleted = FALSE
                """,
                (order_id,),
                fetch_one=True
            )
            
            if not order:
                return JsonResponse({'error': 'Purchase order not found'}, status=404)
            
            # Get purchase order items
            items = db_manager.execute_query(
                """
                SELECT poi.*, c.name as category_name, p.product_name
                FROM purchase_order_items poi
                LEFT JOIN categories c ON poi.category_id = c.id
                LEFT JOIN products p ON poi.product_id = p.id
                WHERE poi.po_id = %s
                ORDER BY poi.id
                """,
                (order_id,),
                fetch_all=True
            )
            
            print(f"🔍 Found {len(items) if items else 0} items for purchase order {order_id}")
            if items:
                print(f"📝 Sample item: {dict(items[0])}")
            
            # Convert order to dict and add items
            order_dict = dict(order)
            order_dict['supplierName'] = order_dict['supplier_name']
            
            # Convert items to dict and handle Decimal types
            items_list = []
            if items:
                for item in items:
                    item_dict = dict(item)
                    # Convert Decimal fields to float for JSON serialization
                    if 'weight_kg' in item_dict and item_dict['weight_kg'] is not None:
                        item_dict['weight_kg'] = float(item_dict['weight_kg'])
                    if 'estimated_value' in item_dict and item_dict['estimated_value'] is not None:
                        item_dict['estimated_value'] = float(item_dict['estimated_value'])
                    items_list.append(item_dict)
            
            order_dict['items'] = items_list
            
            print(f"📤 Returning order with {len(order_dict['items'])} items")
            if items_list:
                print(f"📝 Sample converted item: {items_list[0]}")
            
            return JsonResponse(order_dict)
            
        except Exception as e:
            print(f"❌ Error getting purchase order details: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            db_manager = DatabaseManager()
            
            # Get current order state for validation
            current_order = db_manager.execute_query(
                "SELECT status, converted_to_grn FROM purchase_orders WHERE id = %s AND is_deleted = FALSE",
                (order_id,),
                fetch_one=True
            )
            
            if not current_order:
                return JsonResponse({'error': 'Purchase order not found'}, status=404)
            
            current_status = current_order['status']
            current_converted = current_order['converted_to_grn']
            
            # Validate actions based on lifecycle rules
            if 'converted_to_grn' in data and 'status' in data:
                # GRN conversion action
                if not validate_action(current_status, current_converted, "convert_to_grn"):
                    return JsonResponse({
                        'error': get_lifecycle_error_message(current_status, current_converted, "convert_to_grn")
                    }, status=400)
            elif 'supplierId' in data and 'items' in data:
                # Edit action
                if not validate_action(current_status, current_converted, "edit"):
                    return JsonResponse({
                        'error': get_lifecycle_error_message(current_status, current_converted, "edit")
                    }, status=400)
            elif 'status' in data:
                # Status change action
                new_status = data['status']
                if new_status == "Order Received" and not validate_action(current_status, current_converted, "mark_received"):
                    return JsonResponse({
                        'error': get_lifecycle_error_message(current_status, current_converted, "mark_received")
                    }, status=400)
                elif new_status == "Order Cancelled" and not validate_action(current_status, current_converted, "mark_cancelled"):
                    return JsonResponse({
                        'error': get_lifecycle_error_message(current_status, current_converted, "mark_cancelled")
                    }, status=400)
            
            # Handle different types of updates
            if 'converted_to_grn' in data and 'status' in data:
                # GRN conversion update with status (handles both fields together)
                print(f"🔄 Updating purchase order {order_id} with GRN conversion and status...")
                result = db_manager.execute_query(
                    """
                    UPDATE purchase_orders 
                    SET converted_to_grn = %s, status = %s, updated_by = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (data['converted_to_grn'], data['status'], user['id'], order_id)
                )
                print(f"✅ Updated purchase order {order_id}: converted_to_grn = {data['converted_to_grn']}, status = {data['status']}")
                
            elif 'converted_to_grn' in data:
                # GRN conversion-only update
                print(f"🔄 Updating purchase order {order_id} with GRN conversion only...")
                if data['converted_to_grn']:
                    result = db_manager.execute_query(
                        """
                        UPDATE purchase_orders 
                        SET converted_to_grn = %s, status = 'Order Received', updated_by = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (data['converted_to_grn'], user['id'], order_id)
                    )
                else:
                    result = db_manager.execute_query(
                        """
                        UPDATE purchase_orders 
                        SET converted_to_grn = %s, updated_by = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (data['converted_to_grn'], user['id'], order_id)
                    )
                print(f"✅ Updated purchase order {order_id}: converted_to_grn = {data['converted_to_grn']}")
                
            elif 'status' in data:
                # Status-only update
                print(f"🔄 Updating purchase order {order_id} with status only...")
                result = db_manager.execute_query(
                    """
                    UPDATE purchase_orders 
                    SET status = %s, updated_by = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (data['status'], user['id'], order_id)
                )
                print(f"✅ Updated purchase order {order_id}: status = {data['status']}")
                    
            elif 'supplierId' in data and 'items' in data:
                # Comprehensive purchase order update with items
                print(f"🔄 Updating purchase order {order_id} with comprehensive data...")
                
                # Update main order fields
                result = db_manager.execute_query(
                    """
                    UPDATE purchase_orders 
                    SET supplier_id = %s, order_date = %s, notes = %s, updated_by = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (data['supplierId'], data['orderDate'], data.get('notes', ''), user['id'], order_id)
                )
                
                # Delete existing items
                db_manager.execute_query(
                    "DELETE FROM purchase_order_items WHERE po_id = %s",
                    (order_id,)
                )
                
                # Insert new items and calculate totals
                total_items = len(data['items'])
                total_value = 0
                
                for item in data['items']:
                    db_manager.execute_query(
                        """
                        INSERT INTO purchase_order_items 
                        (po_id, category_id, product_id, quantity_bags, weight_kg, estimated_value, remarks)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            order_id,
                            item['categoryId'],
                            item['productId'],
                            item['quantityBags'],
                            item['weightKg'],
                            item.get('estimatedValue', 0),
                            item.get('remarks', '')
                        )
                    )
                    total_value += item.get('estimatedValue', 0)
                
                # Update order totals
                db_manager.execute_query(
                    """
                    UPDATE purchase_orders 
                    SET total_items = %s, total_value = %s
                    WHERE id = %s
                    """,
                    (total_items, total_value, order_id)
                )
                
                print(f"✅ Updated purchase order with {total_items} items, total value: ₹{total_value}")
            
            return JsonResponse({'message': 'Purchase order updated successfully'})
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"❌ Error updating purchase order: {e}")
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    elif request.method == 'DELETE':
        try:
            db_manager = DatabaseManager()
            
            # Get current order state for validation
            current_order = db_manager.execute_query(
                "SELECT status, converted_to_grn FROM purchase_orders WHERE id = %s AND is_deleted = FALSE",
                (order_id,),
                fetch_one=True
            )
            
            if not current_order:
                return JsonResponse({'error': 'Purchase order not found'}, status=404)
            
            current_status = current_order['status']
            current_converted = current_order['converted_to_grn']
            
            # Validate delete action
            if not validate_action(current_status, current_converted, "delete"):
                return JsonResponse({
                    'error': get_lifecycle_error_message(current_status, current_converted, "delete")
                }, status=400)
            
            # Soft delete the purchase order (using is_deleted flag)
            db_manager.execute_query(
                "UPDATE purchase_orders SET is_deleted = TRUE, updated_by = %s, updated_at = NOW() WHERE id = %s",
                (user['id'], order_id)
            )
            
            return JsonResponse({'message': 'Purchase order deleted successfully'})
            
        except Exception as e:
            return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def sales_orders_view(request):
    """Sales Orders management using DatabaseManager"""
    try:
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            orders = db_manager.get_sales_orders()
            return JsonResponse({'orders': orders})
        
        elif request.method == 'POST':
            data = json.loads(request.body)
            print(f"🔍 Creating sales order: customer_id={data.get('customerId')}, items={len(data.get('items', []))}")
            print(f"🔍 Sales order data: {data}")
            
            result = db_manager.create_sales_order(
                data['customerId'],
                data['orderDate'],
                data['items'],
                user['id']
            )
            
            if 'error' in result:
                print(f"❌ Sales order creation failed: {result['error']}")
                return JsonResponse(result, status=400)
            
            return JsonResponse(result, status=201)
    
    except Exception as e:
        print(f"❌ Error in sales_orders_view: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def sales_order_detail_view(request, order_id):
    """Handle individual sales order operations using DatabaseManager"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'GET':
        try:
            orders = db_manager.get_sales_orders()
            order = None
            for o in orders:
                if o['id'] == order_id:
                    order = o
                    break
            
            if not order:
                return JsonResponse({'error': 'Sales order not found'}, status=404)
            
            return JsonResponse(order)
            
        except Exception as e:
            print(f"❌ Error getting sales order details: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            result = db_manager.update_sales_order(order_id, data, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=404 if result['error'] == 'Sales order not found or could not be updated' else 400)
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"❌ Error updating sales order: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'DELETE':
        try:
            result = db_manager.delete_sales_order(order_id, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=404 if result['error'] == 'Sales order not found' else 400)
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ Error deleting sales order: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)



@csrf_exempt
def job_orders_view(request):
    """Job Orders management using DatabaseManager"""
    try:
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            orders = db_manager.get_job_orders()
            return JsonResponse({'orders': orders})
        
        elif request.method == 'POST':
            data = json.loads(request.body)
            result = db_manager.create_job_order(
                data['processorId'],
                data['orderDate'],
                data['items'],
                user['id']
            )
            
            if 'error' in result:
                return JsonResponse(result, status=400)
            
            return JsonResponse(result, status=201)
    
    except Exception as e:
        print(f"❌ Error in job_orders_view: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def sales_order_status_view(request, order_id):
    """Handle sales order status updates"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            new_status = data.get('status')
            
            if not new_status:
                return JsonResponse({'error': 'Status is required'}, status=400)
            
            result = db_manager.update_sales_order_status(order_id, new_status, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=400)
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"❌ Error updating sales order status: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def sales_order_convert_view(request, order_id):
    """Handle sales order to challan conversion"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        db_manager = DatabaseManager()
        result = db_manager.convert_sales_order_to_challan(order_id, user['id'])
        
        if 'error' in result:
            status_code = 404 if 'not found' in result['error'] else 400
            return JsonResponse(result, status=status_code)
        
        return JsonResponse(result)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        print(f"❌ Error converting sales order to challan: {e}")
        return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)

# Sales Challans Views
@csrf_exempt
def sales_challans_view(request):
    """Handle sales challans list operations"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'GET':
        try:
            print("🔍 Getting sales challans...")
            challans = db_manager.get_sales_challans()
            print(f"🔍 Found {len(challans)} sales challans")
            print(f"✅ Returning {len(challans)} sales challans")
            return JsonResponse({'challans': challans})
        except Exception as e:
            print(f"❌ Error getting sales challans: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(f"🔍 Creating sales challan: customer_id={data.get('customerId')}, items={len(data.get('items', []))}")
            
            result = db_manager.create_sales_challan(
                customer_id=data['customerId'],
                challan_date=data['challanDate'],
                items=data['items'],
                user_id=user['id']
            )
            
            if 'error' in result:
                return JsonResponse(result, status=400)
            
            print(f"✅ Sales challan created successfully: {result.get('scNumber')}")
            return JsonResponse(result, status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except KeyError as e:
            return JsonResponse({'error': f'Missing field: {e}'}, status=400)
        except Exception as e:
            print(f"❌ Error creating sales challan: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def sales_challan_detail_view(request, challan_id):
    """Handle individual sales challan operations"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'GET':
        try:
            challans = db_manager.get_sales_challans()
            challan = None
            for c in challans:
                if c['id'] == challan_id:
                    challan = c
                    break
            
            if not challan:
                return JsonResponse({'error': 'Sales challan not found'}, status=404)
            
            return JsonResponse(challan)
            
        except Exception as e:
            print(f"❌ Error getting sales challan details: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            result = db_manager.update_sales_challan(challan_id, data, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=404 if result['error'] == 'Sales challan not found or could not be updated' else 400)
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"❌ Error updating sales challan: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    
    elif request.method == 'DELETE':
        try:
            result = db_manager.delete_sales_challan(challan_id, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=404)
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ Error deleting sales challan: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def sales_challan_status_view(request, challan_id):
    """Handle sales challan status updates"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            new_status = data.get('status')
            
            if not new_status:
                return JsonResponse({'error': 'Status is required'}, status=400)
            
            result = db_manager.update_sales_challan_status(challan_id, new_status, user['id'])
            
            if 'error' in result:
                return JsonResponse(result, status=400)
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"❌ Error updating sales challan status: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)

# Dashboard views - need to be defined
@csrf_exempt
def dashboard_stats_view(request):
    """Get dashboard statistics"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        return JsonResponse({'totalOrders': 0, 'totalValue': 0})
    except Exception as e:
        print(f"❌ Error getting dashboard stats: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def dashboard_alerts_view(request):
    """Get stock alerts for dashboard"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        return JsonResponse({'alerts': []})
    except Exception as e:
        print(f"❌ Error getting stock alerts: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def dashboard_transactions_view(request):
    """Get recent transactions for dashboard"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        return JsonResponse({'transactions': []})
    except Exception as e:
        print(f"❌ Error getting recent transactions: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def dashboard_orders_view(request):
    """Get pending orders data for dashboard"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        return JsonResponse({'orders': []})
    except Exception as e:
        print(f"❌ Error getting pending orders: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def audit_logs_view(request):
    """Get audit logs"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        return JsonResponse([])
    except Exception as e:
        print(f"❌ Error getting audit logs: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
def stock_levels_view(request):
    """Get current stock levels from inventory"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        db_manager = DatabaseManager()
        
        # Get query parameters for filtering
        location_id = request.GET.get('location_id')
        product_id = request.GET.get('product_id')
        
        # Convert to integers if provided
        if location_id:
            try:
                location_id = int(location_id)
            except ValueError:
                location_id = None
        
        if product_id:
            try:
                product_id = int(product_id)
            except ValueError:
                product_id = None
        
        # Get stock levels
        stock_levels = db_manager.get_stock_levels(location_id=location_id, product_id=product_id)
        
        return JsonResponse({'stockLevels': stock_levels})
        
    except Exception as e:
        print(f"❌ Failed to get stock levels: {e}")
        return JsonResponse({'error': 'Failed to get stock levels'}, status=500)

@csrf_exempt
def stock_levels_by_category_view(request):
    """Get stock levels grouped by category"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        db_manager = DatabaseManager()
        
        # Get query parameters for filtering
        location_id = request.GET.get('location_id')
        
        # Convert to integer if provided
        if location_id:
            try:
                location_id = int(location_id)
            except ValueError:
                location_id = None
        
        # Get stock levels by category
        stock_levels = db_manager.get_stock_levels_by_category(location_id=location_id)
        
        return JsonResponse({'categories': stock_levels})
        
    except Exception as e:
        print(f"❌ Failed to get stock levels by category: {e}")
        return JsonResponse({'error': 'Failed to get stock levels by category'}, status=500)

# URL patterns
urlpatterns = [
    path('api/login', login_view, name='login'),
    path('api/logout', logout_view, name='logout'),
    path('api/me', me_view, name='me'),
    
    # Locations
    path('api/locations', locations_view, name='locations'),
    path('api/locations/<int:location_id>', location_detail_view, name='location_detail'),
    
    # Categories
    path('api/categories', categories_view, name='categories'),
    path('api/categories/<int:category_id>', category_detail_view, name='category_detail'),
    
    # Products
    path('api/products', products_view, name='products'),
    path('api/products/<int:product_id>', product_detail_view, name='product_detail'),
    
    # Suppliers
    path('api/suppliers', suppliers_view, name='suppliers'),
    path('api/suppliers/<int:supplier_id>', supplier_detail_view, name='supplier_detail'),
    
    # Customers
    path('api/customers', customers_view, name='customers'),
    path('api/customers/<int:customer_id>', customer_detail_view, name='customer_detail'),
    
    # Processors
    path('api/processors', processors_view, name='processors'),
    path('api/processors/<int:processor_id>', processor_detail_view, name='processor_detail'),
    
    # GRNs
    path('api/grns', grns_view, name='grns'),
    path('api/grns/<int:grn_id>', grn_detail_view, name='grn_detail'),
    
    # Orders
    path('api/purchase-orders', purchase_orders_view, name='purchase_orders'),
    path('api/purchase-orders/<int:order_id>', purchase_order_detail_view, name='purchase_order_detail'),
    path('api/sales-orders', sales_orders_view, name='sales_orders'),
    path('api/sales-orders/<int:order_id>', sales_order_detail_view, name='sales_order_detail'),
    path('api/sales-orders/<int:order_id>/status', sales_order_status_view, name='sales_order_status'),
    path('api/sales-orders/<int:order_id>/convert-to-challan', sales_order_convert_view, name='sales_order_convert'),
    path('api/job-orders', job_orders_view, name='job_orders'),
    
    # Sales Challans
    path('api/sales-challans', sales_challans_view, name='sales_challans'),
    path('api/sales-challans/<int:challan_id>', sales_challan_detail_view, name='sales_challan_detail'),
    path('api/sales-challans/<int:challan_id>/status', sales_challan_status_view, name='sales_challan_status'),
    
    # Dashboard
    path('api/dashboard/stats', dashboard_stats_view, name='dashboard_stats'),
    path('api/dashboard/stock-alerts', dashboard_alerts_view, name='dashboard_alerts'),
    path('api/dashboard/recent-transactions', dashboard_transactions_view, name='dashboard_transactions'),
    path('api/dashboard/pending-orders', dashboard_orders_view, name='dashboard_orders'),
    
    # Inventory endpoints
    path('api/inventory/stock-levels', stock_levels_view, name='stock_levels'),
    path('api/inventory/stock-levels-by-category', stock_levels_by_category_view, name='stock_levels_by_category'),
    path('api/reports/stock-levels', stock_levels_by_category_view, name='reports_stock_levels'),
    
    # Audit logs
    path('api/audit-logs', audit_logs_view, name='audit_logs'),
    
    # Connection health monitoring
    path('api/connection-health', connection_health_view, name='connection_health'),
]

# Django configuration
if not settings.configured:
    settings.configure(
        DEBUG=True,
        SECRET_KEY='django-insecure-dev-key-for-demo-only',
        ROOT_URLCONF=__name__,
        ALLOWED_HOSTS=['*'],
        MIDDLEWARE=[
            'django.middleware.common.CommonMiddleware',
        ],
        # No databases configuration - we're using direct psycopg2 connections
    )

# Initialize Django
django.setup()

# Initialize database tables
db_manager.init_tables()

if __name__ == '__main__':
    import sys
    if len(sys.argv) == 1:
        sys.argv.append('runserver')
        sys.argv.append('0.0.0.0:5000')
    execute_from_command_line(sys.argv)