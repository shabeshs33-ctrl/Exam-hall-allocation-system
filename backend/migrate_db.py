from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE students ADD COLUMN class_section VARCHAR(255);"))
        conn.commit()
    print("Migration successful")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print("Error migrating:", e)
