import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetry } from '../js/telemetry.mjs';
function fixture(){let time=0,visible=true;const events=[];const t=createTelemetry({send:(event,properties)=>events.push({event,...properties}),now:()=>time,visible:()=>visible});return {t,events,step(seconds){for(let i=0;i<seconds;i++){time+=1000;t.tick();}},hide(){visible=false;},show(){visible=true;}};}
test('failed written exams finish once without a licence; successful road tests earn one',()=>{
 const {t,events}=fixture();t.start('exam');t.stage('written');t.endStage(false,{written_score:2});t.finish('exam_completed',{outcome:'written-fail',grade:'raincoat',written_score:2});t.finish('exam_completed',{outcome:'pass'});
 assert.equal(events.filter(e=>e.event==='exam_completed').length,1);assert.equal(events.filter(e=>e.event==='license_earned').length,0);
 t.start('exam');t.stage('written');t.endStage(true);t.stage('road');t.endStage(true);t.finish('exam_completed',{outcome:'pass',grade:'full'});
 assert.equal(events.filter(e=>e.event==='license_earned').length,1);assert.equal(events.find(e=>e.event==='unlock_achievement').achievement_id,'full_licence');assert.equal(events.filter(e=>e.event==='game_retried').length,1);
});
test('engagement milestones count foreground play only; changing apps is not abandonment',()=>{
 const f=fixture();f.t.start('challenge','hard');f.t.stage('challenge');f.step(10);f.hide();f.step(120);f.show();f.step(20);
 assert.deepEqual(f.events.filter(e=>['game_engaged','game_progress'].includes(e.event)).map(e=>e.milestone_seconds),[10,30]);
 assert.equal(f.events.some(e=>e.event==='game_abandoned'),false);f.t.abandon();f.t.abandon();assert.equal(f.events.filter(e=>e.event==='game_abandoned').length,1);
});
test('challenge score retains difficulty and terminal results survive a closed result screen',()=>{
 const {t,events}=fixture();t.start('challenge','hard');t.stage('challenge');t.endStage(false,{duration_seconds:94.74});t.finish('challenge_completed',{duration_seconds:94.74,perfect:35,new_record:true});t.abandon();
 const score=events.find(e=>e.event==='post_score');assert.equal(score.score,94.7);assert.equal(score.level,2);assert.equal(score.difficulty,'hard');assert.equal(events.filter(e=>e.event==='game_finished').length,1);assert.equal(events.some(e=>e.event==='game_abandoned'),false);
});
test('analytics send failures cannot throw into gameplay',()=>{
 const t=createTelemetry({send(){throw Error('blocked');},now:()=>0,visible:()=>true});assert.doesNotThrow(()=>{t.start('exam');t.stage('written');t.finish('exam_completed',{outcome:'pass',grade:'partial'});});
});
