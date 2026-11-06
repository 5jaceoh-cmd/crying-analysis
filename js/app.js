(() => {
  const LIST_STEP = 50;
  const CLOCK_REFRESH_MS = 20000;
  const TOAST_MS = 6000;
  const { TYPES, LABELS } = Analysis;
  const $ = (id) => document.getElementById(id);

  const state = {
    preset: 7, // 숫자(최근 n일), 'all', 또는 직접 설정이면 null
    start: '',
    end: '',
    listLimit: LIST_STEP,
    timeEdited: false,
    series: [],
  };

  /* 입력 */

  function fillNow() {
    const now = new Date();
    $('entry-date').value = Analysis.toDateKey(now);
    $('entry-time').value = Analysis.toTimeKey(now);
    state.timeEdited = false;
  }

  function newId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatMoment(at) {
    const [, month, day] = at.slice(0, 10).split('-').map(Number);
    return `${month}월 ${day}일 ${at.slice(11)}`;
  }

  function saveRecord(type) {
    const date = $('entry-date').value;
    const time = $('entry-time').value;
    if (!date || !time) {
      showToast('날짜와 시간을 입력해 주세요.');
      return;
    }
    const record = { id: newId(), type, at: `${date}T${time}` };
    if (!Store.add(record)) {
      showToast('저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해 주세요.');
      return;
    }
    render();
    const outside = date < state.start || date > state.end;
    showToast(
      `${LABELS[type]} ${formatMoment(record.at)} 기록${outside ? ' (조회 기간 밖)' : ''}`,
      () => { Store.remove(record.id); render(); },
    );
  }

  function deleteRecord(id) {
    const removed = Store.remove(id);
    if (!removed) {
      showToast('삭제하지 못했습니다.');
      return;
    }
    render();
    showToast(`${LABELS[removed.type]} ${formatMoment(removed.at)} 삭제`, () => {
      Store.add(removed);
      render();
    });
  }

  /* 알림 */

  let toastTimer = null;

  function showToast(message, onUndo) {
    const undo = $('toast-undo');
    $('toast-message').textContent = message;
    undo.hidden = !onUndo;
    undo.onclick = onUndo ? () => { onUndo(); hideToast(); } : null;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, TOAST_MS);
  }

  function hideToast() {
    $('toast').hidden = true;
  }

  /* 조회 기간 */

  function syncRange(records) {
    if (state.preset === null) {
      state.start = $('range-start').value;
      state.end = $('range-end').value;
      return;
    }
    const range = state.preset === 'all'
      ? Analysis.fullRange(records)
      : Analysis.presetRange(state.preset);
    state.start = range.start;
    state.end = range.end;
    $('range-start').value = range.start;
    $('range-end').value = range.end;
  }

  function renderPresets() {
    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === String(state.preset)));
    });
  }

  /* 렌더링 */

  function buildTiles() {
    TYPES.forEach((type) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.type = type;
      const label = document.createElement('div');
      label.className = 'tile-label';
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      label.append(swatch, LABELS[type]);
      const value = document.createElement('div');
      value.className = 'tile-value';
      value.id = `tile-value-${type}`;
      const peak = document.createElement('div');
      peak.className = 'tile-peak';
      peak.id = `tile-peak-${type}`;
      tile.append(label, value, peak);
      $('tiles').appendChild(tile);
    });
  }

  function renderTiles(series) {
    series.forEach((s) => {
      const total = s.counts.reduce((sum, count) => sum + count, 0);
      $(`tile-value-${s.type}`).textContent = `${total.toLocaleString('ko-KR')}건`;
      $(`tile-peak-${s.type}`).textContent = s.peak.hours.length
        ? `가장 많은 시간 ${Analysis.formatPeak(s.peak)}`
        : '기록 없음';
    });
  }

  function renderChart() {
    if (state.series.some((s) => s.peak.max > 0)) {
      HourChart.render($('chart'), $('tooltip'), state.series);
    }
  }

  function renderTable(series) {
    const body = $('hour-table-body');
    const rows = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const row = document.createElement('tr');
      const head = document.createElement('th');
      head.scope = 'row';
      head.textContent = Analysis.formatHour(hour);
      row.appendChild(head);
      series.forEach((s) => {
        const cell = document.createElement('td');
        cell.textContent = s.counts[hour];
        if (s.peak.hours.includes(hour)) cell.className = 'peak-cell';
        row.appendChild(cell);
      });
      rows.push(row);
    }
    body.replaceChildren(...rows);
  }

  function formatDateHeading(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    });
  }

  function renderList(records) {
    const sorted = [...records].sort((a, b) => b.at.localeCompare(a.at));
    const nodes = [];
    let currentDate = null;
    let group = null;

    sorted.slice(0, state.listLimit).forEach((record) => {
      const date = record.at.slice(0, 10);
      if (date !== currentDate) {
        currentDate = date;
        const heading = document.createElement('h3');
        heading.textContent = formatDateHeading(date);
        group = document.createElement('ul');
        nodes.push(heading, group);
      }
      const item = document.createElement('li');
      item.dataset.type = record.type;
      const time = document.createElement('span');
      time.className = 'record-time';
      time.textContent = record.at.slice(11);
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      const label = document.createElement('span');
      label.className = 'record-label';
      label.textContent = LABELS[record.type] ?? record.type;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ghost-button';
      remove.textContent = '삭제';
      remove.setAttribute('aria-label', `${formatMoment(record.at)} ${label.textContent} 삭제`);
      remove.addEventListener('click', () => deleteRecord(record.id));
      item.append(time, swatch, label, remove);
      group.appendChild(item);
    });

    $('record-list').replaceChildren(...nodes);
    $('list-empty').hidden = sorted.length > 0;
    $('list-more').hidden = sorted.length <= state.listLimit;
  }

  function render() {
    const records = Store.all();
    syncRange(records);
    renderPresets();

    const valid = Boolean(state.start && state.end && state.start <= state.end);
    const selected = valid ? Analysis.inRange(records, state.start, state.end) : [];
    const counts = Analysis.hourlyCounts(selected);
    state.series = TYPES.map((type) => ({
      type, label: LABELS[type], counts: counts[type], peak: Analysis.peakHours(counts[type]),
    }));

    $('range-summary').textContent = valid
      ? `${Analysis.daysBetween(state.start, state.end).toLocaleString('ko-KR')}일 동안 ${selected.length.toLocaleString('ko-KR')}건`
      : '시작일과 종료일을 확인해 주세요. 시작일은 종료일보다 늦을 수 없습니다.';

    const hasData = selected.length > 0;
    $('chart-area').hidden = !hasData;
    $('chart-empty').hidden = hasData || !valid;

    renderTiles(state.series);
    renderChart();
    renderTable(state.series);
    renderList(selected);

    if (Store.wasDamaged()) $('storage-warning').hidden = false;
  }

  /* 이벤트 연결 */

  function bind() {
    document.querySelectorAll('[data-record]').forEach((button) => {
      button.addEventListener('click', () => saveRecord(button.dataset.record));
    });
    ['entry-date', 'entry-time'].forEach((id) => {
      $(id).addEventListener('input', () => { state.timeEdited = true; });
    });
    $('entry-now').addEventListener('click', fillNow);
    setInterval(() => { if (!state.timeEdited) fillNow(); }, CLOCK_REFRESH_MS);

    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const { preset } = button.dataset;
        state.preset = preset === 'all' ? 'all' : Number(preset);
        state.listLimit = LIST_STEP;
        render();
      });
    });
    ['range-start', 'range-end'].forEach((id) => {
      $(id).addEventListener('change', () => {
        state.preset = null;
        state.listLimit = LIST_STEP;
        render();
      });
    });

    $('list-more').addEventListener('click', () => {
      state.listLimit += LIST_STEP;
      render();
    });

    // 다른 탭에서 기록이 바뀌면 화면을 맞춘다.
    window.addEventListener('storage', (event) => {
      if (event.key === Store.KEY) render();
    });

    // 설치한 앱은 백그라운드에서 타이머가 멈춘 채 복귀하므로 시각과 조회 기간을 다시 맞춘다.
    function resume() {
      if (document.hidden) return;
      if (!state.timeEdited) fillNow();
      render();
    }
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', (event) => { if (event.persisted) resume(); });

    let chartWidth = 0;
    new ResizeObserver(() => {
      const width = $('chart').clientWidth;
      if (width !== chartWidth) {
        chartWidth = width;
        renderChart();
      }
    }).observe($('chart'));
  }

  buildTiles();
  fillNow();
  bind();
  render();

  // file://에서는 서비스 워커를 쓸 수 없다.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('서비스 워커 등록 실패', error);
    });
    // 기록이 기기에만 있으므로 저장 공간 자동 정리에서 제외해 달라고 요청한다.
    navigator.storage?.persist?.();
  }
})();
