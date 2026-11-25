---
id: 001
feature: 할 일 추가
date: 2026-11-24
status: done
level: 중급
---
## 설명
- 바뀐 파일: src/todo.js, src/app.js
- 흐름: 입력창 → form submit → addTodo() → todos 배열 → render()
- 이유: Map도 고려했지만 순서 유지가 쉬운 배열을 택했다
- 막혔던 것: 빈 입력이 추가되는 버그 → trim 검사로 해결

## 퀴즈
### Q1 [데이터 흐름] 객관식
문제: 사용자가 '추가' 버튼을 누르면 입력한 글자는 어디에 저장되나요?
보기: ① localStorage ② todos 배열 ③ 서버 ④ input 요소
정답: ②
내 답: ②
결과: 맞음
해설: addTodo()가 todos 배열에 push한다 (src/todo.js:7)

### Q2 [코드] 객관식
문제: 여러 줄 입력을 줄 단위로 나누려면 어떤 코드를 쓰나요?
보기: ① text.trim() ② text.split('\n') ③ text.join(',') ④ text.length
정답: ②
내 답: ①
결과: 틀림
해설: 줄바꿈 문자 '\n'으로 나눈다. 예: 'a\nb'.split('\n') → ['a', 'b']. 테스트 파일은 C:\temp\notes.txt

### Q3 [설계 이유] 서술형
문제: 할 일을 Map이 아니라 배열에 담은 이유는 무엇인가요?
정답: 추가한 순서를 그대로 유지하며 화면에 그리기 쉬워서
내 답: 순서대로 보여주려고
결과: 맞음
해설: render()가 todos.map으로 순서대로 그린다 (src/app.js:8)
