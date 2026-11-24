import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth.jsx';

function currentWeek() {
  const now = new Date();
  const day = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  return { year, week: Math.ceil(((day - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7) };
}

export default function WeeklyEvaluations({ child, selectedWeek }) {
  const { user } = useAuth();
  const initial = currentWeek();
  const [ownYear, setYear] = useState(initial.year);
  const year = selectedWeek?.year ?? ownYear;
  const [ownWeek, setWeek] = useState(initial.week);
  const week = selectedWeek?.week ?? ownWeek;
  const [data, setData] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const generation = useRef(0);
  const mine = data?.entries.find((entry) => entry.specialistId === user.id);
  const jan1Day = new Date(Date.UTC(Number(year), 0, 1)).getUTCDay();
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const maxWeeks = jan1Day === 4 || (jan1Day === 3 && leap) ? 53 : 52;

  async function load() {
    const id = ++generation.current;
    setLoading(true); setError(null); setData(null); setContent('');
    try {
      const result = await apiFetch(`/api/children/${child.id}/entries?year=${year}&week=${week}`);
      if (id !== generation.current) return;
      setData(result);
      setContent(result.entries.find((entry) => entry.specialistId === user.id)?.content || '');
    } catch (err) { if (id === generation.current) setError(err.message); }
    finally { if (id === generation.current) setLoading(false); }
  }
  useEffect(() => {
    setMessage(null);
    load();
    return () => { generation.current += 1; };
  }, [child.id, year, week, user.id]);

  async function submit(event) {
    event.preventDefault();
    if (sending || loading || !data) return;
    setSending(true); setError(null); setMessage(null);
    try {
      await apiFetch(mine ? `/api/entries/${mine.id}` : `/api/children/${child.id}/entries`, {
        method: mine ? 'PUT' : 'POST', body: { year: Number(year), week: Number(week), content },
      });
      await load();
      setMessage('Haftalık değerlendirme kaydedildi.');
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  return <section className="card" aria-label={`${child.name} haftalık değerlendirmeleri`}>
    <h2>Haftalık değerlendirmeler</h2>
    <p className="admin-muted">Uzmanların bu çocuk için yazdığı haftalık gözlem notları.</p>
    {!selectedWeek && <div className="evaluation-filters">
      <label>Yıl<input type="number" min="2000" max="2100" required value={year} disabled={sending}
        onChange={(e) => { setYear(e.target.value); setWeek((w) => Math.min(Number(w), 52)); }} /></label>
      <label>Hafta<select aria-label="Hafta" value={week} disabled={sending} onChange={(e) => setWeek(e.target.value)}>
        {Array.from({ length: maxWeeks }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}. hafta</option>)}
      </select></label>
    </div>}
    {data && <p>{data.year} yılı · {data.week}. hafta · {data.start} – {new Date(new Date(`${data.end}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10)}</p>}
    {loading && <p role="status">Değerlendirmeler yükleniyor…</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="success">{message}</p>}
    {data && data.entries.length === 0 && <p>Bu hafta için henüz değerlendirme yok.</p>}
    {data?.entries.map((entry) => <article className="evaluation-entry" key={entry.id}>
      <h3>{entry.specialistName}</h3>
      <p className="admin-muted">{entry.entryDate}{Boolean(entry.isEdited) && ' · Düzenlendi'}</p>
      <p className="evaluation-content">{entry.content}</p>
    </article>)}
    {user.role === 'specialist' && <form onSubmit={submit} className="evaluation-form">
      <h3>{mine ? 'Değerlendirmeni düzenle' : 'Haftalık değerlendirme yaz'}</h3>
      <label>Değerlendirme<textarea aria-label="Değerlendirme" required maxLength={10000} rows={5} value={content}
        onChange={(e) => setContent(e.target.value)} disabled={loading || sending || !data} /></label>
      <button disabled={loading || sending || !data || !content.trim()}>{sending ? 'Kaydediliyor…' : 'Değerlendirmeyi kaydet'}</button>
    </form>}
  </section>;
}
