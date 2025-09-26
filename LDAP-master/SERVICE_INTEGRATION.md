# Docker 서비스 인증 통합 가이드

이 문서는 기존 Docker 서비스들을 DSM LDAP 기반 SSO 시스템과 통합하는 방법을 설명합니다.

## 통합 개요

### 인증 플로우
```
1. 사용자 → Docker 서비스 접근
2. Docker 서비스 → 인증 필요 시 SSO Provider로 리다이렉트
3. SSO Provider → DSM LDAP 인증
4. SSO Provider → 토큰 발급
5. Docker 서비스 → 토큰 검증 및 사용자 정보 획득
6. Docker 서비스 → JWT 발급 및 서비스 제공
```

### 통합 방식
1. **OIDC 클라이언트 등록**: 각 서비스를 OIDC 클라이언트로 등록
2. **인증 미들웨어 적용**: 각 서비스에 인증 미들웨어 추가
3. **사용자 정보 매핑**: LDAP 사용자 정보를 서비스에 맞게 변환
4. **권한 기반 접근 제어**: 역할 기반 권한 시스템 구현

## 1. OIDC 클라이언트 등록

### 클라이언트 정보
각 Docker 서비스는 OIDC 클라이언트로 등록되어야 합니다.

```sql
-- PostgreSQL에서 클라이언트 등록
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    redirect_uris,
    scope
) VALUES (
    'your-service-client-id',
    'your-service-client-secret',
    '서비스 이름',
    ARRAY['http://your-service:3000/auth/callback'],
    'openid profile email'
);
```

### 환경변수 설정
각 서비스의 `.env` 파일에 다음 변수들을 추가:

```bash
# OIDC 설정
OIDC_ISSUER=http://sso-provider:3000
OIDC_CLIENT_ID=your-service-client-id
OIDC_CLIENT_SECRET=your-service-client-secret

# 인증 서비스
AUTH_SERVICE_URL=http://auth-service:3000

# 세션 설정
SESSION_SECRET=your-session-secret
REDIS_URL=redis://redis:6379
```

## 2. Node.js 서비스 통합 예시

### 패키지 설치
```bash
npm install express-session passport passport-openidconnect express-jwt jwks-rsa
```

### 인증 미들웨어 구현
```javascript
// middleware/auth.js
const session = require('express-session');
const RedisStore = require('connect-redis');
const passport = require('passport');
const OpenIDStrategy = require('passport-openidconnect').Strategy;
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Redis 세션 스토어 설정
const redisStore = new RedisStore({
  client: require('redis').createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  })
});

// 세션 설정
const sessionConfig = {
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  name: 'yourapp.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
};

// OIDC 전략 설정
passport.use('oidc', new OpenIDStrategy({
  issuer: process.env.OIDC_ISSUER,
  authorizationURL: `${process.env.OIDC_ISSUER}/oidc/authorize`,
  tokenURL: `${process.env.OIDC_ISSUER}/oidc/token`,
  userInfoURL: `${process.env.OIDC_ISSUER}/oidc/userinfo`,
  clientID: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  callbackURL: `${process.env.SERVICE_URL}/auth/callback`,
  scope: ['openid', 'profile', 'email']
}, (issuer, profile, done) => {
  // 사용자 프로필 처리
  const user = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    roles: profile.roles || []
  };
  return done(null, user);
}));

// JWT 검증 미들웨어
const jwtCheck = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${process.env.OIDC_ISSUER}/oidc/.well-known/jwks`
  }),
  audience: process.env.OIDC_CLIENT_ID,
  issuer: process.env.OIDC_ISSUER,
  algorithms: ['RS256']
});

// 권한 체크 미들웨어
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증 필요' });
    }

    if (!req.user.roles || !req.user.roles.includes(role)) {
      return res.status(403).json({ error: '권한 없음' });
    }

    next();
  };
};

module.exports = {
  sessionConfig,
  passport,
  jwtCheck,
  requireRole
};
```

### 라우트 설정
```javascript
// routes/auth.js
const express = require('express');
const passport = require('passport');

const router = express.Router();

// 로그인 시작
router.get('/login', passport.authenticate('oidc'));

// OIDC 콜백
router.get('/callback', passport.authenticate('oidc', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('세션 삭제 오류:', err);
    }
    res.redirect('/');
  });
});

// 사용자 정보 조회
router.get('/me', (req, res) => {
  if (req.user) {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles
    });
  } else {
    res.status(401).json({ error: '인증 필요' });
  }
});

module.exports = router;
```

### 서버 설정
```javascript
// server.js
const express = require('express');
const session = require('express-session');
const { sessionConfig, passport, jwtCheck } = require('./middleware/auth');

const app = express();

// 세션 미들웨어
app.use(session(sessionConfig));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 인증 라우트
app.use('/auth', require('./routes/auth'));

// 보호된 라우트 (JWT 필요)
app.use('/api', jwtCheck);

// 보호된 라우트 (특정 역할 필요)
app.use('/admin', jwtCheck, requireRole('admin'));

// 대시보드 (인증된 사용자만)
app.get('/dashboard', (req, res) => {
  if (req.user) {
    res.json({
      message: '환영합니다!',
      user: req.user,
      logoutUrl: '/auth/logout'
    });
  } else {
    res.redirect('/auth/login');
  }
});

module.exports = app;
```

## 3. Python Flask 서비스 통합 예시

### 패키지 설치
```bash
pip install flask flask-oidc authlib requests redis
```

### 인증 설정
```python
# auth_config.py
import os
from authlib.integrations.flask_oidc import FlaskOIDC
from flask import Flask

app = Flask(__name__)

# OIDC 설정
app.config.update({
    'SECRET_KEY': os.environ.get('SECRET_KEY'),
    'OIDC_CLIENT_CONFIG': {
        'issuer': os.environ.get('OIDC_ISSUER'),
        'client_id': os.environ.get('OIDC_CLIENT_ID'),
        'client_secret': os.environ.get('OIDC_CLIENT_SECRET'),
        'redirect_uri': os.environ.get('SERVICE_URL') + '/oidc/callback'
    }
})

oidc = FlaskOIDC(app)

@app.route('/login')
@oidc.require_login
def login():
    return f'환영합니다, {oidc.user_getfield("name")}!'

@app.route('/dashboard')
@oidc.require_login
def dashboard():
    return f'사용자 정보: {oidc.user_getinfo(["name", "email", "department"])}'

@app.route('/admin')
@oidc.require_login
def admin():
    if 'admin' not in oidc.user_getfield('roles', []):
        return '권한이 없습니다.', 403
    return '관리자 페이지'

@app.route('/logout')
def logout():
    oidc.logout()
    return '로그아웃되었습니다.'
```

## 4. Nginx 설정

### 보호된 서비스 프록시
```nginx
# nginx.conf
upstream auth_service {
    server auth-service:3000;
}

upstream your_service {
    server your-service:3000;
}

server {
    listen 80;
    server_name your-service.localhost;

    # 정적 파일
    location /static/ {
        proxy_pass http://your_service;
    }

    # API 엔드포인트 (JWT 필요)
    location /api/ {
        auth_request /auth/verify;
        auth_request_set $user $upstream_http_x_user;
        auth_request_set $roles $upstream_http_x_roles;

        proxy_pass http://your_service;
        proxy_set_header X-User $user;
        proxy_set_header X-Roles $roles;
    }

    # 인증 확인
    location /auth/verify {
        internal;
        proxy_pass http://auth_service/auth/verify;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }

    # 인증되지 않은 경우
    location /auth/login {
        return 302 http://sso-provider/oidc/authorize?response_type=code&client_id=$arg_client_id&redirect_uri=$arg_redirect_uri;
    }

    # 모든 기타 요청
    location / {
        proxy_pass http://your_service;
    }
}
```

## 5. Docker Compose 서비스 업데이트

### 서비스 환경변수 추가
```yaml
services:
  your-service:
    build:
      context: ./your-service
      dockerfile: Dockerfile
    ports:
      - "3003:3000"
    environment:
      - OIDC_ISSUER=http://sso-provider:3000
      - OIDC_CLIENT_ID=your-service-client-id
      - OIDC_CLIENT_SECRET=your-service-client-secret
      - SERVICE_URL=http://your-service:3000
      - SESSION_SECRET=${SESSION_SECRET}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - sso-provider
      - auth-service
      - redis
    networks:
      - sso-network
```

## 6. 테스트 및 검증

### 통합 테스트
1. **인증 플로우 테스트**:
   - 브라우저에서 서비스 접근
   - SSO 로그인 페이지로 리다이렉트 확인
   - LDAP 인증 후 토큰 발급 확인
   - 서비스로 돌아와서 사용자 정보 표시 확인

2. **권한 테스트**:
   - 관리자 권한이 필요한 페이지 접근
   - 권한 없는 사용자의 접근 거부 확인
   - 역할 기반 메뉴 표시 확인

3. **세션 관리 테스트**:
   - 로그아웃 후 접근 불가 확인
   - 세션 만료 후 재인증 확인
   - 다중 탭/브라우저에서의 동작 확인

### 디버깅 팁
- **로그 확인**: 각 서비스의 로그에서 인증 관련 메시지 확인
- **토큰 검증**: JWT 디코딩으로 토큰 내용 확인
- **Redis 데이터**: 세션과 토큰 데이터 직접 확인
- **LDAP 연결**: LDAP 서버 연결 상태 확인

## 7. 보안 체크리스트

### ✅ 필수 보안 설정
- [ ] HTTPS 사용 (프로덕션 환경)
- [ ] 강력한 세션 시크릿 키 설정
- [ ] HttpOnly 쿠키 설정
- [ ] CSRF 보호 구현
- [ ] Rate limiting 설정
- [ ] 입력값 검증 및 sanitization
- [ ] 에러 메시지에 민감한 정보 노출 금지

### ✅ 권한 관리
- [ ] 역할 기반 접근 제어 구현
- [ ] LDAP 그룹과 애플리케이션 역할 매핑
- [ ] 권한 변경 시 세션 무효화
- [ ] 감사 로그 기록

## 8. 모니터링 및 운영

### 로그 모니터링
```bash
# 각 서비스 로그 확인
docker-compose logs -f auth-service
docker-compose logs -f your-service
docker-compose logs -f sso-provider

# Redis 모니터링
docker-compose exec redis redis-cli monitor

# PostgreSQL 로그
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log
```

### 성능 모니터링
- **응답시간**: 각 인증 단계별 응답시간 측정
- **에러율**: 인증 실패율 모니터링
- **세션 수**: 활성 세션 수 추적
- **LDAP 응답시간**: LDAP 쿼리 성능 모니터링

### 백업 및 복구
- **데이터베이스 백업**: PostgreSQL 데이터 정기 백업
- **Redis 백업**: RDB 스냅샷 및 AOF 로그 백업
- **설정 백업**: 환경변수 및 설정 파일 백업

이 가이드를 따라 각 Docker 서비스를 통합하면 DSM LDAP 기반의 통합 SSO 시스템을 완성할 수 있습니다.
