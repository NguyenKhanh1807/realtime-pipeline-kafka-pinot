#!/usr/bin/env python3
"""
Script to create a testing user with data generation privileges.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_engine
from app.models_auth import AuthUser
from app.auth import hash_password, _ensure_schema
from sqlalchemy.orm import Session
from sqlalchemy import select

def create_testing_user():
    """Create a testing user if it doesn't exist."""
    _ensure_schema()
    engine = get_engine()
    
    with Session(engine) as db:
        # Check if testing user already exists
        stmt = select(AuthUser).where(AuthUser.username == "testing")
        existing_user = db.execute(stmt).scalar_one_or_none()
        
        if existing_user:
            print("Testing user already exists!")
            print(f"Username: {existing_user.username}")
            print(f"Active: {existing_user.is_active}")
            print(f"Created: {existing_user.created_at}")
            return existing_user
        
        # Create new testing user
        testing_user = AuthUser(
            username="testing",
            password_hash=hash_password("testing123"),  # Default password
            is_active=True
        )
        
        db.add(testing_user)
        db.commit()
        db.refresh(testing_user)
        
        print("✅ Testing user created successfully!")
        print(f"Username: testing")
        print(f"Password: testing123")
        print(f"User ID: {testing_user.id}")
        print(f"Created: {testing_user.created_at}")
        
        return testing_user

if __name__ == "__main__":
    create_testing_user()