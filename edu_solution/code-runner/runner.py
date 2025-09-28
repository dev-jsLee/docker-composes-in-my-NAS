import asyncio
import subprocess
import tempfile
import os
import time
import signal
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="Python Code Runner",
    description="안전한 파이썬 코드 실행 서비스",
    version="1.0.0"
)

class CodeRequest(BaseModel):
    code: str
    timeout: int = 30

class CodeResponse(BaseModel):
    success: bool
    output: str
    error: str = None
    execution_time: float

@app.get("/")
async def root():
    return {
        "message": "Python Code Runner Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "code-runner"}

@app.post("/execute", response_model=CodeResponse)
async def execute_code(request: CodeRequest):
    """
    파이썬 코드를 안전하게 실행합니다.
    """
    try:
        start_time = time.time()
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(request.code)
            temp_file = f.name
        
        try:
            # 코드 실행 (제한된 환경에서)
            result = subprocess.run(
                ['python', temp_file],
                capture_output=True,
                text=True,
                timeout=request.timeout,
                cwd='/tmp/execution'
            )
            
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return CodeResponse(
                    success=True,
                    output=result.stdout,
                    error=result.stderr if result.stderr else None,
                    execution_time=execution_time
                )
            else:
                return CodeResponse(
                    success=False,
                    output=result.stdout,
                    error=result.stderr,
                    execution_time=execution_time
                )
                
        except subprocess.TimeoutExpired:
            return CodeResponse(
                success=False,
                output="",
                error=f"코드 실행이 시간 초과되었습니다 ({request.timeout}초)",
                execution_time=request.timeout
            )
        
        finally:
            # 임시 파일 정리
            try:
                os.unlink(temp_file)
            except:
                pass
                
    except Exception as e:
        return CodeResponse(
            success=False,
            output="",
            error=f"코드 실행 중 오류가 발생했습니다: {str(e)}",
            execution_time=0
        )

# 보안을 위한 제한된 실행 환경 설정
def setup_restricted_environment():
    """
    코드 실행을 위한 제한된 환경을 설정합니다.
    """
    # 실행 디렉토리 확인 및 생성
    exec_dir = '/tmp/execution'
    if not os.path.exists(exec_dir):
        os.makedirs(exec_dir, mode=0o755)
    
    # 환경 변수 제한
    restricted_env = {
        'PATH': '/usr/local/bin:/usr/bin:/bin',
        'PYTHONPATH': '',
        'HOME': exec_dir,
        'TMPDIR': exec_dir
    }
    
    for key, value in restricted_env.items():
        os.environ[key] = value

if __name__ == "__main__":
    # 제한된 환경 설정
    setup_restricted_environment()
    
    # 서버 시작
    uvicorn.run(
        "runner:app",
        host="0.0.0.0",
        port=8080,
        reload=False  # 프로덕션에서는 reload 비활성화
    )
