# 익명 이슈 트래킹 시스템 구축 계획

## 개요
QA 단계에서 사용할 익명 이슈 트래킹 시스템을 Docker로 구축합니다.

## 🚨 Taiga.io 오류 해결

### 발생한 문제
- `SECRET_KEY setting must not be empty` 오류 발생
- Django 설정 문제로 컨테이너 시작 실패

### 적용한 해결책
1. **환경변수 추가**: `TAIGA_SECRET_KEY`와 `SECRET_KEY` 모두 설정
2. **도메인 설정**: `TAIGA_SITES_DOMAIN`과 `TAIGA_SITES_SCHEME` 추가
3. **재시작 정책**: `on-failure:2`로 변경

## ⭐ 추천 솔루션: Plane.so (NEW)

### 왜 Plane.so인가?
- ✅ **최신 기술**: 현대적인 Next.js + Django 스택
- ✅ **안정성**: Taiga보다 설정이 간단하고 안정적
- ✅ **익명 지원**: 게스트 사용자 이슈 등록 가능
- ✅ **이미지 첨부**: MinIO 통합으로 완벽한 파일 업로드
- ✅ **스레드 댓글**: 실시간 댓글 시스템
- ✅ **모던 UI**: GitHub Issues와 유사한 직관적 인터페이스

### 실행 방법
```bash
# Plane.so 실행 (추천)
docker-compose -f docker-compose-plane.yml up -d

# 접속: http://localhost:52030 (프론트엔드)
# API: http://localhost:52031 (백엔드)
```

### 구성 요소
1. **PostgreSQL** - 데이터베이스
2. **Redis** - 캐시 및 세션
3. **MinIO** - 파일 저장소 (이미지 첨부용)
4. **Plane Backend** - Django API
5. **Plane Frontend** - Next.js 웹앱
6. **Nginx** - 리버스 프록시

## 대안 솔루션

### 1. Taiga.io (수정된 버전)
- **파일**: `docker-compose.yml`
- **상태**: SECRET_KEY 오류 수정 완료
- **접속**: http://localhost:52030

### 2. 기타 옵션
- **Redmine**: 전통적이지만 안정적
- **GitLab**: 통합 개발 플랫폼
- **Mattermost**: 채팅 기반 협업

## 권장사항

1. **1순위**: Plane.so (`docker-compose-plane.yml`) - 가장 안정적
2. **2순위**: 수정된 Taiga.io (`docker-compose.yml`) - 문제 해결됨
3. **3순위**: 다른 대안 검토

## 다음 단계
1. Plane.so로 테스트 진행
2. 익명 등록 기능 확인
3. 이미지 업로드 테스트
4. QA 팀 교육 준비
