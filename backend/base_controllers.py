#!/usr/bin/env python3
"""
Base CRUD controllers for inventory management system
Extracted from simple_server.py to eliminate code duplication
"""

import json
from typing import Dict, Any, List, Optional, Callable
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from database_storage import DatabaseManager
from auth_utils import get_user_from_token


class CRUDConfig:
    """Configuration for CRUD operations"""
    DEFAULT_ERROR_MESSAGE = 'An error occurred'
    VALIDATION_ERROR_STATUS = 400
    AUTH_ERROR_STATUS = 401
    NOT_FOUND_STATUS = 404
    SERVER_ERROR_STATUS = 500
    
    # Common validation messages
    REQUIRED_FIELD_MESSAGE = '{field} is required'
    INVALID_ID_MESSAGE = 'Invalid ID provided'
    NOT_FOUND_MESSAGE = '{entity} not found'
    DELETE_SUCCESS_MESSAGE = '{entity} deleted successfully'
    UPDATE_SUCCESS_MESSAGE = '{entity} updated successfully'
    CREATE_SUCCESS_MESSAGE = '{entity} created successfully'


class BaseCRUDController:
    """Base controller with common CRUD operations to eliminate duplication"""
    
    def __init__(self, entity_name: str):
        self.entity_name = entity_name
        self.config = CRUDConfig()
        self.db_manager = DatabaseManager()
    
    def _get_user_or_error(self, request, methods_requiring_auth: List[str] = None) -> tuple:
        """Check authentication for specified methods"""
        if methods_requiring_auth is None:
            methods_requiring_auth = ['POST', 'PUT', 'DELETE']
        
        if request.method in methods_requiring_auth:
            user = get_user_from_token(request)
            if not user:
                return None, JsonResponse({'error': 'Authentication required'}, 
                                        status=self.config.AUTH_ERROR_STATUS)
        return True, None
    
    def _parse_json_body(self, request) -> tuple:
        """Parse JSON body and return data or error response"""
        try:
            data = json.loads(request.body)
            return data, None
        except json.JSONDecodeError:
            return None, JsonResponse({'error': 'Invalid JSON data'}, 
                                    status=self.config.VALIDATION_ERROR_STATUS)
    
    def _validate_required_fields(self, data: Dict[str, Any], required_fields: List[str]) -> Optional[JsonResponse]:
        """Validate required fields and return error response if validation fails"""
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'error': self.config.REQUIRED_FIELD_MESSAGE.format(field=field)
                }, status=self.config.VALIDATION_ERROR_STATUS)
        return None
    
    def _handle_database_error(self, error: Exception, operation: str = 'operation') -> JsonResponse:
        """Handle database errors with consistent error response"""
        return JsonResponse({
            'error': f'Database error during {operation}: {str(error)}'
        }, status=self.config.SERVER_ERROR_STATUS)
    
    def _success_response(self, data: Any = None, message: str = None) -> JsonResponse:
        """Create success response with optional data and message"""
        response = {}
        if message:
            response['message'] = message
        if data is not None:
            if isinstance(data, list):
                # Handle plural forms correctly
                if self.entity_name.lower().endswith('s'):
                    response[self.entity_name.lower()] = data
                else:
                    response[f'{self.entity_name.lower()}s'] = data
            else:
                response[self.entity_name.lower().rstrip('s')] = data
        return JsonResponse(response if response else data, safe=False)
    
    def handle_get_list(self, get_method: Callable) -> JsonResponse:
        """Handle GET request for entity list"""
        try:
            entities = get_method()
            return self._success_response(entities)
        except Exception as e:
            return self._handle_database_error(e, f'retrieving {self.entity_name.lower()}s')
    
    def handle_get_by_id(self, get_method: Callable, entity_id: int) -> JsonResponse:
        """Handle GET request for single entity by ID"""
        try:
            entity = get_method(entity_id)
            if entity:
                return self._success_response(entity)
            else:
                return JsonResponse({
                    'error': self.config.NOT_FOUND_MESSAGE.format(entity=self.entity_name)
                }, status=self.config.NOT_FOUND_STATUS)
        except Exception as e:
            return self._handle_database_error(e, f'retrieving {self.entity_name.lower()}')
    
    def handle_get_by_id_from_list(self, get_list_method: Callable, entity_id: int) -> JsonResponse:
        """Handle GET request for single entity by ID from list (for DatabaseManager compatibility)"""
        try:
            entities = get_list_method()
            entity = None
            for item in entities:
                if str(item.get('id', item.get(f'{self.entity_name.lower()[:-1]}_id'))) == str(entity_id):
                    entity = item
                    break
            
            if entity:
                return self._success_response(entity)
            else:
                return JsonResponse({
                    'error': self.config.NOT_FOUND_MESSAGE.format(entity=self.entity_name)
                }, status=self.config.NOT_FOUND_STATUS)
        except Exception as e:
            return self._handle_database_error(e, f'retrieving {self.entity_name.lower()}')
    
    def handle_create(self, request, create_method: Callable, required_fields: List[str], 
                     field_mapping: Dict[str, str] = None) -> JsonResponse:
        """Handle POST request for creating entity"""
        auth_check, auth_error = self._get_user_or_error(request)
        if auth_error:
            return auth_error
        
        data, parse_error = self._parse_json_body(request)
        if parse_error:
            return parse_error
        
        validation_error = self._validate_required_fields(data, required_fields)
        if validation_error:
            return validation_error
        
        try:
            # Apply field mapping if provided
            if field_mapping:
                mapped_data = {}
                for api_field, db_field in field_mapping.items():
                    if api_field in data:
                        mapped_data[db_field] = data[api_field]
                # Add any fields not in mapping
                for key, value in data.items():
                    if key not in field_mapping:
                        mapped_data[key] = value
                data = mapped_data
            
            result = create_method(**data)
            return self._success_response(
                result, 
                self.config.CREATE_SUCCESS_MESSAGE.format(entity=self.entity_name)
            )
        except Exception as e:
            return self._handle_database_error(e, f'creating {self.entity_name.lower()}')
    
    def handle_update(self, request, update_method: Callable, entity_id: int, 
                     field_mapping: Dict[str, str] = None) -> JsonResponse:
        """Handle PUT request for updating entity"""
        auth_check, auth_error = self._get_user_or_error(request)
        if auth_error:
            return auth_error
        
        data, parse_error = self._parse_json_body(request)
        if parse_error:
            return parse_error
        
        try:
            # Apply field mapping if provided
            if field_mapping:
                mapped_data = {}
                for api_field, db_field in field_mapping.items():
                    if api_field in data:
                        mapped_data[db_field] = data[api_field]
                # Add any fields not in mapping
                for key, value in data.items():
                    if key not in field_mapping:
                        mapped_data[key] = value
                data = mapped_data
            
            result = update_method(entity_id, **data)
            if result:
                return self._success_response(
                    result,
                    self.config.UPDATE_SUCCESS_MESSAGE.format(entity=self.entity_name)
                )
            else:
                return JsonResponse({
                    'error': self.config.NOT_FOUND_MESSAGE.format(entity=self.entity_name)
                }, status=self.config.NOT_FOUND_STATUS)
        except Exception as e:
            return self._handle_database_error(e, f'updating {self.entity_name.lower()}')
    
    def handle_delete(self, request, delete_method: Callable, entity_id: int) -> JsonResponse:
        """Handle DELETE request for entity"""
        auth_check, auth_error = self._get_user_or_error(request)
        if auth_error:
            return auth_error
        
        try:
            success = delete_method(entity_id)
            if success:
                return self._success_response(
                    message=self.config.DELETE_SUCCESS_MESSAGE.format(entity=self.entity_name)
                )
            else:
                return JsonResponse({
                    'error': self.config.NOT_FOUND_MESSAGE.format(entity=self.entity_name)
                }, status=self.config.NOT_FOUND_STATUS)
        except Exception as e:
            return self._handle_database_error(e, f'deleting {self.entity_name.lower()}')


class MasterDataController(BaseCRUDController):
    """Specialized controller for master data entities"""
    
    def handle_standard_crud(self, request, entity_id: int = None) -> JsonResponse:
        """Handle standard CRUD operations for master data entities"""
        method_map = {
            'locations': {
                'get_list': self.db_manager.get_locations,
                'create': self.db_manager.create_location,
                'update': self.db_manager.update_location,
                'delete': self.db_manager.delete_location,
                'required_fields': ['name'],
                'field_mapping': {'contactPerson': 'contact_person'}
            },
            'categories': {
                'get_list': self.db_manager.get_categories,
                'create': self.db_manager.create_category,
                'update': self.db_manager.update_category,
                'delete': self.db_manager.delete_category,
                'required_fields': ['name']
            },
            'products': {
                'get_list': self.db_manager.get_products,
                'create': self.db_manager.create_product,
                'update': self.db_manager.update_product,
                'delete': self.db_manager.delete_product,
                'required_fields': ['name', 'categoryId'],
                'field_mapping': {'categoryId': 'category_id', 'hsnCode': 'hsn_code'}
            }
        }
        
        if self.entity_name.lower() not in method_map:
            return JsonResponse({'error': f'Unsupported entity: {self.entity_name}'}, 
                              status=self.config.VALIDATION_ERROR_STATUS)
        
        methods = method_map[self.entity_name.lower()]
        
        if request.method == 'GET':
            if entity_id:
                # For individual entities, use get_list and filter by ID
                return self.handle_get_by_id_from_list(methods['get_list'], entity_id)
            else:
                return self.handle_get_list(methods['get_list'])
        
        elif request.method == 'POST':
            return self.handle_create(
                request, 
                methods['create'], 
                methods['required_fields'],
                methods.get('field_mapping')
            )
        
        elif request.method == 'PUT' and entity_id:
            return self.handle_update(
                request, 
                methods['update'], 
                entity_id,
                methods.get('field_mapping')
            )
        
        elif request.method == 'DELETE' and entity_id:
            return self.handle_delete(request, methods['delete'], entity_id)
        
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)