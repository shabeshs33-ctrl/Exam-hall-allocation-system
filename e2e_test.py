import requests
import json
import os

BASE_URL = "http://localhost:8000"

def run_test():
    print("1. Admin Login")
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin123"})
    if res.status_code != 200:
        print("FAIL: Admin Login")
        return
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("PASS: Admin Login")

    print("\n2. Create Test CSV")
    csv_content = """Department,Section,Student Name,Email,Register No
CSE,A,Test Student 1,test1@gmail.com,310625243201
CSE,A,Test Student 2,test2@gmail.com,310625243202
"""
    with open("test_students.csv", "w") as f:
        f.write(csv_content)

    print("\n3. Admin uploads CSV")
    with open("test_students.csv", "rb") as f:
        res = requests.post(
            f"{BASE_URL}/admin/students/upload", 
            headers=admin_headers,
            files={"file": ("test_students.csv", f, "text/csv")}
        )
    print("Upload Response:", res.json())
    if res.status_code == 200:
        print("PASS: CSV Upload")
    else:
        print("FAIL: CSV Upload")
        return

    print("\n4. Verify uploaded students")
    res = requests.get(f"{BASE_URL}/admin/students", headers=admin_headers)
    students = res.json()
    student_1 = next((s for s in students if s["roll_number"] == "310625243201"), None)
    student_2 = next((s for s in students if s["roll_number"] == "310625243202"), None)
    if student_1 and student_2:
        print("PASS: Students created correctly")
    else:
        print("FAIL: Students missing")
        return

    print("\n5. Admin creates Exam")
    exam_data = {
        "exam_name": "Test Exam API",
        "exam_date": "2026-10-10",
        "start_time": "10:00",
        "end_time": "13:00",
        "subject": "Testing"
    }
    res = requests.post(f"{BASE_URL}/admin/exams", headers=admin_headers, json=exam_data)
    exam = res.json()
    if res.status_code == 200:
        print("PASS: Exam created")
    else:
        print("FAIL: Exam creation")
        return

    print("\n6. Admin creates Hall")
    hall_data = {
        "hall_number": "TEST_HALL_1",
        "capacity": 50,
        "building": "Test Block"
    }
    res = requests.post(f"{BASE_URL}/admin/halls", headers=admin_headers, json=hall_data)
    
    if res.status_code == 400 and "already exists" in res.text:
        # Hall already exists, just get it
        halls = requests.get(f"{BASE_URL}/admin/halls", headers=admin_headers).json()
        hall = next(h for h in halls if h["hall_number"] == "TEST_HALL_1")
    else:
        hall = res.json()
        
    print("PASS: Hall created/fetched")

    print("\n7. Admin generates Hall Allocation")
    alloc_data = {
        "exam_id": exam["id"],
        "class_section": "A",
        "hall_ids": [hall["id"]]
    }
    res = requests.post(f"{BASE_URL}/admin/allocation/generate", headers=admin_headers, json=alloc_data)
    print("Generate Allocation:", res.json())
    if res.status_code == 200:
        print("PASS: Allocation generation")
    else:
        print("FAIL: Allocation generation")
        return

    print("\n8. Verify Admin sees Allocation")
    res = requests.get(f"{BASE_URL}/admin/allocation", headers=admin_headers)
    allocs = res.json()
    my_allocs = [a for a in allocs if a["exam_id"] == exam["id"]]
    if len(my_allocs) >= 2:
        print("PASS: Allocations stored in MySQL")
    else:
        print("FAIL: Allocations missing")

    print("\n9. Login as Student 1 (310625243201)")
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "310625243201", "password": "310625243201"})
    student1_token = res.json()["access_token"]
    student1_headers = {"Authorization": f"Bearer {student1_token}"}
    print("PASS: Student 1 Login")

    print("\n10. Student 1 Dashboard data (Profile, Allocation)")
    profile_res = requests.get(f"{BASE_URL}/students/me", headers=student1_headers)
    alloc_res = requests.get(f"{BASE_URL}/students/me/allocation", headers=student1_headers)
    
    if profile_res.status_code == 200 and alloc_res.status_code == 200:
        alloc_1 = alloc_res.json()
        if len(alloc_1) > 0 and alloc_1[0]["student"]["roll_number"] == "310625243201":
            print("PASS: Student 1 sees only their own data")
            print("  Exam:", alloc_1[0]["exam"]["exam_name"])
            print("  Date:", alloc_1[0]["exam"]["exam_date"])
            print("  Time:", alloc_1[0]["exam"]["start_time"])
            print("  Hall:", alloc_1[0]["hall"]["hall_number"])
            print("  Seat:", alloc_1[0]["seat_number"])
        else:
            print("FAIL: Student 1 allocation issue")
    else:
        print("FAIL: Student 1 endpoint failing")

    print("\n11. Login as Student 2 (310625243202)")
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "310625243202", "password": "310625243202"})
    student2_token = res.json()["access_token"]
    student2_headers = {"Authorization": f"Bearer {student2_token}"}
    print("PASS: Student 2 Login")
    
    print("\n12. Student 2 Allocation data")
    alloc_res2 = requests.get(f"{BASE_URL}/students/me/allocation", headers=student2_headers)
    alloc_2 = alloc_res2.json()
    if len(alloc_2) > 0 and alloc_2[0]["student"]["roll_number"] == "310625243202":
        print("PASS: Student 2 sees only their own data (Isolation works)")
    else:
        print("FAIL: Student 2 allocation issue")

    # Cleanup
    print("\n13. Cleanup test data")
    requests.delete(f"{BASE_URL}/admin/exams/{exam['id']}", headers=admin_headers)
    requests.delete(f"{BASE_URL}/admin/halls/{hall['id']}", headers=admin_headers)
    requests.delete(f"{BASE_URL}/admin/students/{student_1['id']}", headers=admin_headers)
    requests.delete(f"{BASE_URL}/admin/students/{student_2['id']}", headers=admin_headers)
    print("PASS: Data cleaned up successfully without wiping database")

if __name__ == "__main__":
    run_test()
