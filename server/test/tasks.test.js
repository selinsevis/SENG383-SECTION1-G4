const request=require('supertest');
const {openDatabase,seedDatabase,DEMO_PASSWORD}=require('../src/database');
const {createApp}=require('../src/app');
let db,app;
beforeEach(()=>{db=openDatabase(':memory:');seedDatabase(db);app=createApp(db,{jwtSecret:'test'});});
afterEach(()=>db.close());
async function auth(email){const r=await request(app).post('/api/auth/login').send({email,password:DEMO_PASSWORD});return{Authorization:`Bearer ${r.body.token}`};}
const task={title:'Synthetic task',description:'Read',area:'language',dueDate:'2026-11-16'};
test('Flow 2: teacher assigns, child completes, teacher sees done; completion is idempotent',async()=>{
 const t=await auth('teacher@demo.test'),c=await auth('child@demo.test');
 const r=await request(app).post('/api/children/1/tasks').set(t).send(task).expect(201);
 expect(r.body).toMatchObject({...task,childId:1,assignedBy:2,status:'open'});
 const done=await request(app).patch(`/api/tasks/${r.body.id}/complete`).set(c).expect(200);
 const again=await request(app).patch(`/api/tasks/${r.body.id}/complete`).set(c).expect(200);
 expect(again.body.completedAt).toBe(done.body.completedAt);
 const list=await request(app).get('/api/tasks/assigned-by-me').set(t).expect(200);
 expect(list.body.find(x=>x.id===r.body.id).status).toBe('done');
});
test('parent can assign; child, unlinked specialist and other child requests are blocked',async()=>{
 const p=await auth('parent@demo.test'),c=await auth('child@demo.test');
 await request(app).post('/api/children/1/tasks').set(p).send(task).expect(201);
 await request(app).post('/api/children/1/tasks').set(c).send(task).expect(403);
 await request(app).get('/api/children/1/tasks').set(await auth('psychologist@demo.test')).expect(403);
 db.prepare("INSERT INTO children(id,parent_id,name) VALUES(2,1,'Other')").run();
 const other=await request(app).post('/api/children/2/tasks').set(p).send(task).expect(201);
 await request(app).patch(`/api/tasks/${other.body.id}/complete`).set(c).expect(403);
 await request(app).patch('/api/tasks/999/complete').set(c).expect(404);
 await request(app).patch('/api/tasks/1/complete').set(p).expect(403);
 await request(app).get('/api/tasks').expect(401);
 await request(app).get('/api/tasks').set(p).expect(404);
});
test('invalid task fields and missing children are rejected',async()=>{
 const t=await auth('teacher@demo.test');
 for(const invalid of [{title:''},{description:1},{area:'wizard'},{dueDate:'2026-02-30'},{dueDate:'invalid'}])await request(app).post('/api/children/1/tasks').set(t).send({...task,...invalid}).expect(400);
 await request(app).post('/api/children/999/tasks').set(t).send(task).expect(404);
});
test('unlink hides assigned tasks and blocks current requests',async()=>{
 const t=await auth('teacher@demo.test');
 await request(app).delete('/api/children/1/specialists/2').set(await auth('parent@demo.test')).expect(204);
 await request(app).get('/api/tasks/assigned-by-me').set(t).expect(200,[]);
 await request(app).get('/api/children/1/tasks').set(t).expect(403);
});
test('skeleton migration preserves task IDs/title/status and foreign keys',()=>{
 const old=openDatabase(':memory:');try{
 old.exec("CREATE TABLE tasks(id INTEGER PRIMARY KEY,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open'); INSERT INTO tasks VALUES(1,'Existing','done')");
 seedDatabase(old);seedDatabase(old);
 expect(old.prepare('SELECT id,title,status,child_id,assigned_by FROM tasks WHERE id=1').get()).toEqual({id:1,title:'Existing',status:'done',child_id:1,assigned_by:2});
 expect(old.pragma('foreign_key_check')).toEqual([]);
 }finally{old.close();}
});

test('only the owning child can undo; timestamp clears and stats update immediately',async()=>{
 const t=await auth('teacher@demo.test'),c=await auth('child@demo.test'),p=await auth('parent@demo.test');
 const created=await request(app).post('/api/children/1/tasks').set(t).send(task).expect(201);
 const url=`/api/tasks/${created.body.id}`;
 await request(app).patch(`${url}/complete`).set(c).expect(200);
 expect((await request(app).get('/api/children/1/stats?year=2026&week=47').set(p)).body.done).toBe(1);
 for(const headers of [p,t])await request(app).patch(`${url}/undo`).set(headers).expect(403);
 const undone=await request(app).patch(`${url}/undo`).set(c).expect(200);
 expect(undone.body).toMatchObject({status:'open',completedAt:null});
 await request(app).patch(`${url}/undo`).set(c).expect(200);
 expect((await request(app).get('/api/children/1/stats?year=2026&week=47').set(p)).body.done).toBe(0);
 expect((await request(app).get('/api/tasks/assigned-by-me').set(t)).body.find(x=>x.id===created.body.id).status).toBe('open');
 db.prepare("INSERT INTO children(id,parent_id,name) VALUES(2,1,'Other')").run();
 const other=await request(app).post('/api/children/2/tasks').set(p).send(task).expect(201);
 await request(app).patch(`/api/tasks/${other.body.id}/undo`).set(c).expect(403);
 await request(app).patch('/api/tasks/999/undo').set(c).expect(404);
});
