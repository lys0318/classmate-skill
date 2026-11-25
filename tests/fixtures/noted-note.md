---
id: 001
feature: 할 일 추가
date: 2026-11-24
status: noted
level: 중급
---
## 설명
- 바뀐 파일: src/todo.js, src/app.js
- 흐름: 입력창 → form submit → addTodo() → todos 배열 → render()
- 이유: Map도 고려했지만 순서 유지가 쉬운 배열을 택했다
- 막혔던 것: 빈 입력이 추가되는 버그 → trim 검사로 해결
