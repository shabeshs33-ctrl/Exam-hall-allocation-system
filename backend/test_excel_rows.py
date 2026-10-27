import pandas as pd
df = pd.read_excel("test_students.xlsx", nrows=10)
print(df.head(10).to_string())
