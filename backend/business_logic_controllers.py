#!/usr/bin/env python3
"""
Business logic controllers for complex operations in inventory management system
Handles GRN, Orders, Sales Challans, and other business processes
"""

import json
from typing import Dict, Any, List, Optional
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from database_storage import DatabaseManager
from auth_utils import get_user_from_token
from base_controllers import BaseCRUDController


class GRNController(BaseCRUDController):
    """Controller for Goods Receipt Note (GRN) management"""
    
    def __init__(self):
        super().__init__('GRN')
    
    def handle_grn_operations(self, request, grn_id: int = None) -> JsonResponse:
        """Handle GRN CRUD operations with business logic"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            try:
                if grn_id:
                    grn = self.db_manager.get_grn(grn_id)
                    if grn:
                        return JsonResponse(grn)
                    else:
                        return JsonResponse({'error': 'GRN not found'}, status=404)
                else:
                    grns = self.db_manager.get_grns()
                    return JsonResponse(grns, safe=False)
            except Exception as e:
                return self._handle_database_error(e, 'retrieving GRNs')
        
        elif request.method == 'POST':
            try:
                data = json.loads(request.body)
                
                # Validate required fields
                required_fields = ['supplierName', 'items']
                validation_error = self._validate_required_fields(data, required_fields)
                if validation_error:
                    return validation_error
                
                # Business logic for GRN creation
                result = self.db_manager.create_grn(
                    supplier_name=data['supplierName'],
                    items=data['items'],
                    user_id=user['id']
                )
                
                if 'error' in result:
                    return JsonResponse(result, status=400)
                
                return JsonResponse(result, status=201)
                
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON'}, status=400)
            except Exception as e:
                return self._handle_database_error(e, 'creating GRN')
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class OrderController(BaseCRUDController):
    """Controller for Purchase Orders and Sales Orders"""
    
    def __init__(self):
        super().__init__('Order')
    
    def handle_purchase_orders(self, request, order_id: int = None) -> JsonResponse:
        """Handle purchase order operations"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            try:
                if order_id:
                    order = self.db_manager.get_purchase_order(order_id)
                    if order:
                        return JsonResponse(order)
                    else:
                        return JsonResponse({'error': 'Purchase order not found'}, status=404)
                else:
                    orders = self.db_manager.get_purchase_orders()
                    return JsonResponse(orders, safe=False)
            except Exception as e:
                return self._handle_database_error(e, 'retrieving purchase orders')
        
        elif request.method == 'POST':
            try:
                data = json.loads(request.body)
                result = self.db_manager.create_purchase_order(
                    supplier_id=data.get('supplierId'),
                    items=data.get('items', []),
                    user_id=user['id']
                )
                
                if 'error' in result:
                    return JsonResponse(result, status=400)
                
                return JsonResponse(result, status=201)
                
            except Exception as e:
                return self._handle_database_error(e, 'creating purchase order')
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    def handle_sales_orders(self, request, order_id: int = None) -> JsonResponse:
        """Handle sales order operations with inventory validation"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            try:
                if order_id:
                    order = self.db_manager.get_sales_order(order_id)
                    if order:
                        return JsonResponse(order)
                    else:
                        return JsonResponse({'error': 'Sales order not found'}, status=404)
                else:
                    orders = self.db_manager.get_sales_orders()
                    return JsonResponse(orders, safe=False)
            except Exception as e:
                return self._handle_database_error(e, 'retrieving sales orders')
        
        elif request.method == 'POST':
            try:
                data = json.loads(request.body)
                result = self.db_manager.create_sales_order(
                    customer_id=data.get('customerId'),
                    items=data.get('items', []),
                    user_id=user['id']
                )
                
                if 'error' in result:
                    return JsonResponse(result, status=400)
                
                return JsonResponse(result, status=201)
                
            except Exception as e:
                return self._handle_database_error(e, 'creating sales order')
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class ChallanController(BaseCRUDController):
    """Controller for Sales Challan management"""
    
    def __init__(self):
        super().__init__('Challan')
    
    def handle_sales_challans(self, request, challan_id: int = None) -> JsonResponse:
        """Handle sales challan operations"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        if request.method == 'GET':
            try:
                if challan_id:
                    challan = self.db_manager.get_sales_challan(challan_id)
                    if challan:
                        return JsonResponse(challan)
                    else:
                        return JsonResponse({'error': 'Sales challan not found'}, status=404)
                else:
                    challans = self.db_manager.get_sales_challans()
                    return JsonResponse(challans, safe=False)
            except Exception as e:
                return self._handle_database_error(e, 'retrieving sales challans')
        
        elif request.method == 'POST':
            try:
                data = json.loads(request.body)
                result = self.db_manager.create_sales_challan(
                    customer_id=data.get('customerId'),
                    items=data.get('items', []),
                    user_id=user['id']
                )
                
                if 'error' in result:
                    return JsonResponse(result, status=400)
                
                return JsonResponse(result, status=201)
                
            except Exception as e:
                return self._handle_database_error(e, 'creating sales challan')
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class DashboardController(BaseCRUDController):
    """Controller for dashboard operations"""
    
    def __init__(self):
        super().__init__('Dashboard')
    
    def get_dashboard_stats(self, request) -> JsonResponse:
        """Get dashboard statistics"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        try:
            stats = self.db_manager.get_dashboard_stats()
            return JsonResponse(stats)
        except Exception as e:
            return self._handle_database_error(e, 'retrieving dashboard stats')
    
    def get_dashboard_alerts(self, request) -> JsonResponse:
        """Get dashboard alerts"""
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        
        try:
            alerts = []  # Placeholder for actual alerts logic
            return JsonResponse(alerts, safe=False)
        except Exception as e:
            return JsonResponse({'alerts': []})


# Create singleton instances
grn_controller = GRNController()
order_controller = OrderController()
challan_controller = ChallanController()
dashboard_controller = DashboardController()