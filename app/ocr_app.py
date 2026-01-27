# ocr 및 빈칸/원본 저장

from fastapi import APIRouter, UploadFile, File, Cookie, Form, Body
from pydantic import BaseModel
from typing import List, Optional
import os
# from core.gpt_service import GPTService
from database import get_db  
from core.clova_ocr_service import CLOVAOCRService

app = APIRouter(tags=["OCR"])

# GPT 서비스 초기화
API_KEY = os.getenv("OPENAI_API_KEY")
clova_service = CLOVAOCRService(API_KEY) if API_KEY else None


# JSON 요청을 위한 모델
class QuizSaveRequest(BaseModel):
    subject_name: str
    original: str
    quiz: str
    answers: Optional[List[str]] = []

# 1. OCR 텍스트 추출 엔드포인트 수정
@app.post("/ocr")
async def run_ocr_endpoint(file: UploadFile = File(...)):
    try:
        if not clova_service:
            return {"status": "error", "message": "OCR 서비스가 설정되지 않았습니다. OPENAI_API_KEY를 .env 파일에 설정해주세요."}
        
        file_bytes = await file.read()

        # 1. 네이버 OCR로 텍스트 추출
        result = clova_service.process_file(file_bytes, file.filename)
        
        if result["status"] == "error":
            return result

        # 2. 프론트엔드 JS가 data.keywords를 사용하므로 키 이름을 일치시켜 반환
        return result
    
    except Exception as e:
        print(f"서버 내부 에러: {e}")
        return {"status": "error", "message": str(e)}


# 2. OCR 결과 및 퀴즈 데이터 DB 저장 (JSON 방식) 
@app.post("/ocr/save-test")
async def save_test(data: QuizSaveRequest, user_email: Optional[str] = Cookie(None)):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO ocr_data (user_email, subject_name, study_name, ocr_text, answers) 
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (user_email, data.subject_name, data.study_name, data.original, data.answers))
        new_id = cur.fetchone()[0]
        conn.commit()

        print("\n" + "✅"*10 + " OCR 데이터 저장 성공 " + "✅"*10)
        print(f"ID      : {new_id}")
        print(f"사용자  : {user_email}")
        print(f"과목명  : {data.subject_name}")
        print(f"키워드수: {len(data.answers)}개")
        print(f"🔹 원본 내용 미리보기: {data.original}")
        print("="*45 + "\n")
        

        return {"status": "success", "quiz_id": new_id}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cur.close()
        conn.close()


# 해당 학습 삭제 로직 /ocr/ocr-data/delete/{학습파일 번호}
@app.delete("/ocr/ocr-data/delete/{quiz_id}")
async def delete_ocr_data(quiz_id: int, user_email: str = Cookie(None)):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT image_url FROM ocr_data WHERE id = %s AND user_email = %s",
        (quiz_id, user_email))

        row = cur.fetchone()

        if not row:
            return{"status": "error", "message": "데이터를 찾지 못했습니다"}

        file_path = row[0]
        
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        cur.execute("DELETE FROM ocr_data WHERE id = %s AND user_email = %s", (quiz_id, user_email))
        conn.commit()
        
        print(f"해당 파일 삭제 완료:{quiz_id}")
        return{"status": "success", "message":"삭제 성공했습니다."}

    except Exception as e:
        conn.rollback()
        return{"status": "error", "message": str(e)}
    finally:
        cur.close()
        conn.close()


# 학습 목록 /ocr/list
from fastapi import Query, Cookie

# 학습 목록 /ocr/list
@app.get("/ocr/list")
async def get_ocr_list(
    user_email: str = Cookie(None),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1)
):
    start = (page - 1) * size

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                id,
                study_name,
                subject_name,

                CASE
                    WHEN LENGTH(ocr_text::TEXT) > 50
                        THEN SUBSTRING(ocr_text::TEXT FROM 1 FOR 50) || '...'
                    ELSE ocr_text::TEXT
                END AS ocr_preview,

                CASE
                    WHEN created_at::DATE = CURRENT_DATE THEN '오늘'
                    WHEN created_at >= CURRENT_DATE - INTERVAL '7 days'
                        THEN (CURRENT_DATE - created_at::DATE) || '일 전'
                    ELSE TO_CHAR(created_at::DATE, 'YYYY-MM-DD')
                END AS created_at_display

            FROM public.ocr_data
            WHERE user_email = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (user_email, size, start))

        rows = cur.fetchall()

        result = []
        for row in rows:
            result.append({
                "id": row[0],
                "study_name": row[1],
                "subject_name": row[2],
                "ocr_preview": row[3],
                "created_at": row[4]
            })

        return {
            "page": page,
            "size": size,
            "data": result
        }

    finally:
        cur.close()
        conn.close()




        
