/* ==========================================================================
   M24 – načtení obsahu z Excelu (obsah/obsah.xlsx)
   --------------------------------------------------------------------------
   Převede listy Excelu na jednoduchá data, se kterými pracuje web.js:
     texty     { klic: "text" }
     projekty  [ { slug, nazev, rok, kategorie, popisek, text[], titulni,
                   siroka, fotky[{src, popisek}], naUvod, hlavni } ]
     paticka   [ [ {text, odkaz} ], … 4 sloupce ]
   ========================================================================== */
(function () {
  "use strict";

  const EXCEL = "obsah/obsah.xlsx";
  const FOTKY = "obsah/fotky/";

  /* ---------- pomocné funkce ---------- */

  // "Složka s fotkami" → "slozka-s-fotkami"
  const slug = (t) =>
    String(t ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

  const bunka = (v) => (v === null || v === undefined ? "" : String(v).trim());
  const ano = (v) => ["ano", "a", "yes", "y", "x", "1", "true", "pravda"].includes(bunka(v).toLowerCase());
  const ne = (v) => ["ne", "n", "no", "0", "false", "nepravda"].includes(bunka(v).toLowerCase());

  // text z buňky → odstavce (prázdný řádek nebo Alt+Enter)
  function odstavce(text) {
    text = bunka(text).replace(/\r\n/g, "\n");
    if (!text) return [];
    let casti = text.split(/\n\s*\n/);
    if (casti.length === 1) casti = text.split("\n");
    return casti.map((p) => p.trim()).filter(Boolean);
  }

  // cesta k fotce (zakóduje mezery a diakritiku v názvech souborů)
  const cesta = (...casti) =>
    FOTKY + casti.join("/").split("/").filter(Boolean).map(encodeURIComponent).join("/");

  // list Excelu → pole objektů podle hlavičky (první řádek)
  function tabulka(listy, nazev) {
    const klic = Object.keys(listy).find((k) => slug(k) === slug(nazev));
    if (!klic) return [];
    const [hlavicka = [], ...radky] = listy[klic];
    const sloupce = Array.from(hlavicka, slug);
    return radky
      .map((r, i) => {
        const o = { _radek: i + 2 };
        sloupce.forEach((s, j) => { if (s) o[s] = r[j]; });
        return o;
      })
      .filter((o) => sloupce.some((s) => s && bunka(o[s]) !== ""));
  }

  // "Fotky": "5" → 01.jpg … 05.jpg, nebo seznam názvů oddělených čárkou / řádkem
  function seznamFotek(hodnota) {
    const t = bunka(hodnota);
    if (!t) return [];
    if (/^\d+$/.test(t)) {
      return Array.from({ length: parseInt(t, 10) }, (_, i) => String(i + 1).padStart(2, "0") + ".jpg");
    }
    return t.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  }

  /* ---------- převod Excelu na data webu ---------- */

  function zpracuj(listy) {
    const varovani = [];

    // Texty
    const texty = {};
    tabulka(listy, "Texty").forEach((r) => {
      const k = bunka(r.klic);
      if (k && !k.startsWith("—")) texty[k] = bunka(r.text);
    });

    // Popisky fotek
    const popisky = {};
    tabulka(listy, "Popisky fotek").forEach((r) => {
      popisky[slug(r["slozka-projektu"]) + "/" + bunka(r.soubor).toLowerCase()] = bunka(r.popisek);
    });

    // Projekty
    const projekty = [];
    const videne = new Set();
    tabulka(listy, "Projekty").forEach((r) => {
      if (ne(r.zobrazit)) return;
      const slozka = bunka(r["slozka-s-fotkami"]);
      const nazev = bunka(r.nazev);
      if (!slozka || !nazev) {
        varovani.push(`Projekty, řádek ${r._radek}: chybí „Složka s fotkami“ nebo „Název“ – řádek přeskočen.`);
        return;
      }
      if (videne.has(slug(slozka))) {
        varovani.push(`Projekty, řádek ${r._radek}: složka „${slozka}“ je v tabulce dvakrát.`);
        return;
      }
      videne.add(slug(slozka));

      const titulniSoubor = bunka(r["titulni-fotka"]);
      const sirokaSoubor = bunka(r["siroka-fotka-na-uvod"]);
      let soubory = seznamFotek(r.fotky);
      if (!soubory.length) soubory = [titulniSoubor || "01.jpg"];

      const fotky = soubory.map((f) => ({
        src: cesta("projekty", slozka, f),
        popisek: popisky[slug(slozka) + "/" + f.toLowerCase()] || "",
      }));
      const uvod = bunka(r["na-uvodni-strance"]);

      projekty.push({
        slug: slozka,
        nazev,
        rok: bunka(r.rok),
        kategorie: bunka(r.kategorie),
        popisek: bunka(r["kratky-popisek"]) || nazev,
        text: odstavce(r.text),
        titulni: titulniSoubor ? cesta("projekty", slozka, titulniSoubor) : fotky[0].src,
        siroka: sirokaSoubor ? cesta("projekty", slozka, sirokaSoubor)
          : titulniSoubor ? cesta("projekty", slozka, titulniSoubor) : fotky[0].src,
        fotky,
        naUvod: uvod ? (Number(uvod.replace(",", ".")) || (ano(uvod) ? 999 : 0)) : 0,
        hlavni: ano(r["hlavni-projekt"]),
        poradi: Number(bunka(r.poradi).replace(",", ".")) || 9999,
      });
    });
    projekty.sort((a, b) => a.poradi - b.poradi);

    // Patička
    const paticka = [[], [], [], []];
    tabulka(listy, "Patička").forEach((r) => {
      const s = Math.min(Math.max(parseInt(bunka(r.sloupec), 10) || 1, 1), 4);
      paticka[s - 1].push({ text: bunka(r.text), odkaz: bunka(r.odkaz) });
    });

    // Fotky webu (úvod, about, kontakt)
    const fotkaWebu = (k) => (texty[k] ? cesta("web", texty[k]) : "");

    varovani.forEach((v) => console.warn("M24 obsah:", v));
    return {
      texty, projekty, paticka, odstavce,
      fotky: { hero: fotkaWebu("hero_foto"), about: fotkaWebu("about_foto"), kontakt: fotkaWebu("kontakt_foto") },
    };
  }

  // Excel se načte jen jednou, i když o něj žádá víc částí stránky.
  let nacitani = null;
  window.M24Obsah = {
    nacti() {
      nacitani = nacitani || M24Xlsx.nacti(EXCEL).then(zpracuj);
      return nacitani;
    },
  };
})();
