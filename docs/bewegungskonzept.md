# Bewegungskonzept – Kurzreferat Transaktionsanalyse

SK1 Mitarbeiterführung · PVA 3 · 26.10.2026 · Einzelpräsentation, 10 Min., online (MS Teams)

## 1 Leitidee: Bewegung = Transaktion

Die Transaktionsanalyse beschreibt, **wie Botschaften zwischen Ich-Zuständen hin- und hergehen**. Genau das zeigt die Bewegung: Ein Pfeil zeichnet sich in Sprechrichtung, der empfangende Ich-Zustand reagiert, gekreuzte Pfeile erzeugen einen Funken, und das Gespräch *kippt* sichtbar. Keine Bewegung ist Dekoration. Jede steht für einen Vorgang, den das Publikum verstehen soll.

## 2 Gestaltungsprinzipien

| # | Prinzip | Was es konkret heisst |
|---|---|---|
| 1 | **Bedeutung vor Effekt** | Jede Bewegung bildet einen Inhalt ab (Senden, Empfangen, Kippen, Verdecken). Wenn sich eine Bewegung nicht in einem Satz begründen lässt, fliegt sie raus. |
| 2 | **Ein Gedanke pro Klick** | Das Bild folgt der Stimme. Die vortragende Person bestimmt das Tempo, nichts läuft automatisch weiter. Pro Klick gibt es höchstens eine Hauptbewegung. |
| 3 | **Kontinuität ist der rote Faden** | Was bleibt, bewegt sich nicht: Agenda → Kapitelleiste, drei Ich-Zustände → zwei Personen, das Diagramm steht auf Folie 5–7 still und nur die Pfeile wechseln. |
| 4 | **Ruhig genug für Teams** | Geteilte Bildschirme laufen mit reduzierter Bildrate. Deshalb gilt: grosse, eher langsame Bewegungen (≥ 0,5 s), wenige Dauerschleifen, keine feinen Verläufe. |
| 5 | **Zugänglich und robust** | Die Präsentation läuft auch rückwärts sauber, Sprünge sind möglich, die Bewegung lässt sich reduzieren oder abschalten, sie läuft offline und lässt sich als PDF exportieren. |

## 3 Visuelle Grammatik

| Element | Bedeutung |
|---|---|
| Terrakotta `#b85a33` | Eltern-Ich (EL) |
| Blau `#2c6a8c` | Erwachsenen-Ich (ER) |
| Gelb `#e4b04a` | Kind-Ich (K) |
| Pfeil navy | Reiz |
| Pfeil terrakotta | Antwort |
| durchgezogen | soziale Ebene, also das *Gesagte* |
| gestrichelt | psychologische Ebene, also das *Gemeinte* |
| Leuchtring um einen Kreis | Dieser Ich-Zustand sendet gerade. |
| Pulsring | Dieser Ich-Zustand empfängt. |
| Neigung (Kippen) | Das Gespräch kippt. Leitmotiv auf Folie 1, 6 und 10. |

Die Kartenfarben auf Folie 8 und 10 entsprechen den physischen Karten EL / ER / K. Folie und Kamera sprechen damit dieselbe Sprache.

## 4 Bewegungsvokabular

Zwei Arten von Bewegung werden technisch bewusst getrennt:

- **Zustand** (`data-anim`, `data-mod`): Er beschreibt, was in einem Schritt sichtbar oder verändert ist. Umgesetzt als CSS-Transition, deshalb läuft er **vorwärts und rückwärts** und lässt sich anspringen.
- **Akzent** (`data-fx`): ein einmaliger Impuls (Puls, Schütteln, Funke). Er läuft **nur beim Vorwärtsklicken** und nur im Modus «voll». Wer zurückgeht oder springt, sieht direkt den ruhigen Endzustand.

| Name | Typ | Einsatz | Dauer | Kurve |
|---|---|---|---|---|
| `rise` | Zustand | Text erscheint von unten (Standard) | 520 ms | ease-out |
| `fade` | Zustand | Nebeninformation, Quellen | 520 ms | ease-out |
| `from-left` / `from-right` | Zustand | Sprecherrichtung im Dialog | 520 ms | ease-out |
| `pop` | Zustand | Ich-Zustände, Chips, Bubbles | 780 ms | spring |
| `stamp` | Zustand | Etikett «aus dem K» | 780 ms | spring |
| `flip` | Zustand | Antwortkarten (Echo der echten Karten) | 780 ms | ease-out |
| `wipe` / `wipe-down` | Zustand | Merksatz-Balken; «Gemeint» liegt *unter* «Gesagt» | 780 ms | ease-in-out |
| `line-x` / `line-y` | Zustand | Linien, Ø-50-Linie, Zitatbalken | 780 ms | ease-in-out |
| `grow` | Zustand | Balken des Egogramms | 780 ms | ease-out |
| `marker` | Zustand | Unterstreichung des Kernsatzes bzw. der Kritik | 780 ms | ease-in-out |
| `draw` | Zustand | Transaktionspfeil zeichnet sich, Spitze poppt am Ende | 950 ms | ease-in-out |
| `fan` | Zustand | Karten fächern auf | 780 ms | spring |
| `is-dimmed` / `is-muted` / `is-lifted` | Zustand | Fokus lenken: Rest tritt zurück, Lösung hebt sich ab | 780 ms | spring / ease-in-out |
| `is-tilted` | Zustand | Diagramm kippt (gekreuzte Transaktion) | 1,1 s | spring |
| `is-flowing` | Zustand | Pfeile fliessen weiter (Regel 1) | Schleife 1,6 s | linear |
| Morph | Übergang | Gleiche Objekte wandern zur nächsten Folie | 950 ms | ease-in-out |
| `pulse` | Akzent | Empfänger reagiert | ca. 860 ms | ease-out |
| `shake` | Akzent | gereizte Antwort | 520 ms | ease-out |
| `spark` | Akzent | Kreuzungspunkt | 700 ms | ease-out |
| `tip` | Akzent | Wort «kippen» kippt kurz | 1,4 s | ease-in-out |
| `typing` | Akzent | «… tippt» vor der Chat-Antwort | 900 ms | linear |
| `wobble` | Akzent | Daumen hoch | 900 ms | ease-in-out |

Alle Dauern und Kurven stehen als Tokens in [`assets/css/tokens.css`](../assets/css/tokens.css). Wer dort einen Wert ändert, ändert ihn überall.

## 5 Choreografie-Regeln

1. **Reihenfolge:** zuerst Titel, dann Kontext, dann Detail. Innerhalb einer Gruppe 110 ms versetzt (stagger).
2. **Klick-Zeitpunkt:** Geklickt wird *am Anfang* des Satzes, zu dem das Bild gehört, nicht danach.
3. **Eine Hauptbewegung:** Wenn ein Pfeil sich zeichnet, darf daneben höchstens eine Karte aufsteigen.
4. **Ausblenden ist schneller als Einblenden** und kommt ohne Verzögerung, damit Rückwärtsklicks sofort reagieren.
5. **Dauerschleifen nur mit Aussage:** Einzige Schleife ist das «Weiterfliessen» bei Regel 1.
6. **Die Kamera ist ein Medium:** Auf Folie 8 übernehmen die echten Karten. Mit **B** wird die Folie schwarz, das Publikum sieht nur noch die Person.

## 6 Rahmenbedingungen MS Teams

- **Teilen:** In Chrome oder Edge die Präsentation im Vollbild (**F**) öffnen und den Bildschirm oder das Fenster teilen. Die Referentenansicht (**P**) liegt auf dem zweiten Bildschirm oder neben dem geteilten Fenster.
- **Modus «Standout»:** Die vortragende Person wird vor die Folie gelegt. Mit **S** lässt sich der ungefähre Bereich einblenden. Danach die Werte `--safe-w` und `--safe-h` in `tokens.css` an die echte Aufnahme anpassen und prüfen, ob Regelkarten (Folie 5–7) und die ER-Karte (Folie 8) frei bleiben.
- **Bildrate und Kompression:** Bewegungen sind bewusst eher langsam gewählt. Falls die Übertragung ruckelt, mit **M** auf «reduziert» umschalten. Dann gibt es nur noch Überblendungen.
- **Pop-ups:** Beim ersten **P** das Pop-up für die Datei bzw. Seite erlauben.
- **Probedurchlauf:** einmal mit einer zweiten Person im Call testen und dabei auf Lesbarkeit, Ruckeln und den Standout-Bereich achten.

## 7 Bezug zum Bewertungsraster

| Kriterium (Raster SK1) | Beitrag des Bewegungsdesigns | Wo |
|---|---|---|
| Eingehaltener Zeitrahmen | Referentenansicht mit Timer, Plan je Folie (aus dem Skript), Status «Vorsprung / im Plan / knapp / über Plan» und Zeitleiste bis 10:00 | Referentenansicht |
| Gelungener Einstieg | Primacy: Das Zitat steht allein, der Kernsatz wird markiert, erst dann erscheint der Titel. Danach folgen die Chat-Szene mit Tipp-Anzeige und die Teams-Reaktion. | F1–2 |
| Nachvollziehbare Zielsetzung, Gliederung, Verlauf | ARA baut sich Schritt für Schritt auf. Die Agenda morpht in die Kapitelleiste und zeigt auf F4–8 den Stand, inkl. Punkte für die drei Transaktionsarten. | F3–8 |
| Erkennbarer roter Faden | Die Kreise aus F4 werden zu den zwei Personen, das Diagramm bleibt auf F5–7 stehen, die Szene aus F2 kehrt auf F6 zurück, und das Leitmotiv «kippen» zieht sich durch. | F1–10 |
| Professioneller Umgang mit Medien | Klicksteuerung inkl. Clicker, saubere Rückwärtsnavigation, Sprünge, Blackout, offline lauffähig, PDF-Export, reduzierbare Bewegung | gesamt |
| Professionell & abwechslungsreich geplanter Medieneinsatz | Wechsel zwischen Folie, Kamera (Karten, **B**), Teams-Reaktion, Diagramm- und Daten-Animation | F2, F8, F9, F10 |
| Aussagekräftige und ansprechende Visualisierung | Die Bewegung trägt Bedeutung: Senden und Empfangen, Kreuzen erzeugt einen Funken, das Gespräch kippt, das Gemeinte liegt «darunter». | F5–7 |
| Nachvollziehbare Argumentation, inhaltlich fundiert | Das Egogramm baut sich auf, die Lücken werden markiert, und die methodische Kritik an der Studie 2024 wird sichtbar unterstrichen statt versteckt. | F9 |
| Effektiver Abschluss | Recency: Zusammenfassung mit Mini-Icons der drei Arten, Essenz mit Leitmotiv, Kartenfächer als Echo der echten Karten | F10 |
| Freie Sprechweise, selbstsicheres Auftreten | Stichwort für den nächsten Klick, grosse Notizen und Vorschau in der Referentenansicht. Das Ablesen von den Folien entfällt. | Referentenansicht |
| Breiter Blickkontakt | Kamera-Momente (Karten, Blackout), die Folien tragen nur Schlüsselwörter | F2, F8, F10 |

## 8 Barrierefreiheit

- Das System-Setting «Bewegung reduzieren» wird respektiert (Modus «reduziert»). **M** wechselt manuell zwischen voll, reduziert und aus.
- Farbe ist nie die einzige Information: Ich-Zustände tragen immer auch ihr Kürzel (EL/ER/K), Ebenen unterscheiden sich durch durchgezogene bzw. gestrichelte Linien.
- Kontraste stammen aus der bestehenden Palette (navy auf creme, creme auf navy).

## 9 Offene Punkte und nächste Schritte

- [ ] Probedurchlauf mit Stoppuhr und Karten. Klick-Zeitpunkte und `data-delay`-Werte (z. B. Tipp-Anzeige auf F2) nach Gefühl feinjustieren.
- [ ] Standout-Bereich mit echter Kamera prüfen, Layout F5–8 bei Bedarf anpassen.
- [ ] Für den Offline-Betrieb die Schriften (Domine, Nunito Sans, OFL) lokal unter `assets/fonts` ablegen.
- [ ] Neu hinzugekommene, aus den Sprechernotizen abgeleitete Elemente bestätigen oder streichen: Reaktionszeile F7, Frage-Chip F8, Kartenfächer F10 (siehe Storyboard).
- [ ] Optional: Bildschirmaufnahme als Backup-Video. Optional: Diagramm für «Spiel» oder Fall Berger mit demselben Baukasten.
- [ ] Aus dem Skript: Erscheinungsjahre und Seitenzahlen auf der Quellenfolie ergänzen, Deck als PDF exportieren (`index.html?print` → Drucken).
