"""
Main FastAPI application entry point.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.data_generation import router as data_generation_router
from app.database import get_db
from app.models_transaction_user import TransactionUser
from app.models_user_ban import UserBan

app = FastAPI(
    title="Realtime Pipeline API",
    description="Backend API for real-time fraud detection pipeline",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    data_generation_router,
    prefix="/api/data-generation",
    tags=["data-generation"]
)

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {
        "message": "Realtime Pipeline API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/api/transaction-users")
async def get_transaction_users(
    limit: int = 10000,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get transaction users from PostgreSQL."""
    try:
        users = db.query(TransactionUser)\
            .order_by(TransactionUser.user_seq)\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        return [user.to_dict() for user in users]
    except Exception as e:
        return {"error": str(e), "users": []}

@app.get("/api/transaction-users/count")
async def get_transaction_users_count(db: Session = Depends(get_db)):
    """Get count of transaction users."""
    try:
        count = db.query(TransactionUser).count()
        return {"count": count}
    except Exception as e:
        return {"error": str(e), "count": 0}

@app.get("/api/user/bans")
async def get_user_bans(db: Session = Depends(get_db)):
    """Get all user bans from PostgreSQL."""
    try:
        bans = db.query(UserBan).all()
        return [ban.to_dict() for ban in bans]
    except Exception as e:
        return {"error": str(e), "bans": []}
