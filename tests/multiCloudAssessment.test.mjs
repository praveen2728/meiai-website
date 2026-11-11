import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentQuestions, createMultiCloudDraft, deriveMultiCloudFindings, normalizeMultiCloudDraft, summarizeMultiCloudDraft } from '../src/lib/multiCloudAssessment.ts';

test('AWS and GCP drafts begin blank and unknown checks do not pass or create findings',()=>{
 for(const provider of ['AWS','GCP']){const draft=createMultiCloudDraft(provider);assert.equal(Object.keys(draft.answers).length,7);assert.ok(Object.values(draft.answers).every(x=>x==='unknown'));assert.equal(deriveMultiCloudFindings(draft).length,0)}
});
test('partial and missing answers create stable, actionable findings with provider references',()=>{
 const draft=createMultiCloudDraft('AWS');const [first,second]=assessmentQuestions.AWS;draft.answers[first.id]='missing';draft.answers[second.id]='partial';const found=deriveMultiCloudFindings(draft);assert.deepEqual(found.map(x=>x.id),[first.id,second.id]);assert.ok(found.every(x=>x.remediation.length>30&&x.validation.length>20&&x.reference.url.startsWith('https://')));assert.ok(found[0].resources.length>0);
});
test('draft normalization ignores unknown question IDs and invalid answer states',()=>{
 const normalized=normalizeMultiCloudDraft({provider:'GCP',answers:{'gcp-identity':'implemented','fake':'missing','gcp-network':'pass'},evidence:{'gcp-identity':'reviewed'}},'GCP');assert.equal(normalized.answers['gcp-identity'],'implemented');assert.equal(normalized.answers['gcp-network'],'unknown');assert.equal(normalized.answers.fake,undefined);assert.equal(normalized.evidence['gcp-identity'],'reviewed');
});
test('dashboard summary counts reported states without counting unknown as implemented',()=>{
 const draft=createMultiCloudDraft('GCP');draft.answers['gcp-identity']='implemented';draft.answers['gcp-network']='partial';draft.answers['gcp-secrets']='missing';const summary=summarizeMultiCloudDraft(draft);assert.equal(summary.total,7);assert.equal(summary.answered,3);assert.equal(summary.unknown,4);assert.equal(summary.implemented,1);assert.equal(summary.findings.length,2);
});
