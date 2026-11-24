import { expect, test } from 'vitest';
import { monthGrid } from './calendar';
test('month leaf has 42 consecutive days and begins on Monday', () => {
  const days = monthGrid(2026, 11);
  expect(days).toHaveLength(42);
  expect(new Date(days[0].date).getUTCDay()).toBe(1);
  expect(days.filter((d) => d.inMonth)).toHaveLength(30);
  expect(new Set(days.map((d) => d.date)).size).toBe(42);
});
test('leap February and January padding preserve correct calendar dates', () => {
  expect(monthGrid(2024, 2).filter((d) => d.inMonth)).toHaveLength(29);
  expect(monthGrid(2026, 1)[0].date).toBe('2025-12-29');
});
