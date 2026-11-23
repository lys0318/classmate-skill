// 할 일 목록 상태와 조작 함수
export const todos = [];

export function addTodo(text) {
  const t = text.trim();
  if (!t) return false; // 빈 입력은 추가하지 않는다
  todos.push({ id: Date.now(), text: t, done: false });
  return true;
}

export function removeTodo(id) {
  const i = todos.findIndex((t) => t.id === id);
  if (i !== -1) todos.splice(i, 1);
}
