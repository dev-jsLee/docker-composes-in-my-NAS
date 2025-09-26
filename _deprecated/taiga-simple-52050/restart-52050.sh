#!/bin/bash

# Taiga 이슈 트래킹 시스템 재시작 스크립트 (포트 52050)

echo "🔄 Taiga 이슈 트래킹 시스템을 재시작합니다..."
echo "포트: 52050"
echo ""

# 컨테이너 중지
echo "🛑 컨테이너를 중지합니다..."
docker-compose -f docker-compose-52050.yml down

# 잠시 대기
sleep 3

# 컨테이너 시작
echo "🚀 컨테이너를 시작합니다..."
docker-compose -f docker-compose-52050.yml up -d

# 시작 대기
echo "⏳ 서비스가 시작될 때까지 대기합니다..."
sleep 10

# 상태 확인
echo "📊 컨테이너 상태 확인:"
docker-compose -f docker-compose-52050.yml ps

echo ""
echo "✅ 재시작 완료!"
echo "🌐 접속: http://localhost:52050"
