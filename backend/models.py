from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
import datetime
from database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    
    student = relationship("Student", back_populates="user", uselist=False)

class StudentList(Base):
    __tablename__ = "student_lists"

    id = Column(Integer, primary_key=True, index=True)
    department = Column(String(255), nullable=False, index=True)
    year = Column(String(255), nullable=False, index=True)
    batch = Column(String(255), nullable=False, index=True)
    section = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    students = relationship("Student", back_populates="student_list")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    student_list_id = Column(Integer, ForeignKey("student_lists.id"), nullable=True)
    
    name = Column(String(255), nullable=False, index=True)
    roll_number = Column(String(255), unique=True, index=True, nullable=False)
    department = Column(String(255), nullable=True)
    year = Column(Integer, nullable=True)
    email = Column(String(255), nullable=True)
    class_section = Column(String(255), nullable=True)

    user = relationship("User", back_populates="student")
    student_list = relationship("StudentList", back_populates="students")
    allocations = relationship("Allocation", back_populates="student")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    exam_name = Column(String(255), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    allocations = relationship("Allocation", back_populates="exam")

class Hall(Base):
    __tablename__ = "halls"

    id = Column(Integer, primary_key=True, index=True)
    hall_number = Column(String(255), unique=True, index=True, nullable=False)
    building = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)

    allocations = relationship("Allocation", back_populates="hall")

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    exam_id = Column(Integer, ForeignKey("exams.id"))
    hall_id = Column(Integer, ForeignKey("halls.id"))
    seat_number = Column(Integer, nullable=False)

    student = relationship("Student", back_populates="allocations")
    exam = relationship("Exam", back_populates="allocations")
    hall = relationship("Hall", back_populates="allocations")
