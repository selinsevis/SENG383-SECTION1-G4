import { useState } from 'react';
import { apiFetch } from '../api.js';

export default function AddChild({ onAdded, ready }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    setSending(true); setError(null); setMessage(null);
    try {
      const child = await apiFetch('/api/children', { method: 'POST', body: { firstName, lastName, email, password } });
      onAdded(child);
      setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setMessage(`${child.name} ve giriş hesabı oluşturuldu.`);
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }
  return <section className="card">
    <h2>Add child / Çocuk ekle</h2>
    <form className="inline-form" onSubmit={submit}>
      <label>Çocuğun adı<input required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
      <label>Çocuğun soyadı<input required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
      <label>Çocuğun e-postası<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Çocuğun şifresi<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button disabled={sending || !ready}>{sending ? 'Ekleniyor…' : 'Add child'}</button>
    </form>
    <p className="admin-muted">Yalnızca sentetik demo bilgileri girin. Çocuk bu e-posta ve şifreyle giriş yapabilir. Şifre en az 8 karakter olmalıdır.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="success">{message}</p>}
  </section>;
}
