import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    """SQLite 데이터베이스 연결"""
    try:
        # SQLite 데이터베이스 파일 경로
        db_path = os.path.join(os.path.dirname(__file__), 'test.db')
        conn = sqlite3.connect(db_path)
        # Row factory 설정 (딕셔너리처럼 사용 가능)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        return None

# PostgreSQL 버전 (주석 처리)
# import psycopg2
# def get_db():
#     try:
#         conn = psycopg2.connect(
#             host=os.getenv("DB_HOST"),
#             database=os.getenv("DB_NAME"),
#             user=os.getenv("DB_USER"),
#             password=os.getenv("DB_PASS")
#         )
#         return conn
#     except Exception as e:
#         print(f"❌ DB 연결 실패: {e}")
#         return None
