import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
test('UI hides numeric evidence score but keeps verdict and original evidence',()=>{
 assert.ok(app.includes('有原始公开材料支持'));
 assert.ok(app.includes('核验结论'));
 assert.ok(app.includes('原文摘录'));
 assert.ok(app.includes('查看原始公告 / 报道'));
 assert.ok(!app.includes('证据质量参考分'));
 assert.ok(!app.includes('${a.score}'));
 assert.ok(!app.includes('评分考虑来源40%'));
});
