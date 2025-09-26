# 익명 이슈 트래킹 시스템 구축 계획

## 개요
QA 단계에서 사용할 익명 이슈 트래킹 시스템을 Docker로 구축합니다.

## 선택된 솔루션: Taiga.io

### 특징
- ✅ 익명 이슈 등록 가능
- ✅ 이미지 첨부 지원
- ✅ 스레드 방식 댓글 시스템
- ✅ 현대적이고 직관적인 UI
- ✅ Docker로 간편 배포
- ✅ 무료 오픈소스

### 구성 요소
1. **PostgreSQL** - 데이터베이스
2. **Redis** - 캐시 및 세션 관리
3. **Taiga Backend** - API 서버
4. **Taiga Frontend** - 웹 인터페이스
5. **Nginx** - 리버스 프록시

## 설치 및 실행

### 1. 환경 설정
```bash
# SECRET_KEY 변경 (보안상 중요)
# docker-compose.yml에서 SECRET_KEY 값을 랜덤한 값으로 변경

# 이메일 설정
# DEFAULT_FROM_EMAIL과 SERVER_EMAIL을 회사 도메인으로 변경
```

### 2. 실행
```bash
docker-compose up -d
```

### 3. 접속
- URL: http://localhost:8080
- 초기 관리자 계정 생성 필요

## 대안 솔루션

### 1. Mattermost (채팅 기반)
- 실시간 채팅과 이슈 트래킹 통합
- 플러그인을 통한 기능 확장 가능

### 2. Redmine (전통적)
- 강력한 이슈 트래킹 기능
- 다양한 플러그인 지원
- 익명 등록 설정 가능

### 3. GitLab (통합 플랫폼)
- 이슈 트래킹 + 버전 관리 통합
- CI/CD 파이프라인 포함

## 다음 단계
1. Taiga.io 초기 설정 및 테스트
2. 익명 등록 설정 확인
3. 이미지 업로드 기능 테스트
4. 사용자 교육 및 가이드 작성
