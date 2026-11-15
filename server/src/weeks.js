const DAY = 86400000;

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  return { year, week: Math.ceil(((d.getTime() - start) / DAY + 1) / 7) };
}

function weekRange(yearValue, weekValue) {
  if (![yearValue, weekValue].every((v) => typeof v === 'string' || typeof v === 'number')) return null;
  if (!/^[0-9]{4}$/.test(String(yearValue)) || !/^[0-9]{1,2}$/.test(String(weekValue))) return null;
  const year = Number(yearValue);
  const week = Number(weekValue);
  if (year < 2000 || year > 2100 || week < 1 || week > isoWeek(new Date(Date.UTC(year, 11, 28))).week) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * DAY + (week - 1) * 7 * DAY;
  const date = (offset) => new Date(monday + offset * DAY).toISOString().slice(0, 10);
  return { year, week, start: date(0), end: date(7) };
}

module.exports = { isoWeek, weekRange };
