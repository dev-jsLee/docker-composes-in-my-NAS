# syntax=docker/dockerfile:1
FROM ghcr.io/visioncortex/vtracer:latest

ENV TZ=Asia/Seoul \
    PUID=1000 \
    PGID=1000

# 작업 디렉터리 준비
RUN mkdir -p /app /work/in /work/out

# 엔트리포인트 스크립트 추가
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /work

ENTRYPOINT ["/app/entrypoint.sh"]
