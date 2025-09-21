# Docker 컨테이너 기반 SSO 서비스 아키텍처 계획

## 1. 전체 아키텍처 개요

### 목표
- Docker 컨테이너로 구성된 SSO(Single Sign-On) 인증 서비스
- 여러 마이크로서비스들의 통합 인증 게이트웨이 역할
- Redis를 활용한 세션 기반 인증 공유

### 아키텍처 구성도
```
사용자 브라우저
    ↓ (쿠키: sessionId)
API Gateway (Nginx)
    ↓
├── SSO Service (인증)
├── Homepage Service
├── Product Service
├── Other Services...
    ↓
Redis (공유 세션 스토어)
```

## 2. 핵심 컨테이너 구성

### 2.1 SSO 인증 서비스 (`sso-service`)
**역할**: 회원가입, 로그인, 인증 토큰 관리
**포트**: 3001
**핵심 기능**:
- 사용자 인증 처리
- 세션 생성 및 관리
- 권한 정보 저장
- 인증 상태 검증 API 제공

### 2.2 홈페이지 서비스 (`homepage-service`)
**역할**: 메인 랜딩 페이지 및 대시보드
**포트**: 3002
**핵심 기능**:
- 인증된 사용자 홈페이지 표시
- 세션 기반 사용자 정보 표시
- 미인증 시 SSO로 리다이렉트

### 2.3 기타 비즈니스 서비스들
**예시**: `product-service`, `user-service`, `order-service`
**포트**: 3003, 3004, 3005...
**핵심 기능**:
- 각각의 비즈니스 로직 처리
- 세션 기반 인증 상태 확인
- 권한별 접근 제어

### 2.4 공유 Redis (`redis`)
**역할**: 세션 데이터 중앙 저장소
**포트**: 6379
**저장 데이터**:
```
Key: sess:abc123xyz
Value: {
  userId: 1,
  email: "user@example.com",
  roles: ["user", "admin"],
  createdAt: "2025-09-13T10:00:00Z"
}
```

### 2.5 API Gateway (`nginx`)
**역할**: 라우팅 및 프록시
**포트**: 80 (외부 접근)
**라우팅 규칙**:
- `/auth/*` → SSO Service
- `/home/*` → Homepage Service  
- `/products/*` → Product Service

## 3. 연결 기준 및 세션 관리

### 3.1 핵심 연결 포인트
**연결 기준**: Redis 세션 ID
**쿠키명**: `myapp.sid` (모든 서비스 공통)
**세션 시크릿**: 환경변수로 모든 컨테이너에 동일하게 설정

### 3.2 세션 설정 공통 사항
```javascript
// 모든 서비스에서 동일한 설정
{
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  name: 'myapp.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 개발환경
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    domain: '.myapp.com' // 서브도메인 공유
  }
}
```

## 4. Docker Compose 구성

### 4.1 서비스 정의
```yaml
version: '3.8'

services:
  # SSO 인증 서비스
  sso-service:
    build: ./sso-service
    ports:
      - "3001:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - SESSION_SECRET=${SESSION_SECRET}
      - DB_URL=${DATABASE_URL}
    depends_on:
      - redis

  # 홈페이지 서비스
  homepage-service:
    build: ./homepage-service
    ports:
      - "3002:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - SESSION_SECRET=${SESSION_SECRET}
      - SSO_URL=http://sso-service:3000
    depends_on:
      - redis

  # 기타 서비스들
  product-service:
    build: ./product-service
    ports:
      - "3003:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - redis

  # 공유 Redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  # API Gateway
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - sso-service
      - homepage-service
      - product-service

volumes:
  redis-data:
```

## 5. 구현 세부사항

### 5.1 SSO 서비스 주요 엔드포인트
- `POST /login` - 로그인 처리
- `POST /register` - 회원가입 처리
- `GET /verify` - 세션 인증 상태 확인
- `POST /logout` - 로그아웃 처리

### 5.2 인증 플로우
1. 사용자가 서비스 접근
2. 세션 쿠키 확인
3. Redis에서 세션 데이터 조회
4. 인증 상태에 따라 처리:
   - 인증됨: 서비스 제공
   - 미인증: SSO 로그인 페이지로 리다이렉트

### 5.3 권한 관리
```javascript
// 권한 체크 미들웨어 예시
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.session.roles?.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

## 6. 보안 고려사항

### 6.1 필수 보안 설정
- HTTPS 사용 (프로덕션 환경)
- 강력한 세션 시크릿 키
- HttpOnly 쿠키 설정
- CORS 정책 설정
- Rate limiting 적용

### 6.2 환경변수 관리
```bash
# .env 파일
SESSION_SECRET=your-super-secret-session-key
DATABASE_URL=postgresql://user:pass@db:5432/sso
REDIS_URL=redis://redis:6379
CORS_ORIGIN=https://myapp.com
```

## 7. 장점 및 고려사항

### 7.1 장점
- **중앙화된 인증**: 한 곳에서 모든 인증 관리
- **확장성**: 새로운 서비스 쉽게 추가 가능
- **독립 배포**: 각 서비스 독립적 개발/배포
- **세션 공유**: Redis를 통한 효율적인 세션 관리

### 7.2 고려사항
- **단일 장애점**: Redis 또는 SSO 서비스 장애 시 전체 영향
- **네트워크 지연**: 컨테이너 간 통신 오버헤드
- **세션 동기화**: Redis 가용성 및 백업 전략 필요
- **도메인 설정**: 서브도메인 간 쿠키 공유 설정

## 8. 다음 단계

### 8.1 개발 우선순위
1. SSO 서비스 기본 구조 구현
2. Redis 세션 설정 및 테스트
3. 첫 번째 연동 서비스 구현
4. API Gateway 설정
5. 보안 강화 및 에러 처리

### 8.2 모니터링 및 운영
- Docker 컨테이너 헬스체크 설정
- Redis 메모리 사용량 모니터링
- 세션 만료 정책 및 정리 작업
- 로그 중앙화 (ELK 스택 고려)

이 계획을 바탕으로 단계적으로 구현하면 확장 가능하고 안정적인 SSO 기반 마이크로서비스 아키텍처를 구축할 수 있습니다.