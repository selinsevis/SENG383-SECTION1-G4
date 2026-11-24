export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = first.getTime() - ((first.getUTCDay() || 7) - 1) * 86400000;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start + index * 86400000);
    return { date: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1 };
  });
}
