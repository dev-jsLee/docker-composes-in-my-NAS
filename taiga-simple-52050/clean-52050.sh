#!/bin/bash

# Taiga 이슈 트래킹 시스템 완전 정리 스크립트 (포트 52050)

echo "⚠️  경고: 모든 데이터가 삭제됩니다!"
echo "포트: 52050"
echo ""

read -p "정말로 모든 데이터를 삭제하시겠습니까? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
    echo ""
    echo "🗑️  모든 데이터를 삭제합니다..."
    
    # 컨테이너와 볼륨 완전 삭제
    echo "📦 컨테이너와 볼륨을 삭제합니다..."
    docker-compose -f docker-compose-52050.yml down -v
    
    # 데이터 디렉토리 삭제
    echo "📁 데이터 디렉토리를 삭제합니다..."
    sudo rm -rf /volume4/warehouse/taiga-52050
    
    # 이미지 정리 (선택사항)
    echo "🖼️  사용하지 않는 이미지를 정리합니다..."
    docker image prune -f
    
    echo ""
    echo "✅ 완전 정리 완료!"
    echo ""
    echo "💡 새로 시작하려면: ./start-52050.sh"
    
else
    echo ""
    echo "❌ 취소되었습니다."
    echo "💡 단순 중지만 하려면: ./stop-52050.sh"
fi
