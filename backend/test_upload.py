import requests

BASE_URL = "http://localhost:8000"

print("1. Logging in as Admin...")
resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin123"})
if resp.status_code != 200:
    print("Admin login failed:", resp.text)
    exit(1)
admin_token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {admin_token}"}
print("Admin login successful.")

print("2. Uploading CSV...")
with open("test.csv", "rb") as f:
    files = {"file": ("test.csv", f, "text/csv")}
    resp = requests.post(f"{BASE_URL}/admin/students/upload", files=files, headers=headers)

print("Response status:", resp.status_code)
print("Response text:", resp.text)
