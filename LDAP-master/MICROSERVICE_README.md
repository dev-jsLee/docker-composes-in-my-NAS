# 마이크로 서비스 연동 가이드

이 문서는 기존 LDAP-SSO 시스템과 연동되는 마이크로 서비스를 만드는 방법을 설명합니다.

## 📋 개요

### 아키텍처
```
기존 LDAP-SSO 시스템
├── auth-service (포트 3001)
├── sso-provider (포트 3002)
├── redis (포트 6379)
└── postgres (포트 5432)

새로운 마이크로 서비스들
├── user-service (포트 3003)
├── product-service (포트 3004)
├── order-service (포트 3005)
└── nginx-microservices (포트 80/443)
```

### 주요 연결 포인트
1. **OIDC 인증**: `sso-provider`를 통한 중앙 인증
2. **Redis 세션 공유**: 모든 서비스 간 세션 공유
3. **Nginx 라우팅**: API Gateway를 통한 요청 라우팅
4. **서비스 간 통신**: 내부 네트워크를 통한 직접 통신

## 🚀 빠른 시작

### 1. OIDC 클라이언트 등록
```bash
# PostgreSQL에서 클라이언트 등록 실행
psql -h localhost -p 5432 -U sso_user -d sso_db -f scripts/register-oidc-clients.sql
```

### 2. 환경변수 설정
```bash
# 각 서비스 디렉토리에서
cp microservice-templates/your-service.env .env
# .env 파일을 실제 값으로 수정
```

### 3. 서비스 빌드 및 시작
```bash
# Docker 이미지 빌드
docker-compose -f docker-compose.microservices.yml build

# 서비스 시작
docker-compose -f docker-compose.microservices.yml up -d

# 로그 확인
docker-compose -f docker-compose.microservices.yml logs -f
```

## 📁 프로젝트 구조

```
LDAP-master/
├── docker-compose.yml              # 기존 SSO 시스템
├── docker-compose.microservices.yml # 마이크로 서비스 예시
├── nginx/
│   ├── nginx.conf                  # 기존 게이트웨이
│   └── nginx.microservices.conf    # 마이크로 서비스 게이트웨이
├── scripts/
│   └── register-oidc-clients.sql   # OIDC 클라이언트 등록
├── microservice-templates/         # 환경변수 템플릿
│   ├── user-service.env
│   ├── product-service.env
│   └── order-service.env
├── user-service/                   # 사용자 관리 서비스
├── product-service/                # 제품 관리 서비스
└── order-service/                  # 주문 관리 서비스
```

## 🔧 서비스별 설정

### 사용자 관리 서비스 (user-service)
- **포트**: 3003
- **기능**: 사용자 프로필, 그룹 관리, 권한 관리
- **OIDC 클라이언트**: `user-service-client`

### 제품 관리 서비스 (product-service)
- **포트**: 3004
- **기능**: 제품 카탈로그, 재고 관리, 가격 관리
- **OIDC 클라이언트**: `product-service-client`

### 주문 관리 서비스 (order-service)
- **포트**: 3005
- **기능**: 주문 처리, 결제 연동, 배송 관리
- **OIDC 클라이언트**: `order-service-client`

## 🔐 인증 연동 방법

### 1. Node.js 서비스 예시
```javascript
// package.json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "passport": "^0.6.0",
    "passport-openidconnect": "^0.1.1",
    "redis": "^4.6.7"
  }
}
```

### 2. 인증 미들웨어 구현
```javascript
// middleware/auth.js
const session = require('express-session');
const RedisStore = require('connect-redis');
const passport = require('passport');
const OpenIDStrategy = require('passport-openidconnect').Strategy;

const redisClient = require('redis').createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// 세션 설정
const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  name: 'microservice.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
};

// OIDC 전략
passport.use('oidc', new OpenIDStrategy({
  issuer: process.env.OIDC_ISSUER,
  authorizationURL: `${process.env.OIDC_ISSUER}/authorize`,
  tokenURL: `${process.env.OIDC_ISSUER}/token`,
  userInfoURL: `${process.env.OIDC_ISSUER}/userinfo`,
  clientID: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  callbackURL: `${process.env.SERVICE_URL}/auth/callback`,
  scope: ['openid', 'profile', 'email']
}, (issuer, profile, done) => {
  return done(null, profile);
}));

module.exports = { sessionConfig, passport };
```

### 3. 보호된 라우트 예시
```javascript
// routes/protected.js
const express = require('express');
const { passport } = require('../middleware/auth');

const router = express.Router();

// 로그인 필요
router.get('/profile', passport.authenticate('oidc'), (req, res) => {
  res.json({
    user: req.user,
    message: '인증된 사용자만 접근 가능'
  });
});

// 관리자 권한 필요
router.get('/admin', passport.authenticate('oidc'), (req, res) => {
  if (!req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: '관리자 권한 필요' });
  }

  res.json({
    message: '관리자 페이지',
    user: req.user
  });
});

module.exports = router;
```

## 🗄️ 데이터베이스 설정

### PostgreSQL 데이터베이스 생성
```sql
-- 각 서비스별 데이터베이스 생성
CREATE DATABASE user_db;
CREATE DATABASE product_db;
CREATE DATABASE order_db;

-- 사용자 생성 및 권한 부여
CREATE USER user_service WITH PASSWORD 'password';
CREATE USER product_service WITH PASSWORD 'password';
CREATE USER order_service WITH PASSWORD 'password';

GRANT ALL PRIVILEGES ON DATABASE user_db TO user_service;
GRANT ALL PRIVILEGES ON DATABASE product_db TO product_service;
GRANT ALL PRIVILEGES ON DATABASE order_db TO order_service;
```

## 🔀 Nginx 라우팅 설정

### API 경로 구조
```
GET  /api/users/          # 사용자 목록 조회
GET  /api/users/admin/    # 관리자 기능 (인증 필요)
POST /api/products/       # 제품 생성
GET  /api/products/admin/ # 제품 관리 (인증 필요)
POST /api/orders/         # 주문 생성
GET  /api/orders/admin/   # 주문 관리 (인증 필요)
```

### 인증 필요 경로
- `/api/*/admin/*` - 관리자 권한 필요
- `/api/*/private/*` - 로그인 필요
- 기타 공개 경로는 인증 없이 접근 가능

## 🔄 서비스 간 통신

### HTTP 클라이언트 설정
```javascript
// services/apiClient.js
const axios = require('axios');

const apiClient = axios.create({
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Name': process.env.SERVICE_NAME
  }
});

// 다른 서비스 호출 예시
async function getUserInfo(userId) {
  try {
    const response = await apiClient.get(
      `${process.env.USER_SERVICE_URL}/api/users/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error('사용자 서비스 호출 실패:', error.message);
    throw error;
  }
}

module.exports = { apiClient, getUserInfo };
```

## 📊 모니터링 및 로깅

### 통합 로그 형식
```javascript
// middleware/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME,
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

module.exports = logger;
```

### 헬스체크 엔드포인트
```javascript
// routes/health.js
router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME,
    uptime: process.uptime(),
    checks: {
      database: 'ok',    // DB 연결 확인
      redis: 'ok',       // Redis 연결 확인
      oidc: 'ok'         // SSO 서비스 확인
    }
  };

  // 각 의존성 체크
  try {
    // 데이터베이스 연결 확인
    await checkDatabaseConnection();
  } catch (error) {
    healthCheck.checks.database = 'error';
    healthCheck.status = 'degraded';
  }

  const httpStatus = healthCheck.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(healthCheck);
});
```

## 🔒 보안 고려사항

### API 키 및 시크릿 관리
- 각 서비스별로 별도의 클라이언트 시크릿 사용
- 환경변수로 민감한 정보 관리
- 프로덕션에서는 Vault나 Secret Manager 사용 고려

### 서비스 간 인증
```javascript
// middleware/serviceAuth.js
const jwt = require('jsonwebtoken');

const verifyServiceToken = (req, res, next) => {
  const token = req.headers['x-service-token'];
  if (!token) {
    return res.status(401).json({ error: '서비스 토큰 필요' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SERVICE_JWT_SECRET);
    req.serviceInfo = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않은 서비스 토큰' });
  }
};

module.exports = { verifyServiceToken };
```

## 🚀 배포 및 운영

### Docker Compose 확장
```bash
# 모든 서비스 시작
docker-compose -f docker-compose.yml -f docker-compose.microservices.yml up -d

# 특정 서비스만 시작
docker-compose -f docker-compose.microservices.yml up user-service -d

# 서비스 스케일링
docker-compose -f docker-compose.microservices.yml up -d --scale user-service=3
```

### 환경별 설정
```yaml
# docker-compose.override.yml
version: '3.8'

services:
  user-service:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 🔧 문제 해결

### 일반적인 문제

#### 1. OIDC 인증 실패
```bash
# 클라이언트 등록 확인
docker-compose exec postgres psql -U sso_user -d sso_db -c \
  "SELECT client_id, client_name FROM oauth_clients WHERE client_id = 'your-service-client';"

# OIDC 설정 확인
docker-compose logs sso-provider | grep OIDC
```

#### 2. Redis 연결 실패
```bash
# Redis 연결 테스트
docker-compose exec redis redis-cli ping

# Redis 메모리 확인
docker-compose exec redis redis-cli info memory
```

#### 3. Nginx 라우팅 문제
```bash
# Nginx 설정 테스트
docker-compose exec nginx-microservices nginx -t

# Nginx 로그 확인
docker-compose logs nginx-microservices
```

### 디버깅 팁
- 각 서비스의 헬스체크 엔드포인트 확인
- Redis에서 세션 데이터 직접 확인
- Nginx access.log에서 요청 패턴 분석
- 각 서비스의 애플리케이션 로그 확인

## 📚 추가 리소스

- [OpenID Connect 명세](https://openid.net/connect/)
- [Express OIDC 가이드](https://github.com/panva/node-openid-client)
- [Docker Compose 네트워킹](https://docs.docker.com/compose/networking/)
- [Redis 세션 스토어](https://github.com/tj/connect-redis)

이 가이드를 따라 새로운 마이크로 서비스를 구축하면 기존 LDAP-SSO 시스템과 완벽하게 연동되는 서비스를 만들 수 있습니다.
