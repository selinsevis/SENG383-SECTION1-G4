// One boundary for AI providers. Mock mode is deterministic and performs no network I/O.
const PROMPTS = {
  parent: 'Ebeveyne, yalnızca verilen haftalık kayıtlardan sade bir özet sun. Karar, teşhis veya tedavi önerme. Kaynakların dışına çıkma.',
  specialist: 'Uzmana, yalnızca verilen haftalık kayıtları yapılandırılmış biçimde özetle. Karar, teşhis veya tedavi önerme. Kaynakların dışına çıkma.',
};
function generateSummary({ role, week, stats, sources }, mode = process.env.AI_MODE || 'mock') {
  if (mode !== 'mock') throw Object.assign(new Error('Bu sürüm yalnızca AI_MODE=mock destekliyor; gerçek sağlayıcı henüz yapılandırılmadı.'), { status: 503 });
  const intro = role === 'specialist' ? 'Uzman için haftalık kayıt özeti' : 'Ebeveyn için haftalık kayıt özeti';
  const lastDay = new Date(Date.parse(week.end) - 86400000).toISOString().slice(0, 10);
  const content = sources.length
    ? `${intro}: ${week.start}–${lastDay}. Bu hafta ${stats.total} görevin ${stats.done} tanesi tamamlandı (%${stats.completionRate}). ${sources.filter((s) => s.type === 'entry').length} uzman değerlendirmesi ve ${sources.filter((s) => s.type === 'event').length} takvim etkinliği kaydedildi. Bu metin yalnızca kayıtlı bilgileri özetler; gelişim hakkında klinik sonuç çıkarmaz.`
    : `${intro}: seçilen haftada özetlenecek kayıt bulunamadı. Yeni bir sonuç veya öneri üretilmedi.`;
  return { content, mode: 'mock', label: 'AI-generated', prompt: PROMPTS[role] };
}
module.exports = { generateSummary, PROMPTS };
