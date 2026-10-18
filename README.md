# Transaktionsanalyse – Bewegungsdesign

Grundlage für ein animiertes Kurzreferat zur **Transaktionsanalyse** (SK1 Mitarbeiterführung, PVA 3, 26.10.2026, 10 Min. online in MS Teams).

Das Repo enthält die bestehende Präsentation als browserbasiertes Deck mit klickgesteuerter Choreografie und eine Referentenansicht mit Zeitplan. Dazu kommen ein Bewegungskonzept und ein Storyboard, die das Design auf das Bewertungsraster beziehen.

- **Bewegung = Transaktion:** Pfeile zeichnen sich in Sprechrichtung, Empfänger reagieren, gekreuzte Pfeile erzeugen einen Funken, das Gespräch *kippt*.
- **Roter Faden durch Morphs:** Die Agenda wird zur Kapitelleiste, die drei Ich-Zustände teilen sich auf zwei Personen auf, und das Diagramm bleibt über drei Folien stehen.
- **Für Teams gebaut:** ruhige Tempi, Blackout für Kamera-Momente mit den echten Karten, Hilfe für den Standout-Bereich, reduzierbare Bewegung.

## Schnellstart

1. `index.html` per Doppelklick in **Chrome oder Edge** öffnen. Ein Server ist nicht nötig.
2. Mit **→ / Leertaste / Klick** weiterschalten, **P** öffnet die Referentenansicht (Pop-up erlauben).
3. Für die Präsentation **F** (Vollbild) drücken und in Teams den Bildschirm bzw. das Fenster teilen.

Alternativ lokal mit Server (z. B. für Live-Reload-Tools):

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000` öffnen.

## Steuerung

| Taste | Funktion |
|---|---|
| `→` `Leertaste` `Bild ↓` `Enter` · Klick | nächster Schritt (Presenter-Clicker funktionieren) |
| `←` `Bild ↑` `Backspace` · Rechtsklick | vorheriger Schritt |
| `⇧ →` / `⇧ ←` | ganze Folie vor / zurück |
| `5` `Enter` | zu Folie 5 springen |
| `P` | Referentenansicht: Notizen, «Jetzt» und «Nächster Klick» als Vorschau, Stichwort, Timer gegen den Plan |
| `B` / `.` | Folie schwarz, damit die Kamera mit den Karten im Fokus steht |
| `F` | Vollbild |
| `M` | Bewegung: voll → reduziert → aus (wird gespeichert) |
| `S` | ungefährer Bereich der Referentin / des Referenten im Teams-Modus «Standout» |
| `H` / `?` | Hilfe |

In der Referentenansicht funktionieren die Pfeiltasten ebenfalls. Dazu kommen `T` (Timer Start/Pause), `R` (Reset) und `+`/`−` (Schriftgrösse der Notizen). Der Timer startet automatisch beim ersten Klick.

## PDF und Übersicht

- `index.html?print` zeigt alle Folien im Endzustand untereinander.
- Für ein PDF im Browser *Drucken → Als PDF sichern* wählen und «Hintergrundgrafiken» aktivieren. Das Seitenformat 1920 × 1080 ist hinterlegt.

## Projektstruktur

```
index.html                 Folien (Inhalt + Choreografie als data-Attribute + Sprechernotizen)
presenter.html             Referentenansicht
assets/css/tokens.css      Farben, Schriften, Bewegungs-Tokens (Dauern, Kurven)
assets/css/deck.css        Bühne, Folien-Grundlayout, Bedienelemente, Druck
assets/css/motion.css      Bewegungsvokabular (rise, pop, draw, flip, …) und Modi
assets/css/slides.css      Layouts der einzelnen Folien
assets/css/presenter.css   Referentenansicht
assets/js/motion.js        Bewegungsmodi, Akzente (data-fx), Morph zwischen Folien
assets/js/diagram.js       baut Transaktionspfeile aus data-from/data-to
assets/js/deck.js          Navigation, Schritte, Skalierung, Synchronisation
assets/js/presenter.js     Timer, Plan, Vorschau, Fernsteuerung
docs/bewegungskonzept.md   Leitidee, Prinzipien, Vokabular, Teams, Bezug zum Raster
docs/storyboard.md         jede Folie Klick für Klick mit Stichwort und Bewegung
```

Es gibt keine Abhängigkeiten und keinen Build-Schritt: reines HTML, CSS und JavaScript (Web Animations API).

## Animationen bearbeiten

Die Choreografie steht direkt im HTML:

```html
<p data-step="2" data-anim="rise" data-i="1" data-delay="300" data-cue="Relevanz">…</p>
```

| Attribut | Bedeutung |
|---|---|
| `data-step="2"` | sichtbar ab Schritt 2. `data-step="1-2"` heisst: nur in Schritt 1 bis 2. Kinder erben den Schritt. |
| `data-anim="rise"` | wie das Element erscheint: `fade` `rise` `from-left` `from-right` `pop` `stamp` `flip` `wipe` `wipe-down` `line-x` `line-y` `grow` `marker` `fan` `draw` |
| `data-i="1"` · `data-delay="300"` | Versatz in der Gruppe bzw. zusätzliche Verzögerung in ms |
| `data-mod="3:is-dimmed 1-1:is-sending"` | Klasse je Schritt-Bereich: `is-dimmed` `is-muted` `is-lifted` `is-tilted` `is-tilted-sm` `is-sending` `is-flowing` |
| `data-fx="pulse"` | Akzent beim Vorwärtsklicken: `pulse` `shake` `spark` `tip` `typing` `wobble` `count`. Mit `data-fx-step` und `data-fx-delay` |
| `data-morph="ego-er-l ego-er"` | Morph zum gleichen Schlüssel auf der Nachbarfolie. Mehrere Schlüssel erlauben das Aufteilen. |
| `data-cue="…"` | Stichwort für «Nächster Klick» in der Referentenansicht |

**Transaktionsdiagramme** entstehen deklarativ:

```html
<div class="diagram">
  <div class="ego ego--er" data-node="L.ER">ER</div> …
  <svg class="arrows">
    <g class="arrow arrow--reiz" data-from="L.ER" data-to="R.ER" data-offset="-18"
       data-step="1" data-anim="draw"></g>
    <g class="arrow arrow--antwort" data-from="R.K" data-to="L.EL" data-dashed
       data-step="2" data-anim="draw"></g>
  </svg>
</div>
```

Neue Diagramme (z. B. ein «Spiel» oder der Fall Berger) brauchen deshalb keinen neuen Code.

Dauern und Kurven ändert man zentral in `assets/css/tokens.css`. Eigene Akzente lassen sich mit `TA.motion.register('name', (el) => …)` ergänzen. Jeder Schrittwechsel löst zudem das Event `ta:change` aus.

## Dokumente

- [Bewegungskonzept](docs/bewegungskonzept.md): Leitidee, Prinzipien, Vokabular, Teams-Rahmenbedingungen, Bezug zum Bewertungsraster, offene Punkte
- [Storyboard](docs/storyboard.md): alle 45 Klicks mit Stichwort und Bewegung

## Hinweise

- Inhalte, Sprechernotizen und Zeitplan stammen aus dem bestehenden Deck und dem Skript zum Referat.
- Die Schriften Domine und Nunito Sans (SIL Open Font License) werden über Google Fonts geladen. Ohne Internet greifen Georgia bzw. Systemschriften.
- Das Daumen-Icon stammt von [Lucide](https://lucide.dev) (ISC-Lizenz).
