import sqlite3

conn = sqlite3.connect('test.db')
cur = conn.cursor()

# 모든 사용자 정보 조회
cur.execute("SELECT * FROM users")
users = cur.fetchall()

# 컬럼 이름 가져오기
cur.execute("PRAGMA table_info(users)")
columns = cur.fetchall()
column_names = [col[1] for col in columns]

print("사용자 목록:")
print(f"컬럼: {column_names}")
print("-" * 80)
for user in users:
    print(user)

conn.close()
