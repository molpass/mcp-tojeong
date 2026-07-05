// ganji.js — 간지(干支) 산출 + 토정비결 조견표(태세수·월건수·일진수)의 진실 출처.
//
// 조견표는 임의 나열이 아니라 두 개의 표준 수표에서 결정론적으로 산출된다.
// 출처: badukworld.co.kr 작괘법(선천수·중천수 표 + 합성 규칙),
//       chunun.com 60갑자 대조표, myungmundang.net 예시로 교차 검증.
//
//   태세수(太歲數) = 中天數(천간) + 中天數(지지)
//   월건수(月建數) = 先天數(천간) + 先天數(지지)
//   일진수(日辰數) = 先天數(천간) + 中天數(지지)
//
// 간지 자체(연·월·일 갑자)와 음양력 변환은 korean-lunar-calendar가 제공한다.

import KoreanLunarCalendar from "korean-lunar-calendar";

const KLC = KoreanLunarCalendar.default || KoreanLunarCalendar;

// 先天數: 甲己子午=9, 乙庚丑未=8, 丙辛寅申=7, 丁壬卯酉=6, 戊癸辰戌=5, 巳亥=4
export const SUNCHEON = {
  甲: 9, 己: 9, 乙: 8, 庚: 8, 丙: 7, 辛: 7, 丁: 6, 壬: 6, 戊: 5, 癸: 5,
  子: 9, 午: 9, 丑: 8, 未: 8, 寅: 7, 申: 7, 卯: 6, 酉: 6, 辰: 5, 戌: 5, 巳: 4, 亥: 4,
};

// 中天數: 甲己辰戌丑未=11, 乙庚申酉=10, 丙辛亥子=9, 丁壬寅卯=8, 戊癸巳午=7
export const JUNGCHEON = {
  甲: 11, 己: 11, 乙: 10, 庚: 10, 丙: 9, 辛: 9, 丁: 8, 壬: 8, 戊: 7, 癸: 7,
  辰: 11, 戌: 11, 丑: 11, 未: 11, 申: 10, 酉: 10, 亥: 9, 子: 9, 寅: 8, 卯: 8, 巳: 7, 午: 7,
};

// 간지 2자(예: "乙酉")를 받아 각 수리를 산출하는 순수 함수.
export const taeseNumber = (ganji) => JUNGCHEON[ganji[0]] + JUNGCHEON[ganji[1]];
export const wolgeonNumber = (ganji) => SUNCHEON[ganji[0]] + SUNCHEON[ganji[1]];
export const iljinNumber = (ganji) => SUNCHEON[ganji[0]] + JUNGCHEON[ganji[1]];

// 60갑자 전체 목록 (甲子 → 癸亥). 조견표 생성·검증용.
export const SEXAGENARY = (() => {
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const list = [];
  for (let i = 0; i < 60; i++) {
    list.push(stems[i % 10] + branches[i % 12]);
  }
  return list;
})();

const strip = (s) => s.replace(/[年月日]/g, "");

// 음력 날짜(윤달 여부 포함)의 연·월·일 간지를 반환.
function ganjiOfLunar(year, month, day, isLeap = false) {
  const c = new KLC();
  if (!c.setLunarDate(year, month, day, isLeap)) {
    throw new Error(`유효하지 않은 음력 날짜: ${year}-${month}-${day} (윤달=${isLeap})`);
  }
  const g = c.getChineseGapja();
  return { year: strip(g.year), month: strip(g.month), day: strip(g.day) };
}

// 양력 → 음력 변환. { year, month, day, intercalation } 반환.
export function solarToLunar(year, month, day) {
  const c = new KLC();
  if (!c.setSolarDate(year, month, day)) {
    throw new Error(`유효하지 않은 양력 날짜: ${year}-${month}-${day}`);
  }
  return c.getLunarCalendar();
}

// 음력 → 양력 변환 (감사·왕복검증용). { year, month, day } 반환.
export function lunarToSolar(year, month, day, isLeap = false) {
  const c = new KLC();
  if (!c.setLunarDate(year, month, day, isLeap)) {
    throw new Error(`유효하지 않은 음력 날짜: ${year}-${month}-${day} (윤달=${isLeap})`);
  }
  return c.getSolarCalendar();
}

// 해당 음력 월의 날수(대월 30 / 소월 29).
export function lunarMonthDays(year, month, isLeap = false) {
  const c = new KLC();
  if (!c.setLunarDate(year, month, 1, isLeap)) {
    throw new Error(`유효하지 않은 음력 월: ${year}-${month} (윤달=${isLeap})`);
  }
  return c.getLunarMonthDays();
}

// 작괘에 필요한 수리 일체를 산출한다.
//   birthLunar: { year, month, day }  — 음력 생년월일 (윤달은 평달로 정규화된 값)
//   targetYear: 운세를 보는 해(당년)
// 태세·월건·일진 간지는 모두 "당년(targetYear)"의 해당 연·월·일 기준이다.
export function resolveChart(birthLunar, targetYear) {
  const { month, day } = birthLunar;

  // 태세: 당년의 연간지 (모든 사람 공통). 당년 아무 유효 날짜로 조회.
  const taeseGanji = ganjiOfLunar(targetYear, 1, 1).year;

  // 월건: 당년 음력 생월의 월간지 + 그 달의 날수.
  const wolgeonGanji = ganjiOfLunar(targetYear, month, 1).month;
  const monthDays = lunarMonthDays(targetYear, month);

  // 당년 생월이 소월(29)인데 생일이 30일이면 말일로 당긴다.
  // 문서화된 전통 규칙이 아니라 무음 오답을 막기 위한 구현 관례.
  const dayClamped = day > monthDays;
  const effectiveDay = dayClamped ? monthDays : day;

  // 일진: 당년 음력 생월·생일의 일간지 (클램프된 날 기준).
  const iljinGanji = ganjiOfLunar(targetYear, month, effectiveDay).day;

  return {
    koreanAge: targetYear - birthLunar.year + 1,
    taese: { ganji: taeseGanji, value: taeseNumber(taeseGanji) },
    wolgeon: { ganji: wolgeonGanji, value: wolgeonNumber(wolgeonGanji) },
    iljin: { ganji: iljinGanji, value: iljinNumber(iljinGanji) },
    monthDays,
    birthDay: effectiveDay,
    dayClamped,
  };
}
