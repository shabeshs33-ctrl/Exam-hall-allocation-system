from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Union
from datetime import date, time, datetime
from models import RoleEnum

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[RoleEnum] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: RoleEnum

class User(UserBase):
    id: int
    role: RoleEnum
    class Config:
        from_attributes = True

class StudentListBase(BaseModel):
    department: str
    year: str
    batch: str
    section: str

    @field_validator('year', mode='before')
    @classmethod
    def convert_year(cls, v):
        if isinstance(v, (int, float)):
            return str(int(v))
        return v

    @field_validator('section', mode='before')
    @classmethod
    def convert_section(cls, v):
        if isinstance(v, str):
            return v.strip().upper()
        return v

    @field_validator('department', 'year', 'batch', 'section')
    @classmethod
    def validate_non_empty(cls, v, info):
        if not v or not str(v).strip():
            raise ValueError(f"{info.field_name.capitalize()} cannot be empty.")
        return str(v).strip()

class StudentListCreate(StudentListBase):
    pass

class StudentList(StudentListBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class StudentListResponse(StudentList):
    student_count: int

class StudentBase(BaseModel):
    name: str
    roll_number: str
    department: Optional[str] = None
    year: Optional[int] = None
    email: Optional[EmailStr] = None
    class_section: Optional[str] = None
    student_list_id: Optional[int] = None

class StudentCreate(StudentBase):
    username: str
    password: str

class Student(StudentBase):
    id: int
    user_id: int
    student_list: Optional[StudentList] = None
    class Config:
        from_attributes = True

class StudentListResponse(StudentList):
    students_count: int = 0

class ExamBase(BaseModel):
    exam_name: str
    subject: str
    exam_date: date
    start_time: time
    end_time: time

class ExamCreate(ExamBase):
    pass

class Exam(ExamBase):
    id: int
    class Config:
        from_attributes = True

class HallBase(BaseModel):
    hall_number: str
    building: str
    capacity: int

class HallCreate(HallBase):
    pass

class Hall(HallBase):
    id: int
    class Config:
        from_attributes = True

class AllocationBase(BaseModel):
    student_id: int
    exam_id: int
    hall_id: int
    seat_number: int

class Allocation(AllocationBase):
    id: int
    class Config:
        from_attributes = True
        
class AllocationResponse(Allocation):
    student: Student
    exam: Exam
    hall: Hall
    class Config:
        from_attributes = True
