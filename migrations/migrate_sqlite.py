"""
SQLite DB 마이그레이션 스크립트
소셜 계정 연동을 위한 컬럼 추가
"""
import sqlite3
import os

def migrate():
    # 데이터베이스 파일 경로
    db_path = os.path.join(os.path.dirname(__file__), '..', 'test.db')
    
    print(f"📁 DB 경로: {db_path}")
    
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # users 테이블이 없으면 생성
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                social_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                nickname VARCHAR(50),
                kakao_id VARCHAR(255) DEFAULT NULL,
                naver_id VARCHAR(255) DEFAULT NULL,
                points INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ users 테이블 생성/확인 완료")
        
        # 기존 테이블에 kakao_id 컬럼 추가 (이미 있으면 무시)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN kakao_id VARCHAR(255) DEFAULT NULL")
            print("✅ kakao_id 컬럼 추가")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("ℹ️  kakao_id 컬럼이 이미 존재합니다")
            else:
                raise
        
        # 기존 테이블에 naver_id 컬럼 추가 (이미 있으면 무시)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN naver_id VARCHAR(255) DEFAULT NULL")
            print("✅ naver_id 컬럼 추가")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("ℹ️  naver_id 컬럼이 이미 존재합니다")
            else:
                raise
        
        # 인덱스 생성
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_naver_id ON users(naver_id)")
        print("✅ 인덱스 생성 완료")
        
        # 변경사항 커밋
        conn.commit()
        print("\n🎉 마이그레이션 완료!")
        
        # 테이블 구조 확인
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\n📊 users 테이블 구조:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
