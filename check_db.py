import sqlite3

conn = sqlite3.connect('test.db')
cur = conn.cursor()

# 테이블 목록 조회
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("테이블 목록:", [t[0] for t in tables])

# users 테이블 구조 확인
if tables:
    for table in tables:
        print(f"\n{table[0]} 테이블 구조:")
        cur.execute(f"PRAGMA table_info({table[0]})")
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[1]} - {col[2]}")

conn.close()
