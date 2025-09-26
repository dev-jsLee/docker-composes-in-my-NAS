#!/bin/bash

# Taiga 이슈 트래킹 시스템 중지 스크립트 (포트 52050)

echo "🛑 Taiga 이슈 트래킹 시스템을 중지합니다..."
echo "포트: 52050"
echo ""

# 컨테이너 중지
echo "📦 컨테이너를 중지합니다..."
docker-compose -f docker-compose-52050.yml down

echo ""
echo "✅ 중지 완료!"
echo ""
echo "💡 참고사항:"
echo "   - 데이터는 보존됩니다"
echo "   - 다시 시작: ./start-52050.sh"
echo "   - 완전 삭제: ./clean-52050.sh"
