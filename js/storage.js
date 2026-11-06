// localStorage 저장소. 탭 사이 충돌을 피하려고 메모리에 캐시하지 않고 매번 읽는다.
const Store = (() => {
  const KEY = 'crying-analysis.records.v1';
  const CORRUPT_KEY = `${KEY}.corrupt`;
  let damaged = false;

  function all() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      return [];
    }
    if (raw === null) return [];
    try {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) return records;
    } catch {
      // 아래에서 원본을 보존한다.
    }
    // 다음 저장이 손상된 원본을 덮어쓰기 전에 복구용으로 남겨 둔다.
    damaged = true;
    try {
      localStorage.setItem(CORRUPT_KEY, raw);
    } catch {
      // 보존에 실패해도 앱은 계속 동작해야 한다.
    }
    return [];
  }

  function write(records) {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  function add(record) {
    return write(all().concat(record));
  }

  function remove(id) {
    const records = all();
    const target = records.find((r) => r.id === id);
    if (!target) return null;
    return write(records.filter((r) => r.id !== id)) ? target : null;
  }

  function wasDamaged() {
    return damaged;
  }

  return { KEY, all, add, remove, wasDamaged };
})();
