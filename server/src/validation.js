const { isoWeek, weekRange } = require('./weeks');
function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function dateTime(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && date(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14)) < 60;
}
function range(query) {
  if (query.weekStart !== undefined) {
    if (!date(query.weekStart) || new Date(query.weekStart).getUTCDay() !== 1) return null;
    return { start: query.weekStart, end: new Date(Date.parse(query.weekStart) + 604800000).toISOString().slice(0, 10) };
  }
  const now = isoWeek();
  return weekRange(query.year ?? now.year, query.week ?? now.week);
}
const text = (v, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
module.exports = { date, dateTime, range, text };
