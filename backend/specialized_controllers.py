#!/usr/bin/env python3
"""
Specialized controllers for complex operations in inventory management system
Extends base controllers for entity-specific business logic
"""

import json
from typing import Dict, Any, List, Optional
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from database_storage import DatabaseManager
from auth_utils import get_user_from_token
from base_controllers import BaseCRUDController, CRUDConfig


class SupplierController(BaseCRUDController):
    """Specialized controller for supplier management"""
    
    def __init__(self):
        super().__init__('Supplier')
        self.required_fields = ['name']
        self.field_mapping = {
            'contactPerson': 'contact_person',
            'gstNumber': 'gst_number'
        }
    
    def handle_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Handle supplier CRUD operations"""
        if request.method == 'GET':
            if entity_id:
                return self.handle_get_by_id_from_list(self.db_manager.get_suppliers, entity_id)
            else:
                return self.handle_get_list(self.db_manager.get_suppliers)
        
        elif request.method == 'POST':
            return self.handle_create(
                request, 
                self.db_manager.create_supplier, 
                self.required_fields,
                self.field_mapping
            )
        
        elif request.method == 'PUT' and entity_id:
            return self.handle_update(
                request, 
                self.db_manager.update_supplier, 
                entity_id,
                self.field_mapping
            )
        
        elif request.method == 'DELETE' and entity_id:
            return self.handle_delete(request, self.db_manager.delete_supplier, entity_id)
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class CustomerController(BaseCRUDController):
    """Specialized controller for customer management"""
    
    def __init__(self):
        super().__init__('Customer')
        self.required_fields = ['name']
        self.field_mapping = {
            'contactPerson': 'contact_person',
            'gstNumber': 'gst_number'
        }
    
    def handle_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Handle customer CRUD operations"""
        if request.method == 'GET':
            if entity_id:
                return self.handle_get_by_id_from_list(self.db_manager.get_customers, entity_id)
            else:
                return self.handle_get_list(self.db_manager.get_customers)
        
        elif request.method == 'POST':
            return self.handle_create(
                request, 
                self.db_manager.create_customer, 
                self.required_fields,
                self.field_mapping
            )
        
        elif request.method == 'PUT' and entity_id:
            return self.handle_update(
                request, 
                self.db_manager.update_customer, 
                entity_id,
                self.field_mapping
            )
        
        elif request.method == 'DELETE' and entity_id:
            return self.handle_delete(request, self.db_manager.delete_customer, entity_id)
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class ProcessorController(BaseCRUDController):
    """Specialized controller for processor management"""
    
    def __init__(self):
        super().__init__('Processor')
        self.required_fields = ['name']
        self.field_mapping = {
            'contactPerson': 'contact_person',
            'gstNumber': 'gst_number'
        }
    
    def handle_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Handle processor CRUD operations"""
        if request.method == 'GET':
            if entity_id:
                return self.handle_get_by_id_from_list(self.db_manager.get_processors, entity_id)
            else:
                return self.handle_get_list(self.db_manager.get_processors)
        
        elif request.method == 'POST':
            return self.handle_create(
                request, 
                self.db_manager.create_processor, 
                self.required_fields,
                self.field_mapping
            )
        
        elif request.method == 'PUT' and entity_id:
            return self.handle_update(
                request, 
                self.db_manager.update_processor, 
                entity_id,
                self.field_mapping
            )
        
        elif request.method == 'DELETE' and entity_id:
            return self.handle_delete(request, self.db_manager.delete_processor, entity_id)
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


class ProductController(BaseCRUDController):
    """Specialized controller for product management with enhanced validation"""
    
    def __init__(self):
        super().__init__('Product')
        self.required_fields = ['productName', 'categoryId']
        self.field_mapping = {
            'productName': 'product_name',
            'categoryId': 'category_id',
            'hsnCode': 'hsn_code'
        }
    
    def handle_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Handle product CRUD operations with enhanced validation"""
        if request.method == 'GET':
            if entity_id:
                return self.handle_get_by_id_from_list(self.db_manager.get_products, entity_id)
            else:
                return self.handle_get_list(self.db_manager.get_products)
        
        elif request.method == 'POST':
            return self.handle_create(
                request, 
                self.db_manager.create_product, 
                self.required_fields,
                self.field_mapping
            )
        
        elif request.method == 'PUT' and entity_id:
            return self.handle_update(
                request, 
                self.db_manager.update_product, 
                entity_id,
                self.field_mapping
            )
        
        elif request.method == 'DELETE' and entity_id:
            return self.handle_delete(request, self.db_manager.delete_product, entity_id)
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)


# Create singleton instances for optimized access
supplier_controller = SupplierController()
customer_controller = CustomerController()
processor_controller = ProcessorController()
product_controller = ProductController()