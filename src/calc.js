// calc.js — 작괘(作卦) 순수 함수. I/O 없음 → 단독 테스트 가능.
//
//   상괘(上卦) = (한국나이 + 태세수) % 8   ,  나머지 0 → 8
//   중괘(中卦) = (당년 생월 날수 + 월건수) % 6 ,  나머지 0 → 6
//   하괘(下卦) = (음력 생일 + 일진수) % 3   ,  나머지 0 → 3
//   괘코드 = 상·중·하 3자리 결합 (예: 2,1,2 → "212")

// 나머지가 0이면 제수(divisor)를 취한다.
const mod = (sum, divisor) => sum % divisor || divisor;

export const upperGwae = (koreanAge, taeseValue) => mod(koreanAge + taeseValue, 8);
export const middleGwae = (monthDays, wolgeonValue) => mod(monthDays + wolgeonValue, 6);
export const lowerGwae = (birthDay, iljinValue) => mod(birthDay + iljinValue, 3);

// 산출된 수리로 최종 괘를 만든다.
//   { koreanAge, taeseValue, monthDays, wolgeonValue, birthDay, iljinValue }
export function makeGwae({ koreanAge, taeseValue, monthDays, wolgeonValue, birthDay, iljinValue }) {
  const sang = upperGwae(koreanAge, taeseValue);
  const jung = middleGwae(monthDays, wolgeonValue);
  const ha = lowerGwae(birthDay, iljinValue);
  return { sang, jung, ha, code: `${sang}${jung}${ha}` };
}
