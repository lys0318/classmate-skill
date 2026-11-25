// 리포트 틀 테스트용 데이터. review가 .classmate/report-data.js에 쓰는 형식과 같다.
window.CLASSMATE_DATA = {
  project: '할 일 앱',
  summary: '할 일을 추가·완료·삭제하고 브라우저에 저장하는 작은 웹 앱',
  generatedAt: '2026-11-25',
  level: '중급',
  structure: {
    mermaid: 'graph TD\n  A[index.html] --> B[app.js]\n  B --> C[(localStorage)]\n  B --> D[render: 목록 그리기]',
    text: 'index.html: 화면 뼈대\napp.js: 상태, 저장, 그리기\nstyle.css: 모양',
  },
  flows: ['입력창 → submit → update() → todos 배열 → save() → render()'],
  decisions: [
    { feature: '할 일 추가', why: 'Map도 고려했지만 순서 유지가 쉬운 배열을 택했다' },
    { feature: '할 일 삭제', why: '기록 없음' },
  ],
  features: [
    {
      id: '001', name: '할 일 추가', date: '2026-11-24', status: 'done',
      questions: [
        { area: '데이터 흐름', type: '객관식', question: '추가한 글자는 어디에 저장되나요?', answer: '② todos 배열', userAnswer: '② todos 배열', result: '맞음', explanation: 'addTodo()가 todos 배열에 push한다 (src/todo.js:7)' },
        { area: '데이터 흐름', type: '객관식', question: '화면은 언제 다시 그려지나요?', answer: '③ update() 끝에서', userAnswer: '① 새로고침할 때', result: '틀림', explanation: 'update()가 save() 다음 render()를 부른다 (app.js:49-50)' },
        { area: '코드', type: '서술형', question: '</script><script>alert(1)</script> 는 무엇을 하나요?', answer: '스크립트 태그를 닫고 새 스크립트를 실행하려는 문자열', userAnswer: '태그를 닫는다', result: '부분', explanation: '<b>굵게</b> 같은 HTML도 글자 그대로 보여야 한다' },
      ],
    },
    {
      id: '002', name: '할 일 삭제', date: '2026-11-24', status: 'deferred',
      questions: [
        { area: '데이터 흐름', type: '객관식', question: '삭제 버튼을 누르면 무엇이 바뀌나요?', answer: '② todos에서 그 항목이 빠진 새 배열', userAnswer: '', result: '미응답', explanation: 'todos.filter로 새 배열을 만든다 (app.js:67)' },
        { area: '문제 해결', type: '객관식', question: '삭제 후 화면이 안 바뀌면 어디부터 볼까요?', answer: '① update()가 render()를 부르는지', userAnswer: '', result: '미응답', explanation: '' },
      ],
    },
  ],
  reviews: [
    {
      date: '2026-11-25',
      questions: [
        { area: '데이터 흐름', type: '서술형', question: '체크박스를 누르면 무슨 일이 일어나나요?', answer: 'ul 리스너 → update() → save() → render()', userAnswer: 'update()가 불린다', result: '부분', explanation: 'ul 리스너가 클릭을 받는다 (app.js:62)' },
        { area: '구조', type: '객관식', question: '화면 뼈대는 어느 파일에 있나요?', answer: '① index.html', userAnswer: '① index.html', result: '맞음', explanation: 'index.html이 form과 ul을 정의한다' },
      ],
    },
  ],
  nextSteps: ['이벤트 위임과 버블링 다시 보기', 'update()가 상태를 바꾸는 유일한 곳인 이유 정리하기'],
};
