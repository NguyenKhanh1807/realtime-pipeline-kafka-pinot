# User Management Actions

This document describes the user management functionality in the Database Management page.

## Overview

Administrators can now manually manage user risk levels through the Database Management interface. This allows for human oversight and intervention beyond the automated fraud detection system.

## Features

### User Status

Each user has a status that indicates their risk level:

- **Normal** 🟢 - User has no restrictions
- **Warning** 🟡 - User is flagged for monitoring due to suspicious activity
- **Banned** 🔴 - User is prohibited from performing transactions

### Available Actions

The system provides different actions based on the user's current status:

| Current Status | Available Action | Description |
|---------------|------------------|-------------|
| Normal | **Warn** | Flag user for suspicious activity and increased monitoring |
| Warning | **Ban** | Prohibit user from performing transactions |
| Banned | **Unban** | Remove ban and restore user to normal status |

## User Interface

### Database Management Page

The user table displays the following columns:

1. **User ID** - Unique user sequence number
2. **Name** - User's full name
3. **Country** - User's country code
4. **Status** - Color-coded badge showing current status
   - Green badge: Normal
   - Yellow badge: Warning
   - Red badge: Banned
5. **Register Date** - When the user registered
6. **Actions** - Button to perform status change action

### Action Buttons

- **Warn Button** (Yellow)
  - Shown for normal users
  - Sets status to "warning"
  - Adds ban_reason: "Flagged for suspicious activity"
  
- **Ban Button** (Red)
  - Shown for warning users
  - Sets status to "banned"
  - Adds ban_reason: "Manually banned by admin"
  - Creates record in user_bans table
  
- **Unban Button** (Green)
  - Shown for banned users
  - Restores status to "normal"
  - Clears ban_reason
  - Deactivates ban in user_bans table

### Loading States

When an action is being processed:
- The action button is disabled
- A loading spinner icon appears
- Other actions for the same user are blocked

## Technical Implementation

### Database Schema

The `transaction_users` table includes:

```sql
status VARCHAR(20) DEFAULT 'normal'
ban_reason VARCHAR(500) NULL
```

Possible status values: `'normal'`, `'warning'`, `'banned'`

### API Endpoint

**POST** `/api/database/user-action`

Request body:
```json
{
  "userSeq": 1000001,
  "action": "ban" | "unban" | "warn"
}
```

Response:
```json
{
  "success": true,
  "user": { /* updated user object */ },
  "message": "User 1000001 banned successfully"
}
```

### Migration

The status columns were added via migration `004_add_user_status_columns.sql`:

```bash
python3 scripts/run_migration_004.py
```

## Use Cases

### 1. Manual Ban for Suspicious Users
Admin reviews users with high fraud scores and manually bans accounts showing coordinated fraud patterns.

### 2. Warning High-Risk Users
Admin flags users with unusual activity patterns for increased monitoring without blocking their transactions.

### 3. Unban After Review
Admin reviews banned accounts and unbans legitimate users who were incorrectly flagged.

### 4. Override Automated System
Admin can override automated fraud detection decisions based on additional context or investigation.

## Testing

Run the test script to verify functionality:

```bash
python3 scripts/test_user_actions.py
```

The test performs a complete cycle:
1. Warn a normal user → status becomes "warning"
2. Ban a warning user → status becomes "banned"
3. Unban a banned user → status returns to "normal"

## Future Enhancements

Potential improvements:
- Bulk actions (ban/unban multiple users)
- Action history log (audit trail)
- Reason field for manual entry
- Automatic unbanning after time period
- Integration with automated fraud scoring
- Email notifications to users
- Export banned users list

## Related Files

- Frontend: `/website/app/database-management/page.tsx`
- API: `/website/app/api/database/user-action/route.ts`
- Model: `/app/models_transaction_user.py`
- Migration: `/migrations/004_add_user_status_columns.sql`
- Test: `/scripts/test_user_actions.py`
