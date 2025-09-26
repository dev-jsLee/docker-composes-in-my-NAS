# Node.js 18 Alpine 기반 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 네트워크 문제 우회 - 필수 패키지만 설치
RUN apk add --no-cache dumb-init curl 2>/dev/null || echo "패키지 설치 건너뜀"

# dumb-init이 설치되었다면 사용, 아니면 기본 실행
# ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 사용자 생성 (root 권한 사용 지양)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 의존성 파일 복사 (캐싱을 위해 별도 단계)
COPY package*.json ./

# 프로덕션 의존성 설치
RUN npm ci --only=production && npm cache clean --force

# 소스 코드 복사 (권한 설정)
COPY --chown=nodejs:nodejs src/ ./src/

# 사용자 전환
USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스체크 (curl이 없을 수 있으므로 간단한 방법 사용)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# 애플리케이션 시작
CMD ["node", "src/server.js"]
