// calc.test.js — 작괘·조견표·데이터 무결성 픽스처 (지시서 §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SEXAGENARY,
  taeseNumber,
  wolgeonNumber,
  iljinNumber,
  resolveChart,
  solarToLunar,
  lunarToSolar,
  lunarMonthDays,
} from "../src/ganji.js";
import { makeGwae, upperGwae, middleGwae, lowerGwae } from "../src/calc.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const readJson = (name) => JSON.parse(readFileSync(join(dataDir, name), "utf8"));

// §6-1 공개 문서화 예시: 음력 1976-08-26생, 당년 2005(乙酉) → 괘 212
test("§6-1 공개 예시: 음1976-08-26 / 2005 → 괘 212", () => {
  const chart = resolveChart({ year: 1976, month: 8, day: 26 }, 2005);
  assert.equal(chart.koreanAge, 30);
  assert.deepEqual(chart.taese, { ganji: "乙酉", value: 20 });
  assert.deepEqual(chart.wolgeon, { ganji: "乙酉", value: 14 });
  assert.equal(chart.monthDays, 29); // 소월
  assert.deepEqual(chart.iljin, { ganji: "丙辰", value: 18 });

  const gwae = makeGwae({
    koreanAge: chart.koreanAge,
    taeseValue: chart.taese.value,
    monthDays: chart.monthDays,
    wolgeonValue: chart.wolgeon.value,
    birthDay: 26,
    iljinValue: chart.iljin.value,
  });
  assert.deepEqual(gwae, { sang: 2, jung: 1, ha: 2, code: "212" });
});

// badukworld 독립 예시: 음1975-07-25생, 당년 2024(甲辰)
//
// ★ 기대값을 861 → 811 로 교정했다(2026-08-04). **원 예시를 지우지 않고 교정 근거를 붙인다.**
//
//   전거 — 한국민족문화대백과사전(한국학중앙연구원) '토정비결' 항목의 작괘법 원문:
//     "당년 생월수를 놓되 달이 크면 30이요, 달이 적으면 29를 놓고 거기에 다시 생월의
//      월건수를 놓은 다음 6으로 제하고 남은 수로 중괘를 만든다."
//   즉 중괘의 날수는 **당년 생월의 실제 대소**다.
//
//   2024년 음 7월은 대월(30일)이다 — 한국 기준(KASI)·중국 기준 두 표가 일치한다.
//   그런데 861 이 나오려면 날수가 29 여야 한다. 원 예시가 29 를 쓴 것이고,
//   이 레포의 `lunarMonthDays()` 도 인자 누락으로 언제나 29 를 냈다 —
//   **결함과 예시가 같은 뿌리였고**, 예시에 맞춰 통과하던 테스트였다.
//   날수를 바로잡으면 중괘가 6 → 1 로 옮겨 괘가 811 이 된다.
//   (나머지 자리는 그대로다: 상괘 8 · 하괘 1 · 태세 甲辰 · 월건 壬申 · 일진 甲子.)
//
//   발견: zeostest 가 이 엔진을 PHP 로 이식하며 세운 등가 게이트.
test("독립 예시(baduk, 날수 교정): 음1975-07-25 / 2024 → 괘 811", () => {
  const chart = resolveChart({ year: 1975, month: 7, day: 25 }, 2024);
  assert.equal(chart.koreanAge, 50);
  assert.equal(chart.taese.ganji, "甲辰");
  assert.equal(chart.wolgeon.ganji, "壬申");
  assert.equal(chart.iljin.ganji, "甲子");
  assert.equal(chart.monthDays, 30, "2024 음7월은 대월(30) — 이 값이 29로 돌아가면 결함 재발이다");
  const gwae = makeGwae({
    koreanAge: chart.koreanAge,
    taeseValue: chart.taese.value,
    monthDays: chart.monthDays,
    wolgeonValue: chart.wolgeon.value,
    birthDay: 25,
    iljinValue: chart.iljin.value,
  });
  assert.equal(gwae.code, "811");
});

// 날수가 실제로 갈리는지 — 결함이 돌아오면 이 테스트가 먼저 터진다.
// (인자 없이 부르면 언제나 29 라, 값의 종류가 하나뿐인 것이 그 결함의 지문이다.)
test("날수는 대월/소월을 실제로 가른다", () => {
  assert.equal(lunarMonthDays(2024, 7), 30, "2024 음7월 = 대월");
  assert.equal(lunarMonthDays(2005, 8), 29, "2005 음8월 = 소월");
  assert.equal(lunarMonthDays(2026, 1), 30, "2026 음1월 = 대월");
  const kinds = new Set([2024, 2025, 2026].flatMap((y) =>
    Array.from({ length: 12 }, (_, i) => lunarMonthDays(y, i + 1))));
  assert.deepEqual([...kinds].sort(), [29, 30], "29 하나만 나오면 인자 누락 결함이다");
});

// 말일 클램프: 당년 생월이 소월(29)인데 생일 30일 → 29로 당기고 dayClamped 기록
test("말일 클램프: 소월 당년 생일 30 → 29 (day_clamped)", () => {
  // 2005 음8월 = 소월(29일)
  const clamped = resolveChart({ year: 2004, month: 8, day: 30 }, 2005);
  assert.equal(clamped.monthDays, 29);
  assert.equal(clamped.dayClamped, true);
  assert.equal(clamped.birthDay, 29);
  // 클램프 없는 정상 케이스는 원 생일 유지
  const normal = resolveChart({ year: 1976, month: 8, day: 26 }, 2005);
  assert.equal(normal.dayClamped, false);
  assert.equal(normal.birthDay, 26);
});

// §6-3 경계값: 나머지 0 → 8/6/3 치환
test("§6-3 경계값: 나머지 0 → 8/6/3", () => {
  assert.equal(upperGwae(2, 6), 8); // (2+6)%8=0 → 8
  assert.equal(middleGwae(30, 12), 6); // (30+12)%6=0 → 6
  assert.equal(lowerGwae(15, 15), 3); // (15+15)%3=0 → 3
});

// §6-4 144괘 데이터 무결성
test("§6-4 144괘 무결성: 코드 완전성·월운 완비·오염문자 부재", () => {
  const data = readJson("tojeong_144.json");
  const keys = Object.keys(data);
  assert.equal(keys.length, 144);
  for (let s = 1; s <= 8; s++)
    for (let j = 1; j <= 6; j++)
      for (let h = 1; h <= 3; h++) {
        const code = `${s}${j}${h}`;
        const e = data[code];
        assert.ok(e, `누락 코드: ${code}`);
        assert.ok(e.chongun && e.chongun.length > 0, `${code} 총운 없음`);
        for (let m = 1; m <= 12; m++)
          assert.ok(e.months[String(m)], `${code} ${m}월운 없음`);
      }
  const all = JSON.stringify(data);
  assert.equal((all.match(/[｢｣「」]/g) || []).length, 0, "｢｣「」 오염문자 잔존");
  assert.equal((all.match(/�/g) || []).length, 0, "U+FFFD 깨짐문자 잔존");
  assert.equal(all.includes("[한자구절 확인필요]"), false, "미해소 마커 잔존");
});

// §6-5 양력↔음력 왕복 검증
test("§6-5 양력↔음력 왕복 일치", () => {
  const cases = [
    [1976, 2, 28],
    [2005, 9, 29],
    [2024, 1, 1],
  ];
  for (const [y, m, d] of cases) {
    const lunar = solarToLunar(y, m, d);
    const solar = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.intercalation);
    assert.deepEqual(solar, { year: y, month: m, day: d }, `왕복 실패: ${y}-${m}-${d}`);
  }
});

// 조견표 등가: 생성 표 = 공식 = 공개 대조표(chunun) 앵커
test("조견표 등가: jogyeonpyo.json = 공식 = 공개 앵커", () => {
  const table = readJson("jogyeonpyo.json");
  // (a) 60갑자 완전성 + 생성값 = 공식값
  assert.equal(Object.keys(table).length, 60);
  for (const ganji of SEXAGENARY) {
    const row = table[ganji];
    assert.ok(row, `조견표 누락: ${ganji}`);
    assert.equal(row.taese, taeseNumber(ganji), `${ganji} 태세수 불일치`);
    assert.equal(row.wolgeon, wolgeonNumber(ganji), `${ganji} 월건수 불일치`);
    assert.equal(row.iljin, iljinNumber(ganji), `${ganji} 일진수 불일치`);
  }
  // (b) 공개 대조표(chunun.com) 앵커 값
  const anchors = {
    甲子: { taese: 20, wolgeon: 18, iljin: 18 },
    丙寅: { taese: 17, wolgeon: 14, iljin: 15 },
    丁卯: { taese: 16, wolgeon: 12, iljin: 14 },
    戊辰: { taese: 18, wolgeon: 10, iljin: 16 },
    庚午: { taese: 17, wolgeon: 17, iljin: 15 },
    乙酉: { taese: 20, wolgeon: 14, iljin: 18 },
    丙辰: { taese: 20, wolgeon: 12, iljin: 18 },
  };
  for (const [ganji, exp] of Object.entries(anchors)) {
    assert.equal(table[ganji].taese, exp.taese, `${ganji} 태세 앵커 불일치`);
    assert.equal(table[ganji].wolgeon, exp.wolgeon, `${ganji} 월건 앵커 불일치`);
    assert.equal(table[ganji].iljin, exp.iljin, `${ganji} 일진 앵커 불일치`);
  }
});
