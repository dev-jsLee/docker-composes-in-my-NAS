# 익명 이슈 트래킹 시스템

QA 단계에서 사용할 익명 이슈 트래킹 시스템입니다.

## 🚀 빠른 시작

### Taiga.io (추천)
```bash
# 1. SECRET_KEY 변경
# docker-compose.yml에서 SECRET_KEY를 랜덤한 값으로 변경

# 2. 실행
docker-compose up -d

# 3. 접속
# http://localhost:52030
```

### Mattermost (채팅 기반)
```bash
# 실행
docker-compose -f docker-compose-mattermost.yml up -d

# 접속  
# http://localhost:52030
```

## 📋 주요 기능

- ✅ 익명 이슈 등록
- ✅ 이미지 첨부
- ✅ 스레드 방식 댓글
- ✅ 실시간 알림
- ✅ 모바일 지원

## 🔧 설정

### Taiga.io 초기 설정
1. 관리자 계정 생성
2. 프로젝트 생성
3. 익명 등록 활성화
4. 이슈 템플릿 설정

### Mattermost 초기 설정
1. 관리자 계정 생성
2. 팀 생성
3. 채널 설정
4. 익명 사용자 정책 설정

## 📞 지원

문제가 있으시면 개발팀에 문의해주세요.
