from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# 라우터 임포트 (나중에 구현)
# from app.routers import auth, lessons, practice, users

app = FastAPI(
    title="Python Learning Platform API",
    description="파이썬 학습 플랫폼의 백엔드 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:52040", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기본 라우트
@app.get("/")
async def root():
    return {
        "message": "Python Learning Platform API",
        "version": "1.0.0",
        "status": "running"
    }

# 헬스 체크
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "python-learning-backend"
    }

# API 상태 확인
@app.get("/api/status")
async def api_status():
    return {
        "api": "active",
        "database": "connected",  # 실제로는 DB 연결 상태 확인
        "redis": "connected",     # 실제로는 Redis 연결 상태 확인
        "services": {
            "authentication": "ready",
            "code_execution": "ready",
            "lessons": "ready"
        }
    }

# 임시 코드 실행 엔드포인트 (데모용)
@app.post("/api/execute")
async def execute_code(code_data: dict):
    """
    임시 코드 실행 엔드포인트
    실제로는 code-runner 서비스와 통신해야 함
    """
    code = code_data.get("code", "")
    
    # 간단한 데모 응답
    if "print" in code and "Hello" in code:
        return {
            "success": True,
            "output": "Hello, Python!\n",
            "error": None,
            "execution_time": 0.001
        }
    else:
        return {
            "success": True,
            "output": f"코드가 실행되었습니다:\n{code}\n\n(실제 실행 기능은 code-runner 서비스 연동 후 작동합니다)",
            "error": None,
            "execution_time": 0.001
        }

# 라우터 등록 (나중에 구현)
# app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
# app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
# app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
# app.include_router(users.router, prefix="/api/users", tags=["users"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
