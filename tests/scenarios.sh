#!/usr/bin/env bash
# 시나리오 점검의 준비·검사 부분. 대화 맥락·입력·답·확인 항목은 tests/scenarios.md에 있다.
# 사용법: bash tests/scenarios.sh prep|check <S번호> <임시 폴더 T>
set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cmd=${1:?prep|check}; s=${2:?시나리오 번호}; T=${3:?임시 폴더}
P="$T/my project"; C="$P/.classmate"
fail=0

ok()     { echo "  ok   $1"; }
bad()    { echo "  FAIL $1"; fail=1; }
expect() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (기대 '$3', 실제 '$2')"; fi; }
blocks() { if [ -f "$1" ]; then grep -c 'classmate:start' "$1"; else echo 0; fi; }
cfg()    { node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").replace(/^﻿/,""));console.log(c[process.argv[2]])' "$C/config.json" "$1" 2>/dev/null || echo "(config 없음)"; }
valid()  { local out; out=$(node "$REPO/tests/validate-classmate.mjs" "$C" 2>&1); expect "validate" "$out" "OK"; }

BLOCK='<!-- classmate:start -->
현재 프로젝트에 `.classmate/config.json`이 있고 enabled가 true이면,
기능 하나를 완성했을 때 classmate 스킬을 실행해 설명과 이해도 퀴즈를 제공한다.
<!-- classmate:end -->'

enabled_project() { # $1 = level
  mkdir -p "$C"
  printf '*\n' > "$C/.gitignore"
  printf '{"enabled": true, "level": "%s"}\n' "$1" > "$C/config.json"
}

prep_S1() { mkdir -p "$T/home" "$P"; }
check_S1() {
  expect "전역 블록 1개" "$(blocks "$T/home/.claude/CLAUDE.md")" 1
  valid
  expect "level" "$(cfg level)" "중급"
  expect "enabled" "$(cfg enabled)" "true"
}

prep_S2() {
  mkdir -p "$T/home/.claude" "$P"
  printf '# 내 규칙\n- 한국어로 답한다\n\n%s\n' "$BLOCK" > "$T/home/.claude/CLAUDE.md"
}
check_S2() {
  expect "전역 블록 1개" "$(blocks "$T/home/.claude/CLAUDE.md")" 1
  expect "기존 규칙 보존" "$(grep -c '^# 내 규칙$' "$T/home/.claude/CLAUDE.md")" 1
  valid
  expect "level" "$(cfg level)" "고급"
}

prep_S3() { mkdir -p "$T/home" "$P"; }
check_S3() {
  expect "Codex 전역 블록 1개" "$(blocks "$T/home/.codex/AGENTS.md")" 1
  expect "~/.claude 안 만듦" "$([ -e "$T/home/.claude" ] && echo 있음 || echo 없음)" "없음"
  valid
  expect "level" "$(cfg level)" "입문"
}

prep_S4() {
  mkdir -p "$T/home/.claude"
  printf '%s\n' "$BLOCK" > "$T/home/.claude/CLAUDE.md"
  enabled_project 중급
}
check_S4() {
  expect "level" "$(cfg level)" "고급"
  expect "enabled" "$(cfg enabled)" "false"
  expect "전역 블록 그대로" "$(blocks "$T/home/.claude/CLAUDE.md")" 1
  valid
}

"${cmd}_${s}"
if [ "$cmd" = check ]; then
  [ $fail -eq 0 ] && echo "$s PASS" || echo "$s FAIL"
  exit $fail
fi
