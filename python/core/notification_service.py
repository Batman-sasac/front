from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from database import get_db

def check_and_send_notifications():
    now = datetime.now()
    current_time = now.strftime("%H:%M") # "07:30" 형식

    conn = get_db()
    cur = conn.cursor()
    try:
        # users 테이블에서 직접 알림 설정 확인
        cur.execute("""
            SELECT fcm_token, email 
            FROM users 
            WHERE is_notify = 1
            AND strftime('%H:%M', remind_time) = ?
        """, (current_time,))
        
        targets = cur.fetchall()
        if targets:
            print("\n" + "🔔" * 20)
            print(f"⏰ [알림 발생 시각: {current_time}]")
            for email, r_time in targets:
                print(f"👉 대상 유저: {email} | 설정 시간: {r_time}")
                print(f"💬 메시지: {email}님, 설정하신 복습 시간입니다! 공부를 시작하세요.")
            print("🔔" * 20 + "\n")
        for token, email in targets:
            if token:
                # 여기에 실제 앱 푸시 발송 로직 (FCM 등) 연동
                print(f"🔔 [알림 발송] {email}님, 복습할 시간입니다!")
    finally:
        cur.close()
        conn.close()

scheduler = BackgroundScheduler()
scheduler.add_job(check_and_send_notifications, 'interval', minutes=1)