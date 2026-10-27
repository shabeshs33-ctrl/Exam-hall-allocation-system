import pymysql

passwords = ["", "root", "password", "admin", "123456", "mysql"]
found = False

for p in passwords:
    try:
        conn = pymysql.connect(host='localhost', user='root', password=p)
        print(f"SUCCESS with password: '{p}'")
        found = True
        break
    except pymysql.err.OperationalError as e:
        print(f"FAILED with password '{p}': {e}")
    except Exception as e:
        print(f"ERROR: {e}")

if not found:
    print("Could not find the root password.")
