# Node.js 18 기반 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 개발 서버 실행
EXPOSE 3000

# 개발 모드로 실행
CMD ["npm", "start"]
