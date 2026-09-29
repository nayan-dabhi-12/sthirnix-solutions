/* ==========================================================================
   Sthirnix Solutions — Home page (v2)
   GSAP + ScrollTrigger for scroll choreography, Lenis for smooth scroll.
   Every block is isolated in safe() so one failure never breaks the page.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = !!window.gsap;
  var hasST = hasGSAP && !!window.ScrollTrigger;
  if (hasST) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn("[sthirnix] " + name, e); } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function isDesk() { return window.innerWidth >= 900; }
  /* runs fn(dt) every frame, but only while el is near the viewport */
  function loopWhileVisible(el, fn) {
    var on = true, last = performance.now(), raf = 0;
    function tick(t) {
      var dt = Math.min((t - last) / 1000, .05); last = t;
      fn(dt);
      raf = on ? requestAnimationFrame(tick) : 0;
    }
    if ("IntersectionObserver" in window && el) {
      new IntersectionObserver(function (es) {
        on = es[0].isIntersecting;
        if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      }, { rootMargin: "150px" }).observe(el);
    }
    raf = requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- *
   * Smooth scroll (Lenis) wired into ScrollTrigger
   * ---------------------------------------------------------------- */
  var lenis = null;
  safe("lenis", function () {
    if (REDUCED || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1 });
    if (hasST) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  });
  function scrollToTarget(target, offset) {
    if (lenis) lenis.scrollTo(target, { offset: offset || 0, duration: 1.4 });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
    else if (target) target.scrollIntoView({ behavior: "smooth" });
  }
  function scrollVelocity() { return lenis ? lenis.velocity || 0 : 0; }

  /* ---------------------------------------------------------------- *
   * Microsoft tool artwork lives in <template id="logoLib">
   * ---------------------------------------------------------------- */
  var lib = document.getElementById("logoLib");
  function toolArt(label) {
    var art = document.createElement("div");
    art.className = "logo-50";
    if (!lib) return art;
    var src = lib.content.querySelector('[data-label="' + label + '"]');
    if (src) art.innerHTML = src.innerHTML;
    return art;
  }
  function toolLabels() {
    return lib ? $$("[data-label]", lib.content).map(function (n) { return n.getAttribute("data-label"); }) : [];
  }

  /* ---------------------------------------------------------------- *
   * Split helpers
   * ---------------------------------------------------------------- */
  function splitWords(el, cls) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.innerHTML = "";
    return text.split(" ").map(function (w, i, arr) {
      var s = document.createElement("span");
      s.className = cls;
      s.textContent = w;
      el.appendChild(s);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
      return s;
    });
  }
  /* wraps each visual line of a heading in a mask so it can rise into place */
  function splitLines(el) {
    if (el._lines) return el._lines;
    var words = splitWords(el, "wd");
    var lines = [], top = null, cur = null;
    words.forEach(function (w) {
      if (w.offsetTop !== top) { top = w.offsetTop; cur = []; lines.push(cur); }
      cur.push(w);
    });
    el.innerHTML = "";
    el._lines = lines.map(function (ws) {
      var ln = document.createElement("span"); ln.className = "ln";
      var inner = document.createElement("span");
      inner.textContent = ws.map(function (w) { return w.textContent; }).join(" ");
      ln.appendChild(inner); el.appendChild(ln);
      return inner;
    });
    return el._lines;
  }

  /* ---------------------------------------------------------------- *
   * Preloader → hero intro
   * ---------------------------------------------------------------- */
  var introDone = false;
  var introQueue = [];
  function onIntro(fn) { if (introDone) fn(); else introQueue.push(fn); }
  function finishIntro() { introDone = true; introQueue.forEach(function (f) { safe("intro", f); }); introQueue = []; }

  safe("loader", function () {
    var loader = $("#loader");
    if (!loader) { finishIntro(); return; }
    if (!hasGSAP || REDUCED) { loader.remove(); finishIntro(); return; }
    if (lenis) lenis.stop();
    var num = $("#loaderNum"), bar = $("#loaderBar");
    var state = { v: 0 };
    function paint() { num.textContent = Math.round(state.v); bar.style.width = state.v + "%"; }
    /* a short, fixed-length intro: the page is already parsed, images
       below the fold keep loading lazily in the background */
    gsap.to(state, {
      v: 100, duration: .9, ease: "power2.inOut", onUpdate: paint, onComplete: function () {
        var tl = gsap.timeline({ onComplete: function () { loader.remove(); if (lenis) lenis.start(); } });
        tl.to(".loader__core", { opacity: 0, scale: .9, duration: .25, ease: "power2.in" })
          .to(".loader__panel--top", { yPercent: -100, duration: .75, ease: "expo.inOut" }, "-=.05")
          .to(".loader__panel--bottom", { yPercent: 100, duration: .75, ease: "expo.inOut" }, "<")
          .add(finishIntro, "-=.5");
      }
    });
  });

  /* ---------------------------------------------------------------- *
   * Scroll progress bar
   * ---------------------------------------------------------------- */
  safe("progress", function () {
    var bar = $("#progress");
    if (!bar) return;
    function upd() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? window.pageYOffset / max : 0).toFixed(4) + ")";
    }
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  });

  /* ---------------------------------------------------------------- *
   * Header: full-width row at the top → floating pill once you scroll.
     * ---------------------------------------------------------------- */
  safe("header", function () {
    var hd = $("#hd");
    if (!hd) return;
    var lastY = window.pageYOffset;
    function upd() {
      var y = window.pageYOffset;
      hd.classList.toggle("is-pill", y > 40);
      lastY = y;
    }
    window.addEventListener("scroll", upd, { passive: true });
    upd();

    /* hover glide behind nav links */
    var nav = $(".hd__nav"), glide = $(".hd__glide");
    if (nav && glide) {
      $$("a", nav).forEach(function (a) {
        a.addEventListener("mouseenter", function () {
          glide.style.width = a.offsetWidth + "px";
          glide.style.transform = "translateX(" + a.offsetLeft + "px)";
          glide.style.opacity = "1";
        });
      });
      nav.addEventListener("mouseleave", function () { glide.style.opacity = "0"; });
    }

    /* current-section highlight */
    if (hasST) {
      $$(".hd__nav a").forEach(function (a) {
        var sec = $(a.getAttribute("href"));
        if (!sec) return;
        ScrollTrigger.create({
          trigger: sec, start: "top 50%", end: "bottom 50%",
          onToggle: function (self) { a.classList.toggle("is-here", self.isActive); }
        });
      });
    }
  });

  safe("menu", function () {
    var burger = $("#burger"), drawer = $("#drawer");
    if (!burger || !drawer) return;
    function set(open) {
      html.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      drawer.setAttribute("aria-hidden", String(!open));
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    }
    burger.addEventListener("click", function () { set(!html.classList.contains("menu-open")); });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  });

  /* in-page links go through Lenis */
  safe("anchors", function () {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var t = $(id);
        if (!t) return;
        e.preventDefault();
        scrollToTarget(id === "#top" ? 0 : t, -80);
      });
    });
    var up = $("#toTop");
    if (up) up.addEventListener("click", function () { scrollToTarget(0); });
  });

  /* ---------------------------------------------------------------- *
   * Custom cursor + magnetic buttons (desktop pointers only)
   * ---------------------------------------------------------------- */
  safe("cursor", function () {
    if (!FINE || REDUCED) return;
    var cur = $("#cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), txt = $("#cursorText");
    if (!cur) return;
    html.classList.add("has-cursor");
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      txt.style.left = rx + "px"; txt.style.top = ry + "px";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      var lab = e.target.closest("[data-cursor]");
      var link = e.target.closest("a, button, .rail, .mtab, input, select, textarea");
      if (lab && !link) { cur.classList.add("is-label"); cur.classList.remove("is-link"); txt.textContent = lab.getAttribute("data-cursor"); }
      else if (link) { cur.classList.add("is-link"); cur.classList.remove("is-label"); }
      else { cur.classList.remove("is-link", "is-label"); }
    });
  });

  safe("magnetic", function () {
    if (!FINE || REDUCED || !hasGSAP) return;
    $$(".magnetic").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: .6, ease: "elastic.out(1, .4)" });
      var yTo = gsap.quickTo(el, "y", { duration: .6, ease: "elastic.out(1, .4)" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .3);
        yTo((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
    });
  });

  /* ---------------------------------------------------------------- *
   * HERO — intro, rotating keyword, orbit of Microsoft tools
   * ---------------------------------------------------------------- */
  safe("heroIntro", function () {
    if (!hasGSAP || REDUCED) return;
    gsap.set(".hero__title .line > span", { yPercent: 110 });
    gsap.set("[data-hero]", { opacity: 0, y: 24 });
    gsap.set(".orbit__core", { scale: 0 });
    gsap.set(".orbit__guides circle", { opacity: 0 });
    onIntro(function () {
      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(".hero__title .line > span", { yPercent: 0, duration: 1.3, stagger: .09 })
        .to("[data-hero]", { opacity: 1, y: 0, duration: 1, stagger: .08 }, .25)
        .to(".orbit__guides circle", { opacity: 1, duration: 1.2, stagger: .12 }, .2)
        .to(".orbit__core", { scale: 1, duration: 1.2, ease: "back.out(1.6)" }, .3)
        .fromTo(".tool__chip", { scale: 0 }, { scale: 1, duration: .9, stagger: .045, ease: "back.out(2)" }, .45);
    });
  });

  safe("heroSwap", function () {
    var words = $$("#heroSwap b");
    if (!words.length) return;
    words[0].classList.add("is-on");
    if (REDUCED || !hasGSAP || words.length < 2) return;
    /* A single repeating timeline drives every word. Because it runs on
       GSAP's own clock it pauses with the page, so swaps can never pile
       up the way a setInterval did in a background tab. */
    gsap.set(words, { y: 0, yPercent: 115, autoAlpha: 0 });
    gsap.set(words[0], { yPercent: 0, autoAlpha: 1 });
    words.forEach(function (w) { w.classList.remove("is-on"); });
    var tl = gsap.timeline({ repeat: -1, paused: true });
    words.forEach(function (w, i) {
      var nxt = words[(i + 1) % words.length];
      tl.to(w, { yPercent: -115, autoAlpha: 0, duration: .6, ease: "expo.inOut" }, "+=2")
        .fromTo(nxt, { yPercent: 115, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .6, ease: "expo.inOut", immediateRender: false }, "<");
    });
    /* only animate while the headline can actually be seen */
    var started = false, seen = true;
    function sync() { if (started && seen && !document.hidden) tl.play(); else tl.pause(); }
    onIntro(function () { started = true; sync(); });
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; sync(); }).observe($(".hero__title"));
    }
  });

  safe("orbit", function () {
    var orbit = $("#orbit"), outer = $("#ringOuter"), inner = $("#ringInner"), cap = $("#orbitCaption");
    if (!orbit || !outer || !inner) return;
    var labels = toolLabels();
    if (!labels.length) return;
    var innerCount = Math.min(5, Math.floor(labels.length / 2.5));
    var outerLabels = labels.slice(0, labels.length - innerCount);
    var innerLabels = labels.slice(labels.length - innerCount);
    var defaultCap = cap ? cap.textContent : "";

    function make(ring, list) {
      return list.map(function (label, i) {
        var t = document.createElement("div"); t.className = "tool";
        var chip = document.createElement("div"); chip.className = "tool__chip";
        chip.appendChild(toolArt(label));
        var lab = document.createElement("span"); lab.className = "tool__label"; lab.textContent = label;
        t.appendChild(chip); t.appendChild(lab); ring.appendChild(t);
        t.addEventListener("mouseenter", function () { hover = true; if (cap) cap.textContent = label; });
        t.addEventListener("mouseleave", function () { hover = false; if (cap) cap.textContent = defaultCap; });
        return { el: t, base: (360 / list.length) * i };
      });
    }
    var hover = false;
    var outerTools = make(outer, outerLabels);
    var innerTools = make(inner, innerLabels);

    var size = orbit.offsetWidth;
    function measure() { size = orbit.offsetWidth; }
    window.addEventListener("resize", measure);

    var spin = 0;            /* idle + drag rotation (deg) */
    var scrub = 0;           /* rotation contributed by the pinned scroll (deg) */
    var vel = 0;             /* drag velocity */
    var IDLE = REDUCED ? 0 : 7;

    function place(list, radiusRatio, angle) {
      var r = size * radiusRatio;
      for (var i = 0; i < list.length; i++) {
        var a = (list[i].base + angle - 90) * Math.PI / 180;
        list[i].el.style.transform = "translate3d(" + (Math.cos(a) * r).toFixed(2) + "px," + (Math.sin(a) * r).toFixed(2) + "px,0)";
      }
    }
    loopWhileVisible(orbit, function (dt) {
      spin += (IDLE * (hover ? .15 : 1) + vel) * dt;
      vel *= Math.pow(.92, dt * 60);
      var a = spin + scrub;
      place(outerTools, 286 / 600, a);
      place(innerTools, 186 / 600, -a * 1.35);
    });

    /* drag to fling the rings */
    var dragging = false, px = 0;
    orbit.addEventListener("pointerdown", function (e) { dragging = true; px = e.clientX; });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - px; px = e.clientX;
      spin += dx * .35; vel = dx * 6;
    });
    window.addEventListener("pointerup", function () { dragging = false; });

    /* pin the hero until both rings finish one full turn, then release */
    if (hasST && !REDUCED && window.innerWidth >= 980) {
      ScrollTrigger.create({
        trigger: ".hero", start: "top top", end: "+=110%",
        pin: true, scrub: .8, anticipatePin: 1,
        onUpdate: function (self) { scrub = self.progress * 360; }
      });
      gsap.to(".hero__copy", {
        y: -40, opacity: .35, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "+=110%", scrub: true }
      });
      gsap.to(".orbit", {
        scale: 1.06, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "+=110%", scrub: true }
      });
    }
  });

  /* ---------------------------------------------------------------- *
   * Ticker bands — endless, speed follows scroll velocity
   * ---------------------------------------------------------------- */
  safe("ticker", function () {
    var rows = $$(".ticker__row");
    rows.forEach(function (row) {
      var track = $(".ticker__track", row);
      row.appendChild(track.cloneNode(true));
      row.appendChild(track.cloneNode(true));
    });
    if (REDUCED || !rows.length) return;
    var state = rows.map(function (row) { return { tracks: $$(".ticker__track", row), x: 0, w: 1, dir: +row.getAttribute("data-dir") || 1 }; });
    function measure() { state.forEach(function (s) { s.w = s.tracks[0].offsetWidth || 1; }); }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    loopWhileVisible($(".ticker"), function (dt) {
      var v = scrollVelocity();
      var boost = clamp(Math.abs(v) * 1.4, 0, 40);
      var skew = clamp(v * -.35, -8, 8).toFixed(2);
      state.forEach(function (s) {
        s.x -= s.dir * (60 + boost * 18) * dt;
        if (s.x <= -s.w) s.x += s.w;
        if (s.x > 0) s.x -= s.w;
        var tf = "translate3d(" + s.x.toFixed(1) + "px,0,0) skewX(" + skew + "deg)";
        for (var i = 0; i < s.tracks.length; i++) s.tracks[i].style.transform = tf;
      });
    });
  });

  /* ---------------------------------------------------------------- *
   * Section headings: masked line reveal. Generic fade-ups.
   * ---------------------------------------------------------------- */
  function headingReveals() {
    if (!hasST || REDUCED) return;
    $$("[data-split]").forEach(function (el) {
      var lines = splitLines(el);
      gsap.fromTo(lines, { yPercent: 115, rotate: 3 }, {
        yPercent: 0, rotate: 0, duration: 1.2, ease: "expo.out", stagger: .1,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
    $$("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * ABOUT — words light up as you read; odometer stats
   * ---------------------------------------------------------------- */
  safe("aboutWords", function () {
    var p = $("#aboutText");
    if (!p) return;
    var words = splitWords(p, "w");
    if (!hasST || REDUCED) { words.forEach(function (w) { w.classList.add("is-lit"); }); return; }
    ScrollTrigger.create({
      trigger: p, start: "top 82%", end: "bottom 45%", scrub: true,
      onUpdate: function (self) {
        var lit = Math.round(self.progress * words.length);
        for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-lit", i < lit);
      }
    });
  });

  safe("odometer", function () {
    var odos = $$(".odo");
    var LOOPS = 2; /* how many full 0-9 spins before landing */
    odos.forEach(function (odo) {
      var digits = String(odo.getAttribute("data-value")).split("");
      odo.innerHTML = "";
      odo._cols = digits.map(function (d) {
        var col = document.createElement("span"); col.className = "odo__col";
        var html = "";
        for (var l = 0; l < LOOPS; l++) for (var n = 0; n < 10; n++) html += "<span>" + n + "</span>";
        html += "<span>" + d + "</span>";
        col.innerHTML = html;
        odo.appendChild(col);
        col._target = LOOPS * 10;
        return col;
      });
      odo.setAttribute("aria-label", odo.getAttribute("data-value"));
    });

    function land(odo) { odo._cols.forEach(function (c) { c.style.transform = "translateY(-" + (c._target * 1.12) + "em)"; }); }
    function roll(odo, delay) {
      if (!hasGSAP || REDUCED) { land(odo); return; }
      if (odo._busy) return;
      odo._busy = true;
      var n = odo._cols.length;
      odo._cols.forEach(function (col, i) {
        var s = { v: 0 };
        gsap.to(s, {
          v: col._target, duration: 1.4 + (n - i) * .35, delay: (delay || 0) + i * .06, ease: "expo.out",
          onUpdate: function () { col.style.transform = "translateY(-" + (s.v * 1.12).toFixed(3) + "em)"; },
          onComplete: function () { if (i === 0) odo._busy = false; }
        });
      });
    }

    var stats = $("#stats");
    if (!hasST || REDUCED) { odos.forEach(land); if (stats) stats.classList.add("is-in"); return; }
    ScrollTrigger.create({
      trigger: stats, start: "top 85%", once: true,
      onEnter: function () {
        stats.classList.add("is-in");
        odos.forEach(function (o, i) { roll(o, i * .12); });
        gsap.fromTo(".stat", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .1, ease: "expo.out" });
      }
    });
    /* hovering a stat spins the digits again and lands on the real value */
    $$(".stat").forEach(function (stat) {
      var o = $(".odo", stat);
      stat.addEventListener("mouseenter", function () { roll(o); });
    });
  });

  /* ---------------------------------------------------------------- *
   * SOLUTIONS — a Ferris wheel of cards that never stops turning
   * ---------------------------------------------------------------- */
  safe("ferris", function () {
    var wrap = $("#ferris"), stage = $("#ferrisStage"), now = $("#ferrisNow");
    if (!wrap || !stage) return;
    var seats = $$(".seat", stage);
    var n = seats.length, step = 360 / n;
    var R = 300, rot = 0, vel = 0, drag = false, lastX = 0, front = -1;
    var pinned = false, target = 0, base = 0;

    function measure() {
      var w = seats[0].offsetWidth;
      /* neighbouring seats sit roughly one card-width apart with a small gap */
      R = (w * 1.1) / (2 * Math.sin(Math.PI / n));
      stage.style.transform = "translateZ(" + (-R).toFixed(0) + "px) rotateX(-6deg)";
    }
    measure();
    window.addEventListener("resize", measure);

    function paint() {
      var best = 0, bestD = 999;
      for (var i = 0; i < n; i++) {
        var a = i * step - rot;
        var d = Math.abs(((a % 360) + 540) % 360 - 180);
        seats[i].style.transform = "rotateY(" + a.toFixed(2) + "deg) translateZ(" + R.toFixed(0) + "px)";
        seats[i].style.filter = d > 95 ? "brightness(.55)" : "";
        seats[i].style.zIndex = String(200 - Math.round(d));
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best !== front) {
        if (front >= 0) seats[front].classList.remove("is-front");
        seats[best].classList.add("is-front");
        front = best;
        if (now) {
          now.textContent = $("h3", seats[best]).textContent;
          if (hasGSAP && !REDUCED) gsap.fromTo(now, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .45, ease: "expo.out", overwrite: true });
        }
      }
    }

    loopWhileVisible(wrap, function (dt) {
      if (pinned) {
        /* while pinned, scroll position decides which seat faces you */
        rot += (target - rot) * Math.min(1, dt * 7);
      } else if (!drag) {
        var boost = REDUCED ? 0 : clamp(scrollVelocity() * .8, -30, 30);
        rot += ((REDUCED ? 0 : 9) + vel + boost) * dt;
        vel *= Math.pow(.94, dt * 60);
      }
      paint();
    });

    wrap.addEventListener("pointerdown", function (e) { if (!pinned) { drag = true; lastX = e.clientX; vel = 0; } });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      rot -= dx * .25; vel = -dx * 5;
    });
    window.addEventListener("pointerup", function () { drag = false; });

    if (!hasST || REDUCED) return;
    gsap.fromTo(wrap, { opacity: 0, scale: .85 }, {
      opacity: 1, scale: 1, duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: wrap, start: "top 85%", once: true }
    });
    /* pin the section and walk the wheel through every seat:
       each stretch of scroll brings the next card to the front */
    function snapBase() { base = Math.round(rot / step) * step; }
    ScrollTrigger.create({
      trigger: "#solutions", start: "top top",
      end: "+=" + (n * 45) + "%",
      pin: true, anticipatePin: 1,
      onEnter: function () { snapBase(); pinned = true; },
      onEnterBack: function () { pinned = true; },
      onLeave: function () { pinned = false; },
      onLeaveBack: function () { pinned = false; },
      onUpdate: function (self) {
        /* hold briefly on each seat, then glide to the next */
        var x = self.progress * (n - 1), k = Math.floor(x), f = x - k;
        var eased = k + (f < .35 ? 0 : f > .85 ? 1 : (f - .35) / .5);
        target = base + Math.min(eased, n - 1) * step;
      }
    });
  });

  /* ---------------------------------------------------------------- *
   * SERVICES — cards fly one by one: in from the bottom-right,
   * pause flat in the middle, then leave toward the top-left
   * ---------------------------------------------------------------- */
  safe("flight", function () {
    var stage = $("#flightStage");
    if (!stage) return;
    var cards = $$(".svc", stage);
    cards.forEach(function (c) { $(".svc__icon", c).appendChild(toolArt(c.getAttribute("data-tool"))); });
    if (!hasST || REDUCED || !isDesk()) return;

    var no = $("#flightNo"), items = $$("#flightList li"), n = cards.length, shown = -1;
    function pad(v) { return (v < 10 ? "0" : "") + v; }
    function paint(p) {
      var head = p * (n - 1);
      for (var i = 0; i < n; i++) {
        var rel = i - head, abs = Math.abs(rel);
        var x = rel * 250, y = rel * 150;
        var s = clamp(1 - abs * .16, .5, 1);
        var o = rel < 0 ? clamp(1 - abs * 1.1, 0, 1) : clamp(1.25 - abs * .55, 0, 1);
        cards[i].style.transform = "translate(" + x.toFixed(1) + "px, calc(-50% + " + y.toFixed(1) + "px)) perspective(1000px) rotateY(" + (rel * -16).toFixed(2) + "deg) rotate(" + (rel * 7).toFixed(2) + "deg) scale(" + s.toFixed(3) + ")";
        cards[i].style.opacity = o.toFixed(3);
        cards[i].style.zIndex = String(100 - Math.round(abs * 10));
        cards[i].style.pointerEvents = abs < .5 ? "auto" : "none";
      }
      var cur = clamp(Math.round(head), 0, n - 1);
      if (cur !== shown) {
        shown = cur;
        if (no) {
          no.textContent = pad(cur + 1);
          gsap.fromTo(no, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: "expo.out" });
        }
        items.forEach(function (li, i) { li.classList.toggle("is-on", i === cur); });
      }
    }
    paint(0);
    ScrollTrigger.create({
      trigger: "#services", start: "top top", end: "+=" + (n * 55) + "%",
      pin: true, scrub: .9, anticipatePin: 1,
      onUpdate: function (self) { paint(self.progress); }
    });
  });

  /* ---------------------------------------------------------------- *
   * CASE STUDIES — pinned deck: image wipes up with a scan line,
   * copy swaps, metrics count
   * ---------------------------------------------------------------- */
  safe("cases", function () {
    var shots = $$(".shot"), cases = $$(".case"), tabs = $$(".cases__tabs button"), line = $("#caseLine");
    if (!shots.length) return;
    var cur = 0, st = null;

    function moveLine() {
      var t = tabs[cur]; if (!t || !line) return;
      line.style.width = t.offsetWidth + "px";
      line.style.transform = "translateX(" + (t.offsetLeft - 5) + "px)";
    }
    function count(el) {
      var to = parseFloat(el.getAttribute("data-num")), dec = +el.getAttribute("data-dec") || 0;
      var pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "";
      if (!hasGSAP || REDUCED) { el.textContent = pre + to.toFixed(dec) + suf; return; }
      var s = { v: 0 };
      gsap.to(s, { v: to, duration: 1.4, ease: "expo.out", onUpdate: function () { el.textContent = pre + s.v.toFixed(dec) + suf; } });
    }
    function go(i, instant) {
      if (i === cur && !instant) return;
      var prev = cur; cur = i;
      tabs.forEach(function (t, k) { t.classList.toggle("is-on", k === i); });
      moveLine();
      if (!hasGSAP || REDUCED || instant) {
        shots.forEach(function (s, k) { s.style.clipPath = k === i ? "inset(0 0 0 0)" : "inset(100% 0 0 0)"; });
        cases.forEach(function (c, k) { c.style.visibility = k === i ? "visible" : "hidden"; });
        $$("dt", cases[i]).forEach(count);
        return;
      }
      var down = i > prev;
      shots.forEach(function (s) { gsap.killTweensOf(s); s.style.zIndex = 0; });
      shots[prev].style.zIndex = 1; shots[i].style.zIndex = 2;
      gsap.fromTo(shots[i], { clipPath: down ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.inOut" });
      gsap.fromTo($("img", shots[i]), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: "expo.out" });
      gsap.fromTo(".cases__scan", { top: down ? "100%" : "0%", opacity: 1 }, { top: down ? "0%" : "100%", opacity: 0, duration: 1.1, ease: "expo.inOut" });

      var out = cases[prev], inn = cases[i];
      gsap.to(out.children, { y: down ? -30 : 30, opacity: 0, duration: .45, stagger: .04, ease: "power2.in", onComplete: function () { out.style.visibility = "hidden"; } });
      inn.style.visibility = "visible";
      gsap.fromTo(inn.children, { y: down ? 40 : -40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .07, delay: .35, ease: "expo.out" });
      setTimeout(function () { $$("dt", inn).forEach(count); }, 450);
    }

    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () {
        if (st) scrollToTarget(st.start + (st.end - st.start) * ((k + .5) / shots.length));
        else go(k);
      });
    });
    window.addEventListener("resize", moveLine);
    moveLine();
    $$("dt", cases[0]).forEach(function (el) { el.textContent = (el.getAttribute("data-pre") || "") + "0" + (el.getAttribute("data-suf") || ""); });

    if (!hasST || REDUCED) { go(0, true); return; }
    ScrollTrigger.create({ trigger: ".cases__deck", start: "top 75%", once: true, onEnter: function () { $$("dt", cases[0]).forEach(count); } });
    gsap.fromTo(".cases__media", { clipPath: "inset(12% 12% 12% 12% round 28px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none",
      scrollTrigger: { trigger: ".cases", start: "top 90%", end: "top 20%", scrub: true }
    });
    if (isDesk()) {
      st = ScrollTrigger.create({
        trigger: "#cases", start: "top top", end: "+=" + (shots.length * 70) + "%",
        pin: true, anticipatePin: 1,
        onUpdate: function (self) { go(clamp(Math.floor(self.progress * shots.length), 0, shots.length - 1)); }
      });
    }
  });

  /* ---------------------------------------------------------------- *
   * DYNAMICS MODULES — auto-playing tabs, panel tilts under the pointer
   * ---------------------------------------------------------------- */
  safe("modules", function () {
    var body = $("#modBody"), tabs = $$(".mtab"), panels = $$(".mpanel"), panel = $("#mPanel");
    var fill = $("#dialFill"), dialNo = $("#dialNo"), bars = $$(".mtab__bar");
    if (!tabs.length) return;
    var n = tabs.length, cur = -1, st = null, C = 326.7;

    function set(i) {
      if (i === cur) return;
      var prev = cur; cur = i;
      tabs.forEach(function (t, k) { t.classList.toggle("is-on", k === i); t.setAttribute("aria-selected", String(k === i)); });
      if (dialNo) dialNo.textContent = (i + 1) + "/" + n;
      if (!hasGSAP || REDUCED) {
        panels.forEach(function (p, k) { p.classList.toggle("is-on", k === i); });
        return;
      }
      if (prev >= 0) {
        var old = panels[prev], down = i > prev;
        gsap.to(old, { opacity: 0, y: down ? -30 : 30, duration: .35, ease: "power2.in", overwrite: true, onComplete: function () { if (cur !== prev) old.classList.remove("is-on"); } });
      }
      var p = panels[i], dir = prev < 0 || i > prev ? 1 : -1;
      p.classList.add("is-on");
      gsap.fromTo(p, { opacity: 0, y: 40 * dir }, { opacity: 1, y: 0, duration: .7, delay: prev >= 0 ? .25 : 0, ease: "expo.out", overwrite: true });
      gsap.fromTo($$("li", p), { opacity: 0, y: 14, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: .5, stagger: .05, delay: prev >= 0 ? .4 : .15, ease: "back.out(2)", overwrite: true });
      /* keep the active tab in view on the horizontal mobile strip */
      var strip = tabs[i].parentNode;
      if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tabs[i].offsetLeft - 20, behavior: "smooth" });
    }
    /* progress (0..1) fills the dial and the bar under the active tab */
    function progress(p) {
      var x = p * n;
      bars.forEach(function (b, k) { b.style.transform = "scaleX(" + clamp(x - k, 0, 1).toFixed(3) + ")"; });
      if (fill) fill.style.strokeDashoffset = (C * (1 - clamp(p, 0, 1))).toFixed(1);
    }
    set(0); progress(0);

    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () {
        if (st) scrollToTarget(st.start + (st.end - st.start) * ((k + .5) / n));
        else set(k);
      });
    });

    if (panel && FINE && !REDUCED) {
      var glow = $(".mpanel__glow", panel);
      panel.addEventListener("mousemove", function (e) {
        var r = panel.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        panel.style.transform = "perspective(1200px) rotateY(" + (px * 6).toFixed(2) + "deg) rotateX(" + (-py * 6).toFixed(2) + "deg)";
        if (glow) glow.style.transform = "translate(" + (px * 260 - 60).toFixed(0) + "px," + (py * 260 + 120).toFixed(0) + "px)";
      });
      panel.addEventListener("mouseleave", function () { panel.style.transform = ""; });
    }

    if (!hasST || REDUCED) { progress(1 / n); return; }
    gsap.fromTo(".mtab", { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1, stagger: .08, ease: "expo.out", scrollTrigger: { trigger: body, start: "top 85%", once: true } });
    gsap.fromTo(panel, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: body, start: "top 85%", once: true } });
    /* pin the tabs + panel and let scroll step through each module */
    st = ScrollTrigger.create({
      trigger: body,
      start: function () { return body.offsetHeight > window.innerHeight - 110 ? "top 90px" : "center " + Math.round(45 + (window.innerHeight - 45) / 2) + "px"; },
      end: "+=" + (n * 60) + "%",
      pin: true, anticipatePin: 1,
      onUpdate: function (self) {
        set(clamp(Math.floor(self.progress * n), 0, n - 1));
        progress(self.progress);
      }
    });
  });

  /* ---------------------------------------------------------------- *
   * TESTIMONIALS — two belts drifting in opposite directions
   * ---------------------------------------------------------------- */
  safe("voices", function () {
    var star = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
    $$("[data-stars]").forEach(function (s) { s.innerHTML = star + star + star + star + star; });

    var belts = $$(".voices__belt");
    belts.forEach(function (b) { var t = $(".voices__track", b); b.appendChild(t.cloneNode(true)); b.appendChild(t.cloneNode(true)); });
    if (REDUCED) return;
    var state = belts.map(function (b) {
      var s = { tracks: $$(".voices__track", b), x: 0, dir: +b.getAttribute("data-dir") || 1, speed: 1, target: 1 };
      b.addEventListener("mouseenter", function () { s.target = 0; });
      b.addEventListener("mouseleave", function () { s.target = 1; });
      return s;
    });
    function measure() { state.forEach(function (s) { s.w = s.tracks[0].offsetWidth || 1; }); }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    loopWhileVisible($(".voices"), function (dt) {
      state.forEach(function (s) {
        s.speed += (s.target - s.speed) * .08;
        s.x -= s.dir * 45 * s.speed * dt;
        if (s.x <= -s.w) s.x += s.w;
        if (s.x > 0) s.x -= s.w;
        var tf = "translate3d(" + s.x.toFixed(1) + "px,0,0)";
        for (var i = 0; i < s.tracks.length; i++) s.tracks[i].style.transform = tf;
      });
    });

    if (hasST) {
      gsap.fromTo(".voices__belt", { opacity: 0, x: function (i) { return i ? -120 : 120; } }, {
        opacity: 1, x: 0, duration: 1.4, ease: "expo.out", stagger: .15,
        scrollTrigger: { trigger: ".voices__belt", start: "top 88%", once: true }
      });
    }
  });

  /* ---------------------------------------------------------------- *
   * INDUSTRIES — rails expand on hover/click and auto-advance in view
   * ---------------------------------------------------------------- */
  safe("rails", function () {
    var box = $("#rails");
    if (!box) return;
    var rails = $$(".rail", box), n = rails.length, cur = -1, st = null;
    function open(i) {
      if (i === cur) return;
      cur = i;
      rails.forEach(function (r, k) { r.classList.toggle("is-open", k === i); r.setAttribute("aria-expanded", String(k === i)); });
    }
    function progress(p) {
      var x = p * n;
      rails.forEach(function (r, k) { r.style.setProperty("--seg", clamp(x - k, 0, 1).toFixed(3)); });
    }
    open(0);
    rails.forEach(function (r, k) {
      function go() {
        if (st) scrollToTarget(st.start + (st.end - st.start) * ((k + .5) / n));
        else open(k);
      }
      r.addEventListener("click", go);
      r.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });

    if (!hasST || REDUCED) { progress(1); return; }
    gsap.fromTo(rails, { yPercent: 30, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 1.2, stagger: .07, ease: "expo.out",
      scrollTrigger: { trigger: box, start: "top 88%", once: true }
    });
    /* pin the panels; each stretch of scroll opens the next industry */
    st = ScrollTrigger.create({
      trigger: box,
      /* centre the panels in the space below the floating header */
      start: function () { return box.offsetHeight > window.innerHeight - 110 ? "top 90px" : "center " + Math.round(45 + (window.innerHeight - 45) / 2) + "px"; },
      end: "+=" + (n * 55) + "%",
      pin: true, anticipatePin: 1,
      onUpdate: function (self) {
        open(clamp(Math.floor(self.progress * n), 0, n - 1));
        progress(self.progress);
      }
    });
  });

  /* ---------------------------------------------------------------- *
   * PROCESS — the path draws itself and each step lights up
   * ---------------------------------------------------------------- */
  safe("process", function () {
    var track = $("#processTrack"), svg = $(".process__path"), path = $("#processDraw"), base = $("#processBase"), steps = $$(".step");
    if (!path || !steps.length) return;
    var len = 1, prog = 0;

    /* the curve is rebuilt from the real dot positions so it always
       passes through the centre of every step marker */
    function build() {
      var tr = track.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + tr.width + " " + tr.height);
      var pts = steps.map(function (s) {
        var r = $(".step__dot", s).getBoundingClientRect();
        return [r.left - tr.left + r.width / 2, r.top - tr.top + r.height / 2];
      });
      pts.push([tr.width, pts[pts.length - 1][1] - 40]);
      var d = "M" + pts[0][0] + " " + pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        var mx = (pts[i - 1][0] + pts[i][0]) / 2;
        d += " C" + mx + " " + pts[i - 1][1] + " " + mx + " " + pts[i][1] + " " + pts[i][0] + " " + pts[i][1];
      }
      path.setAttribute("d", d); base.setAttribute("d", d);
      len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len * (1 - prog);
    }
    build();
    window.addEventListener("resize", build);
    window.addEventListener("load", build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    if (!hasST || REDUCED) { prog = 1; path.style.strokeDashoffset = 0; steps.forEach(function (s) { s.classList.add("is-lit"); }); return; }
    ScrollTrigger.create({
      trigger: track, start: "top 75%", end: "bottom 55%", scrub: .6,
      onUpdate: function (self) {
        prog = self.progress;
        path.style.strokeDashoffset = len * (1 - prog);
        steps.forEach(function (s, i) { s.classList.toggle("is-lit", prog >= i / steps.length + .02); });
      }
    });
    gsap.fromTo(steps, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: track, start: "top 80%", once: true }, onComplete: build });
  });

  /* ---------------------------------------------------------------- *
   * CONTACT — perks tick in, floating-label form with inline validation
   * ---------------------------------------------------------------- */
  safe("contact", function () {
    var perks = $(".perks");
    if (perks) {
      if (hasST) ScrollTrigger.create({ trigger: perks, start: "top 85%", once: true, onEnter: function () { perks.classList.add("is-in"); } });
      else perks.classList.add("is-in");
    }
    var form = $("#form"), note = $("#formNote"), btn = $("#formBtn");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = [];
      ["fName", "fMail", "fSvc"].forEach(function (id) {
        var f = document.getElementById(id), ok = f.value.trim() !== "" && (f.type !== "email" || /\S+@\S+\.\S+/.test(f.value));
        f.parentNode.classList.toggle("is-bad", !ok);
        if (!ok) bad.push(f);
      });
      if (bad.length) {
        note.textContent = "Please add your name, a valid work email and the service you need.";
        note.classList.add("is-bad");
        bad[0].focus();
        if (hasGSAP) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: "elastic.out(1, .3)" });
        return;
      }
      note.classList.remove("is-bad");
      var lab = $(".btn__label", btn);
      lab.textContent = "Sending…"; lab.setAttribute("data-text", "Sending…"); btn.disabled = true;
      setTimeout(function () {
        lab.textContent = "Message sent"; lab.setAttribute("data-text", "Message sent");
        note.textContent = "Thanks — we’ll reply within one business day.";
        form.reset();
        setTimeout(function () { lab.textContent = "Send message"; lab.setAttribute("data-text", "Send message"); btn.disabled = false; }, 3500);
      }, 1200);
    });
  });

  /* ---------------------------------------------------------------- *
   * FOOTER — the wordmark rises letter by letter
   * ---------------------------------------------------------------- */
  safe("footer", function () {
    var word = $("#ftWord");
    if (!word) return;
    var chars = word.textContent.split("").map(function (c) { return '<span class="ch">' + c + "</span>"; }).join("");
    word.innerHTML = chars;
    if (!hasST || REDUCED) return;
    gsap.fromTo($$(".ch", word), { yPercent: 110, rotate: 12 }, {
      yPercent: 0, rotate: 0, duration: 1.3, stagger: .05, ease: "expo.out",
      scrollTrigger: { trigger: word, start: "top 95%", once: true }
    });
    gsap.fromTo(".ft__top > *", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .08, ease: "expo.out", scrollTrigger: { trigger: ".ft", start: "top 85%", once: true } });
  });

  /* headings need final fonts to measure their lines */
  function afterFonts() {
    safe("headings", headingReveals);
    if (hasST) ScrollTrigger.refresh();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts);
  else window.addEventListener("load", afterFonts);
  window.addEventListener("load", function () { if (hasST) ScrollTrigger.refresh(); });
})();
