/* ==========================================================================
   Malá čtečka Excelu (.xlsx) – bez externích knihoven
   --------------------------------------------------------------------------
   Soubor .xlsx je ZIP archiv s XML soubory. Prohlížeč ho umí rozbalit sám
   (DecompressionStream), XML přečte DOMParser. Čteme jen to, co web potřebuje:
   názvy listů a hodnoty buněk (text, čísla, ANO/NE).

   Použití:  const listy = await M24Xlsx.nacti("obsah/obsah.xlsx");
             listy["Projekty"]  →  [ ["Zobrazit","Pořadí",…], ["ANO",10,…], … ]
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- ZIP ---------- */

  async function rozbalZip(buffer) {
    const data = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // konec centrálního adresáře (hledáme od konce souboru)
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (data.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Soubor není platný Excel (.xlsx).");

    const pocet = data.getUint16(eocd + 10, true);
    let pos = data.getUint32(eocd + 16, true);
    const soubory = {};
    const dekoder = new TextDecoder();

    for (let n = 0; n < pocet; n++) {
      const metoda = data.getUint16(pos + 10, true);
      const velikost = data.getUint32(pos + 20, true);
      const delkaJmena = data.getUint16(pos + 28, true);
      const delkaExtra = data.getUint16(pos + 30, true);
      const delkaKomentare = data.getUint16(pos + 32, true);
      const offset = data.getUint32(pos + 42, true);
      const jmeno = dekoder.decode(bytes.subarray(pos + 46, pos + 46 + delkaJmena));

      soubory[jmeno] = async () => {
        const lokJmeno = data.getUint16(offset + 26, true);
        const lokExtra = data.getUint16(offset + 28, true);
        const start = offset + 30 + lokJmeno + lokExtra;
        const obsah = bytes.subarray(start, start + velikost);
        if (metoda === 0) return dekoder.decode(obsah);
        if (metoda !== 8) throw new Error("Nepodporovaná komprese v souboru " + jmeno);
        const stream = new Blob([obsah]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return await new Response(stream).text();
      };
      pos += 46 + delkaJmena + delkaExtra + delkaKomentare;
    }
    return soubory;
  }

  /* ---------- XML ---------- */

  const parser = new DOMParser();
  const xml = (text) => parser.parseFromString(text, "application/xml");
  const vsechny = (uzel, tag) => Array.from(uzel.getElementsByTagNameNS("*", tag));
  const textUzlu = (uzel) => vsechny(uzel, "t").map((t) => t.textContent).join("");

  // "AB12" → 27 (index sloupce od 0)
  function sloupec(ref) {
    let n = 0;
    for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  async function nacti(url) {
    const odpoved = await fetch(url, { cache: "no-cache" });
    if (!odpoved.ok) throw new Error("Nepodařilo se stáhnout " + url + " (" + odpoved.status + ").");
    const zip = await rozbalZip(await odpoved.arrayBuffer());
    const cti = async (cesta) => (zip[cesta] ? xml(await zip[cesta]()) : null);

    // sdílené texty (Excel ukládá texty zvlášť a v buňkách jen odkazuje)
    const ss = await cti("xl/sharedStrings.xml");
    const sdilene = ss ? vsechny(ss, "si").map(textUzlu) : [];

    // názvy listů → soubory
    const wb = await cti("xl/workbook.xml");
    const rels = await cti("xl/_rels/workbook.xml.rels");
    const cile = {};
    vsechny(rels, "Relationship").forEach((r) => { cile[r.getAttribute("Id")] = r.getAttribute("Target"); });

    const listy = {};
    for (const list of vsechny(wb, "sheet")) {
      const rid = list.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")
        || list.getAttribute("r:id");
      let cesta = cile[rid] || "";
      cesta = cesta.startsWith("/") ? cesta.slice(1) : "xl/" + cesta.replace(/^\.\//, "");
      const dok = await cti(cesta);
      if (!dok) continue;

      const radky = [];
      for (const row of vsechny(dok, "row")) {
        const r = parseInt(row.getAttribute("r"), 10) - 1;
        const radek = [];
        for (const c of vsechny(row, "c")) {
          const typ = c.getAttribute("t");
          const v = vsechny(c, "v")[0];
          let hodnota = null;
          if (typ === "s" && v) hodnota = sdilene[parseInt(v.textContent, 10)];
          else if (typ === "inlineStr") hodnota = textUzlu(c);
          else if (typ === "b" && v) hodnota = v.textContent === "1";
          else if (typ === "str" && v) hodnota = v.textContent;
          else if (v) hodnota = Number(v.textContent);
          radek[sloupec(c.getAttribute("r"))] = hodnota;
        }
        radky[r] = radek;
      }
      listy[list.getAttribute("name")] = Array.from(radky, (r) => r || []);
    }
    return listy;
  }

  window.M24Xlsx = { nacti };
})();
