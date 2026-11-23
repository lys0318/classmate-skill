// 개발용 검사 스크립트: .classmate/ 폴더가 설계 형식을 따르는지 확인한다. 스킬 사용자에게는 필요 없다.
// 사용법: node tests/validate-classmate.mjs <.classmate 경로>  → 문제 없으면 OK(종료 코드 0), 있으면 목록(종료 코드 1)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LEVELS = ['입문', '중급', '고급'];
const read = (p) => readFileSync(p, 'utf8').replace(/^﻿/, '');

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
if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}
console.log('OK');
