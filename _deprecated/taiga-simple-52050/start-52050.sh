#!/bin/bash

# Taiga 이슈 트래킹 시스템 시작 스크립트 (포트 52050)

echo "🚀 Taiga 이슈 트래킹 시스템을 시작합니다..."
echo "포트: 52050"
echo "접속 URL: http://localhost:52050"
echo ""

# 디렉토리 생성
echo "📁 필요한 디렉토리를 생성합니다..."
sudo mkdir -p /volume4/warehouse/taiga-52050/{postgres-data,media,static}
sudo chown -R 1000:1000 /volume4/warehouse/taiga-52050

# 기존 컨테이너 중지 (있다면)
echo "🛑 기존 컨테이너를 중지합니다..."
docker-compose -f docker-compose-52050.yml down 2>/dev/null

# 새 컨테이너 시작
echo "🔄 새로운 컨테이너를 시작합니다..."
docker-compose -f docker-compose-52050.yml up -d

# 시작 대기
echo "⏳ 서비스가 시작될 때까지 대기합니다..."
sleep 10

# 상태 확인
echo "📊 컨테이너 상태 확인:"
docker-compose -f docker-compose-52050.yml ps

echo ""
echo "✅ 시작 완료!"
echo ""
echo "🌐 접속 정보:"
echo "   - 메인 페이지: http://localhost:52050"
echo "   - API 문서: http://localhost:52050/api/v1/"
echo "   - 관리자 페이지: http://localhost:52050/admin/"
echo "   - 헬스체크: http://localhost:52050/health"
echo ""
echo "📋 다음 단계:"
echo "   1. 브라우저에서 http://localhost:52050 접속"
echo "   2. 관리자 계정 생성"
echo "   3. 프로젝트 생성"
echo "   4. 익명 접근 권한 설정"
echo ""
echo "🔧 문제 해결:"
echo "   - 로그 확인: docker logs taiga-back-52050"
echo "   - 재시작: ./restart-52050.sh"
echo "   - 중지: ./stop-52050.sh"
