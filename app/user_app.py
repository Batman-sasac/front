import os
import requests
import psycopg2
from fastapi import APIRouter, Response, Cookie, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from typing import Optional
from dotenv import load_dotenv
from database import get_db
import jwt
from datetime import datetime, timedelta

load_dotenv()
app = APIRouter(prefix="/auth", tags=["Auth"])

@app.get("/kakao/callback")
async def kakao_callback(code: str):
    # 1. 인가 코드로 Access Token 받기
    token_url = "https://kauth.kakao.com/oauth/token"
    token_data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("KAKAO_REST_API_KEY"),
        "redirect_uri": "http://127.0.0.1:8000/auth/kakao/callback",
        "code": code,
    }
    
    # Client Secret이 있는 경우에만 추가
    client_secret = os.getenv("KAKAO_CLIENT_SECRET")
    if client_secret:
        token_data["client_secret"] = client_secret
    
    # [중요] 토큰 요청 시 에러가 없는지 먼저 확인해야 합니다.
    token_res = requests.post(token_url, data=token_data).json()
    access_token = token_res.get("access_token")

    if not access_token:
        print("토큰 발급 실패:", token_res)
        return {"error": "토큰을 받아오지 못했습니다.", "details": token_res}
    

    # 2. Access Token으로 사용자 정보 가져오기 (중요: user_info_res 정의)
    user_info_res = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    print(f"사용자 데이터: {user_info_res}")

    # 데이터 추출
    social_id = str(user_info_res.get("id"))
    kakao_account = user_info_res.get("kakao_account", {})
    user_email = kakao_account.get("email", "")
    
    # 이메일이 없으면 social_id를 이메일로 사용
    if not user_email:
        user_email = f"kakao_{social_id}@social.local"

    conn = get_db()
    cur = conn.cursor()
    try:
        # 3. DB에서 유저 확인 (social_id 기준)
        cur.execute("SELECT nickname FROM users WHERE social_id = ?", (social_id,))
        user_row = cur.fetchone()

        if user_row is None:
            # [신규 유저] 자동으로 임시 닉네임 생성
            temp_nickname = f"사용자{social_id[-6:]}"
            cur.execute("""
                INSERT INTO users (social_id, email, nickname) 
                VALUES (?, ?, ?)
            """, (social_id, user_email, temp_nickname))
            conn.commit()
            
            # 바로 로그인 처리
            res = RedirectResponse(url="/index", status_code=303)
            res.set_cookie(key="user_email", value=user_email, httponly=True, path="/")
            return res

        elif not user_row[0]:
            # [닉네임 미설정 유저] 자동으로 임시 닉네임 생성
            temp_nickname = f"사용자{social_id[-6:]}"
            cur.execute("UPDATE users SET nickname = ? WHERE social_id = ?", (temp_nickname, social_id))
            conn.commit()
            
            res = RedirectResponse(url="/index", status_code=303)
            res.set_cookie(key="user_email", value=user_email, httponly=True, path="/")
            return res

        else:
            # [정상 유저] 로그인 완료 및 쿠키 발급
            res = RedirectResponse(url="/index", status_code=303)
            res.set_cookie(key="user_email", value=user_email, httponly=True, path="/")
            return res

    except Exception as e:
        print(f"로그인 처리 중 오류: {e}")
        return {"error": "Internal Server Error"}
    finally:
        cur.close()
        conn.close()

@app.get("/nickName", response_class=HTMLResponse)
async def nickname_page(email: str):
    # 이메일 값이 잘 들어오는지 확인
    print(f"닉네임 설정 페이지 진입 - Email: {email}")
    
    with open("templates/nickName.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/set-nickname")
async def set_nickname(email: str = Form(...), nickname: str = Form(...)):
    conn = get_db()
    cur = conn.cursor()
    try:
        # 이메일을 기준으로 닉네임 업데이트
        cur.execute("UPDATE users SET nickname = ? WHERE email = ?", (nickname, email))
        conn.commit()
        
        # 업데이트 후 로그인 쿠키 발급하며 메인 이동
        res = RedirectResponse(url="/index", status_code=303)
        res.set_cookie(key="user_email", value=email, httponly=True, path="/")
        return res
    finally:
        cur.close()
        conn.close()


# ==================== 모바일 앱용 엔드포인트 ====================

def create_jwt_token(email: str, social_id: str) -> str:
    """JWT 토큰 생성 (모바일 앱용)"""
    secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    payload = {
        "email": email,
        "social_id": social_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


@app.get("/kakao/mobile")
@app.post("/kakao/mobile")
async def kakao_login_mobile(code: str = None, request: Request = None):
    """모바일 앱에서 카카오 인가 코드를 받아 JWT 토큰 반환"""
    # GET 요청인 경우 쿼리 파라미터에서, POST인 경우 Form에서 code 가져오기
    if request.method == "GET":
        code = request.query_params.get("code")
    elif request.method == "POST":
        form_data = await request.form()
        code = form_data.get("code")
    
    if not code:
        # GET 요청이고 웹 브라우저에서 온 경우 (Accept: text/html)
        if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
            return HTMLResponse("""
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><title>로그인 중...</title></head>
                <body>
                    <p>로그인 처리 중 오류가 발생했습니다.</p>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({type: 'oauth-error', error: '인가 코드가 없습니다'}, '*');
                            window.close();
                        }
                    </script>
                </body>
                </html>
            """)
        return JSONResponse(
            status_code=400,
            content={"error": "인가 코드가 없습니다"}
        )
    
    # 기존 웹 로직과 동일하게 처리하되, JSONResponse 반환
    token_url = "https://kauth.kakao.com/oauth/token"
    token_data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("KAKAO_REST_API_KEY"),
        "redirect_uri": "http://127.0.0.1:8000/auth/kakao/mobile",
        "code": code,
    }
    
    # Client Secret이 있는 경우에만 추가 (카카오는 선택사항)
    client_secret = os.getenv("KAKAO_CLIENT_SECRET")
    if client_secret:
        token_data["client_secret"] = client_secret
    
    token_res = requests.post(token_url, data=token_data).json()
    access_token = token_res.get("access_token")

    if not access_token:
        # GET 요청이고 웹 브라우저에서 온 경우
        if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
            return HTMLResponse("""
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><title>로그인 중...</title></head>
                <body>
                    <p>토큰 발급에 실패했습니다.</p>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({type: 'oauth-error', error: '토큰 발급 실패'}, '*');
                            window.close();
                        }
                    </script>
                </body>
                </html>
            """)
        return JSONResponse(
            status_code=400,
            content={"error": "토큰 발급 실패", "details": token_res}
        )

    user_info_res = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    social_id = str(user_info_res.get("id"))
    kakao_account = user_info_res.get("kakao_account", {})
    user_email = kakao_account.get("email", "")
    
    # 이메일이 없으면 social_id를 이메일로 사용
    if not user_email:
        user_email = f"kakao_{social_id}@social.local"

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT nickname FROM users WHERE social_id = ?", (social_id,))
        user_row = cur.fetchone()

        if user_row is None:
            # 신규 유저 - 닉네임 없이 등록
            cur.execute("""
                INSERT INTO users (social_id, email, nickname) 
                VALUES (?, ?, NULL)
            """, (social_id, user_email))
            conn.commit()
            
            # 닉네임 설정 필요
            result = {
                "status": "nickname_required",
                "email": user_email,
                "social_id": social_id,
                "message": "닉네임 설정이 필요합니다"
            }
            
            # GET 요청이고 웹 브라우저에서 온 경우 HTML 반환
            if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
                import json
                result_json = json.dumps(result)
                return HTMLResponse(f"""
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="UTF-8"><title>닉네임 설정 필요</title></head>
                    <body>
                        <p>로그인 중...</p>
                        <script>
                            const result = {result_json};
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'oauth-success',
                                    data: result
                                }}, '*');
                                window.close();
                            }}
                        </script>
                    </body>
                    </html>
                """)
            
            return JSONResponse(content=result)

        elif not user_row[0]:
            # 닉네임이 NULL인 경우 - 닉네임 설정 필요
            result = {
                "status": "nickname_required",
                "email": user_email,
                "social_id": social_id,
                "message": "닉네임 설정이 필요합니다"
            }
            
            # GET 요청이고 웹 브라우저에서 온 경우 HTML 반환
            if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
                import json
                result_json = json.dumps(result)
                return HTMLResponse(f"""
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="UTF-8"><title>닉네임 설정 필요</title></head>
                    <body>
                        <p>로그인 중...</p>
                        <script>
                            const result = {result_json};
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'oauth-success',
                                    data: result
                                }}, '*');
                                window.close();
                            }}
                        </script>
                    </body>
                    </html>
                """)
            
            return JSONResponse(content=result)

        else:
            # 정상 유저 - JWT 토큰 발급
            token = create_jwt_token(user_email, social_id)
            result = {
                "status": "success",
                "token": token,
                "email": user_email,
                "nickname": user_row[0],
                "message": "로그인 성공"
            }
            
            # GET 요청이고 웹 브라우저에서 온 경우 HTML 반환
            if request.method == "GET" and "text/html" in request.headers.get("accept", ""):
                import json
                result_json = json.dumps(result)
                return HTMLResponse(f"""
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="UTF-8"><title>로그인 성공</title></head>
                    <body>
                        <p>로그인 중...</p>
                        <script>
                            const result = {result_json};
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'oauth-success',
                                    data: result
                                }}, '*');
                                window.close();
                            }}
                        </script>
                    </body>
                    </html>
                """)
            
            return JSONResponse(content=result)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cur.close()
        conn.close()


@app.get("/naver/mobile")
@app.post("/naver/mobile")
async def naver_login_mobile(code: str = None, request: Request = None):
    """모바일 앱에서 네이버 인가 코드를 받아 JWT 토큰 반환"""
    # GET 요청인 경우 쿼리 파라미터에서, POST인 경우 Form에서 code 가져오기
    if request.method == "GET":
        code = request.query_params.get("code")
    elif request.method == "POST":
        form_data = await request.form()
        code = form_data.get("code")
    
    if not code:
        return JSONResponse(
            status_code=400,
            content={"error": "인가 코드가 없습니다"}
        )
    
    token_url = "https://nid.naver.com/oauth2.0/token"
    token_data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("NAVER_CLIENT_ID"),
        "client_secret": os.getenv("NAVER_CLIENT_SECRET"),
        "redirect_uri": "http://127.0.0.1:8000/auth/naver/mobile",
        "code": code,
    }
    
    token_res = requests.post(token_url, data=token_data).json()
    access_token = token_res.get("access_token")

    if not access_token:
        return JSONResponse(
            status_code=400,
            content={"error": "토큰 발급 실패", "details": token_res}
        )

    user_info_res = requests.get(
        "https://openapi.naver.com/v1/nid/me",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    response_data = user_info_res.get("response", {})
    social_id = response_data.get("id")
    user_email = response_data.get("email", "")
    
    # 이메일이 없으면 social_id를 이메일로 사용
    if not user_email:
        user_email = f"naver_{social_id}@social.local"

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT nickname FROM users WHERE social_id = ?", (social_id,))
        user_row = cur.fetchone()

        if user_row is None:
            # 신규 유저 - 닉네임 없이 등록
            cur.execute("""
                INSERT INTO users (social_id, email, nickname) 
                VALUES (?, ?, NULL)
            """, (social_id, user_email))
            conn.commit()
            
            # 닉네임 설정 필요
            return JSONResponse(content={
                "status": "nickname_required",
                "email": user_email,
                "social_id": social_id,
                "message": "닉네임 설정이 필요합니다"
            })

        elif not user_row[0]:
            # 닉네임이 NULL인 경우 - 닉네임 설정 필요
            return JSONResponse(content={
                "status": "nickname_required",
                "email": user_email,
                "social_id": social_id,
                "message": "닉네임 설정이 필요합니다"
            })

        else:
            token = create_jwt_token(user_email, social_id)
            return JSONResponse(content={
                "status": "success",
                "token": token,
                "email": user_email,
                "nickname": user_row[0],
                "message": "로그인 성공"
            })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cur.close()
        conn.close()


@app.post("/auth/set-nickname-mobile")
async def set_nickname_mobile(email: str = Form(...), nickname: str = Form(...)):
    """모바일 앱에서 닉네임 설정 후 JWT 토큰 반환"""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET nickname = ? WHERE email = ?", (nickname, email))
        conn.commit()
        
        # social_id 조회하여 JWT 토큰 발급
        cur.execute("SELECT social_id FROM users WHERE email = ?", (email,))
        social_id_row = cur.fetchone()
        
        if social_id_row:
            token = create_jwt_token(email, social_id_row[0])
            return JSONResponse(content={
                "status": "success",
                "token": token,
                "email": email,
                "nickname": nickname,
                "message": "닉네임 설정 완료"
            })
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "사용자를 찾을 수 없습니다"}
            )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cur.close()
        conn.close()


@app.post("/verify-token")
async def verify_token(token: str = Form(...)):
    """JWT 토큰 검증"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        
        return JSONResponse(content={
            "status": "valid",
            "email": payload.get("email"),
            "social_id": payload.get("social_id")
        })
    except jwt.ExpiredSignatureError:
        return JSONResponse(status_code=401, content={"error": "토큰이 만료되었습니다"})
    except jwt.InvalidTokenError:
        return JSONResponse(status_code=401, content={"error": "유효하지 않은 토큰입니다"})


@app.get("/auth/user-info")
async def get_user_info(token: str):
    """토큰으로 사용자 정보 조회 (계정 연결 상태 포함)"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        user_email = payload.get("email")
        user_social_id = payload.get("social_id")
        
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT email, nickname, kakao_id, naver_id 
                FROM users WHERE email = ?
            """, (user_email,))
            user_row = cur.fetchone()
            
            if user_row:
                # 현재 로그인한 계정 확인 (email 패턴 기준)
                kakao_email = None
                naver_email = None
                
                # 이메일에 kakao가 포함되어 있으면 카카오 계정
                if user_email and 'kakao' in user_email:
                    kakao_email = user_email
                # 이메일에 naver가 포함되어 있으면 네이버 계정
                elif user_email and 'naver' in user_email:
                    naver_email = user_email
                
                return JSONResponse(content={
                    "status": "success",
                    "email": user_row[0],
                    "nickname": user_row[1],
                    "kakao_connected": kakao_email is not None or user_row[2] is not None,
                    "naver_connected": naver_email is not None or user_row[3] is not None,
                    "kakao_email": kakao_email or user_row[2],
                    "naver_email": naver_email or user_row[3]
                })
            else:
                return JSONResponse(status_code=404, content={"error": "사용자를 찾을 수 없습니다"})
        finally:
            cur.close()
            conn.close()
    except:
        return JSONResponse(status_code=401, content={"error": "유효하지 않은 토큰입니다"})


@app.post("/connect-account")
async def connect_account(
    token: str = Form(...),
    provider: str = Form(...),
    code: str = Form(...)
):
    """기존 계정에 소셜 계정 연동"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        email = payload.get("email")
        
        # 소셜 로그인으로 social_id 가져오기
        if provider == "kakao":
            token_url = "https://kauth.kakao.com/oauth/token"
            token_data = {
                "grant_type": "authorization_code",
                "client_id": os.getenv("KAKAO_REST_API_KEY"),
                "client_secret": os.getenv("KAKAO_CLIENT_SECRET"),
                "redirect_uri": "http://127.0.0.1:8000/auth/kakao/mobile",
                "code": code,
            }
            token_res = requests.post(token_url, data=token_data).json()
            access_token = token_res.get("access_token")
            
            if not access_token:
                return JSONResponse(status_code=400, content={"error": "카카오 토큰 발급 실패"})
            
            user_info_res = requests.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"}
            ).json()
            
            social_id = str(user_info_res.get("id"))
            social_email = user_info_res.get("kakao_account", {}).get("email", "")
            
        elif provider == "naver":
            token_url = "https://nid.naver.com/oauth2.0/token"
            token_data = {
                "grant_type": "authorization_code",
                "client_id": os.getenv("NAVER_CLIENT_ID"),
                "client_secret": os.getenv("NAVER_CLIENT_SECRET"),
                "redirect_uri": "http://127.0.0.1:8000/auth/naver/mobile",
                "code": code,
            }
            token_res = requests.post(token_url, data=token_data).json()
            access_token = token_res.get("access_token")
            
            if not access_token:
                return JSONResponse(status_code=400, content={"error": "네이버 토큰 발급 실패"})
            
            user_info_res = requests.get(
                "https://openapi.naver.com/v1/nid/me",
                headers={"Authorization": f"Bearer {access_token}"}
            ).json()
            
            response_data = user_info_res.get("response", {})
            social_id = response_data.get("id")
            social_email = response_data.get("email", "")
        else:
            return JSONResponse(status_code=400, content={"error": "지원하지 않는 제공자입니다"})
        
        # DB 업데이트
        conn = get_db()
        cur = conn.cursor()
        try:
            if provider == "kakao":
                cur.execute(
                    "UPDATE users SET kakao_id = ? WHERE email = ?",
                    (social_email, email)
                )
            else:
                cur.execute(
                    "UPDATE users SET naver_id = ? WHERE email = ?",
                    (social_email, email)
                )
            conn.commit()
            
            return JSONResponse(content={
                "status": "success",
                "message": f"{provider} 계정이 연결되었습니다",
                "connected_email": social_email
            })
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/disconnect-account")
async def disconnect_account(
    token: str = Form(...),
    provider: str = Form(...)
):
    """소셜 계정 연동 해제"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        email = payload.get("email")
        
        conn = get_db()
        cur = conn.cursor()
        try:
            # 연결된 계정 수 확인
            cur.execute("""
                SELECT kakao_id, naver_id FROM users WHERE email = ?
            """, (email,))
            user_row = cur.fetchone()
            
            if not user_row:
                return JSONResponse(status_code=404, content={"error": "사용자를 찾을 수 없습니다"})
            
            connected_count = sum([1 for x in user_row if x is not None])
            
            if connected_count <= 1:
                return JSONResponse(
                    status_code=400,
                    content={"error": "최소 1개의 계정 연결이 필요합니다"}
                )
            
            # 연동 해제
            if provider == "kakao":
                cur.execute("UPDATE users SET kakao_id = NULL WHERE email = ?", (email,))
            elif provider == "naver":
                cur.execute("UPDATE users SET naver_id = NULL WHERE email = ?", (email,))
            else:
                return JSONResponse(status_code=400, content={"error": "지원하지 않는 제공자입니다"})
            
            conn.commit()
            
            return JSONResponse(content={
                "status": "success",
                "message": f"{provider} 계정 연동이 해제되었습니다"
            })
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/withdraw")
async def withdraw_account(token: str = Form(...)):
    """회원 탈퇴"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        email = payload.get("email")
        
        conn = get_db()
        cur = conn.cursor()
        try:
            # 사용자 삭제 (CASCADE로 관련 데이터도 삭제됨)
            cur.execute("DELETE FROM users WHERE email = ?", (email,))
            conn.commit()
            
            return JSONResponse(content={
                "status": "success",
                "message": "회원 탈퇴가 완료되었습니다"
            })
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/logout")
async def logout():
    """로그아웃 (클라이언트에서 토큰 삭제 처리)"""
    return JSONResponse(content={
        "status": "success",
        "message": "로그아웃되었습니다"
    })


@app.post("/update-nickname")
async def update_nickname(token: str = Form(...), nickname: str = Form(...)):
    """닉네임 변경"""
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        email = payload.get("email")
        
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute("UPDATE users SET nickname = ? WHERE email = ?", (nickname, email))
            conn.commit()
            
            return JSONResponse(content={
                "status": "success",
                "message": "닉네임이 변경되었습니다"
            })
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})