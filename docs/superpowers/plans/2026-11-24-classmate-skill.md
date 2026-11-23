# classmate 스킬 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능이 완성될 때마다 설명과 이해도 퀴즈를 내고, 프로젝트 마무리 때 종합 퀴즈와 HTML 리포트를 만드는 `classmate` 스킬(Claude Code·Codex 겸용)을 만든다.

**Architecture:** 스킬 본체는 에이전트가 읽는 마크다운 지시문(`SKILL.md` + `references/`)이고 실행 코드가 없다. 코드는 리포트 틀 `assets/report-template.html`의 인라인 JS(점수 계산·화면 그리기)뿐이다. 지시문은 "시나리오 점검"으로 검증한다. 새 서브에이전트가 지시문만 보고 임시 폴더에서 행동하면, 그 결과 파일을 검사 스크립트로 확인하는 방식이다. JS는 `node --test`로 검증한다.

**Tech Stack:** Markdown, HTML + 바닐라 JS, Mermaid 11.4.1(jsdelivr CDN). 개발용 검증에만 Node 24(`node:test`, `node:vm`)를 쓰고, 사용자에게는 Node가 필요 없다.

**Spec:** `docs/superpowers/specs/2026-11-24-classmate-skill-design.md`

## Global Constraints

- 스킬 이름은 `classmate`. `SKILL.md` frontmatter에 `name`, `description` 필수이고 `description`은 1024자 이하.
- 사용자 쪽 런타임 의존성 없음(Node·Python 요구 금지). 실행 스크립트를 스킬 폴더에 넣지 않는다.
- 지시문은 한국어로 쓴다. 에이전트 출력은 사용자의 대화 언어를 따른다.
- 인자: Claude Code는 `/classmate <인자>`, Codex는 `$classmate <인자>`. `$ARGUMENTS` 치환에 기대지 말고 "사용자가 classmate와 함께 준 인자"로 지시한다.
- 전역 지침 파일: Claude Code `~/.claude/CLAUDE.md`, Codex `~/.codex/AGENTS.md`. 블록 마커는 `<!-- classmate:start -->` / `<!-- classmate:end -->`. 넣기 전에 내용과 위치를 보여주고 동의를 받는다. 이미 있으면 다시 넣지 않는다.
- 사용자 저장소에 커밋될 흔적 금지: `.classmate/.gitignore` 내용은 `*` 한 줄. 사용자의 `.gitignore`와 프로젝트의 `CLAUDE.md`·`AGENTS.md`는 건드리지 않는다.
- 난이도 값: `입문` | `중급` | `고급`, 기본값 `중급`.
- 영역 값: `구조` | `코드` | `데이터 흐름` | `설계 이유` | `문제 해결`.
- 결과 값: `맞음` | `부분` | `틀림` | `미응답`. 점수는 맞음 1, 부분 0.5, 틀림 0이고 미응답은 계산에서 제외.
- 문제 수: 기능 퀴즈 3문제(객관식 2 + 서술형 1), 기능 여러 개를 묶을 때 합쳐 3~5문제, review 5~10문제. 설명은 10줄 안팎.
- 퀴즈 중 코드 수정 금지. 언제나 '나중에'를 고를 수 있다. 애매하면 끼어들지 않고, 사용자에게 차례를 넘길 때만 끼어든다.
- 기록에 없는 설계 이유와 문제 해결 과정은 지어내지 않는다(`기록 없음`).
- Windows/macOS/Linux에서 동작하고, 경로와 기능 이름에 공백·한글이 있어도 동작한다.
- 시나리오 점검은 실제 `~/.claude`, `~/.codex`에 절대 쓰지 않는다(임시 홈 사용).

## Review Focus

1. 퀴즈 문제나 해설에 코드(`<div>`, `</script>` 등)가 들어간 경우. 리포트가 깨지거나 스크립트가 실행되면 안 되고 글자 그대로 보여야 한다. (Task 4 fixture·브라우저 확인)
2. 전역 지침 파일이 없는 경우, 사용자 규칙이 이미 있는 경우, 블록이 이미 있는 경우. 파일을 만들고, 기존 내용을 보존하고, 블록을 중복으로 넣지 않아야 한다. (Task 1 S1·S2·S3)
3. 아직 답한 문제가 없는 영역(전부 미룸). `NaN%`가 아니라 `기록 없음`으로 보여야 한다. (Task 4 테스트)
4. 프로젝트 경로와 기능 이름에 공백·한글이 있는 경우(`my project`, `할 일 추가`). 노트 파일 이름과 리포트 열기가 정상이어야 한다. (Task 2 S5, Task 5 S11)
5. 새 세션이고 git도 노트도 없는데 `/classmate`를 부른 경우. 지어내지 말고 무엇을 다룰지 물어야 한다. (Task 2 S9)

---

## 파일 구조

```
C:\dev2\classmate skill\                    (저장소 루트)
├─ README.md                                Task 3, 5
├─ skills/classmate/
│  ├─ SKILL.md                              Task 1, 2, 5  진입점, 명령 분기, 켜기·끄기·난이도
│  ├─ references/explain-and-quiz.md        Task 2  완성 판단, 설명, 퀴즈, 채점, 노트 형식
│  ├─ references/review.md                  Task 5  복습 흐름, 리포트 데이터 만들기
│  └─ assets/report-template.html           Task 4  리포트 틀 (인라인 CSS·JS)
└─ tests/
   ├─ scenarios.md                          Task 1, 2, 5  시나리오 점검 목록
   ├─ validate-classmate.mjs                Task 1, 2, 5  .classmate/ 검사 스크립트
   ├─ report-template.test.mjs              Task 4
   └─ fixtures/
      ├─ sample-app/                        Task 2  작은 할 일 앱 (시나리오용)
      ├─ classmate-review/                  Task 5  review 시나리오용 .classmate
      └─ report-data.js                     Task 4
```

## 공통 인터페이스

**config.json**: `{"enabled": true, "level": "중급"}`

**학습 노트** `.classmate/features/NNN-<slug>.md`
- NNN은 기존 최대 번호 + 1(3자리).
- slug는 기능 이름에서 공백을 `-`로 바꾸고 `/\:*?"<>|`를 지운 것. 한글은 유지한다.

```markdown
---
id: 001
feature: 할 일 추가
date: 2026-11-24
status: done
level: 중급
---
## 설명
- 바뀐 파일: src/todo.js, src/app.js
- 흐름: 입력창 → addTodo() → todos 배열 → render()
- 이유: …            (없으면 "기록 없음")
- 막혔던 것: …        (없으면 "없음")

## 퀴즈
### Q1 [데이터 흐름] 객관식
문제: …
보기: ① … ② … ③ … ④ …
정답: ②
내 답: ③
결과: 틀림
해설: … (src/todo.js:12)
```

- `status`는 `done` | `deferred`.
- 서술형에는 `보기:` 줄이 없다.
- 미룬 문제는 `내 답:`을 비우고 `결과: 미응답`으로 둔다.

**복습 기록** `.classmate/reviews/YYYY-MM-DD.md`
- 같은 날 두 번째부터는 `-2`, `-3`을 붙인다.
- frontmatter는 `type: review`, `date`. 본문은 노트의 `## 퀴즈`와 같은 형식이다.

**리포트 데이터** `.classmate/report-data.js`

```
window.CLASSMATE_DATA = {
  project, summary, generatedAt: "YYYY-MM-DD", level,
  structure: { mermaid: string, text: string },
  flows: string[],
  decisions: [{ feature, why }],               // why가 없으면 "기록 없음"
  features: [{ id, name, date, status, questions: Q[] }],
  reviews:  [{ date, questions: Q[] }],
  nextSteps: string[]
};
Q = { area, type: "객관식"|"서술형", question, answer, userAnswer, result, explanation }
```

**리포트 로직**: `report-template.html`의 `<script id="classmate-logic">`이 `window.ClassmateReport`를 정의한다.
- `computeAreaScores(data) -> { [area]: { score: number, total: number, percent: number|null } }`
  - 다섯 영역 키가 항상 있다.
  - `total`은 미응답을 뺀 문제 수다.
  - `percent = Math.round(score / total * 100)`이고, `total === 0`이면 `null`이다.
- `wrongQuestions(data) -> Array<Q & { source: string }>`
  - 결과가 `틀림`이나 `부분`인 문제를 돌려준다.
  - `source`는 기능 이름 또는 `복습 YYYY-MM-DD`다.
- `render(data, doc)`: 사용자 데이터는 모두 `textContent`로 넣는다.

## 시나리오 점검 방법 (Task 1, 2, 5 공통)

`tests/scenarios.md`의 시나리오는 각각 `준비`(bash), `맥락`, `입력`, `답`, `검사`(bash), `확인`(눈으로 볼 항목)으로 이루어진다. 실행은 컨트롤러(이 계획을 실행하는 메인 세션)가 맡는다.

1. `준비`를 실행한다. `T=$(mktemp -d)` 아래에 `home/`과 프로젝트 폴더를 만든다.
2. 새 general-purpose 서브에이전트에게 아래 프롬프트를 보낸다.
3. `검사`를 실행하고, 서브에이전트 보고에서 `확인` 항목을 점검한다.

```
너는 classmate 스킬이 설치된 코딩 에이전트({AGENT}: Claude Code 또는 Codex)다.
먼저 "C:\dev2\classmate skill\skills\classmate\SKILL.md"를 읽고, 필요하면 그 안에서 가리키는 파일도 읽어 그대로 따른다.
- 홈 디렉터리(~)는 {T}/home, 현재 프로젝트 루트는 {PROJECT}로 간주하고 그 밖에는 쓰지 않는다.
- 대화 맥락: {CONTEXT}
- 사용자 입력: {INPUT}
- 사용자에게 질문하면 다음 답을 순서대로 받은 것으로 한다: {ANSWERS}
- 끝나면 사용자에게 보여줬을 메시지를 순서대로 그대로 보고한다.
```

---

### Task 1: 저장소 준비와 켜기·끄기·난이도

**Files:**
- Create: `skills/classmate/SKILL.md`, `tests/scenarios.md`, `tests/validate-classmate.mjs`

**Interfaces:**
- Produces: config.json 형식, 전역 블록 문구, `node tests/validate-classmate.mjs <.classmate 경로>`.
  - 문제가 없으면 `OK`를 출력하고 종료 코드 0.
  - 문제가 있으면 문제 목록을 출력하고 종료 코드 1.
  - 이 Task에서는 `config.json`과 `.gitignore`만 검사한다.

- [ ] **Step 1: 저장소 초기화.** `git init` 후 기존 `docs/`를 커밋한다. Run `git log --oneline` → 커밋 1개.
- [ ] **Step 2: 검사 스크립트 작성.** `.gitignore` 내용이 정확히 `*`인지(앞뒤 공백·줄바꿈 무시), `config.json`에 `enabled`(boolean)와 `level`(세 값 중 하나)이 있는지 본다. 자체 점검: Run `node tests/validate-classmate.mjs "$(mktemp -d)"` → 종료 코드 1, 출력에 `config.json 없음`.
- [ ] **Step 3: 시나리오 S1~S4를 `tests/scenarios.md`에 작성.**
  - **S1 Claude Code 첫 켜기.** 전역 파일 없음, 프로젝트는 `{T}/my project`. 입력 `/classmate on`, 답 `동의`, `중급`.
    - 검사: `grep -c 'classmate:start' "$T/home/.claude/CLAUDE.md"` → `1`, validate → `OK`, `config.json`에 `"level": "중급"`.
    - 확인: 파일에 쓰기 전에 블록 내용과 경로를 보여주고 동의를 물었다.
  - **S2 Claude Code 두 번째 프로젝트.** 전역 파일에 `# 내 규칙` 줄과 블록이 이미 있다. 입력 `/classmate on`, 답 `고급`.
    - 검사: 블록 개수 `1`, `# 내 규칙`이 남아 있음, level `고급`.
    - 확인: 동의를 다시 묻지 않았다.
  - **S3 Codex 첫 켜기.** `{T}/home/.codex`가 없다. 입력 `$classmate on`, 답 `동의`, `입문`.
    - 검사: `$T/home/.codex/AGENTS.md`에 블록 1개, `$T/home/.claude`가 생기지 않음.
  - **S4 S1 상태에서 난이도 변경 후 끄기.** 입력 `/classmate level 고급`, 그다음 `/classmate off`.
    - 검사: level `고급`, enabled `false`, 전역 블록 1개 그대로, `.classmate/` 그대로.
- [ ] **Step 4: S1~S4를 실행해 실패 확인.** 아직 SKILL.md가 없으므로 실패해야 한다.
- [ ] **Step 5: `SKILL.md` 작성.** 다음을 담는다.
  - frontmatter: `name: classmate`. `description`에는 하는 일과 함께, 기능 하나를 완성했을 때나 사용자가 classmate를 부를 때(on/off/level/review) 쓴다는 것을 적는다.
  - 명령 분기 표.
  - `on`/`off`/`level` 절차는 설계 6.2 그대로. 전역 블록 문구도 설계 6.2의 블록을 그대로 쓴다.
  - 에이전트는 자신이 Claude Code인지 Codex인지 안다는 전제로, 어느 전역 파일에 쓸지 표로 준다.
  - "기능 완성 흐름은 `references/explain-and-quiz.md`를, review는 `references/review.md`를 읽는다." (두 파일은 Task 2, 5에서 만든다)
- [ ] **Step 6: S1~S4를 다시 실행해 통과 확인.** 모든 검사와 확인 항목을 충족해야 한다. 실패하면 지시문을 고치고 다시 실행한다.
- [ ] **Step 7: Commit.** `git add skills tests && git commit -m "feat: classmate 켜기·끄기·난이도"`

### Task 2: 기능 완성 시 설명·퀴즈·학습 노트

**Files:**
- Create: `skills/classmate/references/explain-and-quiz.md`, `tests/fixtures/sample-app/`(`index.html`, `src/todo.js`, `src/app.js`. 할 일 추가와 목록 그리기 정도, 합쳐 50줄 이내)
- Modify: `skills/classmate/SKILL.md`(기능 완성 흐름 요약, 인자 없는 `/classmate` 처리), `tests/scenarios.md`, `tests/validate-classmate.mjs`

**Interfaces:**
- Consumes: Task 1의 config.json 형식과 검사 스크립트.
- Produces: 학습 노트 형식(공통 인터페이스). 검사 스크립트가 `features/*.md`를 다음 기준으로 검사한다.
  - 파일명이 `^\d{3}-.+\.md$`.
  - frontmatter 다섯 필드가 있고 값이 허용 범위 안.
  - 헤더가 `^### Q\d+ \[(구조|코드|데이터 흐름|설계 이유|문제 해결)\] (객관식|서술형)$`.
  - 문제마다 `결과:` 값이 허용 범위 안이고, 객관식에는 `보기:` 줄이 있음.
  - `status: deferred`면 모든 결과가 `미응답`.

- [ ] **Step 1: 검사 스크립트에 노트 검사 추가하고 자체 점검.** 영역을 `UI`로 적은 틀린 노트를 임시 폴더에 만들어 실행 → 종료 코드 1, 출력에 `영역`.
- [ ] **Step 2: fixture `sample-app` 작성.**
- [ ] **Step 3: 시나리오 S5~S10 작성.** 모두 `.classmate/config.json`을 `{"enabled":true,"level":"중급"}`로 준비하고, 프로젝트 `{T}/my project`에 sample-app을 복사한다.
  - **S5 지금 풀기.**
    - 맥락: "이번 대화에서 '할 일 추가' 기능을 구현하고 브라우저에서 동작을 확인했다. 빈 입력이 추가되는 버그가 있어 trim 검사로 고쳤다. Map도 고려했지만 순서 유지가 쉬운 배열을 택했다."
    - 입력: 없음. 기능을 막 완성하고 사용자에게 결과를 보고하려는 시점이다.
    - 답: `지금`, `1`, `3`, `todos 배열에 넣고 다시 그린다`.
    - 검사: `features/001-할-일-추가.md` 존재, validate `OK`, `grep -c '^### Q'` → `3`, 객관식 헤더 2개, `status: done`.
    - 확인: 설명이 10줄 안팎이고 바뀐 파일·흐름·이유·막혔던 것을 담았다. 틀린 답에 정답, 이유, 파일:줄을 줬다. 코드를 고치지 않았다.
  - **S6 나중에.** S5와 같은 맥락, 답 `나중에`.
    - 검사: validate `OK`, `status: deferred`, `grep -c '결과: 미응답'` → `3`.
  - **S7 끼어들지 않음.** 맥락: "README의 오타 하나를 고쳤다."
    - 검사: `ls "$T/my project/.classmate/features" 2>/dev/null | wc -l` → `0`.
    - 같은 검사를 한 번 더: 맥락을 S5 맥락으로 바꾸고 config를 `enabled:false`로 바꾼다 → 역시 `0`.
  - **S8 미룬 퀴즈 먼저.** 준비: S6 결과 노트(001, deferred). 입력 `/classmate`, 맥락 없음. 답 `지금`, `2`, `2`, `배열에 추가`.
    - 확인: 첫 메시지에서 001의 미룬 퀴즈를 먼저 제안했다.
    - 검사: 001이 `status: done`, `미응답` 0개.
  - **S9 새 세션·git 없음·노트 없음.** 입력 `/classmate`, 맥락 없음.
    - 검사: `features/` 비어 있음.
    - 확인: 무엇을 다룰지 물었고, 설계 이유를 지어내지 않았다.
  - **S10 두 기능을 한 번에.** 맥락: S5 맥락에 "이어서 '할 일 삭제' 기능도 구현하고 확인했다."를 더한다. 답 `지금`, 이후 객관식은 모두 `1`, 서술형은 모두 `모르겠다`.
    - 검사: 노트 001과 002 존재, `cat features/*.md | grep -c '^### Q'`가 3~5.
    - 확인: 지금/나중에를 한 번만 물었다.
- [ ] **Step 4: S5~S10을 실행해 실패 확인.**
- [ ] **Step 5: `references/explain-and-quiz.md` 작성, `SKILL.md` 보강.** 설계 6.3·6.4·6.5를 담는다.
  - 완성 판단 기준.
  - 끼어드는 시점, 기능 여러 개 묶기.
  - '최근 작업' 범위: 대화 → 마지막 노트 이후의 git 기록 → 사용자에게 묻기.
  - 설명 형식.
  - 퀴즈 구성, 출제 원칙, 난이도 표.
  - 선택지 UI는 있으면 쓰고, 없으면 번호로 받는다.
  - 채점(맞음/부분/틀림).
  - 노트 형식(공통 인터페이스 그대로 복사)과 파일 이름 규칙.
- [ ] **Step 6: S5~S10을 다시 실행해 통과, S1~S4 회귀 실행.**
- [ ] **Step 7: Commit.** `feat: 기능 완성 시 설명·퀴즈·학습 노트`

### Task 3: README와 1단계 실사용 점검

**Files:**
- Create: `README.md`

- [ ] **Step 1: README 작성.** 다음을 담는다.
  - 소개(왜 만들었나 3줄).
  - 설치: Claude Code는 `skills/classmate`를 `~/.claude/skills/classmate`로, Codex는 `~/.agents/skills/classmate`로 복사. OS별 명령 예시를 붙인다.
  - 명령 표(설계 6.1).
  - 학습 기록 설명(`.classmate/`, 커밋에서 빠짐).
  - 완전히 지우는 법(설계 6.2).
  - `review`는 "준비 중"으로 표시.
- [ ] **Step 2: Commit.** `docs: README`
- [ ] **Step 3: 사용자 점검.** 사용자에게 설치 명령과 아래 점검 목록을 주고 실제 프로젝트에서 써보게 한다. 사용자가 건너뛰자고 하면 Task 4로 간다.
  - 점검 목록: `on`의 동의 화면이 이해되는지, 기능 완성 때 끼어드는 빈도가 적당한지, 설명 길이, 퀴즈가 암기형이 아닌지, Codex에서도 같은지.
  - 지시문을 고쳐야 하는 피드백은 Task 1·2 파일에 반영하고, 해당 시나리오를 다시 돌린 뒤 커밋한다.

### Task 4: 리포트 틀

**Files:**
- Create: `skills/classmate/assets/report-template.html`, `tests/report-template.test.mjs`, `tests/fixtures/report-data.js`

**Interfaces:**
- Produces: 리포트 데이터 형식과 `window.ClassmateReport`(공통 인터페이스).
  - 틀은 `<script src="report-data.js">` 다음에 `<script id="classmate-logic">`을 둔다.
  - `document`가 있을 때만 `render(window.CLASSMATE_DATA, document)`를 호출한다.

- [ ] **Step 1: fixture `report-data.js` 작성.** 기능 2개와 복습 1개로 구성한다.
  - `데이터 흐름` 영역 문제: 맞음·부분·틀림·미응답 각 1개.
  - `문제 해결` 영역 문제: 미응답 1개뿐.
  - `코드` 영역 문제 하나의 `question`은 `</script><script>alert(1)</script> 는 무엇을 하나요?`.
  - `decisions` 하나는 `why: "기록 없음"`.
- [ ] **Step 2: 실패하는 테스트 작성.** 틀에서 `classmate-logic` 스크립트를 뽑아 fixture와 함께 `node:vm`의 같은 컨텍스트에서 실행한다(`window` 객체 제공).

```js
test('부분은 0.5점, 미응답은 제외', () => {
  assert.deepEqual(scores['데이터 흐름'], { score: 1.5, total: 3, percent: 50 });
});
test('답한 문제가 없는 영역은 percent null', () => {
  assert.equal(scores['문제 해결'].percent, null);
});
test('다섯 영역 키가 항상 있다', () => {
  assert.deepEqual(Object.keys(scores).sort(), ['구조', '데이터 흐름', '문제 해결', '설계 이유', '코드'].sort());
});
test('wrongQuestions는 틀림·부분만, source 포함', () => {
  const w = R.wrongQuestions(data);
  assert.ok(w.length > 0 && w.every(q => ['틀림', '부분'].includes(q.result) && q.source));
});
```

- [ ] **Step 3: Run `node --test tests/` → FAIL** (틀이 아직 없음)
- [ ] **Step 4: `report-template.html` 작성.** 섹션 순서는 다음과 같다.
  - 요약(프로젝트, 생성일, 난이도)
  - 구조도: Mermaid `https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js`. 불러오기에 실패하면 `structure.text`를 `<pre>`로 보여준다.
  - 핵심 흐름
  - 설계 결정
  - 기능 타임라인
  - 영역별 이해도: 막대로 표시하고, `percent`가 null이면 `기록 없음`.
  - 틀린 문제와 해설
  - 다음에 공부할 것

  데이터는 모두 `textContent`로 넣는다. 다크 모드는 `prefers-color-scheme`로 처리한다.
- [ ] **Step 5: Run `node --test tests/` → PASS**
- [ ] **Step 6: 브라우저 확인.** 임시 폴더에 틀을 `report.html`로, fixture를 `report-data.js`로 복사해 내장 브라우저로 연다. 확인할 것:
  - `</script><script>alert(1)</script>`가 글자 그대로 보이고 알림창이 뜨지 않는다.
  - `문제 해결` 막대에 `기록 없음`이 나온다.
  - 구조도가 그려진다.
  - 375px 폭에서 가로 스크롤이 없다.
- [ ] **Step 7: Commit.** `feat: 리포트 틀`

### Task 5: 프로젝트 복습(review)

**Files:**
- Create: `skills/classmate/references/review.md`, `tests/fixtures/classmate-review/`
  - `config.json`, `.gitignore`
  - `features/001-할-일-추가.md`: done, 틀림 1개 포함
  - `features/002-할-일-삭제.md`: deferred, `이유: 기록 없음`
- Modify: `skills/classmate/SKILL.md`(review 안내), `tests/scenarios.md`, `tests/validate-classmate.mjs`, `README.md`("준비 중" 제거)

**Interfaces:**
- Consumes: 학습 노트 형식(Task 2), 리포트 데이터 형식과 `ClassmateReport`(Task 4).
- Produces: 검사 스크립트가 다음도 검사한다.
  - `reviews/*.md`: type, date, 퀴즈 형식.
  - `report-data.js`: 공통 인터페이스의 필드와 Q 값 범위. `report-template.html`의 `computeAreaScores`가 예외 없이 동작하는지.

- [ ] **Step 1: 검사 스크립트에 reviews·report-data 검사 추가하고 자체 점검.**
  - Task 4 fixture `report-data.js`를 넣은 임시 폴더 → `OK`.
  - `result`를 `"애매"`로 바꾼 복사본 → 종료 코드 1.
- [ ] **Step 2: 시나리오 S11 작성.**
  - 준비: `{T}/my project`에 sample-app을 복사하고, `classmate-review`를 `.classmate`라는 이름으로 복사한다.
  - 입력: `/classmate review`.
  - 답: 객관식은 `1`, 서술형은 `모르겠다`.
  - 검사:
    - validate `OK`.
    - `reviews/`에 파일 1개, 그 안의 `^### Q`가 5~10개.
    - 002가 `status: done`.
    - `cmp "C:/dev2/classmate skill/skills/classmate/assets/report-template.html" "$T/my project/.classmate/report.html"` → 같음.
    - `report-data.js`의 decisions 중 `할 일 삭제`의 why가 `기록 없음`.
  - 확인: 전체 구조 설명이 먼저 나왔다. 리포트를 열려고 했고, 실패했다면 경로를 알려줬다.
- [ ] **Step 3: S11을 실행해 실패 확인.**
- [ ] **Step 4: `references/review.md` 작성, `SKILL.md` 보강.** 설계 6.6을 따른다.
  - 순서: 구조 설명 → 종합 퀴즈(틀렸던 개념, 미룬 퀴즈, 구조 문제).
  - 미룬 문제에 답하면 해당 노트를 done으로 갱신하고, 새 문제는 `reviews/`에 저장한다.
  - 틀은 `report.html`로 그대로 복사하고 데이터만 `report-data.js`에 쓴다(공통 인터페이스 그대로). 틀의 위치는 SKILL.md 기준 상대 경로 `assets/report-template.html`.
  - OS별 열기 명령: Windows `start "" "<경로>"`, macOS `open "<경로>"`, Linux `xdg-open "<경로>"`. 실패하면 경로를 안내한다.
- [ ] **Step 5: S11을 다시 실행해 통과, S1~S10 회귀 실행.**
- [ ] **Step 6: README 갱신.** review의 "준비 중"을 지우고 리포트 설명을 한 줄 넣는다.
- [ ] **Step 7: Commit.** `feat: 프로젝트 복습과 리포트`
