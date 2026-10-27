import requests
import os

token = ""

def login():
    res = requests.post("http://localhost:8000/auth/login", json={"username": "admin", "password": "adminpassword"})
    return res.json().get("access_token")

token = login()
if not token:
    print("Could not login")
    exit()

headers = {"Authorization": f"Bearer {token}"}

# Create Exam
exam_res = requests.post("http://localhost:8000/admin/exams", json={
    "exam_name": "Test Exam",
    "subject": "CS101",
    "exam_date": "2026-10-01",
    "start_time": "10:00:00",
    "end_time": "12:00:00"
}, headers=headers)
exam_id = exam_res.json()["id"]

# Get Halls
halls_res = requests.get("http://localhost:8000/admin/halls", headers=headers)
halls = halls_res.json()
if not halls:
    # Create Hall
    hall_res = requests.post("http://localhost:8000/admin/halls", json={
        "hall_number": "TEST-1",
        "capacity": 50,
        "building": "Main",
        "floor": 1
    }, headers=headers)
    hall_id = hall_res.json()["id"]
else:
    hall_id = halls[0]["id"]

# Create Student List
sl_res = requests.post("http://localhost:8000/admin/student_lists", json={
    "department": "CSE",
    "year": "2",
    "batch": "2024-2028",
    "section": "A"
}, headers=headers)
sl_id = sl_res.json()["id"]

# Create Student
stu_res = requests.post("http://localhost:8000/admin/students", json={
    "name": "Test Student Allocation",
    "roll_number": "AL001",
    "department": "CSE",
    "year": 2,
    "email": "test@test.com",
    "class_section": "A",
    "username": "al001",
    "password": "password",
    "student_list_id": sl_id
}, headers=headers)

# Generate Allocation
alloc_res = requests.post("http://localhost:8000/admin/allocation/generate", json={
    "exam_id": exam_id,
    "department": "CSE",
    "year": "2",
    "batch": "2024-2028",
    "hall_ids": [hall_id]
}, headers=headers)
print("Generate Allocation Response:", alloc_res.status_code, alloc_res.json())

# Cleanup
requests.delete(f"http://localhost:8000/admin/allocation/bulk", json={"ids": [a["id"] for a in requests.get("http://localhost:8000/admin/allocation", headers=headers).json() if a["student"]["roll_number"] == "AL001"]}, headers=headers)
requests.delete(f"http://localhost:8000/admin/students/{stu_res.json()['id']}", headers=headers)
requests.delete(f"http://localhost:8000/admin/student_lists/{sl_id}", headers=headers)
requests.delete(f"http://localhost:8000/admin/exams/{exam_id}", headers=headers)
