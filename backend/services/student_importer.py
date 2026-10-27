import csv
import io
import time
import logging
from sqlalchemy.orm import Session
from auth import get_password_hash
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def import_students(content, filename, header_row_idx, column_mapping, student_list_id: int, db: Session):
    start_time = time.time()
    t_load = time.time()
    rows = []
    if filename.endswith('.csv'):
        try:
            decoded = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            decoded = content.decode('latin-1')
        reader = csv.reader(io.StringIO(decoded))
        rows = list(reader)
    elif filename.endswith('.xlsx'):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        sheet = wb.active
        rows = [[str(cell).strip() if cell is not None else "" for cell in r] for r in sheet.iter_rows(values_only=True)]
        
    logger.info(f"Import: Excel loading: {time.time() - t_load:.2f}s")
    
    data_rows = rows[header_row_idx+1:]
    
    added = 0
    skipped_duplicates = 0
    errors = []
    seen_rolls = set()
    
    t_val = time.time()
    valid_students_data = []
    
    for row_num, row in enumerate(data_rows, start=header_row_idx+2):
        if not any(row): continue
        
        student_data = {}
        for col_idx, field_name in column_mapping.items():
            col_idx = int(col_idx)
            val = str(row[col_idx]).strip() if col_idx < len(row) and row[col_idx] is not None else ""
            student_data[field_name] = val
            
        name = student_data.get("name", "")
        roll_number = student_data.get("roll_number", "")
        student_list = db.query(models.StudentList).filter(models.StudentList.id == student_list_id).first()
        
        department = student_data.get("department", "") or (student_list.department if student_list else None)
        class_section = student_data.get("class_section", "") or (student_list.section if student_list else None)
        try:
            year = int(student_data.get("year", (student_list.year if student_list else 1)))
        except:
            year = 1
        email = student_data.get("email", None)
        
        if not email:
            email = None
            
        if not name or not roll_number:
            errors.append(f"Row {row_num}: Missing required fields (Name, Reg No)")
            continue
            
        if roll_number in seen_rolls:
            errors.append(f"Row {row_num}: Duplicate roll number '{roll_number}' inside the file")
            continue
        seen_rolls.add(roll_number)
        
        valid_students_data.append({
            "name": name,
            "roll_number": roll_number,
            "department": department,
            "year": year,
            "email": email,
            "class_section": class_section,
            "row_num": row_num
        })
        
    logger.info(f"Import: Validation: {time.time() - t_val:.2f}s")
    
    logger.info(f"Excel rows detected: {len(data_rows)}")
    logger.info(f"Valid student rows: {len(valid_students_data)}")
    
    # 3. Print/log the first 10 extracted student records before duplicate checking.
    logger.info("First 10 extracted student records before duplicate checking:")
    for i, s in enumerate(valid_students_data[:10]):
        logger.info(f"Record {i+1}: {s}")

    if not valid_students_data:
        return {
            "message": "Import Complete",
            "added": 0,
            "skipped_duplicates": 0,
            "errors": errors
        }
        
    t_lookup = time.time()
    all_rolls = [s["roll_number"] for s in valid_students_data]
    
    # 4. Print/log the register number used for duplicate checking
    logger.info("First 10 register numbers used for duplicate checking:")
    logger.info(str(all_rolls[:10]))
    
    existing_students = db.query(models.Student).filter(models.Student.roll_number.in_(all_rolls)).all()
    existing_rolls_map = {s.roll_number: s for s in existing_students}
    
    all_usernames = [s["roll_number"].lower() for s in valid_students_data]
    existing_users = db.query(models.User.username).filter(models.User.username.in_(all_usernames)).all()
    existing_usernames = {u[0] for u in existing_users}
    logger.info(f"Import: Database lookup: {time.time() - t_lookup:.2f}s")
    
    t_insert = time.time()
    
    logger.info(f"Existing register numbers found in students table: {len(existing_rolls_map)}")
    logger.info(f"Existing usernames found in users table: {len(existing_usernames)}")
    
    # 1. Filter out duplicates and handle existing students moving to this list
    new_students_data = []
    for s_data in valid_students_data:
        roll = s_data["roll_number"]
        if roll in existing_rolls_map:
            student_obj = existing_rolls_map[roll]
            # Consider Student List correctly
            if student_obj.student_list_id != student_list_id:
                student_obj.student_list_id = student_list_id
                added += 1
            else:
                skipped_duplicates += 1
            continue
            
        if roll.lower() in existing_usernames:
            skipped_duplicates += 1
            continue
            
        new_students_data.append(s_data)
        
    logger.info(f"New students to insert: {len(new_students_data)}")
    logger.info(f"Duplicates skipped: {skipped_duplicates}")
    logger.info(f"Existing students moved to this list: {added}")
        
    t_hash_start = time.time()
    
    import concurrent.futures

    users_to_insert = []
    if new_students_data:
        # Precompute hashes in parallel since bcrypt is slow and releases GIL
        def compute_user(s_data):
            username = s_data["roll_number"].lower()
            password = username
            hashed = get_password_hash(password)
            return models.User(username=username, password_hash=hashed, role=models.RoleEnum.STUDENT), s_data
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            users_to_insert = list(executor.map(compute_user, new_students_data))
            
    logger.info(f"Import: Password Hashing & User Object Creation: {time.time() - t_hash_start:.2f}s")
    
    t_db_insert = time.time()
    if users_to_insert:
        batch_size = 500
        for i in range(0, len(users_to_insert), batch_size):
            batch = users_to_insert[i:i+batch_size]
            batch_users = [u[0] for u in batch]
            db.add_all(batch_users)
            try:
                db.flush()
            except Exception as e:
                db.rollback()
                errors.append(f"Database error during user batch insertion: {str(e)}")
                continue
                
            batch_students = []
            for user, s_data in batch:
                student = models.Student(
                    user_id=user.id,
                    name=s_data["name"],
                    roll_number=s_data["roll_number"],
                    department=s_data["department"],
                    year=s_data["year"],
                    email=s_data["email"],
                    class_section=s_data["class_section"],
                    student_list_id=student_list_id
                )
                batch_students.append(student)
                
            db.add_all(batch_students)
            added += len(batch)
            
    logger.info(f"Import: DB Insert & Flush: {time.time() - t_db_insert:.2f}s")
    
    t_commit = time.time()
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errors.append(f"Database error during commit: {str(e)}")
        added = 0
    logger.info(f"Import: Commit: {time.time() - t_commit:.2f}s")
    
    logger.info(f"Import: Total import: {time.time() - start_time:.2f}s")
    
    return {
        "success": True,
        "message": "Import Complete",
        "added": added,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors
    }
