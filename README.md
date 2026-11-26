# classmate

AI와 바이브코딩을 하다 보면 '수락'만 누르고 넘어가기 쉽습니다. 그러면 프로젝트는 완성돼도, 그 구조와 데이터 흐름, 그렇게 만든 이유, 문제를 푼 과정은 정작 본인이 설명하지 못하게 됩니다.

classmate는 이 문제를 막는 스킬입니다. 기능 하나를 완성할 때마다 에이전트가 방금 만든 것을 짧게 설명하고, 퀴즈로 이해도를 확인합니다. Claude Code와 Codex에서 동작합니다.

```
── 할 일 추가 ─────────────────────────
바뀐 파일 : src/todo.js, src/app.js
흐름      : 입력창 → addTodo() → todos 배열 → render()
이유      : Map도 고려했지만 순서 유지가 쉬운 배열을 택함
막혔던 것 : 빈 입력이 추가되는 버그 → trim 검사로 해결

이해도 퀴즈(3문제)를 지금 풀까요?  1. 지금  2. 나중에
```

## 설치

### Claude Code: 마켓플레이스로 설치 (추천)

Claude Code 안에서 두 줄을 입력합니다. 터미널에서는 `/plugin` 대신 `claude plugin`으로 똑같이 하면 됩니다.

```
/plugin marketplace add lys0318/classmate-skill
/plugin install classmate@classmate-skill
```

- 플러그인으로 설치하면 명령 앞에 플러그인 이름이 붙습니다. 아래 사용법의 `/classmate on`은 `/classmate:classmate on`으로 입력하세요.
- 새 버전 받기: `/plugin marketplace update classmate-skill`. `/plugin`의 Marketplaces에서 이 마켓플레이스의 자동 업데이트를 켜 두면 알아서 받습니다.

### 직접 복사해서 설치 (Codex, 또는 짧은 `/classmate`로 쓰고 싶을 때)

스킬 폴더 `skills/classmate`를 에이전트의 스킬 폴더로 복사하면 끝입니다. 따로 설치할 프로그램은 없습니다. 마켓플레이스로 설치했다면 Claude Code 쪽은 복사하지 마세요. 같은 스킬이 두 번 잡힙니다.

| 에이전트 | 복사할 위치 |
|---|---|
| Claude Code | `~/.claude/skills/classmate` |
| Codex | `~/.agents/skills/classmate` |

**macOS / Linux**

```bash
git clone https://github.com/lys0318/classmate-skill.git
mkdir -p ~/.claude/skills && cp -r classmate-skill/skills/classmate ~/.claude/skills/   # Claude Code
mkdir -p ~/.agents/skills && cp -r classmate-skill/skills/classmate ~/.agents/skills/   # Codex
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/lys0318/classmate-skill.git
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null; Copy-Item -Recurse classmate-skill\skills\classmate "$HOME\.claude\skills\"   # Claude Code
New-Item -ItemType Directory -Force "$HOME\.agents\skills" | Out-Null; Copy-Item -Recurse classmate-skill\skills\classmate "$HOME\.agents\skills\"   # Codex
```

설치한 뒤에는 에이전트를 다시 시작하세요.

## 사용법

학습할 프로젝트에서 `on`을 한 번 실행하면 됩니다. 그 뒤로는 기능을 완성할 때마다 고른 모드에 따라 classmate가 기록하거나 퀴즈를 냅니다. 오타 수정이나 설정 변경처럼 작은 작업에는 끼어들지 않습니다. 이미 완성된 프로젝트는 `learn`으로 공부할 수 있습니다.

| Claude Code | Codex | 하는 일 |
|---|---|---|
| `/classmate on` | `$classmate on` | 이 프로젝트에서 켜기 |
| `/classmate off` | `$classmate off` | 끄기 (학습 기록은 남음) |
| `/classmate` | `$classmate` | 지금 바로 퀴즈. 미룬 퀴즈와 기록만 된 기능이 있으면 먼저 |
| `/classmate level 입문\|중급\|고급` | `$classmate level …` | 난이도 바꾸기 |
| `/classmate mode 가볍게\|꼼꼼하게\|직접만` | `$classmate mode …` | 빈도 모드 바꾸기 |
| `/classmate review` | `$classmate review` | 프로젝트 전체 복습, 종합 퀴즈, 이해도 리포트 |
| `/classmate learn [장 번호]` | `$classmate learn …` | 완성된 프로젝트를 장 단위로 공부하기 (`on` 없이 동작) |

마켓플레이스로 설치했다면 Claude Code 명령의 `/classmate`를 `/classmate:classmate`로 바꿔 입력하세요.

**처음 `on`을 실행할 때**는 개인 전역 지침 파일(Claude Code는 `~/.claude/CLAUDE.md`, Codex는 `~/.codex/AGENTS.md`)에 아래 블록을 넣어도 되는지 묻습니다. 이 블록이 있어야 기능을 완성할 때 자동으로 실행됩니다. 블록은 `.classmate/`가 켜진 프로젝트에서만 동작합니다.

```
<!-- classmate:start -->
현재 프로젝트에 `.classmate/config.json`이 있고 enabled가 true이면,
기능 하나를 완성했을 때 classmate 스킬을 실행해 설명과 이해도 퀴즈를 제공한다.
<!-- classmate:end -->
```

### 빈도 모드

`on` 할 때 고르고, `mode` 명령으로 언제든 바꿀 수 있습니다.

| 모드 | 기능을 완성하면 | 추가 토큰(대략) |
|---|---|---|
| 가볍게 (기본) | 설명 4줄짜리 노트만 남기고 한 줄로 알림. 퀴즈는 `review`나 `/classmate` 때 몰아서. 노트가 5개 쌓일 때마다 중간 점검을 제안 | 기능당 2~3천 |
| 꼼꼼하게 | 바로 설명하고 퀴즈 3문제 (나중으로 미루기 가능) | 기능당 약 1만 |
| 직접만 | 아무것도 안 함. 직접 부를 때만 동작 | 0 |

가볍게가 기본인 이유: "왜 이렇게 만들었는지"와 "어떤 문제를 어떻게 풀었는지"는 그 순간의 대화에만 남아서, 나중에 한꺼번에 하면 기록할 수 없습니다. 기록은 매번 싸게 남기고, 비싼 퀴즈는 몰아서 냅니다.

### 난이도

| 난이도 | 설명과 퀴즈가 다루는 것 |
|---|---|
| 입문 | 무엇을 만들었는지, 용어의 뜻, 각 파일의 역할 |
| 중급 (기본) | 왜 이렇게 짰는지, 데이터가 어디서 어디로 가는지 |
| 고급 | 다른 방식과의 비교, 예외 상황, 고장 났을 때 어디부터 볼지 |

### 퀴즈

- 기능 하나에 3문제(객관식 2, 서술형 1)가 나옵니다.
- 문제는 이 프로젝트의 실제 코드와 방금 한 작업에서 냅니다. 이름 외우기 같은 암기 문제는 내지 않습니다.
- 문제마다 다섯 영역(구조, 코드, 데이터 흐름, 설계 이유, 문제 해결) 중 하나가 붙습니다.
- 언제든 '나중에'를 고를 수 있습니다. 미룬 퀴즈는 다음에 `/classmate`를 부를 때 다시 나옵니다.

### 프로젝트 복습 (`review`)

프로젝트를 마무리할 때, 또는 중간 점검이 필요할 때 실행합니다.

1. 전체 폴더 구조, 핵심 데이터 흐름, 그동안의 설계 결정을 먼저 설명합니다.
2. 미룬 퀴즈, 틀렸던 개념, 전체 구조를 묶어 종합 퀴즈 5~10문제를 냅니다.
3. 브라우저에서 이해도 리포트(`.classmate/report.html`)를 엽니다. 구조도, 기능 타임라인, 다섯 영역별 이해도, 틀린 문제와 해설, 다음에 공부할 것이 들어 있습니다. 서버 없이 파일 하나로 열리고, 구조도는 인터넷이 연결돼 있을 때 그림으로 그려집니다.

### 완성된 프로젝트로 공부하기 (`learn`)

스킬을 나중에 설치했거나, 공부하려고 받은 남의 프로젝트(오픈소스 등)도 쓸 수 있습니다. 프로젝트 폴더에서 `/classmate learn`을 실행하세요. 전역 지침 파일은 건드리지 않습니다.

```
/classmate learn
── 프로젝트 지도: todo-app ─────────────
무엇  : 할 일을 추가·완료·삭제하는 웹 앱
실행  : index.html을 브라우저로 열기
구조  : index.html(화면) · app.js(동작) · style.css(모양)

장 목록
  1. 화면 뼈대와 시작          ← 다음
  2. 할 일 추가 흐름
  3. 완료·삭제와 이벤트 위임
  4. 저장과 불러오기
어느 장부터 볼까요?  (번호 / 처음부터)
```

- 처음에는 README, 폴더 구조, 설정 파일, 진입점만 읽어서 지도와 장 목록을 만듭니다. `node_modules` 같은 폴더는 읽지 않습니다.
- 장마다 그 장의 파일만 읽어서 쉽게 설명하고 퀴즈 3문제를 냅니다. 진행 상황은 `.classmate/learn.md`에 남아 다음 세션에 `/classmate learn`으로 이어집니다.
- 설계 이유는 내 프로젝트면 "그때 왜 이렇게 하셨는지" 물어서 기록하고, 남의 프로젝트면 README·커밋 메시지·주석에서 찾아 **출처를 붙인 추정**으로만 씁니다.
- 다 끝나면 `review`로 종합 퀴즈와 리포트를 받습니다.

## 학습 기록

기록은 프로젝트의 `.classmate/` 폴더에 쌓입니다.

```
.classmate/
├─ .gitignore      # 내용은 * 한 줄. 이 폴더는 커밋되지 않습니다
├─ config.json     # 켜짐 여부, 난이도, 모드
├─ learn.md        # learn의 프로젝트 지도와 장 진행 상황
├─ features/
│  └─ 001-할-일-추가.md   # 기능별 학습 노트 (설명, 문제, 내 답, 해설)
├─ reviews/
│  └─ 2026-11-25.md      # review 때 낸 종합 퀴즈
├─ report.html           # 이해도 리포트 (review 때 생성)
└─ report-data.js        # 리포트 데이터
```

- 학습 노트는 그대로 읽을 수 있는 마크다운이라 복습 자료로 써도 됩니다.
- 모든 기록은 내 컴퓨터에만 있습니다. 서버로 보내지 않습니다.
- 사용자의 `.gitignore`나 프로젝트의 `CLAUDE.md`·`AGENTS.md`는 건드리지 않습니다.
- 기록을 커밋하고 싶으면 `.classmate/.gitignore`만 지우면 됩니다.

## 완전히 지우기

1. 전역 지침 파일(`~/.claude/CLAUDE.md` 또는 `~/.codex/AGENTS.md`)에서 `<!-- classmate:start -->`부터 `<!-- classmate:end -->`까지 지웁니다.
2. 마켓플레이스로 설치했다면 `/plugin uninstall classmate@classmate-skill`, 복사해서 설치했다면 스킬 폴더(`~/.claude/skills/classmate` 또는 `~/.agents/skills/classmate`)를 지웁니다.
3. 학습 기록이 필요 없으면 프로젝트의 `.classmate/` 폴더를 지웁니다.

블록만 남아 있어도 `.classmate/`가 없는 프로젝트에서는 아무 일도 하지 않습니다.

## 개발

스킬 본체는 에이전트가 읽는 지시문(`skills/classmate/`)입니다. 검증은 두 가지로 합니다.

- `tests/scenarios.md`: 새 에이전트에게 지시문만 주고 정해진 상황을 연기시킨 뒤, `bash tests/scenarios.sh check <S번호> <임시 폴더>`로 결과 파일을 검사합니다.
- `node tests/validate-classmate.mjs <.classmate 경로>`: 학습 기록과 리포트 데이터가 정해진 형식을 따르는지 검사합니다.
- `node --test "tests/*.test.mjs"`: 리포트 틀의 점수 계산을 테스트합니다.

검증에만 Node를 씁니다. 스킬을 쓰는 사람에게는 필요 없습니다.
