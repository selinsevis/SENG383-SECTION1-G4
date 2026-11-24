import { describe, expect, test, vi, afterEach } from 'vitest';
import { currentWeek, weekStart } from './week.jsx';
afterEach(() => vi.useRealTimers());
describe('ISO week selection', () => {
 test('week 1 may start in the preceding calendar year', () => expect(weekStart({year:2026,week:1})).toBe('2025-12-29'));
 test('week 53 spans New Year without drifting', () => expect(weekStart({year:2020,week:53})).toBe('2020-12-28'));
 test('normal week is Monday', () => expect(weekStart({year:2026,week:47})).toBe('2026-11-16'));
 test('current week returns the ISO year in early January', () => {
  vi.useFakeTimers();vi.setSystemTime(new Date(2021,0,1,12));expect(currentWeek()).toEqual({year:2020,week:53});
 });
});
