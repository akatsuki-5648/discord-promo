/* ディスコード宣伝｜共通JS
   ★ページ判定は body[data-route] を読む（URLの先頭要素に依存しない。
     file:// でドライブ文字 C: をページ名と誤認する事故を避ける） */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const route = document.body.dataset.route || "";

  // 年号
  document
    .querySelectorAll("[data-year]")
    .forEach((e) => (e.textContent = new Date().getFullYear()));

  // モバイルメニュー（開閉の挙動だけ。見た目は各ページCSS）
  const bg = document.querySelector("[data-burger]");
  const nav = document.querySelector("[data-nav]");
  if (bg && nav) {
    const set = (open) => {
      bg.setAttribute("aria-expanded", String(open));
      open
        ? nav.setAttribute("data-open", "")
        : nav.removeAttribute("data-open");
      document.body.style.overflow = open ? "hidden" : "";
    };
    bg.addEventListener("click", () =>
      set(bg.getAttribute("aria-expanded") !== "true"),
    );
    nav
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") set(false);
    });
  }

  // スクロールで現れる
  const rv = document.querySelectorAll("[data-rv]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e, i) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = Math.min(i * 60, 240) + "ms";
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add("in")); // JS無効/低モーションでも必ず見える
  }

  // 数値のカウントアップ（使うページだけ）
  const nums = document.querySelectorAll("[data-count]");
  if (nums.length && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target,
            to = +el.dataset.count,
            sfx = el.dataset.suffix || "";
          if (reduce) {
            el.textContent = to + sfx;
            io2.unobserve(el);
            return;
          }
          const t0 = performance.now(),
            dur = 1000;
          const step = (t) => {
            const p = Math.min((t - t0) / dur, 1);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + sfx;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io2.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    nums.forEach((n) => io2.observe(n));
  }

  // 目次の現在地ハイライト（目次があるページだけ）
  const toc = document.querySelector(".toc");
  if (toc && "IntersectionObserver" in window) {
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const map = new Map();
    links.forEach((a) => {
      const t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) map.set(t, a);
    });
    const io3 = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          const a = map.get(e.target);
          if (a) a.toggleAttribute("data-here", e.isIntersecting);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    map.forEach((_, t) => io3.observe(t));
  }

  // ★find（探し方）ページの多段フィルタ
  //   真似る先：AAA11Y（適合レベル×タイプ×カテゴリ×カラーの多段絞り込み＋件数＋条件クリア）
  //   要素が無いページでは何もしない
  if (route === "find") {
    const q = document.querySelector("[data-q]");
    const rows = [...document.querySelectorAll("[data-item]")];
    const hit = document.querySelector("[data-hit]");
    const empty = document.querySelector("[data-empty]");
    const g1 = [...document.querySelectorAll("[data-filter]")];
    const g2 = [...document.querySelectorAll("[data-filter2]")];
    const clear = document.querySelector("[data-clear]");
    const state = { a: "all", b: "all", kw: "" };

    const apply = () => {
      let n = 0;
      rows.forEach((r) => {
        const txt = r.textContent.toLowerCase();
        const okA = state.a === "all" || r.dataset.item === state.a;
        const okB = state.b === "all" || r.dataset.item2 === state.b;
        const okK = !state.kw || txt.includes(state.kw);
        const ok = okA && okB && okK;
        r.hidden = !ok;
        if (ok) n++;
      });
      if (hit) hit.textContent = n;
      if (empty) empty.hidden = n !== 0;
    };
    const pick = (group, key) => (btn) => {
      group.forEach((x) => x.toggleAttribute("data-on", x === btn));
      state[key] = btn.dataset[key === "a" ? "filter" : "filter2"];
      apply();
    };
    q &&
      q.addEventListener("input", () => {
        state.kw = q.value.trim().toLowerCase();
        apply();
      });
    g1.forEach((b) => b.addEventListener("click", () => pick(g1, "a")(b)));
    g2.forEach((b) => b.addEventListener("click", () => pick(g2, "b")(b)));
    clear &&
      clear.addEventListener("click", () => {
        state.a = state.b = "all";
        state.kw = "";
        if (q) q.value = "";
        g1.forEach((x, i) => x.toggleAttribute("data-on", i === 0));
        g2.forEach((x, i) => x.toggleAttribute("data-on", i === 0));
        apply();
      });
    apply();
  }

  // ★recruit（募集）ページのタブ切替
  //   真似る先：MBS RECRUIT（All / Job / About / Topic / Column で一覧を切り替える）
  if (route === "recruit") {
    const btns = [...document.querySelectorAll("[data-tab]")];
    const slips = [...document.querySelectorAll("[data-slip]")];
    const hit = document.querySelector("[data-tabhit]");
    const show = (key) => {
      let n = 0;
      slips.forEach((s) => {
        const ok = key === "all" || s.dataset.slip === key;
        s.hidden = !ok;
        if (ok) n++;
      });
      if (hit) hit.textContent = n;
    };
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        btns.forEach((x) => x.toggleAttribute("data-on", x === b));
        show(b.dataset.tab);
      }),
    );
    show("all");
  }
})();

/* ★ニシザキ型：中腹の全幅パララックス（.eyecatch .ec-img）＋ページ遷移マスク */
(function () {
  var red = matchMedia("(prefers-reduced-motion:reduce)").matches;
  /* パララックス：画面内にある間だけ動かす */
  var ecs = [].slice.call(document.querySelectorAll(".eyecatch .ec-img"));
  if (ecs.length && !red) {
    var live = [];
    var io2 = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          var i = live.indexOf(e.target);
          if (e.isIntersecting) {
            if (i < 0) live.push(e.target);
          } else if (i >= 0) live.splice(i, 1);
        });
      },
      { rootMargin: "120px 0px" },
    );
    ecs.forEach(function (el) {
      io2.observe(el);
    });
    var tick = false;
    function move() {
      tick = false;
      var vh = innerHeight;
      live.forEach(function (el) {
        var b = el.parentElement.getBoundingClientRect();
        var p = (b.top + b.height / 2 - vh / 2) / vh; /* -1〜1 */
        el.style.transform = "translate3d(0," + (p * -9).toFixed(2) + "%,0)";
      });
    }
    addEventListener(
      "scroll",
      function () {
        if (!tick) {
          tick = true;
          requestAnimationFrame(move);
        }
      },
      { passive: true },
    );
    addEventListener("resize", move, { passive: true });
    move();
  }
  /* 遷移マスク：ページを開いた時に上から開く */
  if (!red) {
    var m = document.createElement("div");
    m.className = "tmask";
    m.style.background =
      getComputedStyle(document.body).backgroundColor || "#000";
    document.body.appendChild(m);
    setTimeout(function () {
      m.remove();
    }, 700);
  }
})();

/* ★時間帯で空が変わる（こころの bg-time-day/dusk/night を活かす）
   SANKOU! のタグ「アクセス･遷移･日時に応じて変化」に対応 */
(function () {
  var b = document.body;
  if (!b || b.getAttribute("data-route") !== "home") return;
  var h = new Date().getHours();
  b.setAttribute(
    "data-time",
    h >= 5 && h < 16 ? "day" : h < 19 ? "dusk" : "night",
  );
  var c = document.querySelector("[data-clock]");
  if (c) c.textContent = "／ " + (h < 10 ? "0" : "") + h + ":00 の空";
})();
