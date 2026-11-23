import { todos, addTodo, removeTodo } from './todo.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');

function render() {
  list.replaceChildren(...todos.map((t) => {
    const li = document.createElement('li');
    li.textContent = t.text;
    const del = document.createElement('button');
    del.textContent = '삭제';
    del.onclick = () => { removeTodo(t.id); render(); };
    li.append(del);
    return li;
  }));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (addTodo(input.value)) input.value = '';
  render();
});
