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

S5~S10의 공통 맥락: 전역 지침 파일에 classmate 블록이 들어 있다(SKILL.md의 켜기 참고). 프로젝트는 `tests/fixtures/sample-app`의 복사본이고 git 저장소가 아니다.

### S5 기능 완성, 지금 풀기
- AGENT: Claude Code
- CONTEXT: 이번 대화에서 '할 일 추가' 기능을 구현하고 브라우저에서 동작을 확인했다. 빈 입력이 추가되는 버그가 있어 trim 검사로 고쳤다. Map도 고려했지만 순서 유지가 쉬운 배열을 택했다.
- INPUT: 없음. 기능을 막 완성하고 사용자에게 결과를 보고하려는 시점이다.
- ANSWERS: `지금`, 객관식 첫 문제 `1`, 둘째 문제 `3`, 서술형 `todos 배열에 넣고 다시 그린다`
- 확인: 설명이 10줄 안팎이고 바뀐 파일·흐름·이유·막혔던 것을 담았다. 틀린 답에 정답, 이유, `파일:줄`을 줬다. 프로젝트 코드를 고치지 않았다. 암기형 문제가 없다.

### S6 기능 완성, 나중에
- AGENT: Claude Code
- CONTEXT: S5와 같다.
- INPUT: S5와 같다.
- ANSWERS: `나중에`
- 확인: 다음에 classmate를 부르거나 review 때 다시 나온다고 알렸다.

### S7 끼어들지 않음 (작은 수정)
- AGENT: Claude Code
- CONTEXT: 이번 대화에서 README의 오타 하나를 고쳤다.
- INPUT: 없음. 수정을 마치고 사용자에게 보고하려는 시점이다.
- ANSWERS: 없음
- 확인: classmate를 실행하지 않았다.

### S7b 끼어들지 않음 (꺼져 있음)
- AGENT: Claude Code
- CONTEXT: S5와 같다. 단, `.classmate/config.json`의 enabled가 false다.
- INPUT: S5와 같다.
- ANSWERS: 없음
- 확인: classmate를 실행하지 않았다.

### S8 직접 부르기, 미룬 퀴즈 먼저
- AGENT: Claude Code
- CONTEXT: 없음(새 세션). `features/001-할-일-추가.md`가 미룸 상태로 있다.
- INPUT: `/classmate`
- ANSWERS: `지금`, `2`, `2`, `배열에 추가`. 그 뒤 질문에는 `이번엔 여기까지`
- 확인: 첫 메시지에서 001의 미룬 퀴즈를 먼저 제안했다.

### S9 직접 부르기, 새 세션·git 없음·노트 없음
- AGENT: Claude Code
- CONTEXT: 없음(새 세션)
- INPUT: `/classmate`
- ANSWERS: 없음
- 확인: 어떤 기능을 다룰지 물었고, 설명이나 설계 이유를 지어내지 않았다.

### S10 두 기능을 한 번에 완성
- AGENT: Claude Code
- CONTEXT: S5 맥락에 더해, 이어서 '할 일 삭제' 기능도 구현하고 동작을 확인했다.
- INPUT: 없음. 두 기능을 마치고 사용자에게 보고하려는 시점이다.
- ANSWERS: `지금`, 이후 객관식은 모두 `1`, 서술형은 모두 `모르겠다`
- 확인: 지금/나중에를 한 번만 물었다.

### S11 프로젝트 복습 (review)
- AGENT: Claude Code
- CONTEXT: 없음(새 세션). `.classmate/`에 노트 001(완료, 틀린 문제 1개)과 002(미룸, 이유 기록 없음)가 있다. 오늘 날짜는 2026-11-25. 리포트를 여는 명령은 실제로 실행하지 말고 실행했을 명령을 보고한다.
- INPUT: `/classmate review`
- ANSWERS: 객관식은 모두 `1`, 서술형은 모두 `모르겠다`
- 확인: 전체 구조 설명이 퀴즈보다 먼저 나왔다. 운영체제에 맞는 열기 명령을 보고했다. 틀렸던 개념을 같은 문제 그대로 내지 않았다.

### S12 review: 백슬래시와 객관식 보기가 리포트에 그대로
- AGENT: Claude Code
- CONTEXT: 없음(새 세션). 노트 001의 틀린 객관식 문제 해설에 `'a\nb'.split('\n')`과 `C:\temp\notes.txt`가 들어 있다. 오늘 날짜는 2026-11-25. 리포트를 여는 명령은 실행하지 말고 보고한다.
- INPUT: `/classmate review`
- ANSWERS: 객관식은 모두 `1`, 서술형은 모두 `모르겠다`
- 확인: 검사가 통과하면 된다(리포트 데이터의 해설에 백슬래시가 그대로 있고, 틀린 객관식의 정답·내 답에 보기 글이 있음).

### S13 지금/나중에 대신 다른 요청
- AGENT: Claude Code
- CONTEXT: S5와 같다.
- INPUT: S5와 같다.
- ANSWERS: 지금/나중에 질문에 `그것보다 할 일 수정 기능부터 만들어줘`. 새 기능은 실제로 구현하지 말고 시작하겠다고만 보고한다.
- 확인: 퀴즈를 미룸으로 저장했고, 새 요청으로 넘어갔다.

### S14 지금/나중에를 물은 직후 세션이 끊김
- AGENT: Claude Code
- CONTEXT: S5와 같다. 지금/나중에를 묻는 순간 세션이 끊긴다(답을 받지 못하고, 그 뒤로는 아무것도 할 수 없다).
- INPUT: S5와 같다.
- ANSWERS: 없음. 질문을 보낸 즉시 멈춘다.
- 확인: 답을 받기 전에 이미 노트가 미룸 상태로 저장돼 있다.

S1·S3의 답 끝에 모드 `가볍게`, S2의 답 끝에 모드 `꼼꼼하게`를 더한다. S5~S14는 `prep_app`이 모드를 `꼼꼼하게`로 둔다.

### S15 가볍게, 두 기능을 한 번에
- AGENT: Claude Code
- CONTEXT: S10과 같다. config 모드는 `가볍게`.
- INPUT: S10과 같다.
- ANSWERS: 없음
- 확인: 대화창의 classmate 알림이 한 줄뿐이고, 질문을 하지 않았다.

### S16 가볍게, 다섯 번째 기록에서 중간 점검 제안
- AGENT: Claude Code
- CONTEXT: S5와 같다. config 모드는 `가볍게`. noted 노트 001~004가 이미 있다.
- INPUT: S5와 같다.
- ANSWERS: 없음
- 확인: 기록 알림 한 줄 뒤에 `기록이 5개 쌓였어요` 제안 한 줄이 붙었다.

### S17 직접만
- AGENT: Claude Code
- CONTEXT: S5와 같다. config 모드는 `직접만`.
- INPUT: S5와 같다.
- ANSWERS: 없음
- 확인: classmate를 실행하지 않았다.

### S18 mode 명령
- AGENT: Claude Code
- CONTEXT: 이 프로젝트에서 classmate를 이미 켜 두었다(모드 꼼꼼하게).
- INPUT: `/classmate mode 직접만`
- ANSWERS: 없음
- 확인: 바뀐 모드를 알리고, 다른 설정은 그대로 두었다.
