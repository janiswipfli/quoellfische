# Quöllfische Steinen: Shot-Rangliste

Live-Rangliste für eure Party. Gruppen erfassen, pro Shot einen Punkt vergeben, die Rangliste läuft auf dem Beamer oder TV mit.

| Seite | Wofür |
|---|---|
| `index.html` | Rangliste für Beamer/TV (Top 3 auf dem Podest, restliche Gruppen mit Balken, Ticker der letzten Shots) |
| `steuerung.html` | Steuerung an der Bar: Gruppen erfassen, **+1 Shot**, −1, umbenennen, löschen, Backup |

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub erstellen (z. B. `shotboard`).
2. Inhalt dieses Ordners hochladen (Add file > Upload files), `index.html` muss im Hauptverzeichnis liegen.
3. Settings > Pages > Source: **Deploy from a branch**, Branch: `main`, Ordner: `/ (root)` > Save.
4. Nach ca. 1 Minute läuft die Seite unter `https://<dein-username>.github.io/shotboard/`.
   Steuerung: `https://<dein-username>.github.io/shotboard/steuerung.html`

## Setup an der Party

1. Laptop an den Beamer, **beide Seiten im selben Browser** öffnen.
2. `index.html` auf den Beamer-Bildschirm ziehen, Taste **F** für Vollbild.
3. `steuerung.html` bleibt auf dem Laptop-Screen. Jeder Klick auf **+1 Shot** erscheint sofort auf der Rangliste.

Wichtig: Die Daten liegen im Browser dieses Geräts (localStorage). Rangliste und Steuerung müssen darum auf **demselben Gerät im selben Browser** laufen. Handys oder Tablets sehen ihren eigenen, separaten Stand.

## Regeln der Rangliste

- Mehr Shots = weiter oben.
- Gleichstand: Wer den Punktestand zuerst erreicht hat, steht vorne.
- Jede Gruppe sieht, wie viele Shots bis zum nächsten Platz fehlen.
- Wechselt die Nummer 1, erscheint kurz eine Vollbild-Einblendung mit Krone.

## Sicherung

In der Steuerung unter *Einstellungen*: **Backup herunterladen** (JSON) und **Backup laden**. Vor dem Browser-Cache-Leeren oder Gerätewechsel unbedingt ein Backup ziehen.

## Offline

Alles ist lokal eingebunden (Logo, Schriften, Skripte). Nach dem ersten Laden funktioniert die Seite auch bei schlechtem WLAN. Alternativ lokal starten: im Ordner `python3 -m http.server` ausführen und `http://localhost:8000` öffnen.

## Dateien

```
index.html            Rangliste
steuerung.html        Steuerung
assets/logo.png       Logo Quöllfische Steinen (freigestellt, unverändert)
assets/logo-original.jpg
assets/wordmark.svg   Schriftzug QUÖLLFISCH (vom Shirt vektorisiert)
assets/crown.png      Krone aus dem Logo (für Platz 1)
assets/*.css, *.js    Design und Logik
assets/fonts/         Archivo und Syncopate (SIL Open Font License)
```
