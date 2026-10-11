import test from 'node:test';
import assert from 'node:assert/strict';
import { playbooks, m365Tree, azureTree } from '../src/lib/azureSecurityContent.ts';
import { deriveJourney, filterGuides, orderGuides } from '../src/lib/azureJourneyLogic.ts';
import { compareCostStates, createCostState, estimateCost, orgPresets } from '../src/lib/azureCostModel.ts';
import { recommendationArticles } from '../src/lib/securityRecommendations.ts';

test('journey recommendations respond to scope, scenario, and answers', () => {
  const base = deriveJourney(playbooks, 'azure', 'migration', {});
  const ai = deriveJourney(playbooks, 'combined', 'ai', { m365Usage: 'Yes', workloads: 'AI workloads', securityTools: 'Both', requirements: 'Yes' });
  assert.ok(base.guides.length > 0);
  assert.ok(ai.guides.some((guide) => guide.domainId === 'ai'));
  assert.ok(ai.guides.some((guide) => guide.domainId === 'email'));
  assert.ok(ai.guides.some((guide) => guide.domainId === 'siem'));
  assert.ok(ai.changes.length > 0);
  assert.ok(!deriveJourney(playbooks, 'azure', 'ai', {}).guides.some((guide) => guide.domainId === 'm365identity'));
});

test('guide search covers implementation content and architecture mappings are real controls', () => {
  assert.ok(filterGuides(playbooks, 'conditional access', 'all').length > 0);
  assert.ok(filterGuides(playbooks, 'pilot group', 'all').length > 0);
  assert.ok(filterGuides(playbooks, 'IAM-01', 'all').length > 0);
  for (const tree of [azureTree, m365Tree]) {
    const nodes = [tree];
    while (nodes.length) {
      const node = nodes.pop();
      for (const id of node.controls ?? []) assert.ok(playbooks.some((guide) => guide.id === id), `${node.label}: missing ${id}`);
      nodes.push(...(node.children ?? []));
    }
  }
});

test('guide ordering reports unresolved prerequisites and dependency cycles', () => {
  const selected = deriveJourney(playbooks, 'combined', 'ai', { workloads: 'AI workloads' }).guides;
  const ids = new Set(selected.map((guide) => guide.id));
  for (const guide of selected) for (const dependency of guide.prerequisiteControlIds) if (ids.has(dependency)) assert.ok(selected.findIndex((item) => item.id === dependency) < selected.findIndex((item) => item.id === guide.id), `${dependency} precedes ${guide.id}`);
  const cycle = orderGuides([{ ...playbooks[0], id: 'cycle-a', prerequisiteControlIds: ['cycle-b'] }, { ...playbooks[0], id: 'cycle-b', prerequisiteControlIds: ['cycle-a'] }]);
  assert.ok(cycle.issues.some((issue) => issue.includes('cycle')));
});

test('cost presets, scope, and scenario comparison are independent', () => {
  assert.deepEqual([orgPresets.small.users, orgPresets.medium.users, orgPresets.enterprise.users], [100, 1000, 10000]);
  const one = createCostState();
  const two = structuredClone(one);
  two.scope = 'm365'; two.size = 'medium'; two.users = 1000; two.currency = 'USD';
  two.enabled.defenderOffice = true; two.rates.defenderOffice = 10;
  two.currentM365 = 'E3'; two.targetM365 = 'E7';
  const oneEstimate = estimateCost(one); const twoEstimate = estimateCost(two);
  assert.ok(!oneEstimate.lines.some((line) => line.component.id === 'defenderOffice'));
  assert.ok(twoEstimate.lines.some((line) => line.component.id === 'defenderOffice'));
  assert.equal(twoEstimate.targetM365Cost, 99000);
  assert.equal(twoEstimate.m365Uplift, 60000);
  assert.ok(twoEstimate.lines.some((line) => line.component.id === 'm365E7' && line.amount === 99000));
  assert.equal(compareCostStates(one, two).sameCurrency, true);
  assert.equal(compareCostStates(one, { ...two, currency: 'INR' }).sameCurrency, false);
  assert.equal(compareCostStates(one, createCostState()).percentageDifference, null);
});

test('published recommendation articles have unique routes, review dates, and authoritative references', () => {
  const published = recommendationArticles.filter((article) => article.status === 'Published');
  assert.ok(published.length >= 3);
  assert.equal(new Set(published.map((article) => article.slug)).size, published.length);
  for (const article of published) {
    assert.ok(article.publishedAt);
    assert.ok(article.lastReviewedAt);
    assert.ok(article.body.includes('## Recommendation'));
    assert.ok(article.references.length > 0);
    assert.ok(article.references.every((reference) => reference.url.startsWith('https://')));
  }
});
