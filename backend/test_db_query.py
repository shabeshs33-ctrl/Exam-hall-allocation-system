import sqlite3

try:
    conn = sqlite3.connect("exam_hall.db")
    c = conn.cursor()
    c.execute("SELECT roll_number FROM students LIMIT 10")
    print("SQLite students:", c.fetchall())
except Exception as e:
    print("SQLite error:", e)

import pymysql
import os
try:
    conn = pymysql.connect(host='localhost', user='root', password=os.environ.get("DB_PASS", "Shabesh2008"), db='exam_hall_db')
    c = conn.cursor()
    c.execute("SELECT roll_number FROM students LIMIT 10")
    print("MySQL students:", c.fetchall())
except Exception as e:
    print("MySQL error:", e)
