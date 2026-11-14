/* ============================================================
   质元科技 Matterium · 官网 v3 交互层
   晶格粒子场 / 滚动显现 / 视差 / 时间线进度 / 计数动画
   导航 scrollspy / 早期体验弹窗 / 复制反馈 / 减少动效适配
   ============================================================ */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 入口仪式：动态 logo gate ---------- */
  var GATE_ENABLED = true; // 置 false 即回到直出完整首屏方案
  var gate = $("#gate");
  if (gate) {
    var gateSeen = false;
    try { gateSeen = sessionStorage.getItem("matterium_gate_seen") === "1"; } catch (e) {}
    if (!GATE_ENABLED || reduced || gateSeen) {
      gate.remove();
    } else {
      document.body.classList.add("gated");
      gate.focus({ preventScroll: true });
      var gateRevealed = false;
      var reveal = function () {
        if (gateRevealed) return;
        gateRevealed = true;
        document.body.classList.remove("gated");
        gate.classList.add("leave");
        try { sessionStorage.setItem("matterium_gate_seen", "1"); } catch (e) {}
        setTimeout(function () { if (gate.parentNode) gate.remove(); }, 1000);
      };
      gate.addEventListener("click", reveal);
      gate.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(); }
      });
      $(".gate-skip", gate).addEventListener("click", function (e) { e.stopPropagation(); reveal(); });
      window.addEventListener("wheel", reveal, { passive: true, once: true });
      window.addEventListener("touchmove", reveal, { passive: true, once: true });
      document.addEventListener("keydown", function (e) {
        if (gateRevealed || e.key !== "Tab") return;
        e.preventDefault();
        var skip = $(".gate-skip", gate);
        (document.activeElement === skip ? gate : skip).focus();
      });
    }
  }

  /* ---------- 顶栏状态 & 回到顶部 ---------- */
  var topbar = $("#topbar"), totop = $("#totop");
  function onScrollChrome() {
    var y = window.scrollY || 0;
    topbar.classList.toggle("scrolled", y > 10);
    totop.classList.toggle("show", y > 600);
  }
  totop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  /* ---------- 移动端菜单 ---------- */
  var menuBtn = $("#menu-btn"), topnav = $("#topnav");
  function closeMenu() {
    topnav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", function () {
    var open = topnav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("#topnav a").forEach(function (a) { a.addEventListener("click", closeMenu); });
  window.addEventListener("resize", function () { if (window.innerWidth > 960) closeMenu(); });

  /* ---------- 导航 scrollspy ---------- */
  var spyLinks = $$("[data-spy]");
  var spyMap = {};
  spyLinks.forEach(function (a) { spyMap[a.getAttribute("href").slice(1)] = a; });
  var spyIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        spyLinks.forEach(function (a) { a.classList.remove("active"); });
        var link = spyMap[en.target.id];
        if (link) link.classList.add("active");
      }
    });
  }, { rootMargin: "-38% 0px -55% 0px" });
  ["why", "answer", "product", "facts", "about", "contact"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) spyIO.observe(el);
  });

  /* ---------- 滚动显现 ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  $$("[data-reveal]").forEach(function (el) {
    if (reduced) { el.classList.add("in"); } else { revealIO.observe(el); }
  });

  /* 入场动画结束后释放 transform，供视差接管 */
  $$("[data-entrance]").forEach(function (el) {
    el.addEventListener("animationend", function () {
      el.style.animation = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
    }, { once: true });
  });

  /* ---------- 计数动画 ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var prefix = el.getAttribute("data-prefix") || "";
    if (reduced) { el.textContent = prefix + target; return; }
    var t0 = null, dur = 1400;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(2, -10 * p);
      el.textContent = prefix + Math.round(target * (p === 1 ? 1 : e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { animateCount(en.target); countIO.unobserve(en.target); }
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(function (el) { countIO.observe(el); });

  /* ---------- 时间线进度 ---------- */
  var timeline = $("#timeline"), tlProgress = $("#tl-progress");
  var tlRows = $$(".tl-row");
  function updateTimeline() {
    if (!timeline) return;
    var r = timeline.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = Math.min(Math.max((vh * 0.72 - r.top) / r.height, 0), 1);
    tlProgress.style.height = (p * 100).toFixed(2) + "%";
    tlRows.forEach(function (row) {
      var dotY = row.getBoundingClientRect().top + 26 - r.top;
      row.classList.toggle("lit", p * r.height >= dotY);
    });
  }

  /* ---------- 首屏视差 ---------- */
  var hero = $(".hero"), canvas = $("#lattice"), aurora = $(".hero-aurora"), instrument = $(".mc-panel");
  function updateParallax() {
    if (reduced || !hero) return;
    var y = window.scrollY || 0;
    if (y < hero.offsetHeight + 100) {
      canvas.style.transform = "translateY(" + (y * 0.14).toFixed(1) + "px)";
      aurora.style.transform = "translateY(" + (y * 0.08).toFixed(1) + "px)";
      if (instrument) instrument.style.transform = "translateY(" + (y * -0.04).toFixed(1) + "px)";
    }
  }

  /* ---------- 滚动统一调度 ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollChrome();
      updateTimeline();
      updateParallax();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 晶格粒子场 ---------- */
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1, nodes = [], bonds = [], pulses = [];
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var heroVisible = true, running = false, t = 0;
  var COLORS = ["53,196,255", "47,157,255", "232,163,61", "61,220,151"];

  function buildField() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    nodes = []; bonds = [];
    var gap = W < 720 ? 96 : 110;
    var cols = Math.ceil(W / gap) + 2, rows = Math.ceil(H / gap) + 2;
    for (var ry = 0; ry < rows; ry++) {
      for (var cx = 0; cx < cols; cx++) {
        var jx = (Math.random() - 0.5) * gap * 0.5;
        var jy = (Math.random() - 0.5) * gap * 0.5;
        nodes.push({
          ox: cx * gap - gap / 2 + (ry % 2 ? gap / 2 : 0) + jx,
          oy: ry * gap - gap / 2 + jy,
          x: 0, y: 0,
          ph: Math.random() * Math.PI * 2,
          depth: 0.4 + Math.random() * 0.6,
          c: COLORS[Math.random() < 0.72 ? (Math.random() < 0.6 ? 0 : 1) : (Math.random() < 0.5 ? 2 : 3)],
          r: 1.2 + Math.random() * 1.8
        });
      }
    }
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].ox - nodes[j].ox, dy = nodes[i].oy - nodes[j].oy;
        if (dx * dx + dy * dy < gap * gap * 1.5) bonds.push([i, j]);
      }
    }
  }

  function spawnPulse() {
    if (!bonds.length) return;
    var b = bonds[(Math.random() * bonds.length) | 0];
    pulses.push({ b: b, p: 0, c: COLORS[(Math.random() * COLORS.length) | 0] });
  }

  function drawField() {
    ctx.clearRect(0, 0, W, H);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    var i, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.x = n.ox + Math.sin(t * 0.6 + n.ph) * 7 + pointer.x * 26 * n.depth;
      n.y = n.oy + Math.cos(t * 0.5 + n.ph) * 7 + pointer.y * 18 * n.depth;
    }
    ctx.lineWidth = 1;
    for (i = 0; i < bonds.length; i++) {
      var a = nodes[bonds[i][0]], b = nodes[bonds[i][1]];
      ctx.strokeStyle = "rgba(53,196,255," + (0.05 + 0.05 * Math.sin(t + i)).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      ctx.fillStyle = "rgba(" + n.c + "," + (0.35 + 0.3 * n.depth).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
    }
    for (i = pulses.length - 1; i >= 0; i--) {
      var pu = pulses[i];
      pu.p += 0.012;
      if (pu.p >= 1) { pulses.splice(i, 1); continue; }
      var pa = nodes[pu.b[0]], pb = nodes[pu.b[1]];
      var px = pa.x + (pb.x - pa.x) * pu.p, py = pa.y + (pb.y - pa.y) * pu.p;
      ctx.fillStyle = "rgba(" + pu.c + ",.9)";
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.2832); ctx.fill();
    }
  }

  function loop() {
    if (!running) return;
    t += 0.016;
    if (Math.random() < 0.02) spawnPulse();
    drawField();
    requestAnimationFrame(loop);
  }
  function startField() {
    if (running || reduced) return;
    running = true; requestAnimationFrame(loop);
  }
  function stopField() { running = false; }

  buildField();
  if (reduced) { drawField(); } else { startField(); }

  new IntersectionObserver(function (entries) {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible && !document.hidden) startField(); else stopField();
  }, { threshold: 0.02 }).observe(hero);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopField(); else if (heroVisible) startField();
  });

  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  hero.addEventListener("pointerleave", function () { pointer.tx = 0; pointer.ty = 0; });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { buildField(); if (reduced) drawField(); }, 200);
  });

  /* ---------- Toast ---------- */
  var toast = $("#toast"), toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  /* ---------- 复制邮箱 ---------- */
  $$(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() { showToast("邮箱已复制：" + text); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ---------- 浮动联系 ---------- */
  var fab = $("#fab"), fabPop = $("#fab-pop");
  function closeFab() {
    fabPop.hidden = true;
    fab.setAttribute("aria-expanded", "false");
  }
  fab.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = fabPop.hidden;
    fabPop.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function (e) {
    if (!fabPop.hidden && !fabPop.contains(e.target) && !fab.contains(e.target)) closeFab();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !fabPop.hidden) closeFab();
  });

  /* ---------- 早期体验弹窗 ---------- */
  var modal = $("#early-modal"), panel = $(".modal-panel", modal);
  var formView = $("#early-form-view"), successView = $("#early-success-view");
  var form = $("#early-form"), formErr = $("#form-err"), successMsg = $("#success-msg");
  var lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    formView.hidden = false; successView.hidden = true;
    formErr.hidden = true;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("input", form).focus(); }, 60);
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-open-early]").forEach(function (b) {
    b.addEventListener("click", function () { closeFab(); openModal(); });
  });
  $$("[data-close]", modal).forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      var focusables = $$("button, input, select, a[href]", panel).filter(function (el) { return !el.hidden && el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var org = form.org.value.trim();
    var interest = form.interest.value;
    if (!name) { formErr.textContent = "请填写姓名。"; formErr.hidden = false; form.name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { formErr.textContent = "邮箱格式不正确，请检查后重试。"; formErr.hidden = false; form.email.focus(); return; }
    formErr.hidden = true;
    try {
      var key = "matterium_early_access";
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push({ name: name, email: email, org: org, interest: interest, ts: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) { /* 隐私模式下静默降级 */ }
    successMsg.textContent = "服务开放时，通知将发送到 " + email + "。";
    formView.hidden = true; successView.hidden = false;
    form.reset();
    showToast("申请已提交");
  });

  /* ---------- 画廊灯箱 ---------- */
  var lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
  var lbItems = $$("[data-lightbox]").map(function (fig) {
    var img = $("img", fig);
    var fc = $("figcaption", fig), bb = $("b", fc);
    var cap = bb ? bb.textContent + " · " + fc.textContent.slice(bb.textContent.length).trim() : fc.textContent.trim();
    return { src: img.getAttribute("src"), alt: img.getAttribute("alt") || "", cap: cap };
  });
  var lbIdx = 0, lbLastFocus = null;
  /* 灯箱不放大超过原生分辨率，避免模糊 */
  function lbFit() {
    var nw = lbImg.naturalWidth;
    if (nw) lbImg.style.maxWidth = Math.min(1080, nw) + "px";
  }
  lbImg.addEventListener("load", lbFit);
  function lbShow(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    lbImg.src = lbItems[lbIdx].src;
    lbImg.alt = lbItems[lbIdx].alt;
    lbCap.textContent = (lbIdx + 1) + " / " + lbItems.length + " · " + lbItems[lbIdx].cap;
    if (lbImg.complete) lbFit();
  }
  function lbOpen(i) {
    lbLastFocus = document.activeElement;
    lbShow(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $(".lb-x", lb).focus();
  }
  function lbClose() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lbLastFocus) lbLastFocus.focus();
  }
  $$("[data-lightbox]").forEach(function (fig) {
    fig.addEventListener("click", function () { lbOpen(parseInt(fig.getAttribute("data-lightbox"), 10)); });
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lbOpen(parseInt(fig.getAttribute("data-lightbox"), 10)); }
    });
  });
  $$("[data-lb-close]", lb).forEach(function (el) { el.addEventListener("click", lbClose); });
  $(".lb-prev", lb).addEventListener("click", function () { lbShow(lbIdx - 1); });
  $(".lb-next", lb).addEventListener("click", function () { lbShow(lbIdx + 1); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") lbClose();
    if (e.key === "ArrowLeft") lbShow(lbIdx - 1);
    if (e.key === "ArrowRight") lbShow(lbIdx + 1);
  });
})();