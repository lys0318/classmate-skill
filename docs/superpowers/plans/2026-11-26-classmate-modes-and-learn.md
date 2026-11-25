# classmate 빈도 모드와 '처음 배우기' 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** classmate에 기능 완성 시의 빈도 모드(가볍게·꼼꼼하게·직접만)와, 완성된 프로젝트를 장 단위로 공부하는 `/classmate learn`을 더한다.

**Architecture:** 대부분은 에이전트 지시문(`SKILL.md`, `references/*.md`) 변경이고, 코드는 검사기(`tests/validate-classmate.mjs`)와 리포트 틀의 작은 함수 하나뿐이다. 코드는 `node --test`로, 지시문은 기존 시나리오 점검 방식으로 검증한다. 시나리오 점검은 새 서브에이전트(sonnet)가 지시문만 보고 임시 폴더에서 연기하면, 그 결과를 `tests/scenarios.sh check`로 검사하는 방식이다.

**Tech Stack:** Markdown 지시문, HTML + 바닐라 JS, Node 24(`node:test`, 개발용 검증만)

**Spec:** `docs/superpowers/specs/2026-11-26-classmate-modes-and-learn-design.md` (앞선 설계: `docs/superpowers/specs/2026-11-24-classmate-skill-design.md`, 앞선 계획: `docs/superpowers/plans/2026-11-24-classmate-skill.md`)

## Global Constraints

- 모드 값은 `가볍게` | `꼼꼼하게` | `직접만`. 기본값은 `가볍게`이고, `mode`가 없는 config도 `가볍게`로 본다.
- 노트 `status` 값은 `done` | `deferred` | `noted`. `noted`는 `## 퀴즈` 절이 없고, 나머지는 반드시 있다.
- 가볍게 알림은 한 줄이다: `📝 classmate: '<기능 이름>' 기록함 (퀴즈는 review 때)`. 기능 여러 개는 한 줄로 묶는다.
- 중간 점검 제안은 그 시점의 `noted` 노트 수가 5의 배수일 때만 한다: `기록이 <N>개 쌓였어요. /classmate review로 중간 점검해 볼까요?`
- `noted` 기능에 퀴즈를 내면 문제를 그 노트에 쓴다. 상태는 먼저 `deferred`(모두 미응답)로 바꾸고, 모두 답하면 `done`으로 바꾼다. 노트의 이유가 `기록 없음`이면 `설계 이유` 문제는 내지 않는다.
- 인자 없이 직접 부를 때는 한 번에 최대 10문제. review는 5~10문제이고, 채우는 순서는 미룬 퀴즈 → noted → 틀렸던 개념 → 전체 구조. 3·4번만 `reviews/`에 쓴다.
- learn은 `on` 없이 동작하고 전역 지침 파일을 건드리지 않는다. config가 없으면 `{"enabled": false, "level": "<난이도>", "mode": "가볍게"}`와 `.gitignore`(`*`)를 만든다.
- `learn.md` 형식: frontmatter `type: learn`, `owner: 본인|다른 사람`, `started: YYYY-MM-DD`. 장 목록은 `| 장 | 제목 | 범위 | 상태 |` 표이고, 상태는 `대기` | `완료`. 처음 만들 때 장은 3~8개다.
- 지도를 만들 때 읽지 않는 폴더: `node_modules`, `.git`, `dist`, `build`, `vendor`, `.venv`. 장 범위 파일이 대략 300줄 이상이면 관련 부분만 읽는다.
- 장 노트 형식:
  - frontmatter에 `kind: learn`, `chapter: <N>`
  - `feature: <N>장 · <제목>`
  - 막혔던 것 줄은 `해당 없음`
  - 이유 줄은 `(본인 기억) …` 또는 `(추정, 출처: …) …` 또는 `기록 없음`
- 모드는 learn과 직접 부르기에는 적용되지 않는다.
- 기존 제약은 그대로다: 사용자 쪽 런타임 의존성 없음, 사용자 저장소에 커밋될 흔적 없음, 실제 `~/.claude`·`~/.codex`에는 시나리오가 절대 쓰지 않음.

## Review Focus

1. `mode`가 없는 기존 config(먼저 설치한 사용자). 가볍게로 동작하고 검사기·리포트가 깨지지 않아야 한다. (Task 1 테스트 `config에 mode가 없어도 통과`)
2. 가볍게 모드에서 한 번에 기능이 여러 개 완성된 경우. 노트는 기능마다, 알림은 한 줄이어야 한다. (Task 2 S15)
3. `직접만` 모드에서 사용자가 직접 `/classmate`를 부른 경우. 모드와 상관없이 noted 퀴즈가 진행돼야 한다. (Task 3 S24)
4. learn이 `node_modules` 같은 큰 생성물 폴더가 있는 프로젝트에서 실행되는 경우. 그 폴더를 읽지 않아야 한다. (Task 4 S19)
5. 모든 장을 끝낸 뒤 다시 `learn`을 부른 경우. 기존 장과 상태를 지우지 않아야 한다. (Task 4 S22)

---

## 파일 구조

| 파일 | Task | 책임 |
|---|---|---|
| `tests/validate-classmate.mjs` | 1 | mode, noted, kind·chapter, learn.md, report-data의 noted 검사 |
| `tests/validate-classmate.test.mjs` (새) | 1 | 검사기 규칙 테스트 (임시 폴더에 파일을 만들고 검사기 실행) |
| `skills/classmate/assets/report-template.html` | 1 | `timelineBadge()` 함수와 `기록만` 배지 |
| `tests/report-template.test.mjs` | 1 | `timelineBadge` 테스트 |
| `skills/classmate/SKILL.md` | 2, 3, 4 | 명령 표, on에서 모드 묻기, mode 명령, 자동 실행 모드 분기, learn 안내 |
| `skills/classmate/references/explain-and-quiz.md` | 2, 3 | 가볍게 기록, 중간 점검 제안, 직접 불렀을 때의 noted |
| `skills/classmate/references/review.md` | 3 | noted 문제 채우기와 기록, learn.md 지도 재사용, 리포트의 noted |
| `skills/classmate/references/learn.md` (새) | 4 | learn 흐름 전체 |
| `tests/fixtures/noted-note.md`, `tests/fixtures/learn-map.md` (새) | 2, 4 | 시나리오용 fixture |
| `tests/scenarios.sh`, `tests/scenarios.md` | 2~4 | S15~S24, 기존 S1~S3과 prep_app 갱신 |
| `README.md` | 5 | 모드와 learn |

## 공통 인터페이스

**검사기**: `node tests/validate-classmate.mjs <.classmate 경로>`. 문제가 없으면 `OK`(종료 코드 0), 있으면 문제 목록(종료 코드 1). 이번에 더하는 규칙:
- config `mode`: 없으면 통과. 있으면 세 값 중 하나여야 한다.
- 노트 `status: noted`: `## 퀴즈`가 있으면 문제. `done`·`deferred`는 `## 퀴즈`가 없으면 문제.
- 노트 `kind`: 있으면 `learn`이어야 하고, 그때 `chapter`는 양의 정수여야 한다.
- `learn.md`(있으면): frontmatter 세 필드와 값, `## 장 목록` 표의 행이 정규식 `^\| (\d+) \| (.+?) \| (.+?) \| (대기|완료) \|$`에 맞고 장 번호가 1부터 빠짐없이 이어진다.
- `report-data.js`: `features[].status`에 `noted`를 허용하고, `noted`면 `questions`가 빈 배열이어야 한다.

**리포트 로직**: `window.ClassmateReport.timelineBadge(feature) -> string`
- `status: noted` → `'기록만'`
- `status: deferred` → `'미룸 · <미응답 수>문제 남음'`
- 그 밖 → `'<맞음 수>/<문제 수> 맞음'`

`render()`의 타임라인이 이 함수를 쓴다.

**시나리오**: `bash tests/scenarios.sh prep|check <S번호> <임시 폴더>`.
- `prep_app`은 config를 `{"enabled": true, "level": "중급", "mode": "꼼꼼하게"}`로 만든다(기존 S5~S14가 꼼꼼하게를 전제하므로).
- 새 도우미 `set_mode <모드>`는 `$C/config.json`의 mode만 바꾼다.

**시나리오 실행 프롬프트**: 앞선 계획의 "시나리오 점검 방법" 프롬프트를 그대로 쓴다. 서브에이전트에는 `model: sonnet`, 백그라운드 실행, 실제 홈 금지를 붙이고, 질문 도구는 호출하지 말고 준비된 답을 쓰게 한다.

---

### Task 1: 검사기와 리포트 확장

**Files:**
- Create: `tests/validate-classmate.test.mjs`
- Modify: `tests/validate-classmate.mjs`, `skills/classmate/assets/report-template.html`, `tests/report-template.test.mjs`

**Interfaces:**
- Produces: 검사기 새 규칙과 `ClassmateReport.timelineBadge` (공통 인터페이스)

- [ ] **Step 1: 검사기 테스트 작성** (`validate-classmate.test.mjs`)
  - 각 테스트는 `fs.mkdtempSync`로 임시 `.classmate`를 만들어 `.gitignore`·`config.json`·노트를 쓰고, `spawnSync(process.execPath, [validator, dir])`의 종료 코드와 출력을 확인한다.
  - 노트 본문은 `tests/fixtures/deferred-note.md`를 읽어 문자열로 바꿔 쓴다.

```js
test('config에 mode가 없어도 통과', ...)                  // {"enabled":true,"level":"중급"} → 0
test('mode 값이 틀리면 실패', ...)                          // "mode":"보통" → 1, 출력에 'mode'
test('noted 노트는 퀴즈 절 없이 통과', ...)                 // status: noted, '## 퀴즈' 이하 삭제 → 0
test('noted 노트에 퀴즈가 있으면 실패', ...)               // status: noted + 퀴즈 → 1
test('done 노트에 퀴즈가 없으면 실패', ...)                // → 1
test('learn 노트는 chapter가 양의 정수여야 함', ...)        // kind: learn, chapter: 0 → 1 / chapter: 2 → 0
test('learn.md 장 번호가 끊기면 실패', ...)                 // 1, 3 → 1
test('learn.md 상태 값이 틀리면 실패', ...)                 // '진행중' → 1
test('report-data의 noted 기능은 questions가 비어야 함', ...) // noted + 문제 1개 → 1
```

- [ ] **Step 2: Run `node --test "tests/*.test.mjs"` → 새 테스트 FAIL** (기존 5개는 PASS)
- [ ] **Step 3: 검사기 구현.** 공통 인터페이스의 규칙을 `checkBase`·`checkFeatures`·`checkReportData`에 더하고, `checkLearn(dir, problems)`을 새로 만든다.
- [ ] **Step 4: 리포트 틀 테스트 추가** (`report-template.test.mjs`)

```js
test('timelineBadge: noted는 기록만', () => assert.equal(R.timelineBadge({ status: 'noted', questions: [] }), '기록만'));
test('timelineBadge: deferred는 남은 수', () => assert.equal(R.timelineBadge({ status: 'deferred', questions: [{ result: '미응답' }, { result: '미응답' }, { result: '맞음' }] }), '미룸 · 2문제 남음'));
test('timelineBadge: done은 맞힌 수', () => assert.equal(R.timelineBadge({ status: 'done', questions: [{ result: '맞음' }, { result: '틀림' }, { result: '부분' }] }), '1/3 맞음'));
```

- [ ] **Step 5: Run → timelineBadge 3개 FAIL**
- [ ] **Step 6: `timelineBadge(feature) -> string` 구현.** `ClassmateReport`에 넣고, `render()` 타임라인이 이 함수를 쓰게 바꾼다.
- [ ] **Step 7: Run `node --test "tests/*.test.mjs"` → 전부 PASS.** `node tests/validate-classmate.mjs playground/.classmate` → `OK`(회귀)
- [ ] **Step 8: Commit** `feat: 검사기와 리포트에 noted·mode·learn 반영`

### Task 2: 빈도 모드

**Files:**
- Create: `tests/fixtures/noted-note.md` (`deferred-note.md`에서 `status: noted`로 바꾸고 `## 퀴즈` 이하를 지운 것)
- Modify: `skills/classmate/SKILL.md`, `skills/classmate/references/explain-and-quiz.md`, `tests/scenarios.sh`, `tests/scenarios.md`

**Interfaces:**
- Consumes: Task 1의 검사기 규칙
- Produces: `prep_app`의 config에 `"mode": "꼼꼼하게"`, `set_mode <모드>`, `noted-note.md` fixture

- [ ] **Step 1: 시나리오 갱신과 추가.**
  - `prep_app`의 config에 `"mode": "꼼꼼하게"`를 더한다.
  - S1 답에 모드 `가볍게`를, S2 답에 `꼼꼼하게`를, S3 답에 `가볍게`를 더하고, 각 check에 `expect "mode" "$(cfg mode)" …`를 더한다.
  - 새 시나리오:
    - **S15 가볍게, 두 기능.** `prep_app; set_mode 가볍게`, 맥락은 S10과 같음, 답 없음.
      - 검사: 노트 001과 002가 모두 `status: noted`, `qcount` 0, validate OK.
      - 확인: 대화창 알림이 한 줄이고 질문이 없다.
    - **S16 가볍게, 중간 점검 제안.** `prep_app; set_mode 가볍게`에 `noted-note.md`를 id·feature만 바꿔 001~004로 복사. 맥락은 S5와 같음.
      - 검사: noted 노트 5개(005 포함), validate OK.
      - 확인: 기록 알림 뒤에 `기록이 5개 쌓였어요` 제안 한 줄이 붙었다.
    - **S17 직접만.** `prep_app; set_mode 직접만`, 맥락은 S5와 같음.
      - 검사: `nfeat` 0.
    - **S18 mode 명령.** `prep_app`, 입력 `/classmate mode 직접만`.
      - 검사: mode `직접만`, level `중급` 그대로.
- [ ] **Step 2: S15~S18을 지시문 없이 준비·검사해서 FAIL 확인.** S17은 아무 일도 없는 게 통과 조건이라 RED가 성립하지 않는다.
- [ ] **Step 3: `SKILL.md` 수정.**
  - 명령 표에 `mode`를 더한다.
  - 난이도 표 아래에 모드 표를 둔다(세 모드와 한 줄 설명).
  - `on`의 2단계 뒤에 모드 묻기(기본 가볍게)를 넣고, 3단계 config 예시에 `mode`를 더한다.
  - `mode` 명령 절: config가 없으면 on 안내, 값이 틀리면 표를 보여주고 고르게 한다.
  - 자동 실행 판단에 모드 분기를 넣는다: 직접만이면 실행 안 함, 가볍게면 explain-and-quiz의 "가볍게 기록", 꼼꼼하게면 기존 흐름. 흐름 요약 줄도 고친다.
- [ ] **Step 4: `explain-and-quiz.md`에 "0. 가볍게 기록" 절 추가.**
  - 내용: 2절 설명 기준으로 `noted` 노트 쓰기, 알림 한 줄, 5의 배수일 때 제안 한 줄.
  - 5절 status 설명에 `noted`를 더한다.
- [ ] **Step 5: S1, S2, S3, S5, S15, S16, S17, S18 실행 → 전부 PASS, 확인 항목 충족.** 실제 홈 해시는 그대로여야 한다.
- [ ] **Step 6: Commit** `feat: 빈도 모드(가볍게·꼼꼼하게·직접만)`

### Task 3: noted 기능의 퀴즈 (직접 부르기와 review)

**Files:**
- Modify: `skills/classmate/references/explain-and-quiz.md`("직접 불렀을 때"), `skills/classmate/references/review.md`, `tests/scenarios.sh`, `tests/scenarios.md`

**Interfaces:**
- Consumes: `noted-note.md`, `set_mode`, 검사기 규칙

- [ ] **Step 1: 시나리오 추가.**
  - **S23 review에서 noted.** `prep_S11`과 같게 준비하되 `002-할-일-삭제.md`를 noted 노트(feature `할 일 삭제`)로 바꾼다. 입력 `/classmate review`, 답은 객관식 `1`, 서술형 `모르겠다`.
    - 검사:
      - validate OK
      - `status: noted` 노트 0개
      - 002에 `^### Q`가 1개 이상
      - 002의 문제 수와 `reviews/`의 문제 수를 더한 값이 5~10
      - `report-data.js`에 status가 `noted`인 기능이 없음
  - **S24 직접만 모드에서 직접 부르기.** `prep_app; set_mode 직접만`에 noted 노트 001. 입력 `/classmate`, 답 `지금`, `1`, `1`, `모르겠다`, 이후 `이번엔 여기까지`.
    - 검사: 001 `status: done`, `^### Q` 3개, validate OK.
- [ ] **Step 2: S23, S24를 지시문 없이 준비·검사해서 FAIL 확인.**
- [ ] **Step 3: 지시문 수정.**
  - `explain-and-quiz.md` "직접 불렀을 때" 2단계: 미룬 퀴즈와 noted 기능을 함께 알리고, noted 기능은 3문제를 만들어 노트에 쓴 뒤(deferred) 묻는다. 한 번에 최대 10문제, 넘치면 오래된 것부터, 남은 수를 알린다.
  - `review.md` 3절: 채우기 순서에 noted(2번)를 더하고, noted 문제는 노트에 쓰고 상태를 바꾼다. 1번이 다 차면 2번 이하는 다음으로 넘긴다.
  - `review.md` 1·2절: `learn.md`가 있으면 그 지도를 구조 설명에 재사용한다.
  - `review.md` 5절 매핑: `status`에 `noted`(questions 빈 배열)를 허용한다.
- [ ] **Step 4: S8, S9, S11, S12, S23, S24 실행 → 전부 PASS**
- [ ] **Step 5: Commit** `feat: noted 기능을 직접 부르기와 review에서 퀴즈로`

### Task 4: 처음 배우기 (`/classmate learn`)

**Files:**
- Create: `skills/classmate/references/learn.md`, `tests/fixtures/learn-map.md` (설계 6.3 형식, owner 자리에 `OWNER`, 장 3개: `1 화면 뼈대와 시작 | index.html`, `2 할 일 데이터와 조작 | src/todo.js`, `3 이벤트와 그리기 | src/app.js`, 모두 `대기`)
- Modify: `skills/classmate/SKILL.md`(명령 표에 `learn [장 번호]` → `references/learn.md`), `tests/scenarios.sh`, `tests/scenarios.md`

**Interfaces:**
- Consumes: 검사기의 learn.md·kind/chapter 규칙
- Produces: `prep_learn <owner> [상태]`. sample-app을 복사하고, config는 만들지 않는다. 상태를 주면 `learn-map.md`를 OWNER와 상태를 바꿔 `$C/learn.md`로 두고 config(`enabled:false`, `중급`, `가볍게`)와 `.gitignore`를 만든다.

- [ ] **Step 1: 시나리오 추가.**
  - **S19 learn 시작(다른 사람).** `prep_learn`(상태 없음, `.classmate` 없음). `$P/node_modules/big/index.js`에 2000줄짜리 파일을 둔다. 입력 `/classmate learn`, 답 `중급`, `다른 사람`, `다음에 할게요`.
    - 검사:
      - validate OK
      - config `enabled` false, mode `가볍게`
      - `learn.md` owner `다른 사람`, 장 3~8개 모두 `대기`
      - `$T/home/.claude` 없음
      - `nfeat` 0
    - 확인: 보고에 node_modules를 읽었다는 흔적이 없다. 지도에 무엇·실행·구조가 있다.
  - **S20 learn 이어서(다른 사람).** `prep_learn 다른 사람 대기`. 입력 `/classmate learn`, 답 `지금`, `1`, `1`, `모르겠다`.
    - 검사:
      - 노트 001에 `kind: learn`, `chapter: 1`, `status: done`, `^### Q` 3개
      - 이유 줄이 `(추정` 또는 `기록 없음`
      - `learn.md` 1장 `완료`, 2장 `대기`
      - validate OK
  - **S21 learn 장 지정(본인).** `prep_learn 본인 대기`. 입력 `/classmate learn 2`, 답 `순서를 지키기 쉬워서 배열로 했어요`, `나중에`.
    - 검사:
      - 노트 001에 `chapter: 2`, `status: deferred`
      - 이유 줄에 `(본인 기억)`
      - `learn.md` 2장 `완료`, 1장 `대기`
  - **S22 모든 장 완료 후 다시.** `prep_learn 다른 사람 완료`. 입력 `/classmate learn`, 답 `아니요`(다른 영역 안 봄).
    - 검사: `learn.md`가 준비한 것과 같다(`cmp`), `nfeat` 0.
    - 확인: review를 제안했다.
- [ ] **Step 2: S19~S22를 지시문 없이 준비·검사해서 FAIL 확인.** S22는 cmp만으로는 RED가 성립하지 않는다.
- [ ] **Step 3: `references/learn.md` 작성.** 설계 6.1~6.5와 Global Constraints의 learn 값을 그대로 담는다. `SKILL.md` 명령 표에 learn을 더한다.
- [ ] **Step 4: S19~S22 실행 → 전부 PASS.** 실제 홈 해시도 그대로여야 한다.
- [ ] **Step 5: Commit** `feat: 처음 배우기(/classmate learn)`

### Task 5: README와 최종 회귀

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 수정.**
  - 명령 표에 `mode`와 `learn`을 더한다.
  - "빈도 모드" 절: 세 모드, 토큰 추정, 가볍게가 기본인 이유.
  - "완성된 프로젝트로 공부하기" 절: learn 흐름과 text sketch.
  - 학습 기록 트리에 `learn.md`를 더한다.
- [ ] **Step 2: 남은 시나리오 회귀.** S4, S6, S7, S7b, S10, S13, S14 실행 → 전부 PASS.
- [ ] **Step 3: Run `node --test "tests/*.test.mjs"` → PASS.** `node tests/validate-classmate.mjs playground/.classmate` → `OK`
- [ ] **Step 4: Commit** `docs: README에 모드와 learn`
