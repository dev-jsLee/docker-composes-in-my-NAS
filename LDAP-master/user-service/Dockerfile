# Node.js 18 Alpine 기반 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저를 위한 apk 업데이트 및 필수 패키지 설치
RUN apk update && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# dumb-init을 엔트리포인트로 설정 (좀비 프로세스 방지)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 사용자 생성 (root 권한 사용 지양)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 의존성 파일 복사 (캐싱을 위해 별도 단계)
COPY package*.json ./

# 프로덕션 의존성 설치
RUN npm ci --only=production && npm cache clean --force

# 소스 코드 복사 (권한 설정)
COPY --chown=nodejs:nodejs src/ ./src/

# 헬스체크를 위한 curl 설치
RUN apk add --no-cache curl

# 사용자 전환
USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 애플리케이션 시작
CMD ["node", "src/server.js"]
