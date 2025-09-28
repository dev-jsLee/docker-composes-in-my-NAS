# Python 3.11 기반 이미지 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# DNS 설정 및 네트워크 최적화
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf

# 보안을 위한 사용자 생성
RUN groupadd -r coderunner && useradd -r -g coderunner coderunner

# 시스템 패키지 업데이트 (재시도 로직 포함)
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

# 실행 디렉토리 생성 및 권한 설정
RUN mkdir -p /tmp/execution && chown coderunner:coderunner /tmp/execution

# 포트 노출
EXPOSE 8080

# 보안을 위해 non-root 사용자로 실행
USER coderunner

# 코드 실행 서버 시작
CMD ["python", "runner.py"]
