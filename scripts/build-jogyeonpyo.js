// build-jogyeonpyo.js — 선천수·중천수 표(src/ganji.js)에서 60갑자 조견표를 생성한다.
// 생성물 data/jogyeonpyo.json 은 감사용 정적 산출물이며,
// test/calc.test.js 가 "생성 표 = 공식 = 공개 대조표 앵커" 등가를 강제한다.
//
// 실행: npm run build:jogyeonpyo

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEXAGENARY, taeseNumber, wolgeonNumber, iljinNumber } from "../src/ganji.js";

const STEM_HANGUL = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const BRANCH_HANGUL = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };

const table = {};
for (const ganji of SEXAGENARY) {
  table[ganji] = {
    hangul: STEM_HANGUL[ganji[0]] + BRANCH_HANGUL[ganji[1]],
    taese: taeseNumber(ganji),
    wolgeon: wolgeonNumber(ganji),
    iljin: iljinNumber(ganji),
  };
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "jogyeonpyo.json");
writeFileSync(outPath, JSON.stringify(table, null, 1) + "\n", "utf8");
console.log(`생성 완료: data/jogyeonpyo.json (${SEXAGENARY.length}갑자)`);
