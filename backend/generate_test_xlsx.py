import pandas as pd

data = {
    "name": ["Test User 1", "Test User 2", "Test User 3"],
    "roll_number": ["R100", "R101", "R100"],
    "department": ["CS", "IT", "ME"],
    "year": [1, 2, 3],
    "email": ["user1@test.com", "user2@test.com", "user3@test.com"]
}

df = pd.DataFrame(data)
df.to_excel("test_students.xlsx", index=False)
