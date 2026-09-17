/* ==========================================================================
   DEMO JS — Header + Hero (Infinity: icons travel along figure-8 path)
   ========================================================================== */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia("(hover: none)").matches;

  function each(sel, fn, ctx) {
    Array.prototype.forEach.call((ctx || document).querySelectorAll(sel), fn);
  }

  /* ---------- Header scroll state ---------- */
  (function () {
    var hdr = document.querySelector(".hdr");
    if (!hdr) return;
    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (y > 20) hdr.classList.add("is-scrolled");
      else hdr.classList.remove("is-scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  

  /* ---------- Show header + start hero animations ---------- */
  document.documentElement.classList.add("hero-ready");

  /* ---------- Header nav indicator ---------- */
  (function () {
    var nav = document.querySelector(".hdr__nav");
    var indicator = document.getElementById("hdrIndicator");
    if (!nav || !indicator) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        indicator.style.left = a.offsetLeft + "px";
        indicator.style.width = a.offsetWidth + "px";
        indicator.style.opacity = "1";
      });
    });
    nav.addEventListener("mouseleave", function () {
      indicator.style.opacity = "0";
    });
  })();

  /* ---------- Mobile nav ---------- */
  (function () {
    var burger = document.getElementById("burger");
    var mobileNav = document.getElementById("mobileNav");
    if (!burger || !mobileNav) return;
    burger.addEventListener("click", function () {
      var open = !mobileNav.classList.contains("is-open");
      mobileNav.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      Array.prototype.forEach.call(
        mobileNav.querySelectorAll("a"),
        function (a, i) {
          a.style.transitionDelay = open ? 0.12 + i * 0.06 + "s" : "0s";
        },
      );
    });
  })();

  /* ======================================================================
     INFINITY — icons travel along a figure-8 (lemniscate) path
     ====================================================================== */
  (function () {
    var iconsHost = document.getElementById("heroIcons");
    var heroEl = document.getElementById("hero");
    var contentEl = document.querySelector(".hero__content");
    var lib = document.getElementById("logoLib");
    if (!iconsHost || !heroEl || !lib) return;

    var nodes = Array.prototype.slice.call(lib.content.children);
    var n = nodes.length;
    if (!n) return;

    /* ---------------------------------------------------------------
       Color themes for hover glow
       --------------------------------------------------------------- */
    var themes = [
      { glow: "rgba(255, 90, 31, 0.65)", border: "rgba(255, 90, 31, 0.5)" },
      { glow: "rgba(108, 92, 231, 0.65)", border: "rgba(108, 92, 231, 0.5)" },
      { glow: "rgba(59, 144, 245, 0.65)", border: "rgba(59, 144, 245, 0.5)" },
      { glow: "rgba(242, 200, 17, 0.6)", border: "rgba(242, 200, 17, 0.45)" },
      { glow: "rgba(16, 124, 65, 0.6)", border: "rgba(16, 124, 65, 0.45)" },
      { glow: "rgba(183, 71, 42, 0.6)", border: "rgba(183, 71, 42, 0.45)" },
      { glow: "rgba(0, 183, 195, 0.6)", border: "rgba(0, 183, 195, 0.45)" },
      { glow: "rgba(119, 25, 170, 0.6)", border: "rgba(119, 25, 170, 0.45)" },
    ];

    /* ---------------------------------------------------------------
       Create icon elements (they will be positioned by JS on the
       figure-8 path). Each icon keeps its own phase offset so they
       distribute evenly along the loop.
       --------------------------------------------------------------- */
    var icons = [];
    var CYCLE = 26; // seconds for one full loop around the infinity

    nodes.forEach(function (node, i) {
      var theme = themes[i % themes.length];

      var el = document.createElement("div");
      el.className = "icon";
      el.style.setProperty("--sheenDelay", (i * 0.45).toFixed(2) + "s");
      el.style.setProperty("--cardGlow", theme.glow);
      el.style.setProperty("--cardBorder", theme.border);

      var inner = document.createElement("div");
      inner.className = "icon__inner";
      inner.innerHTML = node.innerHTML;

      var label = document.createElement("span");
      label.className = "icon__label";
      label.textContent = node.getAttribute("data-label") || "";

      el.appendChild(inner);
      el.appendChild(label);
      iconsHost.appendChild(el);

      /* Phase offset: spread icons evenly around the loop */
      var phase = (i / n) * Math.PI * 2;

      icons.push({
        el: el,
        phase: phase,
        paused: false,
        /* current position cache */
        cx: 0,
        cy: 0,
        opacity: 1,
      });
    });

    /* ---------------------------------------------------------------
       Pause on hover — freeze the whole loop
       --------------------------------------------------------------- */
    var loopPaused = false;
    var resumeTimer = null;
    icons.forEach(function (ic) {
      ic.el.addEventListener("mouseenter", function () {
        clearTimeout(resumeTimer);
        loopPaused = true;
        ic.paused = true;
      });
      ic.el.addEventListener("mouseleave", function () {
        ic.paused = false;
        resumeTimer = setTimeout(function () {
          loopPaused = false;
        }, 140);
      });
    });

    /* ---------------------------------------------------------------
       Geometry: the figure-8 (lemniscate) parametrisation.

       We use the "Gerono lemniscate":
         x = A * cos(t)
         y = B * sin(t) * cos(t)   -> equals (B/2) * sin(2t)

       This produces a clean horizontal figure-8 (∞).
       t = 0     -> right end of right lobe
       t = π/2   -> center top
       t = π     -> left end of left lobe
       t = 3π/2  -> center bottom

       The motion automatically satisfies the user's requirement:
         - going around the RIGHT lobe -> clockwise
         - crossing the middle -> switches direction
         - going around the LEFT lobe -> anti-clockwise
       --------------------------------------------------------------- */
    var A, B;

    function computeGeometry() {
      var w = heroEl.getBoundingClientRect().width;
      var h = heroEl.getBoundingClientRect().height;
      /* horizontal amplitude — half the width of the infinity */
      A = Math.min(w * 0.42, 640);
      /* vertical amplitude — controls how tall the lobes are */
      B = Math.min(h * 0.55, 520);
    }
    computeGeometry();

    /* ---------------------------------------------------------------
       Hide-zone: use the content's bounding rect as the "hidden"
       region. Any icon whose current position falls inside that
       ellipse will fade out (so it appears to vanish behind text).
       --------------------------------------------------------------- */
    var hideRect = { x: 0, y: 0, w: 0, h: 0 };
    function computeHideRect() {
      if (!contentEl) return;
      var r = contentEl.getBoundingClientRect();
      var hr = heroEl.getBoundingClientRect();
      hideRect.x = r.left - hr.left + r.width * 0.5;
      hideRect.y = r.top - hr.top + r.height * 0.5;
      /* reduce a bit so icons appear right at the edges */
      hideRect.w = r.width * 0.55;
      hideRect.h = r.height * 0.55;
    }

    /* ---------------------------------------------------------------
       Animation loop
       --------------------------------------------------------------- */
    var t0 = performance.now();
    var heroRect = heroEl.getBoundingClientRect();

    function loop(now) {
      var elapsed = (now - t0) / 1000;
      var cxHero = heroRect.width / 2;
      var cyHero = heroRect.height / 2;

      icons.forEach(function (ic) {
        /* current parametric angle */
        var t = ic.phase + (elapsed / CYCLE) * Math.PI * 2;
        /* not paused -> normal; but pause freezes the elapsed by
           simply not advancing — we solve that by adjusting phase
           on resume (skip for simplicity; the pause just holds
           the icon where it was while the mouse is over it) */

        /* Position on figure-8 in "hero local" coordinates */
        var x = cxHero + A * Math.cos(t);
        var y = cyHero + (B / 2) * Math.sin(2 * t);

        /* Set CSS variables */
        ic.el.style.setProperty("--px", x + "px");
        ic.el.style.setProperty("--py", y + "px");

        /* Distance from content center (in ellipse units) */
        var dx = (x - hideRect.x) / (hideRect.w * 0.5);
        var dy = (y - hideRect.y) / (hideRect.h * 0.5);
        var d = dx * dx + dy * dy; // 1.0 = on the ellipse edge

        /* Opacity: 0 inside hide zone, 1 well outside */
        var opacity;
        if (d < 1) {
          opacity = 0;
        } else if (d < 1.35) {
          opacity = (d - 1) / 0.35;
        } else {
          opacity = 1;
        }
        if (opacity !== ic.opacity) {
          ic.el.style.setProperty("--opacity", opacity.toFixed(2));
          ic.opacity = opacity;
        }
      });

      if (!loopPaused && !ic_paused_static) {
        requestAnimationFrame(loop);
      } else {
        /* when paused, keep the loop checking so that we can resume */
        requestAnimationFrame(function (nn) {
          /* if paused, skip time advancement: reset t0 slightly so
             the "elapsed" doesn't advance while paused */
          if (loopPaused || anyIconHovered()) {
            t0 += nn - now;
            /* also skip position update on next frame */
          }
          loop(nn);
        });
      }
    }
    var ic_paused_static = false;
    function anyIconHovered() {
      return icons.some(function (ic) {
        return ic.paused;
      });
    }

    /* Start */
    function startLoop() {
      computeGeometry();
      computeHideRect();
      heroRect = heroEl.getBoundingClientRect();
      t0 = performance.now();
      requestAnimationFrame(loop);
    }
    startLoop();

    /* Recompute geometry on resize */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        computeGeometry();
        computeHideRect();
        heroRect = heroEl.getBoundingClientRect();
      }, 160);
    });

    /* Also recompute if the hero resizes (fonts loaded etc.) */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        computeGeometry();
        computeHideRect();
        heroRect = heroEl.getBoundingClientRect();
      });
      ro.observe(heroEl);
    }
  })();
})();
