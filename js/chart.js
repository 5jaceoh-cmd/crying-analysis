// 유형별 행을 0~24시 축 하나로 정렬해 그리는 SVG 차트.
// 색과 글꼴은 style.css의 토큰을 따르므로 다크 모드에서 다시 그릴 필요가 없다.
const HourChart = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MARGIN = { top: 4, right: 8, bottom: 24, left: 30 };
  const TITLE_H = 18;
  const HEADROOM = 14; // 피크 값 라벨 자리
  const PLOT_H = 70;
  const ROW_GAP = 14;
  const MAX_BAR_W = 24;
  const BAR_GAP = 2;
  const MAX_PEAK_LABELS = 3;
  const X_TICKS = [0, 6, 12, 18, 24];

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  function axisMax(max) {
    let base = 1;
    while (base < 1e6) {
      for (const step of [base, base * 2, base * 5]) {
        if (Math.ceil(max / step) <= 2) return { top: Math.max(step, Math.ceil(max / step) * step), step };
      }
      base *= 10;
    }
    return { top: max, step: max };
  }

  function barPath(x, top, width, base) {
    const r = Math.min(4, width / 2, base - top);
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}`
      + `H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${base}Z`;
  }

  function fillTooltip(tooltip, hour, series) {
    const heading = document.createElement('div');
    heading.className = 'tooltip-title';
    heading.textContent = Analysis.formatHour(hour);
    const rows = series.map((s) => {
      const row = document.createElement('div');
      row.className = 'tooltip-row';
      row.dataset.type = s.type;
      const key = document.createElement('span');
      key.className = 'line-key';
      const value = document.createElement('strong');
      value.textContent = `${s.counts[hour]}건`;
      const label = document.createElement('span');
      label.textContent = s.label;
      row.append(key, value, label);
      return row;
    });
    tooltip.replaceChildren(heading, ...rows);
  }

  // series: [{ type, label, counts, peak }]
  function render(root, tooltip, series) {
    const width = root.clientWidth;
    if (width === 0) return;
    const rowH = TITLE_H + HEADROOM + PLOT_H;
    const height = MARGIN.top + series.length * rowH + (series.length - 1) * ROW_GAP + MARGIN.bottom;
    const plotW = width - MARGIN.left - MARGIN.right;
    const band = plotW / 24;
    const barW = Math.min(MAX_BAR_W, band - BAR_GAP);
    const { top: yTop, step } = axisMax(Math.max(...series.map((s) => s.peak.max)));
    const xAt = (hour) => MARGIN.left + band * hour;
    const plotBottom = height - MARGIN.bottom;

    const svg = svgEl('svg', {
      width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: 0,
      'aria-label': '시간대별 발생 건수 차트. 좌우 화살표로 시간대를 옮길 수 있습니다. 아래 표에서도 같은 값을 볼 수 있습니다.',
    });

    X_TICKS.forEach((hour) => {
      svgEl('line', {
        class: 'grid', x1: xAt(hour), x2: xAt(hour), y1: MARGIN.top, y2: plotBottom,
      }, svg);
      const label = svgEl('text', {
        class: 'axis-label', x: xAt(hour), y: height - 6,
        'text-anchor': hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle',
      }, svg);
      label.textContent = `${hour}시`;
    });

    const highlight = svgEl('rect', {
      class: 'hour-band', y: MARGIN.top, width: band, height: plotBottom - MARGIN.top, visibility: 'hidden',
    }, svg);

    series.forEach((s, index) => {
      const rowTop = MARGIN.top + index * (rowH + ROW_GAP);
      const base = rowTop + rowH;
      const yAt = (value) => base - (value / yTop) * PLOT_H;
      const row = svgEl('g', {}, svg);
      row.dataset.type = s.type;

      svgEl('rect', { class: 'row-swatch', x: MARGIN.left, y: rowTop + 3, width: 10, height: 10, rx: 2 }, row);
      const title = svgEl('text', { class: 'row-title', x: MARGIN.left + 15, y: rowTop + 13 }, row);
      title.textContent = s.label;

      for (let value = 0; value <= yTop; value += step) {
        if (value > 0) {
          svgEl('line', { class: 'grid', x1: MARGIN.left, x2: width - MARGIN.right, y1: yAt(value), y2: yAt(value) }, row);
        }
        const tick = svgEl('text', {
          class: 'axis-label', x: MARGIN.left - 6, y: yAt(value) + 4, 'text-anchor': 'end',
        }, row);
        tick.textContent = value;
      }

      s.counts.forEach((count, hour) => {
        if (count === 0) return;
        const x = xAt(hour) + (band - barW) / 2;
        svgEl('path', { class: 'bar', d: barPath(x, yAt(count), barW, base) }, row);
      });

      if (s.peak.hours.length <= MAX_PEAK_LABELS) {
        s.peak.hours.forEach((hour) => {
          const label = svgEl('text', {
            class: 'peak-label', x: xAt(hour) + band / 2, y: yAt(s.peak.max) - 4, 'text-anchor': 'middle',
          }, row);
          label.textContent = s.peak.max;
        });
      }

      svgEl('line', { class: 'baseline', x1: MARGIN.left, x2: width - MARGIN.right, y1: base, y2: base }, row);
    });

    let activeHour = null;

    function show(hour, pointerY) {
      activeHour = hour;
      highlight.setAttribute('x', xAt(hour));
      highlight.setAttribute('visibility', 'visible');
      fillTooltip(tooltip, hour, series);
      tooltip.hidden = false;
      const gap = 10;
      const tipW = tooltip.offsetWidth;
      const tipH = tooltip.offsetHeight;
      const right = xAt(hour + 1) + gap;
      const left = right + tipW <= width ? right : Math.max(0, xAt(hour) - gap - tipW);
      const top = Math.min(Math.max(0, pointerY - tipH / 2), height - tipH);
      tooltip.style.transform = `translate(${left}px, ${top}px)`;
    }

    function hide() {
      activeHour = null;
      highlight.setAttribute('visibility', 'hidden');
      tooltip.hidden = true;
    }

    function hourFromEvent(event) {
      const x = event.clientX - svg.getBoundingClientRect().left;
      return Math.min(23, Math.max(0, Math.floor((x - MARGIN.left) / band)));
    }

    function onPointer(event) {
      show(hourFromEvent(event), event.clientY - svg.getBoundingClientRect().top);
    }

    svg.addEventListener('pointermove', onPointer);
    svg.addEventListener('pointerdown', onPointer);
    svg.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') hide();
    });
    svg.addEventListener('focus', () => {
      if (svg.matches(':focus-visible')) show(activeHour ?? 12, height / 2);
    });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (event) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1 };
      if (event.key === 'Escape') {
        hide();
      } else if (moves[event.key]) {
        event.preventDefault();
        show(((activeHour ?? 12) + moves[event.key] + 24) % 24, height / 2);
      }
    });

    tooltip.hidden = true;
    root.replaceChildren(svg);
  }

  return { render };
})();
