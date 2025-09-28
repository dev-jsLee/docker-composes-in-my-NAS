# Python 3.11 기반 이미지 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# DNS 설정 및 네트워크 최적화
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf

# 시스템 패키지 업데이트 및 필요한 패키지 설치 (재시도 로직 포함)
RUN for i in 1 2 3; do \
        apt-get update && \
        apt-get install -y gcc build-essential && \
        rm -rf /var/lib/apt/lists/* && \
        break || sleep 10; \
    done

# requirements.txt 복사 및 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# FastAPI 서버 실행
EXPOSE 8000

# 개발 모드로 실행 (자동 리로드)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
