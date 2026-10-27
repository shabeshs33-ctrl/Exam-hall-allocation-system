import os
from sqlalchemy import create_engine, text
from database import Base
import models

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:Shabesh2008@localhost/exam_hall_db")
engine = create_engine(DATABASE_URL)

def migrate():
    # Create the new table if it doesn't exist
    Base.metadata.create_all(bind=engine, tables=[models.StudentList.__table__])
    
    # Add student_list_id column to students table if it doesn't exist
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN student_list_id INTEGER;"))
            conn.execute(text("ALTER TABLE students ADD CONSTRAINT fk_student_list FOREIGN KEY (student_list_id) REFERENCES student_lists(id) ON DELETE SET NULL;"))
            print("Successfully added student_list_id to students table.")
        except Exception as e:
            if "Duplicate column name" in str(e) or "Duplicate key" in str(e) or "already exists" in str(e).lower():
                print("Column/constraint already exists, skipping.")
            else:
                print("Migration warning:", e)
                
if __name__ == "__main__":
    migrate()
