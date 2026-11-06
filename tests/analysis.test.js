const test = require('node:test');
const assert = require('node:assert/strict');
const Analysis = require('../js/analysis.js');

const rec = (type, at) => ({ id: at, type, at });

test('presetRange는 오늘을 포함하고 월 경계를 넘긴다', () => {
  const range = Analysis.presetRange(7, new Date(2026, 10, 3, 23, 59));
  assert.deepEqual(range, { start: '2026-10-28', end: '2026-11-03' });
});

test('inRange는 시작일과 종료일을 모두 포함한다', () => {
  const records = [
    rec('cry', '2026-11-01T00:00'),
    rec('cry', '2026-11-03T23:59'),
    rec('cry', '2026-11-04T00:00'),
    rec('cry', '2026-10-31T23:59'),
  ];
  const result = Analysis.inRange(records, '2026-11-01', '2026-11-03');
  assert.deepEqual(result.map((r) => r.at), ['2026-11-01T00:00', '2026-11-03T23:59']);
});

test('hourlyCounts는 날짜가 달라도 같은 시간대로 합친다', () => {
  const counts = Analysis.hourlyCounts([
    rec('cry', '2026-11-01T14:05'),
    rec('cry', '2026-11-02T14:59'),
    rec('cry', '2026-11-02T15:00'),
    rec('feed', '2026-11-02T00:00'),
    rec('bigCry', '2026-11-02T23:59'),
  ]);
  assert.equal(counts.cry[14], 2);
  assert.equal(counts.cry[15], 1);
  assert.equal(counts.feed[0], 1);
  assert.equal(counts.bigCry[23], 1);
});

test('hourlyCounts는 알 수 없는 유형을 무시한다', () => {
  const counts = Analysis.hourlyCounts([rec('nap', '2026-11-01T14:05')]);
  assert.deepEqual(Object.keys(counts), Analysis.TYPES);
  assert.equal(counts.cry.reduce((a, b) => a + b), 0);
});

test('peakHours는 공동 1위를 모두 돌려주고 기록이 없으면 비어 있다', () => {
  const counts = new Array(24).fill(0);
  assert.deepEqual(Analysis.peakHours(counts), { max: 0, hours: [] });
  counts[3] = 2;
  counts[20] = 2;
  counts[5] = 1;
  assert.deepEqual(Analysis.peakHours(counts), { max: 2, hours: [3, 20] });
});

test('formatPeak은 많은 공동 1위를 줄여서 표시한다', () => {
  assert.equal(Analysis.formatPeak({ max: 0, hours: [] }), '기록 없음');
  assert.equal(Analysis.formatPeak({ max: 1, hours: [23] }), '23~24시');
  assert.equal(Analysis.formatPeak({ max: 1, hours: [1, 2, 3, 4, 5] }), '1~2시, 2~3시, 3~4시 외 2개');
});

test('daysBetween은 양 끝 날짜를 포함한다', () => {
  assert.equal(Analysis.daysBetween('2026-11-01', '2026-11-01'), 1);
  assert.equal(Analysis.daysBetween('2026-10-28', '2026-11-03'), 7);
});

test('fullRange는 가장 이른 기록부터 오늘까지다', () => {
  const today = new Date(2026, 10, 6);
  assert.deepEqual(Analysis.fullRange([], today), { start: '2026-11-06', end: '2026-11-06' });
  assert.deepEqual(
    Analysis.fullRange([rec('cry', '2026-10-01T01:00')], today),
    { start: '2026-10-01', end: '2026-11-06' },
  );
});
