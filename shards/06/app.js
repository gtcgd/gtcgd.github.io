/* procurement-library 静态发布版前端（只读：搜索 + 下载 PDF）
 * 数据来自同目录 index.json，PDF 相对路径引用 pdfs/ 目录。
 */
(() => {
  "use strict";

  const STATE = {
    index: null,
    filter: { mode: "jdOrderNo", query: "", batch: "", todayOnly: false },
  };

  let ql = "";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const MODE_PLACEHOLDER = {
    jdOrderNo: "输入京东单号（支持前缀）",
    gtOrderNo: "输入国铁单号（16位数字）",
  };

  // ===== 数据加载 =====
  async function loadIndex() {
    try {
      const res = await fetch("index.json?_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      STATE.index = await res.json();
      renderBatchOptions();
      renderStats();
      renderResults();
    } catch (e) {
      console.error(e);
      $("#empty").textContent = "无法加载数据，请联系管理员。";
      $("#empty").classList.add("show");
    }
  }

  // ===== 渲染 =====
  function renderBatchOptions() {
    const sel = $("#batch-filter");
    const current = sel.value;
    sel.innerHTML = '<option value="">全部批次</option>';
    for (const b of STATE.index.batches || []) {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `${b.id}（${b.count} 单）`;
      sel.appendChild(opt);
    }
    sel.value = current;
  }

  function renderStats() {
    const t = STATE.index.totals || {};
    $("#total-count").textContent = t.orders || 0;
    $("#batch-count").textContent = t.batches || 0;
    $("#index-time").textContent =
      "数据更新于 " + formatTime(STATE.index.generatedAt);
  }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function escapeHTML(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlight(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const idx = safe.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return safe;
    return (
      safe.substring(0, idx) +
      "<mark>" +
      safe.substring(idx, idx + query.length) +
      "</mark>" +
      safe.substring(idx + query.length)
    );
  }

  function matchOrder(o, mode, q) {
    if (!q) return false; // 未输入订单号前不显示任何采购单
    ql = q.toLowerCase();
    const fields = {
      jdOrderNo: [o.jdOrderNo],
      gtOrderNo: [o.gtOrderNo],
    };
    return (fields[mode] || []).some(
      (v) => v && String(v).toLowerCase().includes(ql)
    );
  }

  function renderResults() {
    if (!STATE.index) return;
    const { mode, query, batch, todayOnly } = STATE.filter;
    const q = query.trim();
    const today = new Date().toISOString().substring(0, 10);

    const orders = (STATE.index.orders || []).filter((o) => {
      if (batch && o.batch !== batch) return false;
      if (todayOnly && (o.batch || "").split("/")[0] !== today) return false;
      return matchOrder(o, mode, q);
    });

    const body = $("#results-body");
    body.innerHTML = "";
    orders.forEach((o, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="idx">${i + 1}</td>
        <td><strong>${highlight(o.jdOrderNo, q)}</strong></td>
        <td><code>${highlight(o.gtOrderNo, q)}</code></td>
        <td>${highlight(o.brand, q)}</td>
        <td>${highlight(o.recipient, q)}</td>
        <td><code>${escapeHTML(o.batch)}</code></td>
        <td>${o.pageCount ?? "-"}</td>
        <td class="muted">${formatTime(o.exportedAt)}</td>
        <td><a class="download-btn" href="${escapeHTML(
          o.pdf
        )}" download="${escapeHTML(o.jdOrderNo)}.pdf">下载 PDF</a></td>
      `;
      body.appendChild(tr);
    });

    $("#result-count").textContent = orders.length;
    const emptyMsg = !q
      ? "请输入京东单号或国铁单号进行检索"
      : "无匹配结果";
    $("#empty").textContent = orders.length === 0 ? emptyMsg : "";
    $("#empty").classList.toggle("show", orders.length === 0);
  }

  // ===== 事件 =====
  function bindEvents() {
    $$('input[name="mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        STATE.filter.mode = e.target.value;
        STATE.filter.query = "";
        $("#query").value = "";
        $("#query").placeholder =
          MODE_PLACEHOLDER[STATE.filter.mode] || MODE_PLACEHOLDER.jdOrderNo;
        renderResults();
      });
    });

    $("#query").addEventListener("input", (e) => {
      STATE.filter.query = e.target.value;
      renderResults();
    });
    $("#query").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        renderResults();
      }
    });
    $("#search-btn").addEventListener("click", renderResults);

    $("#reset-btn").addEventListener("click", () => {
      STATE.filter = { mode: "jdOrderNo", query: "", batch: "", todayOnly: false };
      $("#query").value = "";
      $('input[name="mode"][value="jdOrderNo"]').checked = true;
      $("#batch-filter").value = "";
      $("#today-only").checked = false;
      $("#query").placeholder = MODE_PLACEHOLDER.jdOrderNo;
      renderResults();
    });

    $("#batch-filter").addEventListener("change", (e) => {
      STATE.filter.batch = e.target.value;
      renderResults();
    });
    $("#today-only").addEventListener("change", (e) => {
      STATE.filter.todayOnly = e.target.checked;
      renderResults();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadIndex();
  });
})();
