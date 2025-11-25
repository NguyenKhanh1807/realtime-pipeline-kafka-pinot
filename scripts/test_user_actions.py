#!/usr/bin/env python3
"""
Test the user action API endpoint
"""
import requests
import json

API_URL = "http://localhost:3000/api/database/user-action"
USERS_API_URL = "http://localhost:3000/api/database/users"

def get_users():
    """Get list of users"""
    response = requests.get(USERS_API_URL)
    if response.ok:
        data = response.json()
        return data.get('users', [])
    return []

def test_user_action(user_seq, action):
    """Test user action endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing {action.upper()} action for user {user_seq}")
    print('='*60)
    
    payload = {
        'userSeq': user_seq,
        'action': action
    }
    
    print(f"Request: POST {API_URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            API_URL,
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.ok:
            print(f"✓ {action.upper()} successful!")
            return True
        else:
            print(f"✗ {action.upper()} failed!")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    print("User Action API Test")
    print("="*60)
    
    # Get first user
    users = get_users()
    if not users:
        print("No users found!")
        return
    
    test_user = users[0]
    user_seq = test_user['user_seq']
    
    print(f"\nTest User: {test_user['user_name']} (ID: {user_seq})")
    print(f"Current Status: {test_user.get('status', 'normal')}")
    
    # Test sequence: normal -> warn -> ban -> unban
    print("\n" + "="*60)
    print("TEST SEQUENCE: normal → warn → ban → unban")
    print("="*60)
    
    # Step 1: Warn user
    if test_user_action(user_seq, 'warn'):
        print("\n✓ Step 1 complete: User warned")
    
    # Step 2: Ban user
    if test_user_action(user_seq, 'ban'):
        print("\n✓ Step 2 complete: User banned")
    
    # Step 3: Unban user
    if test_user_action(user_seq, 'unban'):
        print("\n✓ Step 3 complete: User unbanned")
    
    # Verify final state
    print("\n" + "="*60)
    print("VERIFYING FINAL STATE")
    print("="*60)
    
    users = get_users()
    updated_user = next((u for u in users if u['user_seq'] == user_seq), None)
    
    if updated_user:
        print(f"\nUser: {updated_user['user_name']} (ID: {user_seq})")
        print(f"Final Status: {updated_user.get('status', 'normal')}")
        print(f"Ban Reason: {updated_user.get('ban_reason', 'None')}")
        
        if updated_user.get('status') == 'normal':
            print("\n✓ Test sequence completed successfully!")
        else:
            print(f"\n✗ Unexpected final status: {updated_user.get('status')}")
    else:
        print("\n✗ Could not verify final state")

if __name__ == "__main__":
    main()
