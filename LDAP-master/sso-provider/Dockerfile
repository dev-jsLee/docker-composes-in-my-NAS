# Node.js 18 Alpine 기반 이미지
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apk update && apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    && rm -rf /var/cache/apk/*

# dumb-init을 엔트리포인트로 설정
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 의존성 파일 복사
COPY package*.json ./

# 프로덕션 의존성 설치
RUN npm ci --only=production && npm cache clean --force

# 소스 코드 복사
COPY --chown=nodejs:nodejs . .

# 사용자 전환
USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 애플리케이션 시작
CMD ["node", "src/server.js"]
