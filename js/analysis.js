// 기록 집계 전용 모듈. DOM과 저장소에 의존하지 않아 Node에서 테스트할 수 있다.
// 기록 형식: { id, type, at }. at은 현지 시각 문자열 "YYYY-MM-DDTHH:mm"이다.
const Analysis = (() => {
  const TYPES = ['cry', 'bigCry', 'feed'];
  const LABELS = { cry: '울음', bigCry: '크게 울음', feed: '분유' };
  const MAX_PEAKS_SHOWN = 3;

  const pad = (n) => String(n).padStart(2, '0');

  function toDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toTimeKey(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // 오늘을 포함해 최근 days일을 돌려준다.
  function presetRange(days, today = new Date()) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
    return { start: toDateKey(start), end: toDateKey(today) };
  }

  function fullRange(records, today = new Date()) {
    const todayKey = toDateKey(today);
    const dates = records.map((r) => r.at.slice(0, 10)).concat(todayKey).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }

  function inRange(records, start, end) {
    return records.filter((r) => {
      const date = r.at.slice(0, 10);
      return date >= start && date <= end;
    });
  }

  function hourlyCounts(records) {
    const counts = {};
    TYPES.forEach((type) => { counts[type] = new Array(24).fill(0); });
    records.forEach((r) => {
      if (!counts[r.type]) return;
      const hour = Number(r.at.slice(11, 13));
      if (hour >= 0 && hour < 24) counts[r.type][hour] += 1;
    });
    return counts;
  }

  // 공동 1위 시간대를 모두 돌려준다. 기록이 없으면 hours는 빈 배열이다.
  function peakHours(hourCounts) {
    const max = Math.max(...hourCounts);
    if (max === 0) return { max: 0, hours: [] };
    const hours = [];
    hourCounts.forEach((count, hour) => { if (count === max) hours.push(hour); });
    return { max, hours };
  }

  function formatHour(hour) {
    return `${hour}~${hour + 1}시`;
  }

  function formatPeak(peak) {
    if (peak.hours.length === 0) return '기록 없음';
    const shown = peak.hours.slice(0, MAX_PEAKS_SHOWN).map(formatHour).join(', ');
    const rest = peak.hours.length - MAX_PEAKS_SHOWN;
    return rest > 0 ? `${shown} 외 ${rest}개` : shown;
  }

  function daysBetween(start, end) {
    const toUtc = (key) => {
      const [y, m, d] = key.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };
    return Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1;
  }

  return {
    TYPES, LABELS, toDateKey, toTimeKey, presetRange, fullRange, inRange,
    hourlyCounts, peakHours, formatHour, formatPeak, daysBetween,
  };
})();

if (typeof module !== 'undefined') module.exports = Analysis;
