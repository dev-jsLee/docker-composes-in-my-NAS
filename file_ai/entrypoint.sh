#!/usr/bin/env sh
set -e

# 기본값: 컬러 추적 활성화
: "${COLOR:=1}"
: "${INPUT_DIR:=/work/in}"
: "${OUTPUT_DIR:=/work/out}"
: "${CONCURRENCY:=1}"

# 권한 맞추기 (DSM 호환: PUID/PGID)
if [ -n "$PUID" ] && [ -n "$PGID" ]; then
  addgroup -g "$PGID" appgroup 2>/dev/null || true
  adduser -D -G appgroup -u "$PUID" appuser 2>/dev/null || true
else
  PUID=0; PGID=0
fi

mkdir -p "$INPUT_DIR" "$OUTPUT_DIR"
chown -R "$PUID":"$PGID" "$INPUT_DIR" "$OUTPUT_DIR" || true

# 입력이 파일 하나면 그 파일만, 디렉터리면 전체 배치 처리
process_file() {
  in_file="$1"
  base="$(basename "$in_file")"
  name="${base%.*}"
  out_file="$OUTPUT_DIR/${name}.svg"
  if [ "$COLOR" = "1" ] || [ "$COLOR" = "true" ]; then
    vtracer -i "$in_file" -o "$out_file" --color
  else
    vtracer -i "$in_file" -o "$out_file"
  fi
}

is_image() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    *.jpg|*.jpeg|*.png|*.bmp|*.gif|*.webp|*.tif|*.tiff) return 0 ;;
    *) return 1 ;;
  esac
}

if [ $# -ge 1 ]; then
  # 명령행 인수로 파일/디렉토리 받기
  for p in "$@"; do
    if [ -f "$p" ]; then
      is_image "$p" && process_file "$p" || echo "Skip (not image): $p"
    elif [ -d "$p" ]; then
      find "$p" -maxdepth 1 -type f | while read -r f; do
        is_image "$f" && process_file "$f" || echo "Skip (not image): $f"
      done
    fi
  done
else
  # INPUT_DIR 전체 처리
  find "$INPUT_DIR" -maxdepth 1 -type f | while read -r f; do
    is_image "$f" && process_file "$f" || echo "Skip (not image): $f"
  done
fi

# 결과 권한 정리
chown -R "$PUID":"$PGID" "$OUTPUT_DIR" || true

echo "Done. Outputs in $OUTPUT_DIR"
