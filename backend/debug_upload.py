from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from models import RoleEnum
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

# Create an admin user if not exists
db = SessionLocal()
admin = db.query(models.User).filter(models.User.username == "admin").first()
if not admin:
    admin = models.User(username="admin", password_hash="admin", role=RoleEnum.ADMIN)
    db.add(admin)
    db.commit()

token = create_access_token({"sub": "admin", "role": "ADMIN"})

client = TestClient(app)

csv_content = """Name,Roll Number,Department,Year,Email
Arun,23CS001,CSE,3,arun@gmail.com
Bala,23CS002,CSE,3,bala@gmail.com
Kumar,23CS003,IT,2,kumar@gmail.com
"""

with open("test.csv", "w") as f:
    f.write(csv_content)

with open("test.csv", "rb") as f:
    response = client.post(
        "/admin/students/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.csv", f, "text/csv")}
    )

print(response.status_code)
print(response.json())
