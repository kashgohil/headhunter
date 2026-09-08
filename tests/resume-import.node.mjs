import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { createImport, getImport, reviewProposal, retryExtraction, addProposal, deleteImport, findMatches } from '../lib/resume-import/storage.ts';
import { extractProposals } from '../lib/resume-import/extraction.ts';
import { exportBackup, restoreBackup } from '../lib/data-transfer/backup.ts';
const source = `EXPERIENCE
Senior Engineer | Fixture Labs | Jan 2020 - Present
- Built a workflow system with TypeScript.

SKILLS
TypeScript, React

EDUCATION
BSc Computing | Fixture University
Studied distributed systems.

PROJECTS
Request tracker
Built a local request tracker.`;
function database() {
  const db = new Database(':memory:'); db.pragma('foreign_keys=ON');
  const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const e of journal.entries) db.exec(readFileSync(new URL(`../drizzle/${e.tag}.sql`,import.meta.url),'utf8'));
  return db;
}
const create = db => createImport(db,{name:'Synthetic resume',format:'text',text:source});
describe('resume import review',()=>{
 it('extracts all supported kinds without inventing missing context, metrics or proficiency',()=>{
  const p=extractProposals(source);assert.deepEqual(p.map(p=>p.kind),['experience','achievement','skill','skill','education','project']);
  assert.equal(p[0].fields.startDate,'2020-01');assert.equal(p[0].fields.company,'Fixture Labs');
  assert.equal(p[1].fields.result,'');assert.equal(p[1].fields.problem,'');assert.equal(p[2].fields.proficiency,'');
  assert.notEqual(p[2].sourceKey,p[3].sourceKey);
  assert.equal(extractProposals('EXPERIENCE\nEngineer | Company | 2020 - 2024')[0].fields.startDate,'');
 });
 it('persists partial review, never auto-verifies, and keeps rejection/edits across retries and reimport',()=>{
  const db=database();try{
   const id=create(db);const p=getImport(db,id).proposals;assert.equal(p.length,6);assert.equal(db.prepare('select count(*) n from career_skills').get().n,0);
   const skill=p.find(p=>p.kind==='skill');reviewProposal(db,skill.id,0,'save',{...skill.fields,context:'Edited context'});
   const other=p.find(p=>p.kind==='project');reviewProposal(db,other.id,0,'reject',{});
   assert.equal(retryExtraction(db,id),0);assert.equal(create(db),id);
   assert.equal(getImport(db,id).proposals.find(p=>p.id===skill.id).fields.context,'Edited context');
   assert.equal(getImport(db,id).proposals.find(p=>p.id===other.id).state,'rejected');
   assert.throws(()=>reviewProposal(db,other.id,1,'approve',other.fields),/already been reviewed/);
  }finally{db.close();}
 });
 it('approves once, preserves provenance, blocks stale edits and current duplicate/locked facts',()=>{
  const db=database();try{
   const id=create(db);const p=getImport(db,id).proposals.find(p=>p.kind==='skill');
   const fields={...p.fields,recency:'current',proficiency:'working'};
   assert.throws(()=>reviewProposal(db,p.id,0,'approve',p.fields));
   reviewProposal(db,p.id,0,'save',fields);assert.throws(()=>reviewProposal(db,p.id,0,'approve',fields),/another tab/);
   const evidence=reviewProposal(db,p.id,1,'approve',fields);assert.equal(reviewProposal(db,p.id,1,'approve',fields),evidence);
   const row=db.prepare('select * from career_skills where id=?').get(evidence);assert.equal(row.source_type,'imported');assert.equal(row.verification_state,'verified');assert.match(row.source_label,new RegExp(id));
   db.prepare('update career_skills set locked=1 where id=?').run(evidence);
   const other=createImport(db,{name:'Other source',format:'text',text:'SKILLS\n'+fields.name});const next=getImport(db,other).proposals[0];
   assert.equal(findMatches(db,'skill',fields)[0].locked,true);
   assert.throws(()=>reviewProposal(db,next.id,0,'approve',fields,true),/already exists/);
   assert.equal(db.prepare('select count(*) n from career_skills').get().n,1);
  }finally{db.close();}
 });
 it('links approved achievements, rejects fabricated source excerpts, and rolls back on audit failure',()=>{
  const db=database();try{
   const id=create(db);const p=getImport(db,id).proposals;const exp=p.find(p=>p.kind==='experience');
   const eid=reviewProposal(db,exp.id,0,'approve',exp.fields);const ach=p.find(p=>p.kind==='achievement');
   const fields={...ach.fields,experienceId:eid,problem:'Manual requests were hard to track.',result:'Requests were visible to the team.'};
   db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events WHEN NEW.action='resume_import.approved' BEGIN SELECT RAISE(ABORT,'audit failure'); END");
   assert.throws(()=>reviewProposal(db,ach.id,0,'approve',fields));assert.equal(db.prepare('select count(*) n from career_achievements').get().n,0);assert.equal(getImport(db,id).proposals.find(p=>p.id===ach.id).state,'pending');
   db.exec('DROP TRIGGER reject_audit');assert.ok(reviewProposal(db,ach.id,0,'approve',fields));
   assert.throws(()=>addProposal(db,id,'skill','Not in this resume'),/exactly/);
   const manual=addProposal(db,id,'skill','TypeScript');assert.equal(addProposal(db,id,'skill','TypeScript'),manual);
  }finally{db.close();}
 });
 it('round-trips sources and review decisions, enforces immutable excerpts and retains evidence on deletion',()=>{
  const db=database();try{
   const id=create(db);const p=getImport(db,id).proposals.find(p=>p.kind==='experience');reviewProposal(db,p.id,0,'approve',p.fields);
   assert.throws(()=>db.prepare('update resume_import_proposals set source_quote=? where id=?').run('changed',p.id));
   assert.throws(()=>db.prepare('update resume_imports set source_text=? where id=?').run('changed',id));
   const before=getImport(db,id);restoreBackup(db,exportBackup(db));assert.deepEqual(getImport(db,id),before);
   deleteImport(db,id);assert.equal(getImport(db,id),null);assert.equal(db.prepare('select count(*) n from career_experiences').get().n,1);
  }finally{db.close();}
 });
});
