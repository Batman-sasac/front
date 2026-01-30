import os
import jwt
from datetime import datetime, timedelta

def create_jwt_token(email: str, social_id: str) -> str:
    secret_key = os.getenv("JWT_SECRET_KEY", "default_secret")
    payload = {
        "email": email,
        "social_id": social_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    """JWT 토큰 검증 및 payload 반환"""
    secret_key = os.getenv("JWT_SECRET_KEY", "default_secret")
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        raise Exception("유효하지 않은 토큰입니다")