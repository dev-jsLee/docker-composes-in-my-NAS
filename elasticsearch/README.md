# Elasticsearch 파일 검색 시스템

## 개요
이 Docker Compose 설정은 Elasticsearch를 사용한 파일 검색 시스템을 제공합니다.

## 구성 요소
- **Elasticsearch**: 검색 엔진
- **Kibana**: 관리 및 시각화 도구
- **Logstash**: 파일 처리 및 인덱싱

## 사용 방법

### 1. 서비스 시작
```bash
docker-compose up -d
```

### 2. 서비스 확인
- **Elasticsearch**: http://[NAS_IP]:9200
- **Kibana**: http://[NAS_IP]:5601

### 3. 파일 검색 설정
1. 검색할 파일들을 `./documents/` 폴더에 복사
2. Logstash가 자동으로 파일을 인덱싱
3. Kibana에서 검색 및 관리

## 디렉토리 구조
```
elasticsearch/
├── docker-compose.yml
├── config/
│   ├── elasticsearch.yml
│   └── logstash.conf
├── documents/          # 검색할 파일들
└── elasticsearch_data/ # Elasticsearch 데이터
```

## 주요 설정

### Elasticsearch
- 포트: 9200
- 보안: 비활성화 (개발용)
- 메모리: 2GB 제한

### Kibana
- 포트: 5601
- Elasticsearch 자동 연결

### Logstash
- 포트: 5044
- 파일 모니터링: `./documents/**/*`
- 자동 인덱싱

## 검색 예시

### API로 검색
```bash
# 모든 파일 검색
curl -X GET "http://[NAS_IP]:9200/file_search/_search?pretty"

# 특정 파일명 검색
curl -X GET "http://[NAS_IP]:9200/file_search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "file_name": "문서명"
    }
  }
}'

# 파일 타입별 검색
curl -X GET "http://[NAS_IP]:9200/file_search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {
      "file_type": "document"
    }
  }
}'
```

### Kibana에서 검색
1. http://[NAS_IP]:5601 접속
2. "Discover" 메뉴 선택
3. "file_search" 인덱스 선택
4. 검색어 입력

## 주의사항
- 운영환경에서는 보안 설정을 활성화하세요
- 메모리 사용량을 모니터링하세요
- 정기적으로 데이터를 백업하세요
