#!/usr/bin/env python3
"""
Authentication utilities for inventory management system
Extracted from simple_server.py for better modularity
"""

import uuid
import json
from typing import Optional, Dict, Any
from django.http import JsonResponse
from decouple import config

class AuthConfig:
    """Configuration class for authentication settings"""
    # Demo credentials - move to environment variables in production
    DEMO_USERNAME = config('DEMO_USERNAME', default='admin')
    DEMO_PASSWORD = config('DEMO_PASSWORD', default='admin123')
    
    # Token settings
    TOKEN_HEADER_PREFIX = 'Bearer '
    
    # User roles
    ADMIN_ROLE = 'admin'
    USER_ROLE = 'user'


class AuthManager:
    """Optimized authentication manager with configurable settings"""
    
    def __init__(self):
        self.config = AuthConfig()
        # Simple in-memory session storage for demo
        # In production, this would be in a database or Redis
        self.valid_tokens: Dict[str, Dict[str, Any]] = {}
        self.invalidated_tokens: set = set()
    
    def generate_token(self) -> str:
        """Generate a unique token for each login session"""
        return str(uuid.uuid4())
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user credentials and return user data if valid"""
        # Simple credential validation (for demo)
        # In production, use proper authentication with hashed passwords
        if username == self.config.DEMO_USERNAME and password == self.config.DEMO_PASSWORD:
            return {
                'id': 1,
                'username': username,
                'fullName': 'System Administrator',
                'role': self.config.ADMIN_ROLE
            }
        return None
    
    def create_session(self, user_data: Dict[str, Any]) -> str:
        """Create a new session and return token"""
        token = self.generate_token()
        self.valid_tokens[token] = user_data
        return token
    
    def get_user_from_token(self, request) -> Optional[Dict[str, Any]]:
        """Extract user information from Authorization token"""
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith(self.config.TOKEN_HEADER_PREFIX):
            return None
        
        token = auth_header.replace(self.config.TOKEN_HEADER_PREFIX, '')
        
        # Check if token is valid and not invalidated
        if token and token in self.valid_tokens and token not in self.invalidated_tokens:
            return self.valid_tokens[token]
        return None
    
    def invalidate_token(self, token: str) -> bool:
        """Invalidate a specific token"""
        if token in self.valid_tokens:
            self.invalidated_tokens.add(token)
            return True
        return False
    
    def logout_user(self, request) -> bool:
        """Logout user by invalidating their token"""
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith(self.config.TOKEN_HEADER_PREFIX):
            return False
        
        token = auth_header.replace(self.config.TOKEN_HEADER_PREFIX, '')
        return self.invalidate_token(token)


# Create singleton instance
auth_manager = AuthManager()


# Utility functions for backward compatibility
def get_user_from_token(request) -> Optional[Dict[str, Any]]:
    """Backward compatibility function"""
    return auth_manager.get_user_from_token(request)


def generate_token() -> str:
    """Backward compatibility function"""
    return auth_manager.generate_token()


def require_authentication(view_func):
    """Decorator to require authentication for view functions"""
    def wrapper(request, *args, **kwargs):
        user = auth_manager.get_user_from_token(request)
        if not user:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        # Add user to request for easy access in view
        request.user_data = user
        return view_func(request, *args, **kwargs)
    
    return wrapper


def optional_authentication(view_func):
    """Decorator to optionally add authentication to view functions"""
    def wrapper(request, *args, **kwargs):
        user = auth_manager.get_user_from_token(request)
        request.user_data = user  # Will be None if not authenticated
        return view_func(request, *args, **kwargs)
    
    return wrapper