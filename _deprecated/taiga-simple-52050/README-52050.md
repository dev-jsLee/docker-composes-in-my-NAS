# Taiga 이슈 트래킹 시스템 - 포트 52050

QA 단계에서 사용할 익명 이슈 트래킹 시스템입니다.

## 🚀 빠른 시작

### 실행 방법
```bash
# 1. 디렉토리 생성 (DSM에서 필요)
sudo mkdir -p /volume4/warehouse/taiga-52050/{postgres-data,media,static}
sudo chown -R 1000:1000 /volume4/warehouse/taiga-52050

# 2. 실행
docker-compose -f docker-compose-52050.yml up -d

# 3. 접속
# http://localhost:52050
```

### 중지 및 정리
```bash
# 서비스 중지
docker-compose -f docker-compose-52050.yml down

# 데이터까지 완전 삭제
docker-compose -f docker-compose-52050.yml down -v
```

## 📋 주요 기능

- ✅ **익명 이슈 등록**: 회원가입 없이 이슈 등록 가능
- ✅ **이미지 첨부**: 스크린샷, 파일 업로드 지원  
- ✅ **스레드 댓글**: 이슈별 댓글 및 토론
- ✅ **실시간 알림**: WebSocket 기반 즉시 알림
- ✅ **모바일 지원**: 반응형 웹 디자인
- ✅ **프로젝트 관리**: 여러 프로젝트 동시 관리

## 🔧 초기 설정

### 1. 관리자 계정 생성
1. http://localhost:52050 접속
2. 우상단 "Sign up" 클릭
3. 관리자 계정 생성

### 2. 프로젝트 생성
1. "Create Project" 클릭
2. 프로젝트 이름: "QA Issues"
3. 설명: "웹사이트 QA 이슈 트래킹"
4. Public 설정 활성화

### 3. 익명 접근 설정
1. 프로젝트 설정 → Admin → Permissions
2. "Anonymous User" 권한 활성화:
   - View project
   - Add issues
   - Add comments
   - View issues

## 📊 시스템 구성

### 컨테이너 구성
- **PostgreSQL**: 데이터베이스 (포트: 내부 5432)
- **Taiga Backend**: Django API 서버 (포트: 내부 8000)
- **Taiga Frontend**: Angular 웹앱 (포트: 내부 80)
- **Nginx**: 리버스 프록시 (포트: 52050)

### 주요 경로
- **메인**: http://localhost:52050
- **API**: http://localhost:52050/api/v1/
- **관리자**: http://localhost:52050/admin/
- **헬스체크**: http://localhost:52050/health

## 🛠️ 문제 해결

### 로그 확인
```bash
# 전체 로그
docker-compose -f docker-compose-52050.yml logs

# 개별 컨테이너 로그
docker logs taiga-back-52050
docker logs taiga-front-52050  
docker logs taiga-nginx-52050
docker logs taiga-postgres-52050
```

### 컨테이너 상태 확인
```bash
# 실행 중인 컨테이너
docker ps | grep 52050

# 모든 컨테이너 상태
docker-compose -f docker-compose-52050.yml ps
```

### 데이터베이스 초기화
```bash
# 데이터베이스 리셋 (주의: 모든 데이터 삭제)
docker-compose -f docker-compose-52050.yml down -v
docker-compose -f docker-compose-52050.yml up -d
```

## 🔒 보안 설정

### 프로덕션 환경 권장사항
1. **SECRET_KEY 변경**: 현재 예시 키를 랜덤 값으로 변경
2. **데이터베이스 비밀번호 변경**: `taiga123`을 강력한 비밀번호로 변경
3. **HTTPS 설정**: SSL 인증서 적용
4. **방화벽 설정**: 필요한 포트만 개방

## 📞 지원

### 일반적인 문제들
- **하얀 화면**: Backend 로그 확인, 컨테이너 재시작
- **API 연결 실패**: Nginx 설정 확인, 네트워크 연결 확인
- **파일 업로드 실패**: 볼륨 권한 확인, 디스크 용량 확인

### 추가 도움
문제가 지속되면 다음 정보와 함께 문의:
1. 오류 메시지
2. 브라우저 개발자 도구 콘솔 로그
3. Docker 컨테이너 로그

---

**버전**: 1.0  
**포트**: 52050  
**업데이트**: 2025-09-26
