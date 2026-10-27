import pymysql
import os
try:
    conn = pymysql.connect(host='localhost', user='root', password=os.environ.get("DB_PASS", "Shabesh2008"), db='exam_hall_db')
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM exams")
    print("Exams found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(DISTINCT department) FROM student_lists")
    print("Departments found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(DISTINCT year) FROM student_lists")
    print("Years found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(DISTINCT batch) FROM student_lists")
    print("Batches found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(DISTINCT section) FROM student_lists")
    print("Sections found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(*) FROM students")
    print("Students found:", c.fetchone()[0])
    
    c.execute("SELECT COUNT(*) FROM halls")
    print("Halls found:", c.fetchone()[0])

except Exception as e:
    print("MySQL error:", e)
