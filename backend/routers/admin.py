from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io

from database import get_db
import models
import schemas
from auth import get_current_admin, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])

# Dashboard stats
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    total_students = db.query(models.Student).count()
    total_exams = db.query(models.Exam).count()
    total_halls = db.query(models.Hall).count()
    total_allocations = db.query(models.Allocation).count()
    
    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_halls": total_halls,
        "total_allocated_students": total_allocations
    }

from typing import List, Optional

# Student Lists CRUD
@router.get("/student_lists", response_model=List[schemas.StudentListResponse])
def get_student_lists(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    lists = db.query(models.StudentList).all()
    res = []
    for l in lists:
        count = db.query(models.Student).filter(models.Student.student_list_id == l.id).count()
        r = schemas.StudentListResponse.model_validate(l)
        r.students_count = count
        res.append(r)
    return res

@router.post("/student_lists", response_model=schemas.StudentList)
def create_student_list(lst: schemas.StudentListCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    from sqlalchemy import func
    dept = lst.department.strip()
    year = lst.year.strip()
    batch = lst.batch.strip()
    section = lst.section.strip()

    existing = db.query(models.StudentList).filter(
        func.lower(models.StudentList.department) == dept.lower(),
        func.lower(models.StudentList.year) == year.lower(),
        func.lower(models.StudentList.batch) == batch.lower(),
        func.lower(models.StudentList.section) == section.lower()
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A student list for {dept} Year {year} Batch {batch} Section {section} already exists."
        )

    db_lst = models.StudentList(
        department=dept,
        year=year,
        batch=batch,
        section=section
    )
    db.add(db_lst)
    db.commit()
    db.refresh(db_lst)
    return db_lst

@router.delete("/student_lists/{list_id}")
def delete_student_list(list_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    lst = db.query(models.StudentList).filter(models.StudentList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="Student list not found")
        
    # Get all students in this list
    students = db.query(models.Student).filter(models.Student.student_list_id == list_id).all()
    student_ids = [s.id for s in students]
    user_ids = [s.user_id for s in students if s.user_id is not None]
    
    if student_ids:
        db.query(models.Allocation).filter(models.Allocation.student_id.in_(student_ids)).delete(synchronize_session=False)
        db.query(models.Student).filter(models.Student.id.in_(student_ids)).delete(synchronize_session=False)
    if user_ids:
        db.query(models.User).filter(models.User.id.in_(user_ids)).delete(synchronize_session=False)
        
    db.query(models.StudentList).filter(models.StudentList.id == list_id).delete(synchronize_session=False)
    db.commit()
    
    return {"message": "Student list and all its students deleted"}

# Students CRUD
@router.get("/students", response_model=List[schemas.Student])
def get_students(student_list_id: Optional[int] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    query = db.query(models.Student)
    if student_list_id is not None:
        query = query.filter(models.Student.student_list_id == student_list_id)
    return query.all()

@router.post("/students", response_model=schemas.Student)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    try:
        db_user = db.query(models.User).filter(models.User.username == student.username).first()
        if db_user:
            raise HTTPException(status_code=409, detail="A student with this roll number already exists.")
        
        db_student = db.query(models.Student).filter(models.Student.roll_number == student.roll_number).first()
        if db_student:
            raise HTTPException(status_code=409, detail="A student with this roll number already exists.")

        hashed_password = get_password_hash(student.password)
        new_user = models.User(username=student.username, password_hash=hashed_password, role=models.RoleEnum.STUDENT)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        new_student = models.Student(
            user_id=new_user.id,
            name=student.name,
            roll_number=student.roll_number,
            department=student.department,
            year=student.year,
            email=student.email,
            class_section=student.class_section,
            student_list_id=student.student_list_id
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        return new_student
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

from services.excel_analyzer import analyze_excel
from services.student_importer import import_students
from pydantic import BaseModel
import json

@router.post("/students/analyze")
async def analyze_students_file(file: UploadFile = File(...), current_user: models.User = Depends(get_current_admin)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")
    
    content = await file.read()
    analysis = analyze_excel(content, file.filename)
    if not analysis.get("success"):
        raise HTTPException(status_code=400, detail=analysis.get("error"))
        
    return analysis

@router.post("/students/import_analyzed")
async def import_analyzed_students(
    file: UploadFile = File(...), 
    mapping: str = Form(...),
    header_row_idx: int = Form(...),
    student_list_id: int = Form(...),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_admin)
):
    try:
        column_mapping = json.loads(mapping)
    except:
        raise HTTPException(status_code=400, detail="Invalid mapping format")
        
    content = await file.read()
    
    # Verify student list exists
    student_list = db.query(models.StudentList).filter(models.StudentList.id == student_list_id).first()
    if not student_list:
        raise HTTPException(status_code=404, detail="Student list not found")
        
    result = import_students(content, file.filename, header_row_idx, column_mapping, student_list_id, db)
    return result

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.delete("/students/bulk")
def bulk_delete_students(payload: BulkDeleteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not payload.ids:
        return {"deleted": 0}
        
    students = db.query(models.Student).filter(models.Student.id.in_(payload.ids)).all()
    if not students:
        return {"deleted": 0}
        
    student_ids = [s.id for s in students]
    user_ids = [s.user_id for s in students if s.user_id is not None]
    
    db.query(models.Allocation).filter(models.Allocation.student_id.in_(student_ids)).delete(synchronize_session=False)
    db.query(models.Student).filter(models.Student.id.in_(student_ids)).delete(synchronize_session=False)
    if user_ids:
        db.query(models.User).filter(models.User.id.in_(user_ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"{len(student_ids)} students deleted", "deleted": len(student_ids)}

@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    user_id = student.user_id
    
    db.query(models.Allocation).filter(models.Allocation.student_id == student_id).delete(synchronize_session=False)
    db.query(models.Student).filter(models.Student.id == student_id).delete(synchronize_session=False)
    if user_id:
        db.query(models.User).filter(models.User.id == user_id).delete(synchronize_session=False)
        
    db.commit()
    return {"message": "Student deleted"}

# Exams CRUD
@router.get("/exams", response_model=List[schemas.Exam])
def get_exams(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    return db.query(models.Exam).all()

@router.post("/exams", response_model=schemas.Exam)
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    new_exam = models.Exam(**exam.model_dump())
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.delete("/exams/bulk")
def bulk_delete_exams(payload: BulkDeleteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not payload.ids:
        return {"deleted": 0}
        
    exams = db.query(models.Exam).filter(models.Exam.id.in_(payload.ids)).all()
    if not exams:
        return {"deleted": 0}
        
    exam_ids = [e.id for e in exams]
    db.query(models.Allocation).filter(models.Allocation.exam_id.in_(exam_ids)).delete(synchronize_session=False)
    db.query(models.Exam).filter(models.Exam.id.in_(exam_ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"{len(exam_ids)} exams deleted", "deleted": len(exam_ids)}

@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.query(models.Allocation).filter(models.Allocation.exam_id == exam_id).delete(synchronize_session=False)
    db.query(models.Exam).filter(models.Exam.id == exam_id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Exam deleted"}

# Halls CRUD
@router.get("/halls", response_model=List[schemas.Hall])
def get_halls(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    return db.query(models.Hall).all()

@router.post("/halls", response_model=schemas.Hall)
def create_hall(hall: schemas.HallCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    db_hall = db.query(models.Hall).filter(models.Hall.hall_number == hall.hall_number).first()
    if db_hall:
        raise HTTPException(status_code=400, detail="Hall number already exists")
    new_hall = models.Hall(**hall.model_dump())
    db.add(new_hall)
    db.commit()
    db.refresh(new_hall)
    return new_hall

@router.delete("/halls/bulk")
def bulk_delete_halls(payload: BulkDeleteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not payload.ids:
        return {"deleted": 0}
        
    halls = db.query(models.Hall).filter(models.Hall.id.in_(payload.ids)).all()
    if not halls:
        return {"deleted": 0}
        
    hall_ids = [h.id for h in halls]
    db.query(models.Allocation).filter(models.Allocation.hall_id.in_(hall_ids)).delete(synchronize_session=False)
    db.query(models.Hall).filter(models.Hall.id.in_(hall_ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"{len(hall_ids)} halls deleted", "deleted": len(hall_ids)}

@router.delete("/halls/{hall_id}")
def delete_hall(hall_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    hall = db.query(models.Hall).filter(models.Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    db.query(models.Allocation).filter(models.Allocation.hall_id == hall_id).delete(synchronize_session=False)
    db.query(models.Hall).filter(models.Hall.id == hall_id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Hall deleted"}

# Allocation
@router.get("/allocation", response_model=List[schemas.AllocationResponse])
def get_allocations(
    search: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[str] = None,
    batch: Optional[str] = None,
    section: Optional[str] = None,
    exam_id: Optional[int] = None,
    hall_id: Optional[int] = None,
    page: int = 1,
    per_page: int = 100,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_admin)
):
    from sqlalchemy.orm import joinedload
    query = db.query(models.Allocation).options(
        joinedload(models.Allocation.student).joinedload(models.Student.student_list),
        joinedload(models.Allocation.exam),
        joinedload(models.Allocation.hall)
    ).join(
        models.Student, models.Allocation.student_id == models.Student.id
    ).outerjoin(
        models.StudentList, models.Student.student_list_id == models.StudentList.id
    ).join(
        models.Exam, models.Allocation.exam_id == models.Exam.id
    ).join(
        models.Hall, models.Allocation.hall_id == models.Hall.id
    )

    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import or_, func
        query = query.filter(or_(
            func.lower(models.Student.name).like(search_term),
            func.lower(models.Student.roll_number).like(search_term),
            func.lower(models.StudentList.department).like(search_term),
            func.lower(models.Exam.exam_name).like(search_term),
            func.lower(models.Hall.hall_number).like(search_term),
            func.lower(models.Hall.building).like(search_term),
        ))

    if department:
        query = query.filter(models.StudentList.department == department)
    if year:
        query = query.filter(models.StudentList.year == year)
    if batch:
        query = query.filter(models.StudentList.batch == batch)
    if section:
        query = query.filter(models.StudentList.section == section)
    if exam_id:
        query = query.filter(models.Exam.id == exam_id)
    if hall_id:
        query = query.filter(models.Hall.id == hall_id)

    total = query.count()
    allocations = query.order_by(models.Allocation.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    # Return paginated response if needed, but since frontend expects List[schemas.AllocationResponse],
    # returning a list directly but with a header is an option. Wait, I can return a dictionary and adjust frontend, 
    # but the simplest way without breaking frontend is just returning the list.
    return allocations

@router.delete("/allocation/bulk")
def bulk_delete_allocations(payload: BulkDeleteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not payload.ids:
        return {"deleted": 0}
        
    deleted_count = db.query(models.Allocation).filter(models.Allocation.id.in_(payload.ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"{deleted_count} allocations deleted", "deleted": deleted_count}

@router.post("/allocation/generate")
def generate_allocation(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    exam_id = payload.get("exam_id")
    allocation_mode = payload.get("allocation_mode", "same_section")
    group1 = payload.get("group1")
    group2 = payload.get("group2")
    hall_ids = payload.get("hall_ids", [])
    
    if not exam_id or not hall_ids:
        raise HTTPException(status_code=400, detail="Exam and halls are required")
        
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    from sqlalchemy import and_, or_
    
    base_query = db.query(models.Student).join(models.StudentList, models.Student.student_list_id == models.StudentList.id)
    
    if allocation_mode == "same_section":
        query = base_query
        if group1:
            if group1.get("department"):
                query = query.filter(models.StudentList.department == group1.get("department"))
            if group1.get("year"):
                query = query.filter(models.StudentList.year == group1.get("year"))
            if group1.get("batch"):
                query = query.filter(models.StudentList.batch == group1.get("batch"))
            if group1.get("section"):
                query = query.filter(models.StudentList.section == group1.get("section"))
                
        students = query.all()
        if not students:
            raise HTTPException(status_code=404, detail="No students found for the selected Student List.")
        student_ids = [s.id for s in students]
        
    else:
        # mixed_department
        if not group1 or not group2:
            raise HTTPException(status_code=400, detail="Two groups are required for mixed department allocation")
            
        cond1 = and_(
            models.StudentList.department == group1.get("department"),
            models.StudentList.year == group1.get("year"),
            models.StudentList.batch == group1.get("batch"),
            models.StudentList.section == group1.get("section")
        )
        cond2 = and_(
            models.StudentList.department == group2.get("department"),
            models.StudentList.year == group2.get("year"),
            models.StudentList.batch == group2.get("batch"),
            models.StudentList.section == group2.get("section")
        )
        
        group1_students = base_query.filter(cond1).all()
        group2_students = base_query.filter(cond2).all()
        
        students = group1_students + group2_students
        if not students:
            raise HTTPException(status_code=404, detail="No students found for the selected Student Lists.")
            
        group1_ids = [s.id for s in group1_students]
        group2_ids = [s.id for s in group2_students]
        
        student_ids = []
        idx = 0
        while idx < len(group1_ids) or idx < len(group2_ids):
            if idx < len(group1_ids):
                student_ids.append(group1_ids[idx])
            if idx < len(group2_ids):
                student_ids.append(group2_ids[idx])
            idx += 1
        
    # Get halls and available capacity
    halls = db.query(models.Hall).filter(models.Hall.id.in_(hall_ids)).all()
    total_capacity = sum(h.capacity for h in halls)
    
    if total_capacity < len(student_ids):
        raise HTTPException(status_code=400, detail="Not enough hall capacity for the selected Class/Section.")
        
    # Clear existing allocations for these students in this exam
    db.query(models.Allocation).filter(
        models.Allocation.exam_id == exam_id,
        models.Allocation.student_id.in_(student_ids)
    ).delete(synchronize_session=False)
    
    # Allocate students
    allocations_to_add = []
    student_index = 0
    
    for hall in halls:
        # get already allocated seats in this hall for this exam
        existing_allocs = db.query(models.Allocation).filter(
            models.Allocation.exam_id == exam_id,
            models.Allocation.hall_id == hall.id
        ).all()
        used_seats = {a.seat_number for a in existing_allocs}
        
        current_seat = 1
        while current_seat <= hall.capacity and student_index < len(student_ids):
            if current_seat not in used_seats:
                alloc = models.Allocation(
                    student_id=student_ids[student_index],
                    exam_id=exam_id,
                    hall_id=hall.id,
                    seat_number=current_seat
                )
                allocations_to_add.append(alloc)
                student_index += 1
            current_seat += 1
            
        if student_index >= len(student_ids):
            break
            
    if student_index < len(student_ids):
        raise HTTPException(status_code=400, detail="Could not allocate all students due to fragmentation or capacity issues")
        
    db.add_all(allocations_to_add)
    db.commit()
    
    return {"message": f"Successfully allocated {len(allocations_to_add)} students"}
