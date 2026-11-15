const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
function detectType(buffer) {
  if (buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) return ['application/pdf', '.pdf'];
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ['image/png', '.png'];
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return ['image/jpeg', '.jpg'];
  return null;
}
const SELECT = `SELECT d.id, d.child_id AS childId, d.file_name AS name, d.file_type AS type,
  d.size_bytes AS size, u.name AS uploader, d.uploaded_at AS uploadedAt FROM documents d JOIN users u ON u.id = d.uploaded_by`;
function childDocuments(db) {
  const router = express.Router();
  router.get('/', (req, res) => res.json(db.prepare(`${SELECT} WHERE d.child_id = ? ORDER BY d.id DESC`).all(req.child.id)));
  router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'PDF, PNG veya JPEG dosyası seçin.' });
    const type = detectType(req.file.buffer);
    if (!type || req.file.mimetype !== type[0]) return res.status(400).json({ error: 'Yalnızca içeriği doğrulanan PDF, PNG ve JPEG dosyaları kabul edilir.' });
    const stored = randomUUID() + type[1];
    const result = db.prepare(`INSERT INTO documents (child_id, uploaded_by, file_name, stored_name, file_type, size_bytes, file_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.child.id, req.user.id, path.basename(req.file.originalname).replace(/[\r\n\u0000]/g, '').slice(0, 200), stored, type[0], req.file.size, req.file.buffer);
    res.status(201).json(db.prepare(`${SELECT} WHERE d.id = ?`).get(result.lastInsertRowid));
  });
  return router;
}
function documentsRouter(db, access) {
  const router = express.Router();
  router.get('/:docId/:action', (req, res, next) => {
    if (!['download', 'view'].includes(req.params.action)) return res.status(404).json({ error: 'Not found' });
    const doc = db.prepare('SELECT id, child_id, file_name, file_type FROM documents WHERE id = ?').get(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Belge bulunamadı.' });
    req.doc = doc;
    req.params.childId = String(doc.child_id);
    access(req, res, next);
  }, (req, res) => {
    const bytes = db.prepare('SELECT file_data FROM documents WHERE id = ?').get(req.doc.id)?.file_data;
    if (!bytes) return res.status(404).json({ error: 'Belge içeriği bulunamadı. Eski belgeler için seed geçişini çalıştırın.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    res.type(req.doc.file_type);
    res.attachment(req.doc.file_name);
    if (req.params.action === 'view') {
      res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
      res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    }
    res.type(req.doc.file_type).send(Buffer.from(bytes));
  });
  return router;
}
module.exports = { childDocuments, documentsRouter };
