/* ==========================================================================
   M24 – vykreslení obsahu z Excelu do stránek + menu a filtr
   --------------------------------------------------------------------------
   HTML stránky obsahují kostru s atributy, které tady vyplníme:
     data-t="klic"         → text z listu Texty
     data-odstavce="klic"  → text rozdělený na odstavce
     data-foto="hero"      → fotka webu (hero / about / kontakt)
     data-odkaz="klic"     → adresa odkazu z listu Texty
   Seznamy (projekty, patička, kontakt) skládají funkce níže.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- pomocné funkce ---------- */

  // Vytvoří HTML prvek: el("a", {class: "btn", href: "#"}, "text", dalsiPrvek)
  function el(tag, attrs, ...deti) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else e.setAttribute(k, v);
    }
    deti.flat(Infinity).forEach((d) => {
      if (d === null || d === undefined || d === "") return;
      e.append(d instanceof Node ? d : document.createTextNode(String(d)));
    });
    return e;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // odkaz z Excelu: https://, mailto:, tel:, # nechá být, jinak stránka webu
  const odkaz = (o) => (!o ? "#" : o);
  const odkazProjektu = (p) => "projekt.html?p=" + encodeURIComponent(p.slug);

  // obrázek s líným načítáním; když fotka chybí, vypíše varování do konzole
  function foto(src, alt, cls, lazy = true) {
    const img = el("img", { src, alt: alt || "", class: cls, loading: lazy ? "lazy" : null, decoding: "async" });
    img.addEventListener("error", () => {
      img.classList.add("chybi");
      console.warn("M24: fotka nenalezena →", decodeURI(src), "(pozor na velká/malá písmena v názvu)");
    }, { once: true });
    return img;
  }

  /* ---------- společné části všech stránek ---------- */

  function vyplnTexty(o) {
    const t = o.texty;
    $$("[data-t]").forEach((e) => {
      const v = t[e.dataset.t];
      if (v !== undefined && v !== "") e.textContent = v;
      else if (e.hasAttribute("data-skryt-prazdne")) e.hidden = true;
    });
    $$("[data-odstavce]").forEach((e) => {
      e.replaceChildren(...o.odstavce(t[e.dataset.odstavce]).map((p) => el("p", { class: "text" }, p)));
    });
    $$("[data-foto]").forEach((e) => {
      const src = o.fotky[e.dataset.foto];
      if (!src) return;
      if (e.tagName === "image") e.setAttribute("href", src);
      else e.src = src;
    });
    $$("[data-odkaz]").forEach((e) => { e.href = odkaz(t[e.dataset.odkaz]); });
  }

  function vykresliPaticku(o) {
    const box = $("[data-paticka]");
    if (!box) return;
    box.replaceChildren(...o.paticka.map((sloupec) =>
      el("ul", { class: "site-footer__col" }, sloupec.map((p) =>
        el("li", {}, p.odkaz ? el("a", { href: odkaz(p.odkaz) }, p.text) : p.text)))));
  }

  /* ---------- úvodní stránka ---------- */

  function vykresliUvod(o) {
    const t = o.texty;

    // Recent projects – hlavní projekt
    const hlavni = o.projekty.find((p) => p.hlavni) || o.projekty[0];
    const recent = $("#recent");
    if (recent && hlavni) {
      $$("[data-hlavni-odkaz]", recent).forEach((a) => { a.href = odkazProjektu(hlavni); });
      $("[data-hlavni-foto]", recent).replaceWith(foto(hlavni.titulni, hlavni.nazev));
      $("[data-hlavni-popisek]", recent).textContent = hlavni.popisek;
    } else if (recent) {
      recent.hidden = true;
    }

    // Work – vybrané projekty
    const box = $("[data-vypis-uvod]");
    if (box) {
      let vyber = o.projekty.filter((p) => p.naUvod).sort((a, b) => a.naUvod - b.naUvod || a.poradi - b.poradi);
      if (!vyber.length) vyber = o.projekty.slice(0, 3);
      box.replaceChildren(...vyber.map((p) => el("article", { class: "wl-item" },
        el("a", { class: "wl-item__media", href: odkazProjektu(p), "aria-label": p.nazev },
          foto(p.siroka, p.nazev),
          el("span", { class: "wl-item__overlay text", "aria-hidden": "true" }, p.text.slice(0, 2).map((x) => el("span", {}, x)))),
        el("p", { class: "caption wl-item__caption" }, p.kategorie || p.popisek),
        el("a", { class: "btn wl-item__more", href: odkazProjektu(p) }, t.tlacitko_more || "More"))));
    }

    // About – řádky 2D / 3D
    $$("[data-about-radek]").forEach((r) => {
      const k = r.dataset.aboutRadek;
      if (!t[`about_${k}_text`] && !t[`about_${k}_tlacitko`]) r.hidden = true;
    });

    // Kontakt
    const kontakt = $("[data-kontakt]");
    if (kontakt) {
      const tel = (t.telefon || "").replace(/[^\d+]/g, "");
      const radek = (...d) => el("p", {}, d);
      kontakt.replaceChildren(
        radek(el("strong", {}, t.jmeno), el("br"), t.funkce),
        radek(
          t.telefon && el("a", { href: "tel:" + tel }, t.telefon),
          t.telefon && t.email ? " | " : "",
          t.email && el("a", { href: "mailto:" + t.email }, t.email)),
        radek(
          t.email_info && [el("a", { href: "mailto:" + t.email_info }, t.email_info), el("br")],
          t.web && [el("a", { href: t.domena || "https://" + t.web }, t.web), el("br")],
          t.instagram && el("a", { href: t.instagram_odkaz || "#", target: "_blank", rel: "noopener" }, t.instagram)),
        el("p", { class: "contact__studio" }, el("strong", {}, t.studio_nazev)),
        t.sidlo && radek("Sídlo: " + t.sidlo),
        radek(t.ico && "IČO: " + t.ico, t.dic && [el("br"), "DIČ: " + t.dic]),
        t.spisova_znacka && radek((/^[ABC] \d/.test(t.spisova_znacka) ? "Spisová značka: " : "") + t.spisova_znacka));
    }
  }

  /* ---------- přehled prací (mřížka + filtr podle roku) ---------- */

  function vykresliPrace(o) {
    const mrizka = $("[data-mrizka]");
    const filtry = $("[data-filtry]");
    if (!mrizka || !filtry) return;

    mrizka.replaceChildren(...o.projekty.map((p) => el("li", { class: "tile", "data-rok": p.rok },
      el("a", { class: "tile__link", href: odkazProjektu(p) },
        foto(p.titulni, "", "tile__img"),
        el("span", { class: "tile__title" }, p.nazev)))));

    const roky = [...new Set(o.projekty.map((p) => p.rok).filter(Boolean))].sort();
    const vychozi = roky[roky.length - 1] || "vse";
    const tlacitka = [...roky, "vse"].map((r) =>
      el("button", { class: "btn filter", type: "button", "data-rok": r, "aria-pressed": "false" },
        r === "vse" ? o.texty.filtr_vse || "All" : r));
    filtry.replaceChildren(...tlacitka);

    // Desktop: projekty z jiných let zůstanou jako šedé dlaždice. Mobil: skryjí se.
    // Vybraný rok je v adrese (work.html#2024), takže jde poslat odkazem.
    function filtruj(rok, zapsat) {
      if (!tlacitka.some((b) => b.dataset.rok === rok)) rok = vychozi;
      tlacitka.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rok === rok)));
      $$(".tile", mrizka).forEach((d) => d.classList.toggle("is-off", rok !== "vse" && d.dataset.rok !== rok));
      if (zapsat) history.replaceState(null, "", rok === vychozi ? location.pathname : "#" + rok);
    }
    tlacitka.forEach((b) => b.addEventListener("click", () => filtruj(b.dataset.rok, true)));
    filtruj(decodeURIComponent(location.hash.slice(1)) || vychozi, false);
  }

  /* ---------- detail projektu (projekt.html?p=slozka) ---------- */

  function vykresliProjekt(o) {
    const box = $("[data-projekt]");
    if (!box) return;
    const slug = new URLSearchParams(location.search).get("p");
    const i = o.projekty.findIndex((p) => p.slug === slug);
    const p = o.projekty[i];

    if (!p) {
      $("[data-projekt-nazev]").textContent = "Projekt nenalezen";
      $("[data-projekt-text]").replaceChildren(el("p", { class: "text" }, "Tento projekt neexistuje nebo byl skryt."));
      $("[data-projekt-dalsi]").hidden = true;
      return;
    }

    document.title = p.nazev + " – " + (o.texty.seo_nazev || "M24");
    const popis = document.querySelector('meta[name="description"]');
    if (popis && p.text[0]) popis.content = p.text[0].slice(0, 155);

    $("[data-projekt-nazev]").textContent = p.nazev;
    $("[data-projekt-meta]").textContent = [p.kategorie, p.rok].filter(Boolean).join(" · ");
    $("[data-projekt-text]").replaceChildren(...p.text.map((x) => el("p", { class: "text" }, x)));

    const dalsi = o.projekty[(i + 1) % o.projekty.length];
    const a = $("[data-projekt-dalsi]");
    if (dalsi && dalsi !== p) a.href = odkazProjektu(dalsi); else a.hidden = true;

    $("[data-projekt-fotky]").replaceChildren(...p.fotky.map((f, n) =>
      el("figure", {},
        foto(f.src, f.popisek || p.nazev, "", n > 0),
        f.popisek && el("figcaption", { class: "caption" }, f.popisek))));
  }

  /* ---------- mobilní menu ---------- */

  function menu() {
    const toggle = $(".menu-toggle");
    const nav = $("#menu");
    if (!toggle || !nav) return;
    const nastav = (otevrit) => {
      document.body.classList.toggle("menu-open", otevrit);
      toggle.setAttribute("aria-expanded", String(otevrit));
    };
    toggle.addEventListener("click", () => nastav(!document.body.classList.contains("menu-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) nastav(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") nastav(false); });
    matchMedia("(min-width: 701px)").addEventListener("change", () => nastav(false));
  }

  /* ---------- start ---------- */

  menu();

  M24Obsah.nacti()
    .then((o) => {
      vyplnTexty(o);
      vykresliPaticku(o);
      vykresliUvod(o);
      vykresliPrace(o);
      vykresliProjekt(o);
      document.documentElement.classList.add("nacteno");
      // po načtení obsahu doskočit na kotvu (#about, #contact)
      if (location.hash.length > 1 && !$("[data-mrizka]")) {
        const cil = document.getElementById(location.hash.slice(1));
        if (cil) cil.scrollIntoView();
      }
    })
    .catch((chyba) => {
      console.error(chyba);
      const zprava = location.protocol === "file:"
        ? "Web je otevřený přímo ze souboru – prohlížeč pak nedovolí načíst Excel. Spusťte náhled přes server (viz README)."
        : "Nepodařilo se načíst obsah webu (obsah/obsah.xlsx): " + chyba.message;
      document.body.prepend(el("p", { class: "load-error", role: "alert" }, zprava));
      document.documentElement.classList.add("nacteno");
    });
})();
