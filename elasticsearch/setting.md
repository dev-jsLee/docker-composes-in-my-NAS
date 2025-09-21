# Elasticsearch Docker 설정 가이드

## DSM 작업 스케줄러를 이용한 권한 확인

### 1. 작업 스케줄러 설정

#### DSM에서 작업 생성
1. **제어판** → **작업 스케줄러**
2. **생성** → **사용자 정의 스크립트**
3. **일반** 탭 설정:
   - 작업 이름: `Docker 권한 확인`
   - 사용자: `Docker` (또는 해당 계정)
   - 활성화: ✅ 체크

#### 스크립트 작성
**스크립트 내용:**
```bash
#!/bin/bash

# ===== 설정 변수 =====
# 검색할 폴더 경로들 (여러 폴더 지원)
SEARCH_FOLDERS=(
    # "/volume1/공유폴더_2024/☞대상물_1"
    "/volume1/공유폴더_2024/☞대상물_2"
    "/volume1/검색파일"
)

# Docker 관련 폴더들
DOCKER_FOLDERS=(
    "/var/packages/Docker/target"
    "/volume1/docker"
    "/volume1/@docker"
)

# ===== Docker 계정 권한 확인 =====
echo "=== Docker 계정 권한 확인 ==="
echo "현재 사용자: $(whoami)"
echo "현재 그룹: $(groups)"
echo "사용자 ID: $(id)"

echo ""
echo "=== 검색 폴더 접근 권한 확인 ==="
for folder in "${SEARCH_FOLDERS[@]}"; do
    echo "--- 폴더: $folder ---"
    if [ -d "$folder" ]; then
        echo "폴더 존재: 예"
        echo "폴더 권한: $(ls -ld "$folder")"
        echo "폴더 내용 (최대 10개):"
        ls -la "$folder" | head -10
        echo "폴더 크기: $(du -sh "$folder" 2>/dev/null || echo '크기 확인 불가')"
    else
        echo "폴더 존재: 아니오"
    fi
    echo ""
done

echo "=== Docker 관련 폴더 권한 확인 ==="
for folder in "${DOCKER_FOLDERS[@]}"; do
    echo "--- 폴더: $folder ---"
    if [ -d "$folder" ]; then
        echo "폴더 존재: 예"
        echo "폴더 권한: $(ls -ld "$folder")"
    else
        echo "폴더 존재: 아니오"
    fi
done

echo ""
echo "=== 시스템 정보 ==="
echo "시스템 시간: $(date)"
echo "디스크 사용량:"
df -h /volume1
echo ""
echo "메모리 사용량:"
free -h
```

### 2. 실행 및 결과 확인

#### 작업 실행
1. **작업 스케줄러** → 생성한 작업 선택
2. **실행** 버튼 클릭

#### 결과 확인
1. **작업 스케줄러** → **로그** 탭
2. 해당 작업의 **결과** 클릭
3. 권한 정보 확인

### 3. 권한 문제 해결

#### 방법 1: DSM 사용자 권한 설정
1. **제어판** → **사용자** → **Docker** 계정 선택
2. **편집** → **권한** 탭
3. **공유 폴더** 권한에서 **검색파일** 폴더 **읽기** 권한 부여

#### 방법 2: 폴더 권한 직접 설정
1. **파일 스테이션** → **검색파일** 폴더 우클릭
2. **속성** → **권한** 탭
3. **Docker** 사용자에게 **읽기** 권한 부여

### 4. 변수 관리 및 자동화 스크립트

#### 폴더 경로 변수 관리
**검색할 폴더 경로를 쉽게 변경하려면:**

1. **docker-compose.yml** 파일 상단의 `x-search-folders` 섹션 수정
2. **Logstash volumes** 섹션에서 마운트 경로 수정
3. **logstash.conf** 파일에서 input 섹션의 path 수정

#### 폴더 생성 및 권한 자동 설정
```bash
#!/bin/bash

# ===== 설정 변수 =====
SEARCH_FOLDERS=(
    "/volume1/공유폴더_2024/☞대상물_1"
    "/volume1/공유폴더_2024/☞대상물_2"
    "/volume1/검색파일"
)

# ===== 폴더 생성 및 권한 설정 =====
for folder in "${SEARCH_FOLDERS[@]}"; do
    echo "폴더 생성 및 권한 설정: $folder"
    mkdir -p "$folder"
    chmod 755 "$folder"
    chown docker:users "$folder"
done

echo "모든 검색 폴더 생성 및 권한 설정 완료"
```

#### 폴더 경로 변경 스크립트
```bash
#!/bin/bash

# ===== 새로운 폴더 경로 설정 =====
NEW_FOLDERS=(
    "/volume1/새로운폴더1"
    "/volume1/새로운폴더2"
)

# ===== docker-compose.yml 업데이트 =====
echo "docker-compose.yml 업데이트 중..."
# 실제 구현에서는 sed나 다른 도구를 사용하여 파일 수정

# ===== Logstash 설정 업데이트 =====
echo "logstash.conf 업데이트 중..."
# 실제 구현에서는 설정 파일 자동 업데이트

echo "폴더 경로 변경 완료"
```

### 5. Docker Compose 실행

#### 서비스 시작
```bash
cd elasticsearch
docker-compose up -d
```

#### 서비스 확인
- **Elasticsearch**: http://[NAS_IP]:11901
- **Kibana**: http://[NAS_IP]:11903

### 6. 파일 검색 설정

#### 검색할 파일 준비
1. Synology NAS에서 `/volume1/검색파일/` 폴더 생성
2. 검색할 파일들을 해당 폴더에 복사
3. Logstash가 자동으로 파일을 인덱싱

#### Kibana에서 검색
1. http://[NAS_IP]:11903 접속
2. **Discover** 메뉴 선택
3. **file_search** 인덱스 선택
4. 검색어 입력

### 7. 문제 해결

#### 권한 오류 발생 시
1. 작업 스케줄러로 권한 재확인
2. Docker 계정에 적절한 권한 부여
3. 컨테이너 재시작: `docker-compose restart`

#### 메모리 부족 시
1. docker-compose.yml에서 `mem_limit` 조정
2. NAS의 메모리 사용량 확인
3. 다른 서비스 중지 후 재시작

#### 포트 충돌 시
1. docker-compose.yml에서 포트 번호 변경
2. 기존 서비스 중지 후 재시작

### 8. 모니터링

#### 시스템 리소스 확인
```bash
# 메모리 사용량
free -h

# 디스크 사용량
df -h

# Docker 컨테이너 상태
docker ps
```

#### Elasticsearch 상태 확인
```bash
# 클러스터 상태
curl http://localhost:11901/_cluster/health

# 인덱스 상태
curl http://localhost:11901/_cat/indices
```

### 9. 백업 및 유지보수

#### 데이터 백업
1. `./elasticsearch_data/` 폴더 백업
2. 설정 파일 백업: `./config/` 폴더
3. 정기적인 백업 스케줄 설정

#### 로그 관리
1. Docker 로그 확인: `docker logs elasticsearch`
2. 로그 파일 정리 스케줄 설정
3. 디스크 공간 모니터링

### 10. 보안 설정 (운영환경)

#### Elasticsearch 보안 활성화
```yaml
environment:
  - xpack.security.enabled=true
  - xpack.security.enrollment.enabled=true
```

#### 방화벽 설정
1. 필요한 포트만 개방
2. IP 제한 설정
3. SSL/TLS 인증서 설정

---

**주의사항:**
- 운영환경에서는 반드시 보안 설정을 활성화하세요
- 정기적으로 시스템 리소스를 모니터링하세요
- 중요한 데이터는 별도로 백업하세요
