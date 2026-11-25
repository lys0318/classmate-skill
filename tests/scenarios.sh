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
  printf '{"enabled": true, "level": "%s", "mode": "꼼꼼하게"}\n' "$1" > "$C/config.json"
}
# prep_app 직후 전용: 모드만 바꾼 config로 다시 쓴다
set_mode() { printf '{"enabled": true, "level": "중급", "mode": "%s"}\n' "$1" > "$C/config.json"; }

prep_S1() { mkdir -p "$T/home" "$P"; }
check_S1() {
  expect "전역 블록 1개" "$(blocks "$T/home/.claude/CLAUDE.md")" 1
  valid
  expect "level" "$(cfg level)" "중급"
  expect "enabled" "$(cfg enabled)" "true"
  expect "mode" "$(cfg mode)" "가볍게"
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
  expect "mode" "$(cfg mode)" "꼼꼼하게"
}

prep_S3() { mkdir -p "$T/home" "$P"; }
check_S3() {
  expect "Codex 전역 블록 1개" "$(blocks "$T/home/.codex/AGENTS.md")" 1
  expect "~/.claude 안 만듦" "$([ -e "$T/home/.claude" ] && echo 있음 || echo 없음)" "없음"
  valid
  expect "level" "$(cfg level)" "입문"
  expect "mode" "$(cfg mode)" "가볍게"
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
  printf '*\n' > "$C/.gitignore"  # fixture에 두면 자기 폴더를 git에서 숨기므로 여기서 만든다
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

prep_S12() { prep_app; mkdir -p "$C/features"; cp "$REPO/tests/fixtures/backslash-note.md" "$C/features/001-할-일-추가.md"; }
check_S12() {
  valid
  # 스크립트는 표준 입력으로 넘긴다: Windows에서 -e 인자로 넘기면 백슬래시가 바뀐다
  local out; out=$(node - "$C/report-data.js" 2>&1 <<'JS'
const vm = require('vm'), fs = require('fs');
const c = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), c);
const qs = (c.window.CLASSMATE_DATA.features || []).flatMap((f) => f.questions || []);
const bs = qs.some((q) => (q.explanation || '').includes("split('\\n')") && (q.explanation || '').includes('C:\\temp\\notes.txt'));
const w = qs.find((q) => q.type === '객관식' && q.result === '틀림');
const txt = (s) => /[가-힣A-Za-z]/.test((s || '').replace(/^[①②③④]\s*/, ''));
console.log([bs ? '백슬래시OK' : '백슬래시깨짐', w && txt(w.answer) && txt(w.userAnswer) ? '보기글OK' : '번호만'].join(' '));
JS
)
  expect "리포트 데이터: 백슬래시 그대로, 객관식 답에 보기 글" "$out" "백슬래시OK 보기글OK"
}

prep_S13() { prep_app; }
check_S13() {
  local f="$C/features/001-할-일-추가.md"
  valid
  expect "노트 저장됨" "$([ -f "$f" ] && echo 있음 || echo 없음)" "있음"
  expect "status" "$(status "$f")" "deferred"
  expect "미응답 3개" "$(grep -c '^결과: 미응답' "$f" 2>/dev/null)" 3
  expect "코드 변경 없음" "$(diff -r "$REPO/tests/fixtures/sample-app" "$P" -x .classmate >/dev/null && echo 없음 || echo 있음)" "없음"
}

nnoted() { grep -l '^status: noted' "$C"/features/*.md 2>/dev/null | wc -l | tr -d ' '; }

prep_S15() { prep_app; set_mode 가볍게; }
check_S15() {
  valid
  expect "노트 2개" "$(nfeat)" 2
  expect "모두 noted" "$(nnoted)" 2
  expect "문제 없음" "$(qcount "$C"/features/*.md)" 0
}

prep_S16() {
  prep_app; set_mode 가볍게; mkdir -p "$C/features"
  local n; for n in 1 2 3 4; do
    sed -e "s/^id: 001/id: 00$n/" -e "s/^feature: .*/feature: 기능 $n/" "$REPO/tests/fixtures/noted-note.md" > "$C/features/00$n-기능-$n.md"
  done
}
check_S16() {
  valid
  expect "노트 5개" "$(nfeat)" 5
  expect "모두 noted" "$(nnoted)" 5
  expect "새 노트 005" "$(ls "$C"/features/005-*.md >/dev/null 2>&1 && echo 있음 || echo 없음)" "있음"
}

prep_S17()  { prep_app; set_mode 직접만; }
check_S17() { expect "노트 없음" "$(nfeat)" 0; }

prep_S18() { prep_app; }
check_S18() {
  valid
  expect "mode" "$(cfg mode)" "직접만"
  expect "level 그대로" "$(cfg level)" "중급"
}

prep_S23() {
  prep_S11
  sed -e 's/^id: 001/id: 002/' -e 's/^feature: .*/feature: 할 일 삭제/' \
      -e 's/^- 흐름: .*/- 흐름: 삭제 버튼 → removeTodo(id) → todos 배열에서 제거 → render()/' \
      -e 's/^- 이유: .*/- 이유: 기록 없음/' -e 's/^- 막혔던 것: .*/- 막혔던 것: 없음/' \
      "$REPO/tests/fixtures/noted-note.md" > "$C/features/002-할-일-삭제.md"
}
check_S23() {
  local f="$C/features/002-할-일-삭제.md" q2 qr
  valid
  expect "noted 노트 0개" "$(nnoted)" 0
  q2=$(qcount "$f"); qr=$(qcount "$C"/reviews/*.md)
  expect "002에 문제 1개 이상" "$([ "$q2" -ge 1 ] && echo 있음 || echo "$q2")" "있음"
  expect "002 문제 + 복습 문제 5~10" "$([ $((q2 + qr)) -ge 5 ] && [ $((q2 + qr)) -le 10 ] && echo 범위 || echo "$((q2 + qr))")" "범위"
  expect "report-data에 noted 없음" "$(grep -c '"status": *"noted"' "$C/report-data.js" 2>/dev/null || true)" 0
}

prep_S24() { prep_app; set_mode 직접만; mkdir -p "$C/features"; cp "$REPO/tests/fixtures/noted-note.md" "$C/features/001-할-일-추가.md"; }
check_S24() {
  local f="$C/features/001-할-일-추가.md"
  valid
  expect "status" "$(status "$f")" "done"
  expect "문제 3개" "$(qcount "$f")" 3
}

# learn용 준비: $1 = owner(없으면 .classmate를 만들지 않음), $2 = 모든 장의 상태
prep_learn() {
  mkdir -p "$P" "$T/home"; cp -r "$REPO/tests/fixtures/sample-app/." "$P/"
  [ -z "${1:-}" ] && return 0
  mkdir -p "$C"; printf '*\n' > "$C/.gitignore"
  printf '{"enabled": false, "level": "중급", "mode": "가볍게"}\n' > "$C/config.json"
  sed -e "s/^owner: OWNER/owner: $1/" -e "s/| 대기 |\$/| $2 |/" "$REPO/tests/fixtures/learn-map.md" > "$C/learn.md"
}
chstate() { sed -n "s/^| $1 | .* | \(대기\|완료\) |\$/\1/p" "$C/learn.md" 2>/dev/null; }
note1()   { ls "$C"/features/001-*.md 2>/dev/null | head -1; }

prep_S19() {
  prep_learn
  mkdir -p "$P/node_modules/big"
  local i; for i in $(seq 1 2000); do echo "module.exports.f$i = () => $i;"; done > "$P/node_modules/big/index.js"
}
check_S19() {
  local n w
  valid
  expect "enabled" "$(cfg enabled)" "false"
  expect "mode" "$(cfg mode)" "가볍게"
  expect "owner" "$(sed -n 's/^owner: //p' "$C/learn.md" 2>/dev/null)" "다른 사람"
  n=$(grep -cE '^\| [0-9]+ \|' "$C/learn.md" 2>/dev/null); w=$(grep -cE '^\| [0-9]+ \|.*\| 대기 \|$' "$C/learn.md" 2>/dev/null)
  expect "장 3~8개, 모두 대기" "$([ "${n:-0}" -ge 3 ] && [ "${n:-0}" -le 8 ] && [ "$n" = "$w" ] && echo ok || echo "$n/$w")" "ok"
  expect "전역 지침 안 건드림" "$( { [ -e "$T/home/.claude" ] || [ -e "$T/home/.codex" ]; } && echo 있음 || echo 없음)" "없음"
  expect "노트 없음" "$(nfeat)" 0
}

prep_S20() { prep_learn "다른 사람" 대기; }
check_S20() {
  local f; f=$(note1)
  valid
  expect "노트 001" "$([ -n "$f" ] && echo 있음 || echo 없음)" "있음"
  expect "kind" "$(sed -n 's/^kind: //p' "$f" 2>/dev/null)" "learn"
  expect "chapter" "$(sed -n 's/^chapter: //p' "$f" 2>/dev/null)" "1"
  expect "status" "$(status "$f")" "done"
  expect "문제 3개" "$(qcount "$f")" 3
  expect "이유는 추정 또는 기록 없음" "$(grep -qE '^- 이유: (\(추정|기록 없음)' "$f" 2>/dev/null && echo ok || echo 다름)" "ok"
  expect "1장 완료" "$(chstate 1)" "완료"
  expect "2장 대기" "$(chstate 2)" "대기"
}

prep_S21() { prep_learn 본인 대기; }
check_S21() {
  local f; f=$(note1)
  valid
  expect "chapter" "$(sed -n 's/^chapter: //p' "$f" 2>/dev/null)" "2"
  expect "status" "$(status "$f")" "deferred"
  expect "이유에 본인 기억" "$(grep -q '^- 이유: (본인 기억)' "$f" 2>/dev/null && echo ok || echo 다름)" "ok"
  expect "2장 완료" "$(chstate 2)" "완료"
  expect "1장 대기" "$(chstate 1)" "대기"
}

prep_S22() { prep_learn "다른 사람" 완료; cp "$C/learn.md" "$T/learn.orig.md"; }
check_S22() {
  valid
  expect "learn.md 그대로" "$(cmp -s "$T/learn.orig.md" "$C/learn.md" && echo 같음 || echo 다름)" "같음"
  expect "노트 없음" "$(nfeat)" 0
}

[ "$cmd" = prep ] && set -e  # 준비가 하나라도 실패하면 종료 코드 1
prep_S14()  { prep_app; }
check_S14() { check_S13; }

"${cmd}_${s}"
if [ "$cmd" = check ]; then
  [ $fail -eq 0 ] && echo "$s PASS" || echo "$s FAIL"
  exit $fail
fi
