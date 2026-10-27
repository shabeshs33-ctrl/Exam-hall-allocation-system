import json
from services.excel_analyzer import analyze_excel
import os

with open("test_students.xlsx", "rb") as f:
    content = f.read()

res = analyze_excel(content, "test_students.xlsx")
print(json.dumps(res, indent=2))
