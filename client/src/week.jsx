export function currentWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  return { year, week: Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7) };
}
export function weekStart({ year, week }) {
  const d = new Date(Date.UTC(Number(year), 0, 4));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1) + (Number(week) - 1) * 7);
  return d.toISOString().slice(0, 10);
}
export function WeekPicker({ value, onChange }) {
  const d = new Date(Date.UTC(value.year, 11, 28));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const max = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return <div className="week-picker">
    <label>Yıl<select aria-label="Yıl" value={value.year} onChange={(e) => onChange({ year: Number(e.target.value), week: Math.min(value.week, 52) })}>
      {Array.from({ length: 101 }, (_, i) => <option key={i} value={2000 + i}>{2000 + i}</option>)}
    </select></label>
    <label>Hafta<select aria-label="Hafta" value={value.week} onChange={(e) => onChange({ ...value, week: Number(e.target.value) })}>
      {Array.from({ length: max }, (_, i) => <option key={i} value={i + 1}>{i + 1}. hafta</option>)}
    </select></label>
    <span className="week-date">{weekStart(value)} başlangıçlı hafta</span>
  </div>;
}
