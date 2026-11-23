// 개발용 검사 스크립트: .classmate/ 폴더가 설계 형식을 따르는지 확인한다. 스킬 사용자에게는 필요 없다.
// 사용법: node tests/validate-classmate.mjs <.classmate 경로>  → 문제 없으면 OK(종료 코드 0), 있으면 목록(종료 코드 1)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LEVELS = ['입문', '중급', '고급'];
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
    if (!['done', 'deferred'].includes(fm.status)) problems.push(`${label}: status가 done|deferred가 아님`);
    if (!LEVELS.includes(fm.level)) problems.push(`${label}: level이 ${LEVELS.join('|')} 중 하나가 아님`);
    if (!/^## 설명$/m.test(text)) problems.push(`${label}: '## 설명' 없음`);
    const at = text.search(/^## 퀴즈$/m);
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
}

const dir = process.argv[2];
if (!dir) {
  console.error('사용법: node tests/validate-classmate.mjs <.classmate 경로>');
  process.exit(2);
}
const problems = [];
checkBase(dir, problems);
checkFeatures(dir, problems);
if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('OK');
