import test from 'node:test';
import assert from 'node:assert/strict';
import { architectureDocument, architectureSvg, validateArchitectureImport } from '../src/lib/architectureExport.ts';
import { simulatorComponents, initialSimulatorState } from '../src/lib/azureSimulator.ts';
import { isCompatibleRelationship } from '../src/lib/architectureRelationshipRules.ts';

test('architecture JSON round-trips design fields and excludes assessment and license data', () => {
  const state = { ...structuredClone(initialSimulatorState), components: ['entra', 'app-service', 'sql'], relationships: [{ id: 'e1', from: 'entra', to: 'app-service', kind: 'Identity access' }] };
  state.statuses['IAM-01'] = 'missing'; state.licenses = ['m365-e5'];
  const result = validateArchitectureImport(JSON.stringify(architectureDocument(state)));
  assert.deepEqual(result.components, state.components);
  assert.deepEqual(result.relationships, state.relationships);
  assert.equal(result.statuses['IAM-01'], undefined);
  assert.deepEqual(result.licenses, []);
});

test('architecture JSON import rejects malformed and unknown design references', () => {
  assert.throws(() => validateArchitectureImport('{'), /valid JSON/);
  assert.throws(() => validateArchitectureImport(JSON.stringify({ format: 'meiai-architecture', version: 2, state: {} })), /Unsupported/);
  assert.throws(() => validateArchitectureImport(JSON.stringify({ format: 'meiai-architecture', version: 1, state: { components: ['made-up'] } })), /does not recognize/);
  assert.throws(() => validateArchitectureImport(JSON.stringify({ format: 'meiai-architecture', version: 1, state: { components: ['entra'], relationships: [{ id: 'x', from: 'entra', to: 'fake', kind: 'Identity access' }] } })), /included in this design/);
});

test('SVG export contains selected component labels and relationships', () => {
  const state = { ...structuredClone(initialSimulatorState), components: ['entra', 'app-service'], relationships: [{ id: 'e1', from: 'entra', to: 'app-service', kind: 'Identity access' }] };
  const svg = architectureSvg(state);
  assert.match(svg, /Microsoft Entra ID/);
  assert.match(svg, /Azure App Service/);
  assert.match(svg, /Identity access/);
  assert.match(svg, /conceptual design/i);
});

test('relationship rules validate direction and endpoint role', () => {
  const byId = Object.fromEntries(simulatorComponents.map((component) => [component.id, component]));
  assert.equal(isCompatibleRelationship('Identity access', byId.entra, byId['app-service']), true);
  assert.equal(isCompatibleRelationship('Identity access', byId['app-service'], byId.entra), false);
  assert.equal(isCompatibleRelationship('Data access', byId['app-service'], byId.sql), true);
  assert.equal(isCompatibleRelationship('Telemetry', byId['log-analytics'], byId.sentinel), false);
  assert.equal(isCompatibleRelationship('Telemetry', byId['app-service'], byId.sentinel), true);
});
