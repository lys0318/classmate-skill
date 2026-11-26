---
id: 001
feature: 2장 · 할 일 데이터와 조작
date: 2026-11-26
status: done
level: 중급
kind: learn
chapter: 2
---
## 설명
- 다룬 파일: src/todo.js
- 흐름: 입력 문자열 → addTodo() → trim 검사 → todos 배열
- 이유: (추정, 출처: README) Map보다 순서 유지가 쉬운 배열을 택한 것으로 보인다
- 막혔던 것: 해당 없음

## 퀴즈
### Q1 [설계 이유] 객관식
문제: 할 일을 Map이 아니라 배열에 담은 이유로 README에서 추정되는 것은?
보기: ① 속도가 빨라서 ② 순서 유지가 쉬워서 ③ 메모리가 적어서 ④ 서버와 맞추려고
정답: ②
내 답: ①
결과: 틀림
해설: 추정이다(출처: README). README에 "추가한 순서대로 보여준다"고 적혀 있다.

### Q2 [코드] 객관식
문제: addTodo()는 빈 입력에 무엇을 돌려주나요?
보기: ① true ② false ③ null ④ 에러
정답: ②
내 답: ②
결과: 맞음
해설: trim 결과가 비면 false를 돌려준다 (src/todo.js:6)

### Q3 [데이터 흐름] 서술형
문제: removeTodo(id)는 어떤 순서로 항목을 지우나요?
정답: findIndex로 위치를 찾고, 있으면 splice로 지운다
내 답: 모르겠다
결과: 틀림
해설: findIndex → splice (src/todo.js:12-13)
