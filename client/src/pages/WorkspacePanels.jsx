import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth.jsx';

export const AREAS = { language: 'Dil', motor: 'Motor', social: 'Sosyal', cognitive: 'Bilişsel', self_care: 'Öz bakım' };
export function useResource(path) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(null);
    apiFetch(path).then((d) => { if (active) setData(d); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [path, version]);
  return { data, error, refresh: () => setVersion((v) => v + 1) };
}
export function ResourceState({ data, error }) {
  if (error) return <p role="alert" className="error">{error}</p>;
  return data === null ? <p role="status" className="empty-state">Yükleniyor…</p> : null;
}
function useAction() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [message, setMessage] = useState(null);
  async function run(fn) {
    if (busy) return;
    setBusy(true); setError(null); setMessage(null);
    try { await fn(); setMessage('İşlem tamamlandı.'); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return { busy, run, status: <>{error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="success">{message}</p>}</> };
}
export function TasksPanel({ child, dateFilter, monthFilter, onUpdated }) {
  const { user } = useAuth();
  const path = `/api/children/${child.id}/tasks`;
  const { data, error, refresh } = useResource(path);
  const action = useAction();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [form, setForm] = useState({ title: '', description: '', area: 'language', dueDate: dateFilter || (monthFilter && !today.startsWith(monthFilter) ? `${monthFilter}-01` : today) });
  const visibleTasks = data?.filter((task) => dateFilter ? task.dueDate === dateFilter : monthFilter ? task.dueDate?.startsWith(monthFilter) : true);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <section className="card">
    <div className="section-heading"><div><span className="eyebrow">GÜNLÜK ADIMLAR</span><h2>{dateFilter ? `${dateFilter} · Görevler` : 'Görevler'}</h2></div><span className="count-badge">{visibleTasks?.length || 0} görev</span></div>
    <p className="admin-muted">{dateFilter ? 'Takvimde seçilen güne ait görevler.' : monthFilter ? 'Görüntülenen ayda son tarihi olan görevler.' : 'Çocuğun tüm görevleri.'}</p>
    <ResourceState data={data} error={error} />{action.status}
    {visibleTasks?.length === 0 && <p className="empty-state">Bu tarih aralığında görev yok.</p>}
    <div className="task-list">{visibleTasks?.map((task) => <article className="task-row" key={task.id}>
      <span className={`task-dot ${task.status}`} aria-hidden="true">{task.status === 'done' ? '✓' : '○'}</span>
      <div className="task-detail"><h3>{task.title}</h3><p>{task.description}</p><small>{AREAS[task.area]} · Son tarih {task.dueDate}</small></div>
      <span className={`status-pill ${task.status}`}>{task.status === 'done' ? 'Tamamlandı' : 'Bekliyor'}</span>
      {user.role === 'child' && <button className={task.status === 'done' ? 'secondary' : ''} disabled={action.busy} onClick={() => action.run(async () => {
        await apiFetch(`/api/tasks/${task.id}/${task.status === 'done' ? 'undo' : 'complete'}`, { method: 'PATCH' }); refresh(); onUpdated?.();
      })}>{task.status === 'done' ? 'Undone · Yapılmadı' : 'Mark as done'}</button>}
    </article>)}</div>
    {['parent', 'specialist'].includes(user.role) && <form className="panel-form" onSubmit={(e) => {
      e.preventDefault(); action.run(async () => { const created = await apiFetch(path, { method: 'POST', body: form }); setForm({ ...form, title: '', description: '' }); refresh(); onUpdated?.(created.dueDate); });
    }}>
      <h3>Yeni görev ata</h3>
      <label>Görev başlığı<input required maxLength={200} value={form.title} onChange={change('title')} /></label>
      <label>Açıklama<textarea maxLength={5000} aria-label="Görev açıklaması" value={form.description} onChange={change('description')} /></label>
      <div className="form-grid"><label>Gelişim alanı<select aria-label="Gelişim alanı" value={form.area} onChange={change('area')}>
        {Object.entries(AREAS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select></label><label>Son tarih<input type="date" min="2000-01-01" max="2100-12-31" required value={form.dueDate} onChange={change('dueDate')} /></label></div>
      <button disabled={action.busy}>Assign task</button>
    </form>}
  </section>;
}
export function AssignedTasks() {
  const { data, error } = useResource('/api/tasks/assigned-by-me');
  return <section className="card"><h2>Atadığım görevler</h2><ResourceState data={data} error={error} />
    {data?.length === 0 && <p className="empty-state">Henüz görev atamadın.</p>}
    {data?.map((task) => <article className="task-row" key={task.id}><div className="task-detail"><h3>{task.title}</h3><small>{task.childName} · {task.dueDate}</small></div><span className={`status-pill ${task.status}`}>{task.status === 'done' ? 'done' : 'open'}</span></article>)}
  </section>;
}
export function StatsPanel({ child, week }) {
  const { data, error } = useResource(`/api/children/${child.id}/stats?year=${week.year}&week=${week.week}`);
  return <section className="card"><span className="eyebrow">HAFTANIN GÖRÜNÜMÜ</span><h2>Haftalık istatistikler</h2><ResourceState data={data} error={error} />
    {data && <><div className="stats-hero"><strong>%{data.completionRate}</strong><p>{data.total} görevin {data.done} tanesi tamamlandı.</p></div>
    <p className="admin-muted">Seçilen haftada son tarihi olan görevlere göre hesaplanır.</p>
    {data.byArea.map((row) => <div className="stat-row" key={row.area}><span>{AREAS[row.area]}</span><progress max="100" value={row.completionRate} aria-label={AREAS[row.area]} /><strong>{row.done}/{row.total}</strong></div>)}</>}
  </section>;
}
export function DocumentsPanel({ child }) {
  const path = `/api/children/${child.id}/documents`;
  const { data, error, refresh } = useResource(path);
  const [file, setFile] = useState(null), [fileKey, setFileKey] = useState(0);
  const action = useAction();
  async function open(doc, download) {
    const blob = await apiFetch(`/api/documents/${doc.id}/${download ? 'download' : 'view'}`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    if (download) a.download = doc.name;
    else { a.target = '_blank'; a.rel = 'noopener'; }
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return <section className="card"><span className="eyebrow">ÇOCUĞUN DOSYALARI</span><h2>Belgeler</h2>
    <ResourceState data={data} error={error} />{action.status}
    <form className="upload-form" onSubmit={(e) => { e.preventDefault(); action.run(async () => {
      if (!file || file.size > 5 * 1024 * 1024) throw new Error('En fazla 5 MB bir dosya seçin.');
      const body = new FormData(); body.append('file', file); await apiFetch(path, { method: 'POST', body }); setFile(null); setFileKey((v) => v + 1); refresh();
    }); }}><label>PDF veya resim<input key={fileKey} type="file" required accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files[0] || null)} /></label><small>PDF, PNG, JPEG · en fazla 5 MB · sentetik belgeler</small><button disabled={action.busy || !file}>Belge yükle</button></form>
    {data?.length === 0 && <p className="empty-state">Henüz belge yüklenmedi.</p>}
    {data?.map((doc) => <article className="document-row" key={doc.id}><div><h3>{doc.name}</h3><small>{doc.type} · {Math.ceil(doc.size / 1024)} KB · {doc.uploader} · {doc.uploadedAt}</small></div><div className="actions"><button className="secondary" disabled={action.busy} onClick={() => action.run(() => open(doc, false))}>Görüntüle</button><button disabled={action.busy} onClick={() => action.run(() => open(doc, true))}>İndir</button></div></article>)}
  </section>;
}
export function SummaryPanel({ child, week }) {
  const path = `/api/children/${child.id}/summary`;
  const resource = useResource(`${path}?year=${week.year}&week=${week.week}`);
  const [generated, setGenerated] = useState(null), [source, setSource] = useState(null);
  const action = useAction();
  const summary = generated || resource.data;
  return <section className="card ai-card"><div className="section-heading"><div><span className="eyebrow">KAYNAKLARA DAYALI ÖZET</span><h2>Haftalık AI özeti</h2></div><span className="mode-badge">MOCK</span></div>
    <p className="admin-muted">Bu demo gerçek bir AI servisine bağlanmaz. Yetkili haftalık kayıtlardan belirli kurallarla özet üretir.</p>
    {resource.error && <p role="alert" className="error">{resource.error}</p>}{action.status}
    <button disabled={action.busy} onClick={() => action.run(async () => { const data = await apiFetch(path, { method: 'POST', body: week }); setGenerated(data); setSource(null); })}>Özet oluştur</button>
    {summary && <div className="summary-result"><span className="status-pill">AI-generated · mock · {summary.readerRole}</span><p className="evaluation-content">{summary.content}</p><small>{new Date(summary.createdAt.replace(' ', 'T') + 'Z').toLocaleString('tr-TR')}</small>
      <h3>Dayanak kayıtlar</h3>{summary.sources.length === 0 && <p>Bu hafta kaynak kayıt yok.</p>}
      <div className="source-list">{summary.sources.map((s) => <button key={s.id} className="secondary" onClick={() => action.run(async () => setSource(await apiFetch(s.url)))}>{({task:'Görev',entry:'Değerlendirme',event:'Etkinlik'})[s.type]} #{s.recordId}</button>)}</div>
      {source && <div className="source-detail" aria-label="Kaynak kayıt"><h4>{source.title || 'Uzman değerlendirmesi'}</h4><p className="evaluation-content">{source.content || source.description || 'Bu kayıtta ek açıklama yok.'}</p><small>{source.due_date || source.entry_date || source.starts_at}{source.area && ` · ${AREAS[source.area]}`}{source.status && ` · ${source.status === 'done' ? 'Tamamlandı' : 'Bekliyor'}`} · Özet oluşturulduğu andaki kayıt</small></div>}
      <div className="feedback"><span>Özet yararlı mı?</span>{[['helpful','Yararlı'],['incorrect','Hatalı']].map(([v,label]) => <button key={v} className="secondary" aria-pressed={summary.feedback === v} disabled={action.busy} onClick={() => action.run(async () => {
        await apiFetch(`${path}/${summary.id}/feedback`, { method: 'POST', body: { feedback: v } }); setGenerated({ ...summary, feedback: v });
      })}>{label}</button>)}</div>
      <p className="admin-muted">Kararlar kullanıcıya aittir. Bu özet teşhis veya tedavi önerisi değildir.</p>
    </div>}
  </section>;
}
