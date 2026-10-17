import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveSimulatorFindings,
  getRelevantControls,
  getTargetComponentIds,
  getUnknownControls,
  initialSimulatorState,
  normalizeSimulatorState,
  simulatorComponents,
  simulatorControls,
  summarizeSimulator,
} from '../src/lib/azureSimulator.ts';

test('unknown and not-applicable answers are not treated as passes or findings', () => {
  const state = structuredClone(initialSimulatorState);
  const relevant = getRelevantControls(state);
  assert.ok(relevant.length > 0);
  assert.equal(deriveSimulatorFindings(state).length, 0);
  assert.equal(getUnknownControls(state).length, relevant.length);
  assert.equal(summarizeSimulator(state).counts.implemented, 0);
  state.statuses[relevant[0].id] = 'na';
  assert.equal(deriveSimulatorFindings(state).length, 0);
  assert.equal(summarizeSimulator(state).counts.na, 1);
  assert.equal(summarizeSimulator(state).counts.implemented, 0);
});

test('explicit missing and partial control answers deterministically generate prioritized potential gaps', () => {
  const state = structuredClone(initialSimulatorState);
  state.statuses['IAM-01'] = 'missing';
  state.statuses['NET-03'] = 'partial';
  state.statuses['NET-01'] = 'implemented';
  const findings = deriveSimulatorFindings(state);
  assert.deepEqual(findings.map((item) => item.controlId), ['IAM-01', 'NET-03']);
  assert.equal(findings.find((item) => item.controlId === 'IAM-01').severity, 'High');
  assert.equal(findings.find((item) => item.controlId === 'IAM-01').priority, 'Immediate');
  assert.equal(findings.find((item) => item.controlId === 'NET-03').severity, 'Medium');
  assert.match(findings[0].reason, /No tenant configuration was queried/);
  assert.ok(findings.every((item) => item.affectedComponents.length > 0));
});

test('workload and component selection limits the applicable checklist', () => {
  const state = { ...structuredClone(initialSimulatorState), workloads: ['containers'], components: ['aks'] };
  const relevant = getRelevantControls(state);
  assert.ok(relevant.some((item) => item.id === 'APP-01'));
  assert.ok(!relevant.some((item) => item.id === 'NET-04'));
  assert.ok(!relevant.some((item) => item.id === 'DATA-01'));
});

test('target architecture is a proposal derived from reported gaps and environment', () => {
  const state = structuredClone(initialSimulatorState);
  state.environment = 'landing-zone';
  state.statuses['NET-03'] = 'missing';
  const target = getTargetComponentIds(state);
  assert.ok(target.includes('private-endpoint'));
  assert.ok(target.includes('management-groups'));
  assert.ok(target.includes('azure-policy'));
  assert.ok(state.components.includes('private-endpoint'));
  assert.ok(!simulatorComponents.some((component) => component.id === 'not-a-real-resource'));
});

test('saved state normalization rejects unknown ids and invalid status values', () => {
  const normalized = normalizeSimulatorState({
    environment: 'invalid', workloads: ['web-app', 'bad-workload'], components: ['entra', 'fake'],
    statuses: { 'IAM-01': 'implemented', 'BAD-01': 'implemented', 'NET-01': 'verified' },
  });
  assert.equal(normalized.environment, initialSimulatorState.environment);
  assert.deepEqual(normalized.workloads, ['web-app']);
  assert.deepEqual(normalized.components, ['entra']);
  assert.equal(normalized.statuses['IAM-01'], 'implemented');
  assert.equal(normalized.statuses['NET-01'], undefined);
  assert.ok(simulatorControls.every((item) => item.id));
});
