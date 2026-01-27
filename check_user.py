import sqlite3

conn = sqlite3.connect('test.db')
cur = conn.cursor()

cur.execute('SELECT id, email, nickname, social_id FROM users')
users = cur.fetchall()

print(f'\nDB 사용자: {len(users)}명')
for u in users:
    print(f'  ID: {u[0]}')
    print(f'  Email: [{u[1]}]')
    print(f'  Nickname: [{u[2]}]')
    print(f'  Social ID: [{u[3]}]')
    print()

conn.close()
