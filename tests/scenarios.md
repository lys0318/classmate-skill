# 시나리오 점검

스킬 지시문(`skills/classmate/`)이 의도대로 동작하는지, 새 에이전트에게 연기시켜 확인한다.

## 실행 방법

1. 임시 폴더를 만들고 준비한다: `T=$(mktemp -d)`, `bash tests/scenarios.sh prep S1 "$T"`
2. 새 에이전트(서브에이전트)에게 아래 프롬프트를 보낸다. `{T}`는 임시 폴더의 절대 경로, `{PROJECT}`는 `{T}/my project`.
3. 검사한다: `bash tests/scenarios.sh check S1 "$T"` → 마지막 줄 `S1 PASS`
4. 에이전트 보고에서 `확인` 항목을 눈으로 점검한다.
5. 실제 `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`가 바뀌지 않았는지 확인한다(해시 비교).

```
너는 classmate 스킬이 설치된 코딩 에이전트({AGENT})다.
먼저 "<저장소>/skills/classmate/SKILL.md"를 읽고, 필요하면 그 안에서 가리키는 파일도 읽어 그대로 따른다.
- 홈 디렉터리(~)는 {T}/home, 현재 프로젝트 루트는 {PROJECT}로 간주하고 그 밖에는 쓰지 않는다.
  실제 사용자 홈의 파일은 절대 읽거나 쓰지 않는다.
- 대화 맥락: {CONTEXT}
- 사용자 입력: {INPUT}
- 사용자에게 질문하면 다음 답을 순서대로 받은 것으로 한다: {ANSWERS}
- 끝나면 사용자에게 보여줬을 메시지를 순서대로 그대로 보고한다.
```

## 시나리오

### S1 Claude Code 첫 켜기 (전역 파일 없음)
- AGENT: Claude Code
- CONTEXT: 없음
- INPUT: `/classmate on`
- ANSWERS: `동의`, `중급`
- 확인: 파일에 쓰기 전에 블록 내용과 경로(`~/.claude/CLAUDE.md`)를 보여주고 동의를 물었다.

### S2 Claude Code 두 번째 프로젝트 (전역 파일에 규칙과 블록이 이미 있음)
- AGENT: Claude Code
- CONTEXT: 없음
- INPUT: `/classmate on`
- ANSWERS: `고급`
- 확인: 전역 블록 동의를 다시 묻지 않았다.

### S3 Codex 첫 켜기 (`~/.codex` 없음)
- AGENT: Codex
- CONTEXT: 없음
- INPUT: `$classmate on`
- ANSWERS: `동의`, `입문`
- 확인: 블록을 `~/.codex/AGENTS.md`에 넣겠다고 보여줬다.

### S4 난이도 변경 후 끄기
- AGENT: Claude Code
- CONTEXT: 이 프로젝트에서 classmate를 이미 켜 두었다.
- INPUT: `/classmate level 고급`, 그다음 `/classmate off`
- ANSWERS: 없음
- 확인: 끈 뒤 다시 켜는 방법을 알려줬고, 학습 기록을 지우지 않는다고 했다.
