import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const katex = require(process.argv[2]);
const data = JSON.parse(readFileSync("data/revisao-enem-2022.json", "utf8"));
const rows = [...data.questions, ...data.newQuestions];
const visible = rows.filter(q => q.status !== "archived");
assert.equal(rows.length, 65);
assert.equal(visible.length, 62);
assert.equal(visible.filter(q => q.status === "active").length, 61);
assert.equal(new Set(rows.map(q => q.title)).size, rows.length);
let formulas = 0;
for (const q of visible) {
  const number = q.title.match(/\d+/)[0];
  assert.equal(q.year, 2022);
  assert.equal(q.choices.length, 5, q.title);
  assert.equal(q.correctChoice, number === "157" ? null : "ABCDE".indexOf(data.officialAnswerKey[number]), q.title);
  assert.equal(q.status, number === "157" ? "annulled" : "active");
  for (const value of [q.statement, q.solution, ...q.choices]) {
    assert.equal((value.match(/\\\(/g) || []).length, (value.match(/\\\)/g) || []).length, q.title);
    for (const match of value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
      katex.renderToString(match[1] ?? match[2], { throwOnError: true });
      formulas++;
    }
    for (const match of value.matchAll(/\/questions\/2022\/[\w-]+\.png/g)) {
      assert.ok(existsSync("client/public" + match[0]), match[0]);
    }
  }
}
const byNumber = n => visible.find(q => q.title.startsWith("Questão " + n + " "));
assert.deepEqual(byNumber(166).choices, ["0","1","2","3","4"]);
assert.equal(byNumber(143).correctChoice, 3);
assert.ok(byNumber(152).statement.includes("12 m"));
assert.ok(byNumber(112).solution.includes("450"));
assert.ok(!byNumber(112).solution.toLowerCase().includes("chuveiro"));
console.log("ENEM 2022: 62 questões públicas, gabaritos/arquivos válidos; " + formulas + " fórmulas renderizadas.");
