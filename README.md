# M24 – web architekta

Klasický statický web: **HTML + CSS + JavaScript**. Žádný Python, žádné generování, žádná databáze.
Obsah (texty a projekty) je v **Excelu**, který si web při otevření sám načte. Fotky leží ve složkách.

```
index.html                  úvod: hero, Recent projects, Work, About, Call me
work.html                   přehled prací s filtrem podle roku
projekt.html                detail projektu (projekt.html?p=nazev-slozky)
ochrana-osobnich-udaju.html GDPR (vzorový text – zkontrolovat!)
404.html                    stránka „nenalezeno“

css/style.css               celý vzhled, rozdělený do očíslovaných sekcí
js/xlsx-ctecka.js           čte Excel přímo v prohlížeči (vlastní kód, bez knihoven)
js/obsah.js                 převede listy Excelu na data webu
js/web.js                   vloží data do stránek + mobilní menu a filtr
fonts/                      písmo Archivo (uložené na webu, licence OFL)
img/                        favicon, logo

obsah/obsah.xlsx            ← TEXTY a PROJEKTY (klient upravuje jen tohle…)
obsah/fotky/web/            ← …fotky úvodu, About a kontaktu
obsah/fotky/projekty/<složka>/  ← …a fotky projektů
```

Jak to funguje: v HTML je kostra stránky. Prvky s atributy `data-t="klic"`, `data-odstavce`,
`data-foto`… si `js/web.js` naplní textem z listu *Texty*. Seznamy projektů, mřížku a patičku
poskládá z listů *Projekty* a *Patička*. Layout a vzhled tedy upravuješ normálně v HTML a CSS.

---

## 1. Jak klient upravuje web

1. Otevře `obsah/obsah.xlsx`. První list **NÁVOD** všechno vysvětluje.
2. **Texty:** v listu *Texty* mění jen sloupec *Text*.
3. **Nový projekt:**
   - vytvoří složku `obsah/fotky/projekty/nazev-projektu/` (bez mezer a diakritiky),
   - nahraje do ní fotky `01.jpg`, `02.jpg`, … ideálně do 2400 px a 500 kB, protože web fotky sám nezmenšuje,
   - v listu *Projekty* přidá řádek se složkou, názvem, rokem, kategorií, textem a do sloupce *Fotky* napíše počet fotek (např. `5`) nebo jejich názvy (`01.jpg, 02.jpg`).
4. Excel a fotky nahraje na server (GitHub, viz níže). Změna je vidět hned, nic se negeneruje.

⚠️ Na serveru záleží na velkých a malých písmenech: `01.JPG` není `01.jpg`.
Když fotka chybí, dlaždice zůstane prázdná a v konzoli prohlížeče (F12) je napsané, kterou fotku web nenašel.

**Nahrání na GitHub bez programování:** na github.com otevřít repozitář → složka `obsah` →
*Add file → Upload files* → přetáhnout Excel nebo složku s fotkami → *Commit changes*.
Pohodlnější varianta je aplikace [GitHub Desktop](https://desktop.github.com): složka se chová jako běžná složka v počítači a změny se odešlou tlačítkem *Push*.

## 2. Náhled u sebe v počítači

Web načítá Excel, a to prohlížeč z obyčejného dvojkliku na `index.html` (adresa `file://`) z bezpečnostních důvodů nedovolí. Náhled proto spusť přes jednoduchý lokální server:

- **VS Code:** rozšíření *Live Server* → pravým na `index.html` → *Open with Live Server*, nebo
- **Terminál** (na Macu je Python předinstalovaný):
  ```bash
  cd cesta/k/m24-web
  python3 -m http.server 8000
  ```
  a pak otevřít http://localhost:8000

## 3. Nasazení na produkci (GitHub Pages + vlastní doména)

1. Na GitHubu založit repozitář (např. `m24-web`) a nahrát do něj celou složku.
   GitHub Pages zdarma vyžaduje **veřejný** repozitář. Nevadí to, jsou v něm jen věci, které jsou stejně na webu.
   Pokud ho chcete soukromý, použijte Netlify nebo Cloudflare Pages: stačí tam složku přetáhnout nebo propojit s GitHubem, build příkaz nechat prázdný a publish directory `.`.
2. *Settings → Pages → Source: Deploy from a branch → `main` / `(root)`* → Save.
3. U registrátora domény (Wedos, Forpsi, Active24…) nastavit DNS:
   - `www` → **CNAME** → `<uzivatel>.github.io`
   - `@` → **A** záznamy `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. *Settings → Pages → Custom domain* → `www.m24.cz` → po ověření zapnout **Enforce HTTPS**.
5. V `index.html` (meta `og:image`), `robots.txt` a `sitemap.xml` nahradit `www.m24.cz` skutečnou adresou.
6. Volitelně web přidat do [Google Search Console](https://search.google.com/search-console).

## 4. Co web obsahuje pro produkci

- responzivní layout (zlom na 700 px), mobilní menu, ovládání klávesnicí, „přeskočit na obsah“,
- líné načítání fotek, písmo uložené na webu, žádné externí služby ani cookies → **není potřeba cookie lišta**,
- favicon (i pro tmavý režim), ikona pro iPhone, `site.webmanifest`, `robots.txt`, `sitemap.xml`, stránka 404,
- `_headers` s bezpečnostními hlavičkami (použije je Netlify nebo Cloudflare, GitHub Pages je ignoruje),
- srozumitelná hláška, když se Excel nepodaří načíst.

## 5. Úpravy designu

- Barvy, mezery a velikosti písma: proměnné na začátku `css/style.css` (`:root`).
- Mobil: sekce *12* ve stejném souboru.
- Velké „M24“ v úvodu a logo jsou tvary vektorově převedené z písma Archivo (`<path>` přímo v HTML), takže nezávisí na načtení fontu.
- Ukázkové projekty `ukazka-01` … `ukazka-22` jsou jen výplň mřížky. Smažte je z Excelu i ze složky fotek.
- Hlavička a patička jsou v každém HTML souboru. Když měníš menu, uprav je ve všech pěti.

## 6. Právní minimum (Česko) – zkontrolovat před spuštěním

- **Identifikace podnikatele na webu** (§ 435 občanského zákoníku): jméno, **IČO**, sídlo nebo místo podnikání a zápis v rejstříku.
  U OSVČ se místo „spisové značky“ obvykle píše *„Fyzická osoba zapsaná v živnostenském rejstříku“*. DIČ jen u plátce DPH.
- **Fotky:** u realizací ověřit práva fotografa a souhlas investora se zveřejněním.
- **GDPR:** vzorová stránka počítá s tím, že web nemá formulář ani analytiku. Jméno a IČO v ní jsou napsané přímo v HTML, takže je uprav.
- Písmo Archivo má licenci SIL OFL a smí se používat komerčně i na webu.
