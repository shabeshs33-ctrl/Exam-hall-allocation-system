from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta

from database import engine, Base, get_db
import models
import schemas
from auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from routers import admin, student
from models import RoleEnum, User
from auth import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Exam Hall Allocation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(student.router)

@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form_data.username.lower()
    password = form_data.password.lower()
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Initialize an admin user on startup if none exists
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        hashed_password = get_password_hash("admin123")
        new_admin = User(username="admin", password_hash=hashed_password, role=RoleEnum.ADMIN)
        db.add(new_admin)
        db.commit()
    db.close()
