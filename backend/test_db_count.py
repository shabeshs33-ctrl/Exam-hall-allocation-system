import pymysql
import os
try:
    conn = pymysql.connect(host='localhost', user='root', password=os.environ.get("DB_PASS", "Shabesh2008"), db='exam_hall_db')
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM students")
    print("MySQL total students:", c.fetchone()[0])
except Exception as e:
    print("MySQL error:", e)
