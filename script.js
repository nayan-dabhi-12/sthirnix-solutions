/* ==========================================================================
   Sthirnix Solutions — Home page interactions
   GSAP + ScrollTrigger + Lenis. Every block is guarded so one failure
   never takes the page down.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.remove("no-js");
  html.classList.add("js");

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia("(hover: none)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function each(sel, fn, ctx) {
    Array.prototype.forEach.call((ctx || document).querySelectorAll(sel), fn);
  }
  function safe(name, fn) {
    try {
      fn();
    } catch (e) {
      console.warn("[sthirnix] " + name + " skipped:", e.message);
    }
  }

  /* ------------------------------------------------------------------ *
   * Smooth scrolling (Lenis) wired into ScrollTrigger
   * ------------------------------------------------------------------ */
  var lenis = null;
  safe("lenis", function () {
    var L = window.Lenis || (window.lenis && window.lenis.Lenis);
    if (!L || REDUCED) return;
    lenis = new L({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    lenis.on("scroll", function () {
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
    if (hasGSAP) {
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) {
        lenis.raf(t);
        requestAnimationFrame(raf);
      })(0);
    }
  });

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.2 });
    else
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.pageYOffset - 90,
        behavior: "smooth",
      });
  }
  each('a[href^="#"]', function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      closeMobileNav();
      scrollToTarget(t);
    });
  });

  /* ------------------------------------------------------------------ *
   * Preloader → hero intro
   * ------------------------------------------------------------------ */
  safe("preloader", function () {
    var pre = document.getElementById("preloader");
    if (!pre) return;
    var bar = pre.querySelector(".preloader__bar i");
    var num = pre.querySelector(".preloader__count span");
    var p = 0,
      done = false;

    var tick = setInterval(function () {
      p = Math.min(p + Math.random() * 9 + 3, 92);
      paint(p);
    }, 110);

    function paint(v) {
      bar.style.width = v + "%";
      num.textContent = Math.round(v);
    }
    function finish() {
      if (done) return;
      done = true;
      clearInterval(tick);
      paint(100);
      setTimeout(function () {
        pre.style.transition =
          "opacity .6s ease, transform .8s cubic-bezier(.22,1,.36,1)";
        pre.style.opacity = "0";
        pre.style.transform = "scale(1.04)";
        document.body.classList.remove("is-loading");
        setTimeout(function () {
          pre.remove();
          heroIntro();
        }, 620);
      }, 260);
    }
    window.addEventListener("load", finish);
    setTimeout(finish, 3200);
  });

  function heroIntro() {
    if (!hasGSAP || REDUCED) return;
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    var words = document.querySelectorAll("#hero .word > span");
    if (words.length)
      tl.to(
        words,
        { yPercent: 0, opacity: 1, duration: 1, stagger: 0.035 },
        0.15,
      );
    tl.from("#header .header__inner", { y: -18, opacity: 0, duration: 0.8 }, 0)
      .to("#hero .hero__badge", { opacity: 1, y: 0, duration: 0.6 }, 0)
      .to("#hero .rule", { scaleX: 1, duration: 0.7 }, 0.35)
      .to("#hero .lead", { opacity: 1, y: 0, duration: 0.9 }, 0.45)
      .to("#hero .hero__cta", { opacity: 1, y: 0, duration: 0.9 }, 0.58)
      .from(
        "#hero .hero__visual",
        { opacity: 0, y: 40, scale: 0.94, duration: 1.1 },
        0.35,
      )
      .from(
        "#hero .float-chip",
        { opacity: 0, y: 20, scale: 0.5, stagger: 0.08, duration: 0.7 },
        0.8,
      );
  }

  /* ------------------------------------------------------------------ *
   * Custom cursor
   * ------------------------------------------------------------------ */
  safe("cursor", function () {
    var ring = document.getElementById("cursor");
    var dot = document.getElementById("cursorDot");
    if (!ring || TOUCH) return;
    var tx = window.innerWidth / 2,
      ty = window.innerHeight / 2,
      rx = tx,
      ry = ty;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = "translate(" + tx + "px," + ty + "px)";
    });
    (function loop() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();
    each(
      "a, button, input, textarea, .float-chip, .solution, .service, .industry",
      function (el) {
        el.addEventListener("mouseenter", function () {
          ring.classList.add("is-active");
        });
        el.addEventListener("mouseleave", function () {
          ring.classList.remove("is-active");
        });
      },
    );
  });

  /* ------------------------------------------------------------------ *
   * Header + mobile nav
   * ------------------------------------------------------------------ */
  var burger = document.getElementById("burger");
  var mobileNav = document.getElementById("mobileNav");
  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.remove("is-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    if (lenis) lenis.start();
  }
  safe("header", function () {
    var header = document.getElementById("header");
    var last = 0;
    function onScroll() {
      var y = window.pageYOffset;
      header.classList.toggle("is-stuck", y > 40);
      last = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (!burger) return;
    burger.addEventListener("click", function () {
      var open = !mobileNav.classList.contains("is-open");
      mobileNav.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
      Array.prototype.forEach.call(
        mobileNav.querySelectorAll("a"),
        function (a, i) {
          a.style.transitionDelay = open ? 0.12 + i * 0.06 + "s" : "0s";
        },
      );
    });
  });

  /* ------------------------------------------------------------------ *
   * Star icons
   * ------------------------------------------------------------------ */
  safe("stars", function () {
    var tpl = document.getElementById("starIcon");
    if (!tpl) return;
    each("[data-stars]", function (holder) {
      var n = parseInt(holder.getAttribute("data-stars"), 10) || 5;
      for (var i = 0; i < n; i++) {
        var s = document.createElement("span");
        s.className = "icon";
        s.innerHTML = tpl.innerHTML;
        holder.appendChild(s);
      }
    });
  });

  /* ------------------------------------------------------------------ *
   * Split headings into words (two-level spans for a masked rise)
   * ------------------------------------------------------------------ */
  safe("split", function () {
    each("[data-split]", function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map(function (w) {
          return '<span class="word"><span>' + w + "</span></span>";
        })
        .join(" ");
    });
    if (hasGSAP && !REDUCED)
      gsap.set(".word > span", { yPercent: 110, opacity: 0 });
  });

  /* ------------------------------------------------------------------ *
   * Scroll reveals
   * ------------------------------------------------------------------ */
  safe("reveals", function () {
    if (!hasGSAP || !window.ScrollTrigger) {
      each("[data-reveal]", function (el) {
        el.style.opacity = 1;
      });
      each(".rule", function (el) {
        el.style.transform = "none";
      });
      return;
    }
    if (REDUCED) {
      gsap.set("[data-reveal]", { opacity: 1 });
      gsap.set(".rule", { scaleX: 1 });
      gsap.set(".word > span", { yPercent: 0, opacity: 1 });
      return;
    }

    gsap.set("[data-reveal]", { y: 34 });

    /* headings, outside the hero (hero is handled by the intro) */
    each("[data-split]", function (el) {
      if (el.closest("#hero")) return;
      gsap.to(el.querySelectorAll(".word > span"), {
        yPercent: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.04,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });

    each(".rule", function (el) {
      if (el.closest("#hero")) return;
      gsap.to(el, {
        scaleX: 1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%" },
      });
    });

    /* grouped reveals keep their DOM order stagger */
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      batchMax: 6,
      onEnter: function (batch) {
        gsap.to(
          batch.filter(function (el) {
            return !el.closest("#hero");
          }),
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            stagger: 0.09,
            overwrite: true,
          },
        );
      },
    });

    /* image mask reveals */
    each("[data-mask]", function (el) {
      gsap.fromTo(
        el,
        { clipPath: "inset(0% 0% 100% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.25,
          ease: "power3.inOut",
          scrollTrigger: { trigger: el, start: "top 88%" },
        },
      );
    });

    /* soft parallax layers */
    each("[data-parallax]", function (el) {
      var amt = parseFloat(el.getAttribute("data-parallax")) || 0.15;
      gsap.to(el, {
        yPercent: amt * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * Stat counters
   * ------------------------------------------------------------------ */
  safe("counters", function () {
    var nums = Array.prototype.slice.call(
      document.querySelectorAll("[data-count]"),
    );
    if (!nums.length) return;

    function run(el, delay) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      if (hasGSAP) {
        gsap.killTweensOf(obj);
        gsap.killTweensOf(el);
        gsap.to(obj, {
          v: target,
          duration: 1.5,
          delay: delay || 0,
          ease: "power2.out",
          onUpdate: function () {
            el.textContent = Math.round(obj.v) + suffix;
          },
          onComplete: function () {
            gsap.fromTo(
              el,
              { scale: 1 },
              {
                scale: 1.06,
                duration: 0.16,
                yoyo: true,
                repeat: 1,
                ease: "power1.inOut",
              },
            );
          },
        });
      } else {
        el.textContent = target + suffix;
      }
    }

    if (window.ScrollTrigger && hasGSAP && !REDUCED) {
      ScrollTrigger.create({
        trigger: "#about .stats",
        start: "top 88%",
        once: true,
        onEnter: function () {
          nums.forEach(function (el, i) {
            run(el, i * 0.12);
          });
        },
      });
    } else {
      nums.forEach(function (el) {
        run(el);
      });
    }

    /* hovering a stat card rolls the number again — like an odometer
       spinning up and settling back on the real figure */
    if (!TOUCH) {
      each("#about .stat", function (card) {
        var num = card.querySelector("[data-count]");
        if (!num) return;
        card.addEventListener("mouseenter", function () {
          run(num);
        });
      });
    }
  });

  /* ------------------------------------------------------------------ *
   * 3D tilt on cards
   * ------------------------------------------------------------------ */
  safe("tilt", function () {
    if (TOUCH || REDUCED) return;
    each("[data-tilt]", function (card) {
      var raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.style.transform =
            "perspective(900px) rotateY(" +
            (px * 7).toFixed(2) +
            "deg) rotateX(" +
            (-py * 7).toFixed(2) +
            "deg) translateY(-6px)";
        });
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * HERO VISUAL — a handful of product chips floating around the stat
   * card on the right side of the hero, each drifting up and down on
   * its own gentle loop (built from the same logo library as the rest
   * of the site's product icons).
   * ------------------------------------------------------------------ */
  safe("heroFloat", function () {
    var host = document.getElementById("heroFloatIcons");
    var lib = document.getElementById("logoLib");
    if (!host || !lib) return;

    var picks = [
      "Power BI",
      "Dynamics 365",
      "Microsoft Teams",
      "Power Automate",
      "Azure DevOps",
      "Microsoft Copilot",
    ];
    var nodes = Array.prototype.slice.call(lib.content.children);
    picks.forEach(function (label, i) {
      var node = nodes.filter(function (n) {
        return n.getAttribute("data-label") === label;
      })[0];
      if (!node) return;
      var chip = document.createElement("div");
      chip.className = "float-chip float-chip--" + (i + 1);
      var art = document.createElement("div");
      art.className = "logo-50";
      art.innerHTML = node.innerHTML;
      chip.appendChild(art);
      host.appendChild(chip);
    });
  });

  /* ------------------------------------------------------------------ *
   * Solutions rail — pinned horizontal scroll (desktop) / swipe (mobile)
   * ------------------------------------------------------------------ */
  safe("rail", function () {
    var rail = document.getElementById("rail");
    var track = document.getElementById("railTrack");
    var hint = document.getElementById("railHint");
    if (!rail || !track) return;
    var cards = Array.prototype.slice.call(track.children);

    function native() {
      rail.classList.add("is-native");
      if (hint) hint.firstChild.textContent = "Swipe ";
    }
    if (
      !hasGSAP ||
      !window.ScrollTrigger ||
      REDUCED ||
      window.innerWidth < 900
    ) {
      native();
      return;
    }

    rail.classList.add("is-wheel");
    var n = cards.length;
    var ANGLE_STEP =
      360 / n; /* cards spread evenly all the way around — a full circle */
    var RADIUS = 300; /* px — how far a card sits from the centre */
    var BASE_SCALE = 0.8; /* cards sized so neighbours sit close with just a small gap */

    cards.forEach(function (card) {
      card.style.transformOrigin = "50% 50%";
    });

    /* the wheel never stops: it drifts on its own like a fairground ride,
       and scrolling past the section spins it faster — it just keeps
       going round and round instead of finishing on one side */
    var rot = 0;
    var IDLE = 9; /* deg per second, idle drift */
    var boost = 0;
    var lastY = window.pageYOffset;
    var lastT = performance.now();

    function paintRing() {
      cards.forEach(function (card, i) {
        var rel =
          ((((i * ANGLE_STEP - rot) % 360) + 540) % 360) - 180; /* -180..180 */
        var abs = Math.abs(rel);
        var scale = BASE_SCALE * Math.max(1 - abs / 460, 0.72);
        card.style.transform =
          "rotateY(" +
          rel.toFixed(2) +
          "deg) translateZ(" +
          RADIUS +
          "px) scale(" +
          scale.toFixed(3) +
          ")";
        card.style.zIndex = String(100 - Math.round(abs));
      });
    }

    function frame(now) {
      var dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      var y = window.pageYOffset;
      var vel = y - lastY;
      lastY = y;
      boost += vel * 0.1;
      boost *= Math.pow(0.92, dt * 60);
      rot += (IDLE + boost) * dt;
      rot = (rot + 360) % 360;
      paintRing();
      requestAnimationFrame(frame);
    }
    paintRing();
    if (!REDUCED) requestAnimationFrame(frame);
  });

  /* ------------------------------------------------------------------ *
   * Generic slider (case studies + testimonials)
   * ------------------------------------------------------------------ */
  function makeSlider(opt) {
    var track = document.getElementById(opt.track);
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var index = 0,
      timer = null;

    function perView() {
      if (!opt.multi) return 1;
      var w = window.innerWidth;
      return w < 640 ? 1 : w < 980 ? 2 : 3;
    }
    function maxIndex() {
      return Math.max(0, slides.length - perView());
    }

    function go(i, silent) {
      index = i < 0 ? maxIndex() : i > maxIndex() ? 0 : i;
      var step =
        slides[0].getBoundingClientRect().width +
        parseFloat(getComputedStyle(track).columnGap || 0);
      var x = -index * step;
      if (hasGSAP && !silent)
        gsap.to(track, { x: x, duration: 0.9, ease: "power3.inOut" });
      else track.style.transform = "translateX(" + x + "px)";
      if (opt.multi && hasGSAP && !REDUCED) {
        slides.forEach(function (s, si) {
          var active = si >= index && si < index + perView();
          gsap.to(s, {
            opacity: active ? 1 : 0.45,
            duration: 0.5,
            ease: "power2.out",
          });
        });
      }
      if (opt.onChange) opt.onChange(index, slides[index], slides.length);
    }
    function next() {
      go(index + 1);
    }
    function prev() {
      go(index - 1);
    }

    each("[data-" + opt.key + '="next"]', function (b) {
      b.addEventListener("click", function () {
        next();
        restart();
      });
    });
    each("[data-" + opt.key + '="prev"]', function (b) {
      b.addEventListener("click", function () {
        prev();
        restart();
      });
    });

    function restart() {
      clearInterval(timer);
      timer = setInterval(next, opt.delay || 6000);
    }
    restart();
    track.addEventListener("mouseenter", function () {
      clearInterval(timer);
    });
    track.addEventListener("mouseleave", restart);

    /* drag / swipe */
    var down = false,
      startX = 0;
    track.addEventListener("pointerdown", function (e) {
      down = true;
      startX = e.clientX;
    });
    window.addEventListener("pointerup", function (e) {
      if (!down) return;
      down = false;
      var d = e.clientX - startX;
      if (Math.abs(d) > 50) {
        d < 0 ? next() : prev();
        restart();
      }
    });

    window.addEventListener("resize", function () {
      go(Math.min(index, maxIndex()), true);
    });
    go(0, true);
  }
  /* ------------------------------------------------------------------ *
   * Case studies — counter, progress bar, and a fresh entrance for the
   * copy of every slide the arrows bring in.
   * ------------------------------------------------------------------ */
  safe("caseSlider", function () {
    var cases = document.querySelector("#cases .cases");
    var nav = cases ? cases.querySelector(".slider-nav") : null;
    var count = null,
      prog = null;

    if (nav) {
      var meta = document.createElement("div");
      meta.className = "cases__meta";
      meta.innerHTML =
        '<span class="cases__count">01 / 03</span><span class="cases__prog"><i></i></span>';
      nav.insertBefore(meta, nav.children[1] || null);
      count = meta.querySelector(".cases__count");
      prog = meta.querySelector(".cases__prog i");
    }

    /* remember every metric so it can count up again on each visit */
    each("#caseTrack .case__metric b", function (b) {
      b.setAttribute("data-value", b.textContent.trim());
    });

    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }

    function animateSlide(slide) {
      if (!slide || !hasGSAP || REDUCED) return;
      var bits = slide.querySelectorAll(
        ".eyebrow, .h3, .body-s, .case__metric, .btn",
      );
      gsap.fromTo(
        bits,
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.07,
          overwrite: true,
        },
      );
      var media = slide.querySelector(".case__media img");
      if (media)
        gsap.fromTo(
          media,
          { scale: 1.12 },
          { scale: 1, duration: 1.4, ease: "power3.out", overwrite: true },
        );

      each(
        ".case__metric b",
        function (b) {
          var raw = b.getAttribute("data-value") || b.textContent;
          var m = raw.match(/^([^0-9]*)([0-9.]+)(.*)$/);
          if (!m) return;
          var obj = { v: 0 };
          gsap.to(obj, {
            v: parseFloat(m[2]),
            duration: 1.2,
            ease: "power2.out",
            overwrite: true,
            onUpdate: function () {
              b.textContent = m[1] + Math.round(obj.v) + m[3];
            },
          });
        },
        slide,
      );
    }

    var started = false;
    makeSlider({
      track: "caseTrack",
      key: "case",
      delay: 7000,
      onChange: function (i, slide, total) {
        if (count) count.textContent = pad(i + 1) + " / " + pad(total);
        if (prog)
          prog.style.transform = "scaleX(" + ((i + 1) / total).toFixed(3) + ")";
        if (!started) {
          if (hasGSAP && !REDUCED) {
            gsap.set(
              slide.querySelectorAll(
                ".eyebrow, .h3, .body-s, .case__metric, .btn",
              ),
              { opacity: 0, y: 26 },
            );
          }
          return;
        }
        animateSlide(slide);
      },
    });

    if (hasGSAP && window.ScrollTrigger && !REDUCED) {
      ScrollTrigger.create({
        trigger: "#cases",
        start: "top 75%",
        once: true,
        onEnter: function () {
          started = true;
          var track = document.getElementById("caseTrack");
          var active = track && track.children[0];
          animateSlide(active);
        },
      });
    } else {
      started = true;
    }
  });
  safe("testiSlider", function () {
    makeSlider({ track: "testiTrack", key: "testi", multi: true, delay: 5200 });
  });

  /* ------------------------------------------------------------------ *
   * Testimonials — cards fan in on scroll, stars tick in one by one
   * ------------------------------------------------------------------ */
  safe("testiReveal", function () {
    var cards = Array.prototype.slice.call(
      document.querySelectorAll("#resources .testi__card"),
    );
    if (!cards.length) return;
    if (!hasGSAP || !window.ScrollTrigger || REDUCED) {
      cards.forEach(function (c) {
        c.style.opacity = 1;
      });
      return;
    }
    gsap.set(cards, {
      opacity: 0,
      y: 54,
      rotate: function (i) {
        return i % 2 ? 2.4 : -2.4;
      },
      transformOrigin: "50% 100%",
    });
    ScrollTrigger.create({
      trigger: "#resources .testi",
      start: "top 85%",
      once: true,
      onEnter: function () {
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          rotate: 0,
          duration: 0.95,
          ease: "power3.out",
          stagger: 0.12,
        });
        cards.forEach(function (card) {
          var stars = card.querySelectorAll(".stars .icon");
          gsap.fromTo(
            stars,
            { opacity: 0, scale: 0.3 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.4,
              ease: "back.out(3)",
              stagger: 0.06,
              delay: 0.5,
            },
          );
        });
      },
    });
  });

  /* ------------------------------------------------------------------ *
   * Dynamics modules — sticky stack with a scale-away on exit
   * ------------------------------------------------------------------ */
  safe("modules", function () {
    var cards = Array.prototype.slice.call(
      document.querySelectorAll("#moduleStack .module"),
    );
    if (!cards.length) return;

    if (!hasGSAP || !window.ScrollTrigger || REDUCED) {
      cards.forEach(function (c) {
        c.style.opacity = 1;
      });
      return;
    }

    /* each module wakes up (icon pops, checklist ticks in) the moment it
       becomes the front card of the stack */
    cards.forEach(function (card) {
      var icon = card.querySelector(".module__icon");
      var items = card.querySelectorAll(".module li");
      gsap.set(items, { opacity: 0, x: -12 });
      ScrollTrigger.create({
        trigger: card,
        start: "top 68%",
        end: "bottom 30%",
        toggleClass: { targets: card, className: "is-active" },
        onEnter: function () {
          gsap.to(items, {
            opacity: 1,
            x: 0,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.06,
          });
          if (icon)
            gsap.fromTo(
              icon,
              { rotate: -14, scale: 0.8 },
              { rotate: 0, scale: 1, duration: 0.6, ease: "back.out(2.2)" },
            );
        },
      });
    });

    if (window.innerWidth < 900) return;

    cards.forEach(function (card, i) {
      card.style.zIndex = String(i + 1);
      if (i === cards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.35,
        filter: "blur(2px)",
        ease: "none",
        scrollTrigger: {
          trigger: cards[i + 1],
          start: "top 60%",
          end: "top 22%",
          scrub: true,
        },
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * Services — cards tip up out of the page, logos drift on scroll
   * ------------------------------------------------------------------ */
  safe("servicesScroll", function () {
    var section = document.querySelector(".services");
    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".services .service"),
    );
    if (!cards.length) return;
    if (
      !hasGSAP ||
      !window.ScrollTrigger ||
      REDUCED ||
      window.innerWidth < 900
    ) {
      cards.forEach(function (c) {
        c.style.opacity = 1;
      });
      return;
    }

    /* cards travel one at a time along a diagonal line: each enters
       tilted from the bottom-right, straightens up as it becomes the
       active (front, flat) card, then keeps drifting on up toward the
       top-left as the next one arrives — never stacking in a row */
    section.classList.add("is-flow");
    var n = cards.length;

    function paint(progress) {
      var head = progress * (n - 1);
      cards.forEach(function (card, i) {
        var rel = i - head;
        var abs = Math.min(Math.abs(rel), 2.6);
        var x = rel * 220;
        var y = rel * 130;
        var rot = rel * 9;
        var scale = Math.max(1 - abs * 0.16, 0.6);
        var opacity = Math.max(1 - abs * 0.4, 0);
        card.style.transform =
          "translate(" +
          x.toFixed(1) +
          "px," +
          y.toFixed(1) +
          "px) rotate(" +
          rot.toFixed(2) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
        card.style.opacity = opacity.toFixed(2);
        card.style.zIndex = String(100 - Math.round(abs * 10));
      });
    }

    paint(0);
    ScrollTrigger.create({
      trigger: section,
      start: "top 22%",
      end: "+=" + n * 380,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        paint(self.progress);
      },
    });
  });

  /* ------------------------------------------------------------------ *
   * Industries — numbered bento cards that slide in from alternating
   * sides, each with a light beam across its top edge
   * ------------------------------------------------------------------ */
  safe("industriesScroll", function () {
    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".industries .industry"),
    );
    if (!cards.length) return;

    cards.forEach(function (card, i) {
      var no = document.createElement("span");
      no.className = "industry__no";
      no.textContent = (i < 9 ? "0" : "") + (i + 1);
      var go = document.createElement("span");
      go.className = "industry__go";
      go.textContent = "\u2192";
      var beam = document.createElement("span");
      beam.className = "industry__beam";
      card.appendChild(no);
      card.appendChild(go);
      card.appendChild(beam);
    });

    if (!hasGSAP || !window.ScrollTrigger || REDUCED) {
      cards.forEach(function (c) {
        c.style.opacity = 1;
      });
      return;
    }

    cards.forEach(function (card, i) {
      var dir = i % 2 ? 1 : -1;
      gsap.set(card, {
        opacity: 0,
        y: 70,
        x: dir * 46,
        rotate: dir * 1.2,
        transformPerspective: 1000,
      });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 88%" },
      });
      tl.to(card, {
        opacity: 1,
        y: 0,
        x: 0,
        rotate: 0,
        duration: 1.05,
        ease: "power3.out",
      })
        .to(
          card.querySelector(".industry__beam"),
          { scaleX: 1, duration: 0.9, ease: "power2.inOut" },
          0.15,
        )
        .from(
          card.querySelector(".industry__no"),
          { opacity: 0, y: 16, duration: 0.8, ease: "power2.out" },
          0.2,
        );

      gsap.to(card, {
        yPercent: -4 - (i % 3) * 2,
        ease: "none",
        scrollTrigger: {
          trigger: card.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    });
  });

  /* ------------------------------------------------------------------ *
   * Footer — columns rise into place, badge gets a friendly pop
   * ------------------------------------------------------------------ */
  safe("footerReveal", function () {
    var cols = Array.prototype.slice.call(
      document.querySelectorAll(".footer__cols > div"),
    );
    var badge = document.querySelector(".footer__badge");
    if (!cols.length || !hasGSAP || !window.ScrollTrigger || REDUCED) return;
    gsap.set(cols, { opacity: 0, y: 30 });
    if (badge) gsap.set(badge, { opacity: 0, scale: 0.85 });
    ScrollTrigger.create({
      trigger: ".footer",
      start: "top 85%",
      once: true,
      onEnter: function () {
        gsap.to(cols, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.1,
        });
        if (badge)
          gsap.to(badge, {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: "back.out(2.4)",
            delay: 0.3,
          });
      },
    });
  });

  /* keep ScrollTrigger honest once fonts and images land */
  window.addEventListener("load", function () {
    if (window.ScrollTrigger)
      setTimeout(function () {
        ScrollTrigger.refresh();
      }, 200);
  });
})();
