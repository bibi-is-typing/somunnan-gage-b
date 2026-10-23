import test from 'node:test';
import assert from 'node:assert/strict';
import { canMeasure, safeParameters } from '../src/scripts/analytics-policy.mjs';
test('no ID, local previews and review mode never activate GA4', () => {
  assert.equal(canMeasure('', 'example.com', false), false);
  for (const host of ['localhost','127.0.0.1','[::1]','site.local']) assert.equal(canMeasure('G-ABC1234567',host,false),false);
  assert.equal(canMeasure('G-ABC1234567','example.com',true),false);
  assert.equal(canMeasure('G-ABC1234567','example.com',false),true);
});
test('PII and arbitrary values are discarded from analytics payloads', () => {
  assert.deepEqual(safeParameters({ industry:'cafe',help:'consulting',contact:'010-0000-0000',business:'테스트',concern:'private',page_location:'https://example.com/?email=private',section:'hero'}), {industry:'cafe',help:'consulting',section:'hero'});
  assert.deepEqual(safeParameters({industry:'private@example.com',help:'arbitrary',section:'hello<script>'}),{});
});
