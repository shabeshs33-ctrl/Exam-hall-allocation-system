from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_student

router = APIRouter(prefix="/students", tags=["Student"])

@router.get("/me", response_model=schemas.Student)
def get_my_profile(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_student)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.get("/me/exams", response_model=List[schemas.Exam])
def get_my_exams(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_student)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    allocations = db.query(models.Allocation).filter(models.Allocation.student_id == student.id).all()
    exam_ids = [a.exam_id for a in allocations]
    
    exams = db.query(models.Exam).filter(models.Exam.id.in_(exam_ids)).all()
    return exams

@router.get("/me/allocation", response_model=List[schemas.AllocationResponse])
def get_my_allocations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_student)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    allocations = db.query(models.Allocation).filter(models.Allocation.student_id == student.id).all()
    return allocations
