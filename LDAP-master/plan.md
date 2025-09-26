# DSM LDAP와 Docker SSO 통합 아키텍처 계획

## 1. 전체 아키텍처 개요

### 목표
- **DSM LDAP Server**를 통합 사용자 저장소로 활용
- **DSM 자체 패키지**를 **OIDC SSO 프로바이더**로 구성
- Docker 기반 마이크로서비스들의 **통합 인증** 구현
- **기존 SSO 서비스**와의 연동 및 확장
- **SAML 지원**은 필요시 언제든 활성화 가능

### 핵심 통합 포인트
```
DSM 환경
├── LDAP Server (사용자 저장소)
└── DSM 패키지 (OIDC Provider)

Docker 환경
├── 통합 인증 서비스 (LDAP 연동)
├── Redis (세션 저장소)
├── API Gateway (Nginx)
└── 마이크로서비스들 (SSO 적용)
```

**참고**: SAML 지원은 주석 처리되어 있으므로 필요시 활성화 가능

## 2. DSM LDAP 통합 구성

### 2.1 LDAP 사용자 스키마
```ldap
# DSM LDAP 사용자 객체 구조
dn: uid=user1,ou=people,dc=dsm,dc=local
objectClass: inetOrgPerson
objectClass: posixAccount
uid: user1
cn: 홍길동
sn: 홍
givenName: 길동
mail: user1@company.com
userPassword: {SSHA}encrypted_password
displayName: 홍길동
employeeID: EMP001
department: IT
```

### 2.2 LDAP 연결 설정
- **서버**: `ldap://dsm-server:389` 또는 `ldaps://dsm-server:636`
- **Base DN**: `dc=dsm,dc=local`
- **사용자 DN**: `ou=people,dc=dsm,dc=local`
- **관리자 계정**: `cn=admin,dc=dsm,dc=local`

## 3. Docker SSO 서비스 구성

### 3.1 통합 인증 서비스 (`auth-service`)
**역할**: DSM LDAP와 Docker 서비스 간 인증 중재
**포트**: 3001
**핵심 기능**:
- LDAP 사용자 인증 및 정보 조회
- JWT 토큰 발급 및 검증
- **OIDC 프로토콜 지원** (SAML은 주석 처리됨)
- 사용자 정보 캐싱 (Redis)

### 3.2 OIDC 프로바이더 (`sso-provider`)
**역할**: DSM에서 실행되는 SSO 인증 서버
**포트**: 3002
**핵심 기능**:
- **OIDC 표준 인증 엔드포인트** (`/authorize`, `/token`, `/userinfo`)
- SAML 2.0 프로토콜 지원 (주석 처리됨 - 필요시 활성화)
- LDAP 사용자 정보 매핑
- JWT 토큰 생성 및 서명

### 3.3 공유 인프라
```yaml
# Redis (세션 및 캐시)
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data

# PostgreSQL (토큰 및 로그)
postgres:
  image: postgres:15-alpine
  environment:
    - POSTGRES_DB=sso_db
    - POSTGRES_USER=sso_user
    - POSTGRES_PASSWORD=${DB_PASSWORD}
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

## 4. 인증 플로우

### 4.1 OIDC 인증 플로우
```
1. 사용자 → Docker 서비스 접근
2. Docker 서비스 → OIDC Provider (/authorize)
3. OIDC Provider → DSM 로그인 페이지
4. 사용자 → DSM LDAP 인증
5. OIDC Provider → Authorization Code 발급
6. Docker 서비스 → Access Token 교환
7. Docker 서비스 → 사용자 정보 조회
8. Docker 서비스 → JWT 검증 및 서비스 제공
```

### 4.2 SAML 인증 플로우 (주석 처리됨 - 필요시 활성화)
```
# 1. 사용자 → Docker 서비스 접근
# 2. Docker 서비스 → SAML AuthnRequest
# 3. SAML Provider → DSM 로그인 페이지
# 4. 사용자 → DSM LDAP 인증
# 5. SAML Provider → SAML Response (서명됨)
# 6. Docker 서비스 → SAML 검증
# 7. Docker 서비스 → 사용자 정보 추출
# 8. Docker 서비스 → JWT 발급 및 서비스 제공
```

**SAML을 활성화하려면:**
1. Docker Compose에서 SAML 관련 환경변수 주석 해제
2. auth-service에서 SAML 함수 주석 해제
3. 데이터베이스에서 SAML 테이블 생성
4. Nginx에서 SAML 엔드포인트 활성화

## 5. Docker Compose 통합 구성

### 5.1 서비스 정의
```yaml
version: '3.8'

services:
  # DSM LDAP 연동 인증 서비스
  auth-service:
    build:
      context: ./auth-service
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - LDAP_URL=ldap://dsm-server:389
      - LDAP_BASE_DN=dc=dsm,dc=local
      - LDAP_BIND_DN=cn=admin,dc=dsm,dc=local
      - LDAP_BIND_PASSWORD=${LDAP_PASSWORD}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OIDC_ISSUER=http://localhost:3002
      - SAML_ENTITY_ID=http://localhost:3002/saml
    depends_on:
      - redis
      - postgres
    networks:
      - sso-network

  # OIDC/SAML 프로바이더
  sso-provider:
    build:
      context: ./sso-provider
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - LDAP_URL=ldap://dsm-server:389
      - LDAP_BASE_DN=dc=dsm,dc=local
      - JWT_SECRET=${JWT_SECRET}
      - DB_URL=postgresql://sso_user:sso_password@postgres:5432/sso_db
      - SAML_CERT_PATH=/app/certs/saml.crt
      - SAML_KEY_PATH=/app/certs/saml.key
      - OIDC_PRIVATE_KEY_PATH=/app/certs/oidc.key
      - OIDC_PUBLIC_KEY_PATH=/app/certs/oidc.pub
    volumes:
      - ./certs:/app/certs:ro
    depends_on:
      - postgres
    networks:
      - sso-network

  # 기존 홈페이지 서비스 (업데이트됨)
  homepage-service:
    build:
      context: ./homepage-service
      dockerfile: Dockerfile
    ports:
      - "3003:3000"
    environment:
      - SSO_URL=http://auth-service:3000
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
    depends_on:
      - auth-service
    networks:
      - sso-network

  # 공유 Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - sso-network

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sso_db
      - POSTGRES_USER=sso_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sso-network

  # API Gateway
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - sso-network
```

## 6. 사용자 정보 매핑

### 6.1 LDAP → OIDC 사용자 정보 변환
```javascript
// LDAP 속성 → OIDC 클레임 매핑
const ldapToOidcMapping = {
  'uid': 'sub',
  'mail': 'email',
  'cn': 'name',
  'displayName': 'preferred_username',
  'givenName': 'given_name',
  'sn': 'family_name',
  'department': 'department',
  'employeeID': 'employee_id'
};

// LDAP 사용자 → OIDC 토큰 변환
function mapUserToOidcClaims(ldapUser) {
  const claims = {};
  Object.entries(ldapToOidcMapping).forEach(([ldapAttr, oidcClaim]) => {
    if (ldapUser[ldapAttr]) {
      claims[oidcClaim] = ldapUser[ldapAttr];
    }
  });
  return claims;
}
```

### 6.2 사용자 그룹 및 권한 매핑
```javascript
// LDAP 그룹 → 애플리케이션 역할 매핑
const groupRoleMapping = {
  'cn=developers,ou=groups,dc=dsm,dc=local': ['developer', 'user'],
  'cn=admins,ou=groups,dc=dsm,dc=local': ['admin', 'developer', 'user'],
  'cn=managers,ou=groups,dc=dsm,dc=local': ['manager', 'user'],
  'cn=users,ou=groups,dc=dsm,dc=local': ['user']
};
```

## 7. 보안 고려사항

### 7.1 LDAP 보안
- **LDAPS** (LDAP over SSL/TLS) 사용
- LDAP 연결 풀링 및 타임아웃 설정
- LDAP 인젝션 공격 방지
- 연결 정보 암호화 저장

### 7.2 OIDC 보안
- **강력한 JWT 서명 키** 사용
- 토큰 만료 시간 설정 (Access Token: 1시간, Refresh Token: 30일)
- HTTPS 전용 쿠키 설정

### 7.3 SAML 보안 (주석 처리됨)
- SAML 인증서 적절한 유효기간 설정
- XML 서명 및 암호화
- SAML 프로토콜 보안 설정

### 7.4 네트워크 보안
- Docker 네트워크 격리
- 서비스 간 인증 (mTLS 고려)
- API Gateway를 통한 접근 제어
- Rate limiting 및 DDoS 방어

## 8. 구현 단계

### 8.1 Phase 1: LDAP 연동 (1-2주)
1. LDAP 연결 및 인증 모듈 구현
2. 사용자 정보 조회 및 캐싱
3. 기본 인증 API 개발
4. LDAP 스키마 분석 및 매핑

### 8.2 Phase 2: OIDC Provider (2-3주)
1. OIDC 표준 라이브러리 적용
2. JWT 토큰 발급 및 검증
3. OIDC 엔드포인트 구현
4. 클라이언트 등록 및 관리

### 8.3 Phase 3: SAML Provider (1-2주)
1. SAML 2.0 프로토콜 구현
2. XML 서명 및 암호화
3. SAML 엔드포인트 구현
4. 메타데이터 제공

### 8.4 Phase 4: 서비스 통합 (2-3주)
1. 기존 Docker 서비스 SSO 적용
2. 인증 미들웨어 구현
3. 사용자 인터페이스 업데이트
4. 테스트 및 디버깅

### 8.5 Phase 5: 운영 및 모니터링 (1주)
1. 로깅 및 모니터링 설정
2. 헬스체크 및 알림
3. 백업 및 복구 절차
4. 보안 감사 및 강화

## 9. 테스트 전략

### 9.1 단위 테스트
- LDAP 연결 및 쿼리 테스트
- JWT 토큰 생성/검증 테스트
- OIDC/SAML 플로우 테스트

### 9.2 통합 테스트
- 전체 인증 플로우 테스트
- LDAP ↔ Docker 서비스 연동 테스트
- 에러 시나리오 테스트

### 9.3 성능 테스트
- 동시 사용자 100명 부하 테스트
- LDAP 쿼리 응답시간 측정
- 토큰 발급 처리량 테스트

## 10. 운영 고려사항

### 10.1 모니터링
- LDAP 연결 상태 모니터링
- 토큰 발급/만료 통계
- 에러율 및 응답시간 모니터링
- 사용자 활동 로그

### 10.2 백업 및 복구
- PostgreSQL 데이터베이스 백업
- Redis 데이터 스냅샷
- SSL 인증서 백업
- 설정 파일 버전 관리

### 10.3 확장성
- Redis 클러스터 구성
- 데이터베이스 읽기 복제본
- 로드 밸런서 적용
- 마이크로서비스 분리

이 계획을 바탕으로 체계적이고 안전한 DSM LDAP와 Docker SSO 통합 시스템을 구축할 수 있습니다. 각 단계별로 충분한 테스트와 검증을 통해 안정적인 서비스를 제공하겠습니다.
