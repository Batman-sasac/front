import sqlite3

conn = sqlite3.connect('test.db')
cur = conn.cursor()

# 사용자 테이블 구조 확인
cur.execute("PRAGMA table_info(users)")
columns = cur.fetchall()
print("users 테이블 구조:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

print("\n사용자 목록:")
cur.execute("SELECT id, email, nickname, social_id FROM users")
users = cur.fetchall()
for user in users:
    print(f"  ID: {user[0]}, Email: {user[1]}, Nickname: {user[2]}, Social ID: {user[3]}")

conn.close()
