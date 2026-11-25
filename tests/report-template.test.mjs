// 리포트 틀(report-template.html)의 점수 계산 로직 테스트. 실행: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const html = read('../skills/classmate/assets/report-template.html');
const logic = html.match(/<script id="classmate-logic">([\s\S]*?)<\/script>/)?.[1];

const ctx = vm.createContext({ window: {} });
vm.runInContext(read('./fixtures/report-data.js'), ctx);
vm.runInContext(logic ?? 'throw new Error("classmate-logic 스크립트 없음")', ctx);
const R = ctx.window.ClassmateReport;
const data = ctx.window.CLASSMATE_DATA;
// vm 안에서 만든 객체는 프로토타입이 달라 deepStrictEqual이 실패하므로 JSON으로 옮긴다
const plain = (v) => JSON.parse(JSON.stringify(v));
const scores = plain(R.computeAreaScores(data));

test('부분은 0.5점, 미응답은 제외', () => {
  assert.deepEqual(scores['데이터 흐름'], { score: 1.5, total: 3, percent: 50 });
});

test('답한 문제가 없는 영역은 percent null', () => {
  assert.equal(scores['문제 해결'].percent, null);
  assert.equal(scores['설계 이유'].percent, null);
});

test('다섯 영역 키가 항상 있다', () => {
  assert.deepEqual(Object.keys(scores).sort(), ['구조', '데이터 흐름', '문제 해결', '설계 이유', '코드'].sort());
});

test('wrongQuestions는 틀림·부분만, source 포함', () => {
  const w = plain(R.wrongQuestions(data));
  assert.equal(w.length, 3);
  assert.ok(w.every((q) => ['틀림', '부분'].includes(q.result) && q.source));
  assert.ok(w.some((q) => q.source === '복습 2026-11-25'));
});

test('알 수 없는 결과 값은 점수에서 제외', () => {
  const odd = { features: [{ name: 'x', questions: [{ area: '구조', result: 'constructor' }, { area: '모름', result: '맞음' }] }] };
  const s = plain(R.computeAreaScores(odd));
  assert.deepEqual(s['구조'], { score: 0, total: 0, percent: null });
});

test('timelineBadge: noted는 기록만', () => {
  assert.equal(R.timelineBadge({ status: 'noted', questions: [] }), '기록만');
});

test('timelineBadge: deferred는 남은 수', () => {
  assert.equal(R.timelineBadge({ status: 'deferred', questions: [{ result: '미응답' }, { result: '미응답' }, { result: '맞음' }] }), '미룸 · 2문제 남음');
});

test('timelineBadge: done은 맞힌 수', () => {
  assert.equal(R.timelineBadge({ status: 'done', questions: [{ result: '맞음' }, { result: '틀림' }, { result: '부분' }] }), '1/3 맞음');
});
