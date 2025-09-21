# Node.js 기반 Homepage 서비스 Dockerfile
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# 기본 환경변수 설정 (docker-compose에서 오버라이드 가능)
ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV SESSION_SECRET=your-super-secret-session-key-change-this
ENV CORS_ORIGIN=http://localhost

# 애플리케이션 코드 복사
COPY . .

# 비root 사용자 생성 및 권한 설정
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# 애플리케이션 실행
CMD ["npm", "start"]
