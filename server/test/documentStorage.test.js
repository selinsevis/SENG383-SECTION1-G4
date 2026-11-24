const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase, seedDatabase } = require('../src/database');
const { migrateLegacyDocuments } = require('../src/documentStorage');

test('legacy documents move to BLOB with exact bytes and old files are removed only after commit', () => {
  const db = openDatabase(':memory:');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-migrate-'));
  try {
    seedDatabase(db);
    const bytes = Buffer.from('%PDF-1.4\nSynthetic archived file\n%%EOF');
    const id = db.prepare(`INSERT INTO documents(child_id,uploaded_by,file_name,stored_name,file_type,size_bytes)
      VALUES(1,1,'archive.pdf','legacy.pdf','application/pdf',?)`).run(bytes.length).lastInsertRowid;
    fs.writeFileSync(path.join(dir, 'legacy.pdf'), bytes);
    expect(migrateLegacyDocuments(db, dir)).toEqual([Number(id)]);
    expect(db.prepare('SELECT file_data FROM documents WHERE id=?').get(id).file_data).toEqual(bytes);
    expect(fs.existsSync(path.join(dir, 'legacy.pdf'))).toBe(false);
    expect(migrateLegacyDocuments(db, dir)).toEqual([]);
    // A cleanup interrupted after commit is recoverable on the next migration.
    fs.writeFileSync(path.join(dir, 'legacy.pdf'), bytes);
    expect(migrateLegacyDocuments(db, dir)).toEqual([Number(id)]);
    expect(fs.readdirSync(dir)).toEqual([]);
  } finally { db.close(); fs.rmSync(dir, {recursive:true,force:true}); }
});

test('missing or mismatched legacy files are not silently replaced or deleted', () => {
  const db = openDatabase(':memory:');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-migrate-'));
  try {
    seedDatabase(db);
    db.prepare(`INSERT INTO documents(child_id,uploaded_by,file_name,stored_name,file_type,size_bytes)
      VALUES(1,1,'missing.pdf','missing.pdf','application/pdf',100)`).run();
    expect(migrateLegacyDocuments(db, dir)).toEqual([]);
    fs.writeFileSync(path.join(dir,'missing.pdf'), 'short');
    expect(() => migrateLegacyDocuments(db, dir)).toThrow('size mismatch');
    expect(fs.readFileSync(path.join(dir,'missing.pdf'),'utf8')).toBe('short');
    expect(db.prepare('SELECT file_data FROM documents').get().file_data).toBeNull();
  } finally { db.close(); fs.rmSync(dir, {recursive:true,force:true}); }
});

test('seed adds the BLOB column to an old documents schema and migrates without changing metadata', () => {
  const db = openDatabase(':memory:');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-old-schema-'));
  try {
    seedDatabase(db);
    db.exec('ALTER TABLE documents DROP COLUMN file_data');
    const bytes = Buffer.from('%PDF-1.4\nOriginal synthetic document');
    const id = db.prepare(`INSERT INTO documents(child_id,uploaded_by,file_name,stored_name,file_type,size_bytes)
      VALUES(1,1,'original.pdf','old.pdf','application/pdf',?)`).run(bytes.length).lastInsertRowid;
    fs.writeFileSync(path.join(dir,'old.pdf'), bytes);
    seedDatabase(db, {uploadsDir:dir});
    const row = db.prepare('SELECT * FROM documents WHERE id=?').get(id);
    expect(row.file_data).toEqual(bytes);
    expect(row.file_name).toBe('original.pdf');
    expect(row.child_id).toBe(1);
    expect(fs.existsSync(path.join(dir,'old.pdf'))).toBe(false);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  } finally { db.close(); fs.rmSync(dir,{recursive:true,force:true}); }
});
