# Docker Compose 작성 룰북

## 기본 규칙
### 0. 룰북 우선 원칙
- 룰북을 우선적으로 참고하여 작성하되 작성하려는 내용과 상충되는 룰이 발견되면, 사용자에게 판단을 맡길 것. 스스로 판단x
- 사용자가 룰북에 새로운 사항을 추가하라 하면 포괄적이고 통상적인 내용으로 룰북에 정리, 작성할 것.

### 1. 버전 정보 제외
- `docker-compose.yml` 파일의 첫 번째 줄에 버전 정보를 작성하지 않습니다
- 호환성을 위해 버전 명시를 생략합니다

### 2. 사용자 설정값 주석 처리
- 사용자가 반드시 설정해야 하는 값은 주석으로 표시합니다
- 설정 가능한 선택지가 있는 경우 함께 표기합니다
- 필수 설정인 경우, 기본값으로 세팅해둡니다.

### 3. Dockerfile 명명 규칙
- Dockerfile이 필요한 경우 `Dockerfile.<컨테이너명>`의 양식으로 작성합니다
- 예시: `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.database`
- 컨테이너명은 docker-compose.yml의 서비스명과 일치해야 합니다

## 주석 작성 예시

```yaml
# 사용자 설정 필요: 데이터베이스 비밀번호
# MYSQL_ROOT_PASSWORD: your_password_here

# 사용자 설정 필요: 포트 번호 (기본값: 3306)
# PORTS: "3306:3306"

# 사용자 설정 필요: 볼륨 마운트 경로
# VOLUMES: 
#   - /your/local/path:/container/path

# 사용자 설정 필요: 환경 선택
# ENVIRONMENT: development  # 선택지: development, staging, production
```

## 파일 구조 권장사항

```
project_name/
├── docker-compose.yml
├── .env.example          # 환경변수 예시 파일
├── Dockerfile.web        # 웹 서비스용 Dockerfile
├── Dockerfile.api        # API 서비스용 Dockerfile
├── config/               # 설정 파일들
│   ├── nginx.conf
│   └── app.conf
└── README.md             # 사용법 및 설정 가이드
```

## 주석 작성 가이드

### 필수 설정값
```yaml
# 필수: 사용자가 반드시 설정해야 하는 값
# EXAMPLE_VAR: your_value_here
```

### 선택적 설정값
```yaml
# 선택: 기본값이 있지만 변경 가능한 값
# OPTIONAL_VAR: default_value  # 선택지: value1, value2, value3
```

### 경로 설정
```yaml
# 경로: 로컬 파일 시스템 경로 (절대 경로 권장)
# LOCAL_PATH: /absolute/path/to/your/directory
```

### 포트 설정
```yaml
# 포트: 호스트포트:컨테이너포트
# PORTS: "8080:80"  # 호스트 8080포트를 컨테이너 80포트로 매핑
```

### 볼륨 설정
```yaml
# 볼륨: 로컬경로:컨테이너경로
# VOLUMES:
#   - /host/path:/container/path:ro  # 읽기 전용
#   - /host/path:/container/path:rw  # 읽기/쓰기 (기본값)
```

### Dockerfile 설정
```yaml
# Dockerfile 사용 시
build:
  context: .
  dockerfile: Dockerfile.service_name  # Dockerfile.<컨테이너명> 형식 사용
  # 사용자 설정 필요: 빌드 컨텍스트 경로
  # context: ./custom/path
```
