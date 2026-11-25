// 개발용 검사 스크립트: .classmate/ 폴더가 설계 형식을 따르는지 확인한다. 스킬 사용자에게는 필요 없다.
// 사용법: node tests/validate-classmate.mjs <.classmate 경로>  → 문제 없으면 OK(종료 코드 0), 있으면 목록(종료 코드 1)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const LEVELS = ['입문', '중급', '고급'];
const MODES = ['가볍게', '꼼꼼하게', '직접만'];
const STATUSES = ['done', 'deferred', 'noted'];
const AREAS = ['구조', '코드', '데이터 흐름', '설계 이유', '문제 해결'];
const TEMPLATE = new URL('../skills/classmate/assets/report-template.html', import.meta.url);
const RESULTS = ['맞음', '부분', '틀림', '미응답'];
const Q_HEADER = /^### Q\d+ \[(구조|코드|데이터 흐름|설계 이유|문제 해결)\] (객관식|서술형)$/;
const read = (p) => readFileSync(p, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fm;
}

// '### Q' 헤더 단위로 문제를 검사하고, 문제마다 결과 값을 돌려준다
function checkQuiz(text, label, problems) {
  const qs = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      const m = line.match(Q_HEADER);
      if (!m) problems.push(`${label}: 문제 헤더 형식 오류(영역·유형 확인): ${line}`);
      qs.push(m ? { type: m[2], lines: [] } : null);
    } else if (qs.at(-1)) qs.at(-1).lines.push(line);
  }
  if (!qs.length) problems.push(`${label}: 퀴즈 문제 없음`);
  const results = [];
  qs.forEach((q, n) => {
    if (!q) return;
    const get = (k) => q.lines.find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
    for (const k of ['문제', '정답', '결과']) if (get(k) === undefined) problems.push(`${label} Q${n + 1}: '${k}:' 줄 없음`);
    if (q.type === '객관식' && get('보기') === undefined) problems.push(`${label} Q${n + 1}: 객관식인데 '보기:' 줄 없음`);
    const r = get('결과');
    if (r !== undefined && !RESULTS.includes(r)) problems.push(`${label} Q${n + 1}: 결과 값 '${r}'이 ${RESULTS.join('|')} 중 하나가 아님`);
    if (r && r !== '미응답' && !get('해설')) problems.push(`${label} Q${n + 1}: 채점했는데 해설 없음`);
    results.push(r);
  });
  return results;
}

function checkFeatures(dir, problems) {
  const fdir = join(dir, 'features');
  if (!existsSync(fdir)) return;
  for (const f of readdirSync(fdir).filter((f) => f.endsWith('.md'))) {
    const label = `features/${f}`;
    if (!/^\d{3}-[^\s\\/:*?"<>|]+\.md$/.test(f)) problems.push(`${label}: 파일 이름이 NNN-이름.md 형식이 아니거나 공백·금지 문자가 있음`);
    const text = read(join(fdir, f));
    const fm = frontmatter(text);
    if (!fm) { problems.push(`${label}: frontmatter 없음`); continue; }
    if (fm.id !== f.slice(0, 3)) problems.push(`${label}: id(${fm.id})가 파일 번호와 다름`);
    if (!fm.feature) problems.push(`${label}: feature 없음`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date ?? '')) problems.push(`${label}: date가 YYYY-MM-DD가 아님`);
    if (!STATUSES.includes(fm.status)) problems.push(`${label}: status가 ${STATUSES.join('|')} 중 하나가 아님`);
    if (!LEVELS.includes(fm.level)) problems.push(`${label}: level이 ${LEVELS.join('|')} 중 하나가 아님`);
    if (fm.kind !== undefined) {
      if (fm.kind !== 'learn') problems.push(`${label}: kind가 learn이 아님`);
      else if (!/^[1-9]\d*$/.test(fm.chapter ?? '')) problems.push(`${label}: learn 노트의 chapter가 양의 정수가 아님`);
    }
    if (!/^## 설명$/m.test(text)) problems.push(`${label}: '## 설명' 없음`);
    const at = text.search(/^## 퀴즈$/m);
    if (fm.status === 'noted') {
      if (at >= 0) problems.push(`${label}: noted인데 퀴즈 절이 있음`);
      continue;
    }
    if (at < 0) { problems.push(`${label}: '## 퀴즈' 없음`); continue; }
    const results = checkQuiz(text.slice(at), label, problems);
    if (fm.status === 'done' && results.includes('미응답')) problems.push(`${label}: done인데 미응답 문제가 있음`);
    if (fm.status === 'deferred' && !results.includes('미응답')) problems.push(`${label}: deferred인데 미응답 문제가 없음`);
  }
}

function checkBase(dir, problems) {
  const gi = join(dir, '.gitignore');
  if (!existsSync(gi)) problems.push('.gitignore 없음');
  else if (read(gi).trim() !== '*') problems.push('.gitignore 내용이 * 한 줄이 아님');

  const cfgPath = join(dir, 'config.json');
  if (!existsSync(cfgPath)) return problems.push('config.json 없음');
  let cfg;
  try { cfg = JSON.parse(read(cfgPath)); } catch (e) { return problems.push(`config.json JSON 오류: ${e.message}`); }
  if (typeof cfg.enabled !== 'boolean') problems.push('config.json: enabled가 boolean이 아님');
  if (!LEVELS.includes(cfg.level)) problems.push(`config.json: level이 ${LEVELS.join('|')} 중 하나가 아님`);
  // mode가 없으면 가볍게로 본다(먼저 설치한 사용자의 config)
  if (cfg.mode !== undefined && !MODES.includes(cfg.mode)) problems.push(`config.json: mode가 ${MODES.join('|')} 중 하나가 아님`);
}

function checkReviews(dir, problems) {
  const rdir = join(dir, 'reviews');
  if (!existsSync(rdir)) return;
  for (const f of readdirSync(rdir).filter((f) => f.endsWith('.md'))) {
    const label = `reviews/${f}`;
    if (!/^\d{4}-\d{2}-\d{2}(-\d+)?\.md$/.test(f)) problems.push(`${label}: 파일 이름이 YYYY-MM-DD(-N).md 형식이 아님`);
    const text = read(join(rdir, f));
    const fm = frontmatter(text);
    if (!fm) { problems.push(`${label}: frontmatter 없음`); continue; }
    if (fm.type !== 'review') problems.push(`${label}: type이 review가 아님`);
    if (fm.date !== f.slice(0, 10)) problems.push(`${label}: date(${fm.date})가 파일 이름 날짜와 다름`);
    const at = text.search(/^## 퀴즈$/m);
    if (at < 0) problems.push(`${label}: '## 퀴즈' 없음`);
    else checkQuiz(text.slice(at), label, problems);
  }
}

// learn.md: frontmatter와 장 목록 표(장 번호는 1부터 빠짐없이, 상태는 대기|완료)
function checkLearn(dir, problems) {
  const p = join(dir, 'learn.md');
  if (!existsSync(p)) return;
  const text = read(p);
  const fm = frontmatter(text);
  if (!fm) return problems.push('learn.md: frontmatter 없음');
  if (fm.type !== 'learn') problems.push('learn.md: type이 learn이 아님');
  if (!['본인', '다른 사람'].includes(fm.owner)) problems.push('learn.md: owner가 본인|다른 사람이 아님');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.started ?? '')) problems.push('learn.md: started가 YYYY-MM-DD가 아님');
  const at = text.search(/^## 장 목록$/m);
  if (at < 0) return problems.push("learn.md: '## 장 목록' 없음");
  const rows = text.slice(at).split('\n').filter((l) => l.startsWith('|')).slice(2); // 머리줄과 구분줄 제외
  if (!rows.length) problems.push('learn.md: 장이 없음');
  rows.forEach((row, n) => {
    const m = row.match(/^\| (\d+) \| (.+?) \| (.+?) \| (대기|완료) \|$/);
    if (!m) problems.push(`learn.md: 장 목록 ${n + 1}번째 줄 형식 오류(상태는 대기|완료): ${row}`);
    else if (Number(m[1]) !== n + 1) problems.push(`learn.md: 장 번호가 ${n + 1}이어야 하는데 ${m[1]}`);
  });
}

function checkQuestions(qs, label, problems) {
  if (!Array.isArray(qs)) return problems.push(`${label}: questions가 배열이 아님`);
  qs.forEach((q, n) => {
    const l = `${label} 문제 ${n + 1}`;
    if (!AREAS.includes(q?.area)) problems.push(`${l}: area '${q?.area}'가 ${AREAS.join('|')} 중 하나가 아님`);
    if (!['객관식', '서술형'].includes(q?.type)) problems.push(`${l}: type이 객관식|서술형이 아님`);
    if (!RESULTS.includes(q?.result)) problems.push(`${l}: result '${q?.result}'가 ${RESULTS.join('|')} 중 하나가 아님`);
    for (const k of ['question', 'answer', 'userAnswer', 'explanation']) {
      if (typeof q?.[k] !== 'string') problems.push(`${l}: ${k}가 문자열이 아님`);
    }
  });
}

// review가 쓰는 report-data.js를 실행해 형식을 확인하고, 리포트 틀의 점수 계산이 그 데이터로 동작하는지 본다
function checkReportData(dir, problems) {
  const p = join(dir, 'report-data.js');
  if (!existsSync(p)) return;
  const ctx = vm.createContext({ window: {} });
  try { vm.runInContext(read(p), ctx); } catch (e) { return problems.push(`report-data.js 실행 오류: ${e.message}`); }
  const d = ctx.window.CLASSMATE_DATA;
  if (!d || typeof d !== 'object') return problems.push('report-data.js: window.CLASSMATE_DATA 없음');
  for (const k of ['project', 'summary']) if (typeof d[k] !== 'string') problems.push(`report-data.js: ${k}가 문자열이 아님`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.generatedAt ?? '')) problems.push('report-data.js: generatedAt이 YYYY-MM-DD가 아님');
  if (!LEVELS.includes(d.level)) problems.push('report-data.js: level 오류');
  if (typeof d.structure?.mermaid !== 'string' || typeof d.structure?.text !== 'string') problems.push('report-data.js: structure.mermaid·text가 문자열이 아님');
  for (const k of ['flows', 'decisions', 'features', 'reviews', 'nextSteps']) {
    if (!Array.isArray(d[k])) problems.push(`report-data.js: ${k}가 배열이 아님`);
  }
  (d.decisions ?? []).forEach((x, n) => {
    if (typeof x?.feature !== 'string' || typeof x?.why !== 'string') problems.push(`report-data.js: decisions ${n + 1}에 feature·why 문자열이 없음`);
  });
  (d.features ?? []).forEach((f, n) => {
    const l = `report-data.js features ${n + 1}`;
    if (!/^\d{3}$/.test(f?.id ?? '')) problems.push(`${l}: id가 3자리가 아님`);
    if (typeof f?.name !== 'string') problems.push(`${l}: name 없음`);
    if (!STATUSES.includes(f?.status)) problems.push(`${l}: status 오류`);
    if (f?.status === 'noted' && f.questions?.length) problems.push(`${l}: noted 기능인데 questions가 비어 있지 않음`);
    checkQuestions(f?.questions, l, problems);
  });
  (d.reviews ?? []).forEach((r, n) => checkQuestions(r?.questions, `report-data.js reviews ${n + 1}`, problems));
  const logic = readFileSync(TEMPLATE, 'utf8').match(/<script id="classmate-logic">([\s\S]*?)<\/script>/)?.[1];
  try {
    vm.runInContext(logic, ctx);
    ctx.window.ClassmateReport.computeAreaScores(d);
  } catch (e) {
    problems.push(`리포트 틀의 점수 계산이 이 데이터로 실패함: ${e.message}`);
  }
}

const dir = process.argv[2];
if (!dir) {
  console.error('사용법: node tests/validate-classmate.mjs <.classmate 경로>');
  process.exit(2);
}
const problems = [];
checkBase(dir, problems);
checkFeatures(dir, problems);
checkReviews(dir, problems);
checkReportData(dir, problems);
checkLearn(dir, problems);
if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('OK');
