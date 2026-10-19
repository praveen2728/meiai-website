import test from 'node:test';
import assert from 'node:assert/strict';
import { learnArticles, learnArticleBySlug, learnArticleByComponent, learnArticleByQuestion } from '../src/lib/learnContent.ts';
import { simulatorComponents, simulatorControls } from '../src/lib/azureSimulator.ts';

test('published Learn guides have unique routes and substantive sections', () => {
  const slugs = learnArticles.map((article) => article.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(learnArticles.length >= 10);
  for (const article of learnArticles) {
    assert.ok(learnArticleBySlug[article.slug]);
    assert.ok(article.sections.length >= 4);
    assert.ok(article.sections.every((section) => section.paragraphs.some((paragraph) => paragraph.length > 50)));
  }
});

test('article links resolve only to real components and questions', () => {
  const componentIds = new Set(simulatorComponents.map((item) => item.id));
  const questionIds = new Set(simulatorControls.map((item) => item.id));
  for (const article of learnArticles) {
    assert.ok(article.componentIds.every((id) => componentIds.has(id)), article.slug);
    assert.ok(article.questionIds.every((id) => questionIds.has(id)), article.slug);
  }
  assert.ok(Object.values(learnArticleByComponent).every((slug) => Boolean(learnArticleBySlug[slug])));
  assert.ok(Object.values(learnArticleByQuestion).every((slug) => Boolean(learnArticleBySlug[slug])));
});
