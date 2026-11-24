const fs = require('node:fs');
const path = require('node:path');
const DEFAULT_UPLOADS = path.join(__dirname, '..', 'uploads');

// Idempotent upgrade of the former disk storage. Commit and verify bytes before
// removing an old file; missing files remain untouched records, never empty BLOBs.
function migrateLegacyDocuments(db, uploadsDir = DEFAULT_UPLOADS) {
  const migrated = [];
  for (const row of db.prepare('SELECT id, stored_name, size_bytes FROM documents').all()) {
    if (path.basename(row.stored_name) !== row.stored_name) continue;
    const file = path.join(uploadsDir, row.stored_name);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.length !== row.size_bytes) throw new Error(`Document ${row.id}: legacy file size mismatch`);
    db.transaction(() => {
      db.prepare('UPDATE documents SET file_data = ? WHERE id = ? AND file_data IS NULL').run(bytes, row.id);
      const saved = db.prepare('SELECT file_data FROM documents WHERE id = ?').get(row.id).file_data;
      if (!saved || !Buffer.from(saved).equals(bytes)) throw new Error('Document migration verification failed');
    })();
    // If this cleanup fails, the DB copy is already durable and remains usable.
    fs.unlinkSync(file);
    migrated.push(row.id);
  }
  return migrated;
}
module.exports = { migrateLegacyDocuments };
