# DSM LDAP와 Docker OIDC SSO 통합 프로젝트

이 프로젝트는 DSM의 LDAP Server를 활용하여 Docker 컨테이너 기반 서비스들에 **OIDC SSO 인증**을 제공합니다.

> **참고**: SAML 지원은 주석 처리되어 있으므로 필요시 활성화 가능

## 아키텍처 개요

```
DSM 환경
├── LDAP Server (사용자 저장소)
└── DSM 패키지 (OIDC Provider)

Docker 환경
├── 통합 인증 서비스 (LDAP 연동)
├── Redis (세션 저장소)
├── PostgreSQL (토큰 및 로그)
├── API Gateway (Nginx)
└── 마이크로서비스들 (SSO 적용)
```

## 주요 기능

### 🔐 통합 인증 서비스
- **LDAP 사용자 인증**: DSM LDAP Server와 연동
- **JWT 토큰 관리**: Access Token 및 Refresh Token 발급
- **OIDC Provider**: 표준 OIDC 프로토콜 지원
- **SAML Provider**: SAML 2.0 프로토콜 지원 (주석 처리됨)

### 🚀 Docker 서비스 연동
- **Redis 기반 세션 공유**: 모든 서비스 간 세션 공유
- **API Gateway**: 통합 라우팅 및 보안
- **자동 서비스 탐지**: Docker 네트워크 내 서비스 자동 탐지

## 빠른 시작

### 1. 환경 설정
```bash
# 환경변수 파일 생성
cp env.example .env

# .env 파일 편집 (실제 값으로 변경)
# LDAP_URL, LDAP_BIND_PASSWORD, JWT_SECRET, DB_PASSWORD 등
```

### 2. SSL 인증서 생성 (개발환경용)
```bash
# 인증서 디렉토리 생성
mkdir -p certs nginx/ssl

# 개발용 자체 서명 인증서 생성
# SAML 키는 주석 처리됨 (필요시 활성화)
# openssl req -x509 -newkey rsa:4096 -keyout certs/saml.key -out certs/saml.crt -days 365 -nodes -subj "/CN=localhost"
openssl genrsa -out certs/oidc.key 2048
openssl rsa -in certs/oidc.key -pubout -out certs/oidc.pub

# Nginx SSL 인증서
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/server.key -out nginx/ssl/server.crt -days 365 -nodes -subj "/CN=localhost"
```

### 3. 서비스 시작
```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 상태 확인
docker-compose ps
```

### 4. 서비스 중지
```bash
# 모든 서비스 중지
docker-compose down

# 볼륨도 함께 삭제 (주의: 데이터 손실)
docker-compose down -v
```

## 서비스 구성

### 포트 할당
- **3001**: 인증 서비스 (auth-service)
- **3002**: OIDC/SAML 프로바이더 (sso-provider)
- **6379**: Redis
- **5432**: PostgreSQL
- **80/443**: Nginx API Gateway

### 환경변수
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `LDAP_URL` | DSM LDAP 서버 URL | `ldap://dsm-server:389` |
| `LDAP_BASE_DN` | LDAP 베이스 DN | `dc=dsm,dc=local` |
| `LDAP_BIND_DN` | LDAP 관리자 DN | `cn=admin,dc=dsm,dc=local` |
| `LDAP_BIND_PASSWORD` | LDAP 관리자 비밀번호 | (필수) |
| `JWT_SECRET` | JWT 서명 키 | (필수) |
| `DB_PASSWORD` | PostgreSQL 비밀번호 | (필수) |
| `REDIS_PASSWORD` | Redis 비밀번호 | `redis-password-change-this` |

## API 엔드포인트

### OIDC 엔드포인트 (`/oidc`)
- `GET /oidc/.well-known/openid_configuration` - OIDC 설정 정보
- `GET /oidc/authorize` - 인증 요청
- `POST /oidc/token` - 토큰 교환
- `GET /oidc/userinfo` - 사용자 정보 조회
- `POST /oidc/logout` - 로그아웃

### SAML 엔드포인트 (`/saml`) (주석 처리됨 - 필요시 활성화)
- `GET /saml/metadata` - SAML 메타데이터
- `POST /saml/sso` - SAML Single Sign-On
- `POST /saml/slo` - SAML Single Logout

> **SAML 활성화 방법:**
> 1. Docker Compose에서 SAML 환경변수 주석 해제
> 2. Nginx에서 SAML location 활성화
> 3. auth-service에서 SAML 함수 주석 해제

### 인증 API (`/auth`)
- `POST /auth/login` - 로그인
- `POST /auth/register` - 회원가입
- `GET /auth/verify` - 토큰 검증
- `POST /auth/logout` - 로그아웃
- `GET /auth/user` - 사용자 정보 조회

## LDAP 스키마 매핑

### 사용자 속성 매핑
| LDAP 속성 | OIDC 클레임 | 설명 |
|-----------|-------------|------|
| `uid` | `sub` | 사용자 고유 ID |
| `mail` | `email` | 이메일 주소 |
| `cn` | `name` | 전체 이름 |
| `displayName` | `preferred_username` | 표시 이름 |
| `givenName` | `given_name` | 이름 |
| `sn` | `family_name` | 성 |
| `department` | `department` | 부서 |
| `employeeID` | `employee_id` | 사번 |

### 그룹 매핑
```javascript
const groupRoleMapping = {
  'cn=developers,ou=groups,dc=dsm,dc=local': ['developer', 'user'],
  'cn=admins,ou=groups,dc=dsm,dc=local': ['admin', 'developer', 'user'],
  'cn=managers,ou=groups,dc=dsm,dc=local': ['manager', 'user'],
  'cn=users,ou=groups,dc=dsm,dc=local': ['user']
};
```

## 보안 고려사항

### 🔒 LDAP 보안
- **LDAPS** (LDAP over SSL/TLS) 사용 권장
- LDAP 연결 풀링 및 타임아웃 설정
- LDAP 인젝션 공격 방지
- 연결 정보 암호화 저장

### 🔒 JWT 보안
- **강력한 서명 키** 사용 (최소 256비트)
- 적절한 토큰 만료 시간 설정
- Access Token: 1시간, Refresh Token: 30일
- HTTPS 전용 쿠키 설정

### 🔒 SAML 보안
- XML 서명 및 암호화
- 인증서 적절한 유효기간 설정
- 메타데이터 서명 검증

## 개발 및 테스트

### 단위 테스트 실행
```bash
# 각 서비스 디렉토리에서
npm test

# 또는
yarn test
```

### 통합 테스트
```bash
# 전체 스택 테스트
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 성능 테스트
```bash
# 부하 테스트
docker-compose -f docker-compose.load-test.yml up
```

## 모니터링 및 로깅

### 헬스체크
- 모든 서비스에 헬스체크 엔드포인트 구현
- Docker Compose 헬스체크 설정됨
- Nginx 헬스체크: `GET /health`

### 로그
- 각 서비스별 로그 파일 생성
- JSON 형식의 구조화된 로그
- ELK 스택 연동 가능

### 메트릭
- Redis 메모리 사용량 모니터링
- PostgreSQL 쿼리 성능 모니터링
- JWT 토큰 발급/만료 통계

## 문제 해결

### 일반적인 문제

#### 1. LDAP 연결 실패
```bash
# LDAP 서버 연결 확인
telnet dsm-server 389

# 로그 확인
docker-compose logs auth-service

# 환경변수 확인
docker-compose exec auth-service env | grep LDAP
```

#### 2. SSL 인증서 오류
```bash
# 인증서 유효성 확인
openssl x509 -in certs/saml.crt -text -noout

# Nginx SSL 테스트
curl -k https://localhost/health
```

#### 3. Redis 연결 문제
```bash
# Redis 연결 확인
docker-compose exec redis redis-cli ping

# Redis 메모리 확인
docker-compose exec redis redis-cli info memory
```

### 디버깅 팁
- 각 서비스의 로그를 실시간으로 확인: `docker-compose logs -f [service-name]`
- 서비스 내부 접속: `docker-compose exec [service-name] sh`
- 환경변수 확인: `docker-compose exec [service-name] env`

## 라이선스

이 프로젝트는 MIT 라이선스 하에 제공됩니다.

## 지원

문제 발생 시 다음을 확인해 주세요:
1. 환경변수가 올바르게 설정되었는지 확인
2. Docker 서비스가 정상 실행 중인지 확인
3. 로그 파일에서 에러 메시지 확인
4. DSM LDAP 서버 연결 상태 확인

## 로드맵

### v1.0 (현재)
- ✅ LDAP 연동 기본 기능
- ✅ OIDC Provider 구현
- ✅ SAML Provider 구현 (주석 처리됨)
- ✅ Docker Compose 설정
- ✅ 기본 보안 설정

### v1.1
- 🔄 OIDC Device Flow 지원
- 🔄 LDAP 그룹 동기화 개선
- 🔄 관리자 UI 추가
- 🔄 SAML 지원 활성화 (옵션)

### v2.0
- 🔄 클러스터링 지원
- 🔄 고가용성 구성
- 🔄 LDAP HA 지원
- 🔄 고급 모니터링

## 🔄 SAML 지원 활성화 방법

현재 SAML은 주석 처리되어 있지만, 필요시 언제든 활성화할 수 있습니다.

### 1. Docker Compose 설정 활성화
```yaml
# docker-compose.yml에서 주석 해제
environment:
  - SAML_ENTITY_ID=${SAML_ENTITY_ID}
  - SAML_SSO_URL=${SAML_SSO_URL}
  - SAML_CERT_PATH=/app/certs/saml.crt
  - SAML_KEY_PATH=/app/certs/saml.key
```

### 2. Nginx SAML 엔드포인트 활성화
```nginx
# nginx.conf에서 주석 해제
location /saml/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://sso_provider;
    # ... 기타 설정
}
```

### 3. auth-service SAML 함수 활성화
```javascript
// src/services/ldap.js에서 주석 해제
function mapToSamlAttributes(ldapUser) { /* ... */ }

// src/services/jwt.js에서 주석 해제
function mapToSamlAttributes(oidcClaims) { /* ... */ }
```

### 4. 데이터베이스 테이블 생성
```sql
-- init-scripts/01-init-db.sql에서 주석 해제
CREATE TABLE IF NOT EXISTS saml_service_providers (
    -- ... 테이블 정의
);
```

### 5. SAML 인증서 생성
```bash
# 개발환경용 SAML 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout certs/saml.key -out certs/saml.crt -days 365 -nodes
```

### 6. 환경변수 추가
```bash
# .env 파일에 추가
SAML_ENTITY_ID=http://localhost:3002/saml
SAML_SSO_URL=http://localhost:3002/saml/sso
```

### 7. 서비스 재시작
```bash
docker-compose down
docker-compose up -d
```

---

**주의**: 프로덕션 환경에서는 모든 비밀번호와 키를 강력한 값으로 변경하고, SSL/TLS를 반드시 활성화하세요.
