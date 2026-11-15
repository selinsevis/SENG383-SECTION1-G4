import { useState } from 'react';
import Layout from './Layout.jsx';
import LinkedSpecialists from './LinkedSpecialists.jsx';
import useChildren from './useChildren.js';
import AddChild from './AddChild.jsx';
import WeeklyEvaluations from './WeeklyEvaluations.jsx';
import CalendarPanel from './CalendarPanel.jsx';
import { currentWeek, WeekPicker } from '../week.jsx';
import { StatsPanel, DocumentsPanel, SummaryPanel, AssignedTasks } from './WorkspacePanels.jsx';

function Workspace({ role }) {
  const { children, error, addChild } = useChildren();
  const [childId, setChildId] = useState('');
  const [week, setWeek] = useState(currentWeek);
  const [tab, setTab] = useState(role === 'child' ? 'calendar' : 'overview');
  const selected = children?.find((c) => String(c.id) === childId) || children?.[0];
  const tabs = role === 'child' ? [['calendar','Takvim ve görevler']] : [
    ['overview','Genel bakış'], ['calendar','Takvim ve görevler'], ['entries','Değerlendirmeler'],
    ['documents','Belgeler'], ['summary','AI özeti'],
    ...(role === 'parent' ? [['access','Uzman erişimi']] : [['assigned','Atadığım görevler']]),
  ];
  return <Layout title={role === 'parent' ? 'Parent dashboard' : role === 'specialist' ? 'My linked children' : 'My tasks'}>
    <p className="page-description">{role === 'parent' ? 'Çocuğunun haftasını birlikte planla, gözlemleri ve ilerlemeyi tek yerde takip et.' : role === 'specialist' ? 'Bağlı çocuklarınla çalış, haftalık gözlemlerini paylaş ve görevleri takip et.' : 'Küçük adımlar, güzel bir hafta. Görevlerini tamamla ve planına göz at.'}</p>
    {role === 'parent' && <details className="add-child-disclosure"><summary>＋ Yeni çocuk ekle</summary><AddChild onAdded={(child) => { addChild(child); setChildId(String(child.id)); }} ready={Boolean(children)} /></details>}
    {error && <p role="alert" className="error">{error}</p>}
    {!children && !error && <p role="status">Çocuklar yükleniyor…</p>}
    {children?.length === 0 && <section className="card empty-state">{role === 'parent' ? 'Henüz çocuk profili yok. Yukarıdan yeni bir çocuk ekleyebilirsin.' : 'Henüz erişebildiğin bir çocuk yok. Uzman erişimini ebeveyn yönetir.'}</section>}
    {selected && <>
      <div className="workspace-toolbar"><label>{role === 'specialist' ? 'Değerlendirilecek çocuk' : 'Çocuk profili'}<select aria-label={role === 'specialist' ? 'Değerlendirilecek çocuk' : 'Çocuk profili'} value={selected.id} onChange={(e) => setChildId(e.target.value)}>
        {children.map((c) => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
      </select></label></div>
      <div className="child-banner"><div className="avatar">{selected.name.split(' ').map((s) => s[0]).slice(0,2).join('')}</div><div><span className="eyebrow">ÇOCUK PROFİLİ</span><h2>{selected.name}</h2><span>Takvim, görevler ve gelişim kayıtları</span></div><span className="synthetic-badge">Sentetik demo</span></div>
      <nav className="workspace-tabs" aria-label="Çocuk paneli">{tabs.map(([id,label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div key={`${selected.id}-${week.year}-${week.week}-${tab}`} className="workspace-content">
        {tab === 'overview' && <><section className="card"><h2>Haftalık gelişim</h2><WeekPicker value={week} onChange={setWeek} /></section><StatsPanel child={selected} week={week} /><SummaryPanel child={selected} week={week} /></>}
        {tab === 'calendar' && <CalendarPanel child={selected} />}
        {tab === 'entries' && <WeeklyEvaluations child={selected} />}
        {tab === 'documents' && <DocumentsPanel child={selected} />}
        {tab === 'summary' && <><section className="card"><h2>Özet dönemi</h2><WeekPicker value={week} onChange={setWeek} /></section><SummaryPanel child={selected} week={week} /></>}
        {tab === 'access' && <LinkedSpecialists child={selected} />}
        {tab === 'assigned' && <AssignedTasks />}
      </div>
    </>}
  </Layout>;
}
export function ParentHome() { return <Workspace role="parent" />; }
export function SpecialistHome() { return <Workspace role="specialist" />; }
export function ChildHome() { return <Workspace role="child" />; }
