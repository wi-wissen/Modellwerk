# Quellenübersicht – Beispielmodelle (abgerufen 2026-10-09)

Alle Titel, Beschreibungen und Programme sind eigene Formulierungen. Aus Quellen ohne offene Lizenz wurden nur Zahlenwerte/Fakten übernommen, kein Text. Keine Inhalte aus „Moebius“ oder von hoche-bw.de / Detlef Hoche.

| Beispiel (id) | Quelle | Lizenz (auf der Seite geprüft) | genutzt für |
|---|---|---|---|
| luchs-schneehase-lotka-volterra | [Stan Case Study „Predator-Prey Population Dynamics“ (B. Carpenter)](https://mc-stan.org/learn-stan/case-studies/lotka-volterra-predator-prey.html) | Text CC BY-NC 4.0, Code BSD-3 → **nur Fakten** (Felldaten 1900–1920 der Hudson's Bay Company, Parameterschätzung) | Daten, Parameter |
| | [Wikipedia (en): Lotka–Volterra equations](https://en.wikipedia.org/wiki/Lotka%E2%80%93Volterra_equations), [Wikipedia (de): Lotka-Volterra-Gleichungen](https://de.wikipedia.org/wiki/Lotka-Volterra-Gleichungen) | CC BY-SA 4.0 | Aufgabenidee |
| grippe-sir-schule | [Wikipedia (de): SIR-Modell](https://de.wikipedia.org/wiki/SIR-Modell), [Wikipedia (en): Compartmental models in epidemiology](https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology) | CC BY-SA 4.0 | Aufgabenidee, R0-Bereich Influenza |
| kaffee-abkuehlung-newton | [Wikipedia (en): Newton's law of cooling](https://en.wikipedia.org/wiki/Newton%27s_law_of_cooling) | CC BY-SA 4.0 | Aufgabenidee (k selbst gewählt) |
| fallschirmspringer-freier-fall-luftwiderstand | [Wikipedia (de): Fallschirmspringen](https://de.wikipedia.org/wiki/Fallschirmspringen), [Strömungswiderstandskoeffizient](https://de.wikipedia.org/wiki/Str%C3%B6mungswiderstandskoeffizient) | CC BY-SA 4.0 | Parameter (180 km/h, ~300 m in 10 s, cw 0,78) |
| federpendel-gedaempft | [Wikipedia (de): Federpendel](https://de.wikipedia.org/wiki/Federpendel) | CC BY-SA 4.0 | Aufgabenidee (T = 2π√(m/D)) |
| ibuprofen-wirkstoffspiegel | [Wikipedia (de): Ibuprofen](https://de.wikipedia.org/wiki/Ibuprofen) | CC BY-SA 4.0 | Parameter (HWZ 2–3 h, tmax 1–2 h, 400 mg, 1200 mg/Tag) |
| barium-137m-zerfall | [Wikipedia (de): Cäsium-Barium-Generator](https://de.wikipedia.org/wiki/C%C3%A4sium-Barium-Generator), [Caesium-137](https://de.wikipedia.org/wiki/Caesium-137) | CC BY-SA 4.0 | Aufgabenidee, Parameter (HWZ 2,552 min) |
| iss-umlaufbahn | [NASA NSSDCA: Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | keine Lizenzangabe auf der Seite; US-Bundesbehörde (17 U.S.C. § 105, gemeinfrei in den USA) → **nur Fakten** | Parameter (GM, Erdradius) |
| | [Wikipedia (de): Internationale Raumstation](https://de.wikipedia.org/wiki/Internationale_Raumstation) | CC BY-SA 4.0 | Parameter (Bahnhöhe, Umlaufzeit) |
| energiebilanz-erde-co2 | NASA Earth Fact Sheet (s. o.) | wie oben → **nur Fakten** | Parameter (1361 W/m², Albedo 0,294, 288 K) |
| | [Wikipedia (de): Strahlungsantrieb](https://de.wikipedia.org/wiki/Strahlungsantrieb), [Kohlenstoffdioxid in der Erdatmosphäre](https://de.wikipedia.org/wiki/Kohlenstoffdioxid_in_der_Erdatmosph%C3%A4re) | CC BY-SA 4.0 | Parameter (ΔF = 5,35·ln(C/C0), 280 ppm) |
| bevoelkerung-deutschland-geburten-sterbefaelle | [Destatis: Lebendgeborene und Gestorbene](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Geburten/Tabellen/lebendgeborene-gestorbene.html), [Destatis PM Nr. 221/2025](https://www.destatis.de/DE/Presse/Pressemitteilungen/2025/06/PD25_221_124.html) | Website: „© Statistisches Bundesamt (Destatis) … Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet“ (Impressum); GENESIS-Online: Datenlizenz Deutschland – Namensnennung – 2.0 → nur Zahlen, Quellennachweis nötig | Daten |

Lizenz-URLs: CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/ · CC BY-NC 4.0 https://creativecommons.org/licenses/by-nc/4.0/ · dl-de/by-2-0 https://www.govdata.de/dl-de/by-2-0

## Prüfung
Alle Programme wurden mit einem kleinen Interpreter (Python, double, Anweisungen pro Zeitschritt einmal von oben nach unten) nachgerechnet (`tools/sim.py`, `tools/defs.py`, `tools/detail.py`). `checks[].step` = Zustand nach n Schritten. Für die Satzmodelle wurde angenommen, dass das generierte Programm zuerst die „prop“-Zeilen, dann „zu/ab“, dann `Zeit := Zeit + 1` ausführt.
