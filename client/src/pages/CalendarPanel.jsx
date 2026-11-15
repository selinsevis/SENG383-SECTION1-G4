import { useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth.jsx';
import { monthGrid } from '../calendar.js';
import { TasksPanel, useResource, ResourceState } from './WorkspacePanels.jsx';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export default function CalendarPanel({ child }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({ title: '', startsAt: `${today}T10:00`, endsAt: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [message, setMessage] = useState(null);
  const { user } = useAuth();
  const prefix = `${month.year}-${String(month.month).padStart(2, '0')}`;
  const events = useResource(`/api/children/${child.id}/events?year=${month.year}&month=${month.month}`);
  const tasks = useResource(`/api/children/${child.id}/tasks`);
  function changeMonth(delta) {
    const next = new Date(Date.UTC(month.year, month.month - 1 + delta, 1));
    if (next.getUTCFullYear() < 2000 || next.getUTCFullYear() > 2100) return;
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 }); setSelected(''); setMessage(null);
  }
  function chooseDay(day) {
    setSelected(day);
    setMonth({ year: Number(day.slice(0,4)), month: Number(day.slice(5,7)) });
    setForm((f) => ({ ...f, startsAt: `${day}T10:00`, endsAt: '' })); setMessage(null);
  }
  const dayEvents = events.data?.filter((event) => !selected || event.startsAt.slice(0,10) === selected);
  return <>
    <section className="card calendar-card">
      <div className="calendar-header"><div><span className="eyebrow">PLANLA · UYGULA · TAKİP ET</span><h2>{MONTHS[month.month - 1]} {month.year}</h2></div>
        <div className="actions"><button type="button" className="secondary" aria-label="Önceki ay" disabled={month.year === 2000 && month.month === 1} onClick={() => changeMonth(-1)}>‹</button>
          <button type="button" className="secondary" onClick={() => { setMonth({ year: now.getFullYear(), month: now.getMonth() + 1 }); setSelected(''); }}>Bugün</button>
          <button type="button" className="secondary" aria-label="Sonraki ay" disabled={month.year === 2100 && month.month === 12} onClick={() => changeMonth(1)}>›</button></div>
      </div>
      <p className="admin-muted">Gün kutusunu seçerek etkinlikleri ve görevleri birlikte incele. Ayı oklarla değiştirebilirsin.</p>
      <ResourceState data={events.data} error={events.error} /><ResourceState data={tasks.data} error={tasks.error} />
      <div className="calendar-scroll"><div className="month-calendar" role="group" aria-label={`${MONTHS[month.month - 1]} ${month.year} takvimi`}>
        {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
        {monthGrid(month.year, month.month).map((day) => {
          const dayItems = events.data?.filter((event) => event.startsAt.slice(0,10) === day.date) || [];
          const due = tasks.data?.filter((task) => task.dueDate === day.date) || [];
          return <button type="button" key={day.date} disabled={day.date < '2000-01-01' || day.date > '2100-12-31'} aria-label={`${day.date}, ${dayItems.length} etkinlik, ${due.length} görev`} aria-pressed={selected === day.date}
            className={`calendar-day ${day.inMonth ? '' : 'outside-month'} ${day.date === today ? 'today' : ''}`} onClick={() => chooseDay(day.date)}>
            <span className="day-number">{day.day}</span>
            {dayItems.map((event) => <span className="calendar-event" key={event.id}><b>{event.startsAt.slice(11)}</b> {event.title}</span>)}
            {due.length > 0 && <span className="calendar-task-count">{due.filter((t) => t.status === 'done').length}/{due.length} görev tamamlandı</span>}
          </button>;
        })}
      </div></div>
      <div className="calendar-selection"><h3>{selected ? `${selected} · Günün planı` : `${MONTHS[month.month - 1]} · Etkinlikler`}</h3>
        {selected && <button className="secondary" onClick={() => setSelected('')}>Tüm ayı göster</button>}</div>
      {dayEvents?.length === 0 && <p className="empty-state">Bu tarih aralığında etkinlik yok.</p>}
      {dayEvents?.map((event) => <article key={event.id} className="event-row"><div className="date-tile"><strong>{event.startsAt.slice(8,10)}</strong><span>{event.startsAt.slice(5,7)}</span></div><div><h3>{event.title}</h3><p>{event.startsAt.replace('T',' ')}{event.endsAt && ` – ${event.endsAt.replace('T',' ')}`}</p></div></article>)}
      {['parent','specialist'].includes(user.role) && <form className="panel-form" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return; setBusy(true); setError(null); setMessage(null);
        try { await apiFetch(`/api/children/${child.id}/events`, { method:'POST', body:form });
          const day = form.startsAt.slice(0,10); setSelected(day); setMonth({year:Number(day.slice(0,4)),month:Number(day.slice(5,7))});
          setForm({...form,title:''}); events.refresh(); setMessage('Etkinlik takvime eklendi.');
        } catch (err) { setError(err.message); } finally { setBusy(false); }
      }}><h3>Etkinlik ekle</h3><label>Etkinlik başlığı<input required maxLength={200} value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} /></label>
        <div className="form-grid"><label>Başlangıç<input type="datetime-local" required min="2000-01-01T00:00" max="2100-12-31T23:59" value={form.startsAt} onChange={(e) => setForm({...form,startsAt:e.target.value})} /></label>
        <label>Bitiş (isteğe bağlı)<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({...form,endsAt:e.target.value})} /></label></div>
        <button disabled={busy}>Etkinliği kaydet</button>{error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="success">{message}</p>}
      </form>}
    </section>
    <TasksPanel key={`${child.id}-${selected || prefix}`} child={child} dateFilter={selected} monthFilter={prefix} onUpdated={(date) => { tasks.refresh(); if (date) chooseDay(date); }} />
  </>;
}
