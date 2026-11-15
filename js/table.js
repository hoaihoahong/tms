// Bảng dữ liệu: sắp xếp, kéo giãn độ rộng cột, kéo thả đổi vị trí cột (nhớ lại cho từng người dùng)
import { esc } from './ui.js';

export function createTable({ key, columns, onAction, onRowClick, rowActions, empty = 'Chưa có dữ liệu' }) {
  const LS = 'tms_cols_' + key;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(LS) || '{}'); } catch {}
  const ids = columns.map((c) => c.id);
  let order = (saved.order || []).filter((i) => ids.includes(i)); ids.forEach((i) => { if (!order.includes(i)) order.push(i); });
  const widths = { ...(saved.widths || {}) };
  let sort = saved.sort || null;   // {id, dir}
  let rows = []; let view = [];
  const persist = () => { try { localStorage.setItem(LS, JSON.stringify({ order, widths, sort })); } catch {} };
  const colById = (id) => columns.find((c) => c.id === id);
  const W = (c) => widths[c.id] || c.width || 160;

  const wrap = document.createElement('div'); wrap.className = 'tbl-wrap';
  const sortVal = (c, r) => (c.sort ? c.sort(r) : c.text ? c.text(r) : '');
  const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number') ? a - b : String(a ?? '').localeCompare(String(b ?? ''), 'vi', { numeric: true });

  function compute() {
    view = [...rows];
    if (sort) { const c = colById(sort.id); if (c) view.sort((a, b) => cmp(sortVal(c, a), sortVal(c, b)) * (sort.dir === 'desc' ? -1 : 1)); }
  }

  function render() {
    compute();
    const cols = order.map(colById);
    const hasAct = !!rowActions;
    const total = 56 + cols.reduce((s, c) => s + W(c), 0) + (hasAct ? 130 : 0);
    let h = `<table class="dt" style="width:max(100%,${total}px)"><colgroup><col style="width:56px">${cols.map((c) => `<col data-c="${c.id}" style="width:${W(c)}px">`).join('')}${hasAct ? '<col style="width:130px">' : ''}</colgroup><thead><tr><th class="idx" style="cursor:default">STT</th>`;
    cols.forEach((c) => {
      const s = sort && sort.id === c.id ? `<span class="sort">${sort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
      h += `<th draggable="true" data-c="${c.id}" title="Bấm để sắp xếp · Kéo để đổi vị trí cột · Kéo mép phải để chỉnh độ rộng">${esc(c.label)}${s}<span class="rs"></span></th>`;
    });
    if (hasAct) h += '<th style="cursor:default"></th>';
    h += '</tr></thead><tbody>';
    if (!view.length) h += `<tr><td colspan="${cols.length + 1 + (hasAct ? 1 : 0)}" class="empty">${esc(empty)}</td></tr>`;
    view.forEach((r, i) => {
      h += `<tr data-i="${i}" ${onRowClick ? 'style="cursor:pointer"' : ''}><td class="idx">${i + 1}</td>`;
      cols.forEach((c) => { h += `<td class="${c.cls || ''}" title="${c.text ? esc(c.text(r)) : ''}">${c.render ? c.render(r, i) : esc(c.text(r))}</td>`; });
      if (hasAct) h += `<td class="act">${rowActions(r)}</td>`;
      h += '</tr>';
    });
    wrap.innerHTML = h + '</tbody></table>';
    bind();
  }

  function bind() {
    const table = wrap.querySelector('table');
    let didDrag = false;
    wrap.querySelectorAll('thead th[data-c]').forEach((th) => {
      const id = th.dataset.c;
      th.addEventListener('click', () => {
        if (didDrag) { didDrag = false; return; }
        sort = !sort || sort.id !== id ? { id, dir: 'asc' } : sort.dir === 'asc' ? { id, dir: 'desc' } : null;
        persist(); render();
      });
      th.addEventListener('dragstart', (e) => { didDrag = true; th.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; });
      th.addEventListener('dragend', () => { th.classList.remove('dragging'); wrap.querySelectorAll('.dragover').forEach((x) => x.classList.remove('dragover')); setTimeout(() => (didDrag = false), 50); });
      th.addEventListener('dragover', (e) => { e.preventDefault(); th.classList.add('dragover'); });
      th.addEventListener('dragleave', () => th.classList.remove('dragover'));
      th.addEventListener('drop', (e) => {
        e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); if (!from || from === id) return;
        order.splice(order.indexOf(from), 1); order.splice(order.indexOf(id), 0, from); persist(); render();
      });
      const rs = th.querySelector('.rs');
      rs.addEventListener('click', (e) => e.stopPropagation());
      rs.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); th.draggable = false; rs.classList.add('on');
        rs.setPointerCapture(e.pointerId);
        const startX = e.clientX, start = widths[id] || colById(id).width || 160;
        const col = table.querySelector(`col[data-c="${id}"]`);
        const mv = (ev) => { const w = Math.max(60, Math.round(start + ev.clientX - startX)); widths[id] = w; col.style.width = w + 'px'; };
        const up = () => { rs.removeEventListener('pointermove', mv); rs.removeEventListener('pointerup', up); rs.classList.remove('on'); th.draggable = true; persist(); didDrag = true; setTimeout(() => (didDrag = false), 60); };
        rs.addEventListener('pointermove', mv); rs.addEventListener('pointerup', up);
      });
      rs.addEventListener('dblclick', (e) => { e.stopPropagation(); delete widths[id]; persist(); render(); });
    });
    wrap.querySelectorAll('tbody tr[data-i]').forEach((tr) => {
      const row = view[+tr.dataset.i];
      tr.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (b) { e.stopPropagation(); onAction?.(b.dataset.act, row, b); return; }
        onRowClick?.(row);
      });
    });
  }

  render();
  return {
    el: wrap,
    setRows(r) { rows = r; render(); },
    getRows: () => view,
    getColumns: () => order.map(colById).map((c) => ({ id: c.id, label: c.label, text: c.text, width: W(c), align: c.align })),
    resetLayout() { order = [...ids]; Object.keys(widths).forEach((k) => delete widths[k]); sort = null; persist(); render(); },
  };
}
