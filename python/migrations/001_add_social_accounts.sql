-- 소셜 계정 연동을 위한 컬럼 추가
-- 기존 users 테이블에 kakao_id, naver_id 컬럼 추가

ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS naver_id VARCHAR(255) DEFAULT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_naver_id ON users(naver_id);

-- users 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    social_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    kakao_id VARCHAR(255) DEFAULT NULL,
    naver_id VARCHAR(255) DEFAULT NULL,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
