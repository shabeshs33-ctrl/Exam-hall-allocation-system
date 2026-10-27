import pymysql
import os
try:
    conn = pymysql.connect(host='localhost', user='root', password=os.environ.get("DB_PASS", "Shabesh2008"), db='exam_hall_db')
    c = conn.cursor()
    c.execute("SELECT id, department, year, batch, section FROM student_lists")
    print("Student Lists:", c.fetchall())
except Exception as e:
    print("MySQL error:", e)
