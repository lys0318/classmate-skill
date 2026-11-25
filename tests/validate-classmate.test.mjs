// 검사기(validate-classmate.mjs) 규칙 테스트. 실행: node --test "tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const VALIDATOR = fileURLToPath(new URL('./validate-classmate.mjs', import.meta.url));
const DEFERRED = read('./fixtures/deferred-note.md');
const NOTED = DEFERRED.replace('status: deferred', 'status: noted').replace(/\n## 퀴즈[\s\S]*$/, '\n');
const withLearn = (note, chapter) => note.replace('level: 중급', `level: 중급\nkind: learn\nchapter: ${chapter}`);
const LEARN = (rows) =>
  `---\ntype: learn\nowner: 다른 사람\nstarted: 2026-11-26\n---\n# 프로젝트 지도\n- 무엇: 할 일 앱\n\n## 장 목록\n| 장 | 제목 | 범위 | 상태 |\n|---|---|---|---|\n${rows.join('\n')}\n`;

function classmate({ config = { enabled: true, level: '중급' }, notes = {}, files = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cm-'));
  writeFileSync(join(dir, '.gitignore'), '*\n');
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config));
  if (Object.keys(notes).length) mkdirSync(join(dir, 'features'));
  for (const [name, text] of Object.entries(notes)) writeFileSync(join(dir, 'features', name), text);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}
function run(dir) {
  const r = spawnSync(process.execPath, [VALIDATOR, dir], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}
const reportData = (status, questions) => {
  const src = read('./fixtures/report-data.js');
  const d = new Function('window', `${src}; return window.CLASSMATE_DATA;`)({});
  d.features = [Object.assign({}, d.features[0], { status, questions })];
  return `window.CLASSMATE_DATA = ${JSON.stringify(d)};\n`;
};

test('config에 mode가 없어도 통과', () => {
  assert.equal(run(classmate()).code, 0);
});

test('mode 값이 틀리면 실패', () => {
  const r = run(classmate({ config: { enabled: true, level: '중급', mode: '보통' } }));
  assert.equal(r.code, 1);
  assert.match(r.out, /mode/);
});

test('mode 값이 맞으면 통과', () => {
  for (const mode of ['가볍게', '꼼꼼하게', '직접만']) {
    assert.equal(run(classmate({ config: { enabled: false, level: '입문', mode } })).code, 0, mode);
  }
});

test('noted 노트는 퀴즈 절 없이 통과', () => {
  const r = run(classmate({ notes: { '001-할-일-추가.md': NOTED } }));
  assert.equal(r.code, 0, r.out);
});

test('noted 노트에 퀴즈가 있으면 실패', () => {
  const r = run(classmate({ notes: { '001-할-일-추가.md': DEFERRED.replace('status: deferred', 'status: noted') } }));
  assert.equal(r.code, 1);
  assert.match(r.out, /noted인데 퀴즈/);
});

test('done 노트에 퀴즈가 없으면 실패', () => {
  const r = run(classmate({ notes: { '001-할-일-추가.md': NOTED.replace('status: noted', 'status: done') } }));
  assert.equal(r.code, 1);
  assert.match(r.out, /퀴즈' 없음/);
});

test('learn 노트는 chapter가 양의 정수여야 함', () => {
  assert.equal(run(classmate({ notes: { '001-x.md': withLearn(DEFERRED, 0) } })).code, 1);
  assert.equal(run(classmate({ notes: { '001-x.md': withLearn(DEFERRED, 2) } })).code, 0);
});

test('learn.md 정상이면 통과', () => {
  const r = run(classmate({ files: { 'learn.md': LEARN(['| 1 | 화면 | index.html | 완료 |', '| 2 | 데이터 | src/todo.js | 대기 |']) } }));
  assert.equal(r.code, 0, r.out);
});

test('learn.md 장 번호가 끊기면 실패', () => {
  const r = run(classmate({ files: { 'learn.md': LEARN(['| 1 | 화면 | index.html | 대기 |', '| 3 | 데이터 | src/todo.js | 대기 |']) } }));
  assert.equal(r.code, 1);
  assert.match(r.out, /learn\.md/);
});

test('learn.md 상태 값이 틀리면 실패', () => {
  const r = run(classmate({ files: { 'learn.md': LEARN(['| 1 | 화면 | index.html | 진행중 |']) } }));
  assert.equal(r.code, 1);
  assert.match(r.out, /learn\.md/);
});

test('report-data의 noted 기능은 questions가 비어야 함', () => {
  const bad = run(classmate({ files: { 'report-data.js': reportData('noted', [{ area: '구조', type: '객관식', question: 'q', answer: 'a', userAnswer: '', result: '미응답', explanation: '' }]) } }));
  assert.equal(bad.code, 1);
  assert.match(bad.out, /noted/);
  const ok = run(classmate({ files: { 'report-data.js': reportData('noted', []) } }));
  assert.equal(ok.code, 0, ok.out);
});
