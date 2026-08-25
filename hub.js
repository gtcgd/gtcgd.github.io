/* 总检索 hub 前端：聚合所有分片的订单索引(shards.json),
 * 跨全库按单号检索,点击后跳转到对应分片的 PDF。
 * 不依赖跨域 fetch(分片 URL 与订单索引内嵌在 shards.json 中),
 * 打开 PDF 用 window 导航(_blank),规避 CORS。
 */
(() => {
  "use strict";

  const STATE = {
    shards: [],
    index: null,
    filter: { mode: "jdOrderNo", query: "" },
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const MODE_PLACEHOLDER = {
    jdOrderNo: "输入京东单号（支持前缀）",
    gtOrderNo: "输入国铁单号（16位数字）",
  };

  function escapeHTML(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlight(text, q) {
    const safe = escapeHTML(text);
    if (!q) return safe;
    const i = safe.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return safe;
    return (
      safe.substring(0, i) +
      "<mark>" +
      safe.substring(i, i + q.length) +
      "</mark>" +
      safe.substring(i + q.length)
    );
  }

  async function load() {
    try {
      const res = await fetch("shards.json?_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const obj = await res.json();
      STATE.shards = obj.shards || [];
      STATE.index = STATE.shards.flatMap((s) =>
        (s.orders || []).map((o) => ({ ...o, _shard: s }))
      );
      $("#total-count").textContent = STATE.index.length;
      $("#shard-info").textContent = `共 ${STATE.shards.length} 个分片`;
      render();
    } catch (e) {
      console.error(e);
      $("#empty").textContent = "无法加载分片数据，请联系管理员。";
      $("#empty").classList.add("show");
    }
  }

  function render() {
    const { mode, query } = STATE.filter;
    const q = query.trim().toLowerCase();
    const body = $("#results-body");
    body.innerHTML = "";

    if (!q) {
      $("#result-count").textContent = 0;
      $("#empty").textContent = "请输入京东单号或国铁单号进行检索";
      $("#empty").classList.add("show");
      return;
    }

    const hits = STATE.index.filter((o) => {
      const v = mode === "gtOrderNo" ? o.gtOrderNo : o.jdOrderNo;
      return v && String(v).toLowerCase().includes(q);
    });

    hits.forEach((o, i) => {
      const shard = o._shard || {};
      const url = (shard.url || "").replace(/\/+$/, "");
      const pdf = (o.pdf || "").replace(/\\/g, "/");
      const tr = document.createElement("tr");
      const openLink = url
        ? `<a class="download-btn" href="${escapeHTML(url + "/" + pdf)}" target="_blank" rel="noopener">打开 PDF</a>`
        : `<span class="muted">分片未部署</span>`;
      tr.innerHTML = `
        <td class="idx">${i + 1}</td>
        <td><strong>${highlight(o.jdOrderNo, q)}</strong></td>
        <td><code>${highlight(o.gtOrderNo, q)}</code></td>
        <td>${escapeHTML(shard.name || "-")}</td>
        <td>${openLink}</td>`;
      body.appendChild(tr);
    });

    $("#result-count").textContent = hits.length;
    $("#empty").textContent = hits.length === 0 ? "无匹配结果" : "";
    $("#empty").classList.toggle("show", hits.length === 0);
  }

  function bind() {
    $$('input[name="mode"]').forEach((radio) =>
      radio.addEventListener("change", (e) => {
        STATE.filter.mode = e.target.value;
        STATE.filter.query = "";
        $("#query").value = "";
        $("#query").placeholder = MODE_PLACEHOLDER[STATE.filter.mode];
        render();
      })
    );
    $("#query").addEventListener("input", (e) => {
      STATE.filter.query = e.target.value;
      render();
    });
    $("#query").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    load();
  });
})();
