#!/usr/bin/env node
// index.js — 토정비결 MCP 서버 (stdio).
// 결정론적 구조화 데이터만 반환한다. 해석·조언 생성은 상위 레이어(SKILL/LLM)의 몫이다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { solarToLunar, lunarToSolar, resolveChart } from "./ganji.js";
import { makeGwae } from "./calc.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const TOJEONG = JSON.parse(readFileSync(join(dataDir, "tojeong_144.json"), "utf8"));

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = ({ year, month, day }) => `${year}-${pad2(month)}-${pad2(day)}`;

// 생년월일(입력) → 정규화된 음력 생일 + 감사용 양력. 윤달은 평달로 정규화한다.
function normalizeBirth({ year, month, day, calendar, isLeapMonth }) {
  if (calendar === "solar") {
    const lunar = solarToLunar(year, month, day);
    return {
      birthLunar: { year: lunar.year, month: lunar.month, day: lunar.day },
      solarBirth: { year, month, day },
      leapNormalized: lunar.intercalation,
    };
  }
  // lunar 입력: 유효성 검증 겸 감사용 양력 산출 (윤달 여부는 평달로 정규화).
  const solar = lunarToSolar(year, month, day, isLeapMonth);
  return {
    birthLunar: { year, month, day },
    solarBirth: solar,
    leapNormalized: isLeapMonth,
  };
}

const server = new McpServer({ name: "tojeong-mcp", version: "1.0.0" });

server.registerTool(
  "tojeong_fortune",
  {
    title: "토정비결 운세 조회",
    description:
      "생년월일로 해당 연도의 토정비결(土亭祕訣) 운세를 조회한다. 작괘(作卦)로 3자리 괘(卦)를 산출하고 그 괘의 총운(總運)과 12개월 월별운 원문을 그대로 반환한다. 해석·조언은 생성하지 않는 데이터 전용 도구다. 시(時)는 사용하지 않는다.",
    inputSchema: {
      birth_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식")
        .describe("생년월일 (YYYY-MM-DD)"),
      calendar: z
        .enum(["solar", "lunar"])
        .default("solar")
        .describe("입력 달력 종류 (기본 solar=양력)"),
      is_leap_month: z
        .boolean()
        .default(false)
        .describe("음력 윤달 여부 (calendar=lunar일 때만 유효)"),
      target_year: z
        .number()
        .int()
        .optional()
        .describe("운세를 보는 해(당년). 기본값=현재 연도"),
    },
  },
  async ({ birth_date, calendar, is_leap_month, target_year }) => {
    const [year, month, day] = birth_date.split("-").map(Number);
    const targetYear = target_year ?? new Date().getFullYear();

    const { birthLunar, solarBirth, leapNormalized } = normalizeBirth({
      year,
      month,
      day,
      calendar,
      isLeapMonth: is_leap_month,
    });

    const chart = resolveChart(birthLunar, targetYear);
    const gwae = makeGwae({
      koreanAge: chart.koreanAge,
      taeseValue: chart.taese.value,
      monthDays: chart.monthDays,
      wolgeonValue: chart.wolgeon.value,
      birthDay: chart.birthDay,
      iljinValue: chart.iljin.value,
    });

    const entry = TOJEONG[gwae.code];
    const result = {
      gwae_code: gwae.code,
      gwae: { sang: gwae.sang, jung: gwae.jung, ha: gwae.ha },
      chongun: entry.chongun,
      months: entry.months,
      meta: {
        target_year: targetYear,
        calendar_input: calendar,
        lunar_birth: ymd(birthLunar),
        solar_birth: ymd(solarBirth),
        leap_month_normalized: leapNormalized,
        korean_age: chart.koreanAge,
        taese: chart.taese,
        wolgeon: chart.wolgeon,
        iljin: chart.iljin,
        month_days: chart.monthDays,
        day_clamped: chart.dayClamped,
      },
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "tojeong_gwae_lookup",
  {
    title: "토정비결 괘 원문 조회",
    description:
      "괘코드(111~863, 상1-8·중1-6·하1-3)로 해당 괘의 총운·12개월 월별운 원문을 그대로 조회한다. 브라우징·테스트·SKILL 개발용 보조 도구다.",
    inputSchema: {
      gwae_code: z
        .string()
        .regex(/^[1-8][1-6][1-3]$/, "상1-8·중1-6·하1-3 3자리")
        .describe("괘코드 (예: 212)"),
    },
  },
  async ({ gwae_code }) => {
    const entry = TOJEONG[gwae_code];
    if (!entry) {
      return {
        content: [{ type: "text", text: `존재하지 않는 괘코드: ${gwae_code}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
