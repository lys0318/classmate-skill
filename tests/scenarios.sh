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

prep_app() {
  mkdir -p "$P" "$T/home/.claude"; cp -r "$REPO/tests/fixtures/sample-app/." "$P/"; enabled_project 중급
  printf '%s\n' "$BLOCK" > "$T/home/.claude/CLAUDE.md"
}
qcount()   { cat "$@" 2>/dev/null | grep -c '^### Q'; }
nfeat()    { ls "$C/features" 2>/dev/null | wc -l | tr -d ' '; }
status()   { sed -n 's/^status: //p' "$1" 2>/dev/null; }

prep_S5() { prep_app; }
check_S5() {
  local f="$C/features/001-할-일-추가.md"
  expect "노트 001-할-일-추가.md" "$([ -f "$f" ] && echo 있음 || echo 없음)" "있음"
  valid
  expect "문제 3개" "$(qcount "$f")" 3
  expect "객관식 2개" "$(grep -c '^### Q.*객관식$' "$f" 2>/dev/null)" 2
  expect "status" "$(status "$f")" "done"
}

prep_S6() { prep_app; }
check_S6() {
  local f="$C/features/001-할-일-추가.md"
  valid
  expect "status" "$(status "$f")" "deferred"
  expect "미응답 3개" "$(grep -c '^결과: 미응답' "$f" 2>/dev/null)" 3
}

prep_S7()  { prep_app; }
check_S7() { expect "노트 없음" "$(nfeat)" 0; }
prep_S7b() { prep_app; printf '{"enabled": false, "level": "중급"}\n' > "$C/config.json"; }
check_S7b() { expect "노트 없음" "$(nfeat)" 0; }

prep_S8() { prep_app; mkdir -p "$C/features"; cp "$REPO/tests/fixtures/deferred-note.md" "$C/features/001-할-일-추가.md"; }
check_S8() {
  local f="$C/features/001-할-일-추가.md"
  valid
  expect "status" "$(status "$f")" "done"
  expect "미응답 0개" "$(grep -c '^결과: 미응답' "$f")" 0
}

prep_S9()  { prep_app; }
check_S9() { expect "노트 없음" "$(nfeat)" 0; }

prep_S10() { prep_app; }
check_S10() {
  expect "노트 001" "$(ls "$C"/features/001-*.md >/dev/null 2>&1 && echo 있음 || echo 없음)" "있음"
  expect "노트 002" "$(ls "$C"/features/002-*.md >/dev/null 2>&1 && echo 있음 || echo 없음)" "있음"
  local n; n=$(qcount "$C"/features/*.md)
  expect "전체 문제 3~5개" "$([ "$n" -ge 3 ] && [ "$n" -le 5 ] && echo 범위 || echo "$n")" "범위"
  valid
}

prep_S11() {
  mkdir -p "$P" "$T/home/.claude"; cp -r "$REPO/tests/fixtures/sample-app/." "$P/"
  cp -r "$REPO/tests/fixtures/classmate-review" "$C"
  printf '%s\n' "$BLOCK" > "$T/home/.claude/CLAUDE.md"
}
check_S11() {
  valid
  local n_rev; n_rev=$(ls "$C"/reviews/*.md 2>/dev/null | wc -l | tr -d ' ')
  expect "복습 기록 1개" "$n_rev" 1
  local q; q=$(qcount "$C"/reviews/*.md)
  # 미룬 문제 3개는 원래 노트(002)에 기록되므로, 복습 기록의 새 문제와 합쳐 5~10개
  expect "새 문제 2개 이상, 합계 5~10" "$([ "$q" -ge 2 ] && [ $((q + 3)) -le 10 ] && echo 범위 || echo "$q")" "범위"
  expect "002 status" "$(status "$C/features/002-할-일-삭제.md")" "done"
  expect "report.html = 틀 그대로" "$(cmp -s "$REPO/skills/classmate/assets/report-template.html" "$C/report.html" && echo 같음 || echo 다름)" "같음"
  expect "할 일 삭제 이유 = 기록 없음" "$(node -e '
    const vm=require("vm"),fs=require("fs");const c=vm.createContext({window:{}});
    vm.runInContext(fs.readFileSync(process.argv[1],"utf8"),c);
    const d=(c.window.CLASSMATE_DATA.decisions||[]).find(x=>x.feature==="할 일 삭제");console.log(d?d.why:"(없음)")' "$C/report-data.js" 2>/dev/null)" "기록 없음"
}

"${cmd}_${s}"
if [ "$cmd" = check ]; then
  [ $fail -eq 0 ] && echo "$s PASS" || echo "$s FAIL"
  exit $fail
fi
