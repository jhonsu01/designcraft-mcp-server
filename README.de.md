<p align="center"><img src="icon.png" width="120" alt="DesignCraft-Bridge-Symbol"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lassen Sie Claude mit dem auf Ihrem Computer installierten <b>DesignCraft</b> Seiten gestalten — <b>Windows, macOS und Linux</b>:<br>
  Flyer, Plakate, Broschüren, Karten und Buchseiten, Datenzusammenführung, InDesign-IDML-Dateien sowie druckfertiges PDF, PNG, EPUB und HTML.
</p>

---

## Warum

[DesignCraft](https://github.com/storytold/designcraft) ist eine quelloffene DTP-Anwendung auf InDesign-Niveau mit einer CLI ohne Oberfläche (`designcraft-cli`), 444 Befehlen, IDML-Import und -Export und einem MCP-Modus. Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht aus dieser Engine **Datei-rein / Datei-raus-Werkzeuge** für Claude, sodass Sie etwa fragen können:

> *„Mach einen A5-Flyer für mein Café: ein Foto, den Namen in großer Serifenschrift, die Öffnungszeiten und eine Preistabelle, als Druck-PDF mit 3 mm Anschnitt.“*
> *„Erstelle für jede Person in `team.csv` ein Namensschild mit Foto, Name und Funktion.“*
> *„Drucke aus dieser Liste 30 Adressetiketten pro Seite.“*
> *„Ersetze in `katalog.idml` jedes ‚2025‘ durch ‚2026‘, tausche Arial gegen Inter und exportiere PDF/X-4.“*
> *„Exportiere alle Dokumente in `D:\Layouts` als PDF und als PNG-Seiten mit 150 dpi.“*

Geschwister von [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) und [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| Betriebssystem | Zu installierendes DesignCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI oder portables Zip | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `designcraft-cli-<version>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Alle Downloads: [DesignCraft-Releases](https://github.com/storytold/designcraft/releases) (es gibt auch ein FreeBSD-tar.gz; setzen Sie `DESIGNCRAFT_DIR` darauf). An jedem anderen Ort: `DESIGNCRAFT_DIR` (Ordner, `.tar.gz`-Wurzel oder `DesignCraft.app`) oder `DESIGNCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacken Sie das separate `designcraft-cli`-Zip und verschieben Sie `designcraft-cli` nach `/usr/local/bin` (oder setzen Sie `DESIGNCRAFT_CLI` darauf). Beim ersten Start wird Apples Notarisierung online geprüft.
- **Linux:** AppImage und Flatpak enthalten nur die App, nicht `designcraft-cli`; verwenden Sie deb, rpm oder tar.gz. Für eine AppImage-App setzen Sie `DESIGNCRAFT_APP`, damit `open_in_designcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Einrichtung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **DesignCraft-Engine** (`designcraft-cli mcp`) | DesignCrafts eigene Engine: Textsatz, Formate, Rahmen, Tabellen, Datenzusammenführung, Preflight und die PDF-/IDML-/EPUB-/HTML-Exporter. Wird für jeden Auftrag frisch und **ohne Oberfläche** mit Dokumenten im Speicher gestartet und berührt daher nie die DesignCraft-App oder ein geöffnetes Dokument. |
| **MCP-Server** (Node.js) | 10 Werkzeuge auf hoher Ebene. Baut Dokumente aus einer einfachen Elementliste (Positionen je Seite, in jeder Einheit), legt die Farbfelder an, die die Engine braucht, platziert Ihre Bilder per Verweis (sie werden nur gelesen) und prüft jede Ausgabe vorab: DesignCraft selbst würde vorhandene Dateien stillschweigend ersetzen. |
| **Live-App** (optional) | `open_in_designcraft control=true` startet die App mit ihrem nur lokal erreichbaren Steuerkanal (Port 7981), und `run_designcraft_commands live=true` steuert sie. Der Kanal hat kein Passwort: Schließen Sie die App, wenn Sie fertig sind. |

## Werkzeuge

| Werkzeug | Was es tut |
| --- | --- |
| `create_layout` | Ein neues Dokument (Vorgabe oder eigenes Format, Seiten, Doppelseiten, Ränder, Spalten, Anschnitt, Hintergrundfarbe, Absatzformate) aus Elementen auf den Seiten: Textrahmen (Schrift, Schnitt, Größe, Zeilenabstand, Laufweite, Farbe, Ausrichtung, Abstände, Spalten, vertikale Ausrichtung), Bilder (füllen / einpassen / strecken / zentrieren), Rechtecke, Ellipsen, Polygone und Linien (Fläche, Verlauf, Kontur, abgerundete Ecken, Deckkraft, Schlagschatten, Textumfluss, Drehung) und Tabellen (Kopfzeile und ihre Farbe). Meldet Übersatztext |
| `data_merge` | Eine CSV oder eine Liste von Zeilen, zusammengeführt mit einer vorhandenen `.designcraft`-/`.idml`-Vorlage oder einer aus Elementen gebauten: `<<Feld>>`-Text und Bildfelder; eine Seite pro Datensatz oder mehrere Datensätze pro Seite (Etiketten, Karten) |
| `export_document` | Ein Dokument, eine Liste oder ein Ordner → PDF (Seitenbereich, PDF/X-4, PDF/A-2b, Anschnitt, Schnittmarken, Druckbögen, getaggt), PNG-/JPG-Seiten in jeder Auflösung, IDML, EPUB (umfließend oder fest), HTML, Broschüren-PDF, Paket |
| `edit_document` | Suchen / Ersetzen (auch GREP), Text eines Textabschnitts ersetzen, neue Bilder in Rahmen setzen, Schriften ersetzen, Seiten und Elemente hinzufügen; als neue Kopie gespeichert |
| `get_document_info` | Seiten, Elemente je Seite, Textabschnitte (und Übersatz), Formate, Farbfelder, Schriften (auch fehlende), Verknüpfungen (fehlend, niedrige Auflösung), Preflight-Probleme |
| `render_pages` | Seiten, die Claude sieht und die optional als PNG gespeichert werden |
| `list_designcraft_catalog` | 444 Befehle mit Parametern, Seitenvorgaben, Verfügbarkeit von Schriften (oder die Schriften eines Dokuments), Formate |
| `run_designcraft_commands` | Beliebige Engine-Befehle plus `inspect_document`, `get_story`, `place_image`... in einer Sitzung (`$steps[N].feld`-Verweise), ohne Oberfläche oder live, anschließend Export |
| `open_in_designcraft` | Öffnet Dokumente in der DesignCraft-App (optional mit Steuerkanal) |
| `get_designcraft_status` | Plattform, Installation, Version, Befehle, App / Steuerport |

| | |
| --- | --- |
| **Öffnet** | `.designcraft`, InDesign-`.idml`; platziert PNG, JPEG, WebP, GIF, TIFF, PDF und SVG; führt CSV / TSV zusammen |
| **Exportiert** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (umfließend und mit festem Layout), HTML, Broschüren-PDF, Paketordner |

Maße sind in **pt**, sofern `units` nicht `mm`, `cm`, `in` oder `px` angibt; `x` / `y` werden von der **linken oberen Ecke jeder Seite** gemessen (Standard: die Ränder). Inter, Source Sans 3 und Source Serif 4 liegen DesignCraft bei und funktionieren auf jedem System.

## Beispiel

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Titel", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Text", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "Titel", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Fotos\\kaffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Jeden Morgen frisch geröstet.\nMontag bis Samstag, 7:00–19:00.", "style": "Text" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Getränk", "Preis"], ["Espresso", "2,50"], ["Cappuccino", "3,20"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## Voraussetzungen

- **DesignCraft** mit `designcraft-cli` (getestet mit **0.5.0**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Laden Sie `designcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest) herunter.
2. Doppelklicken Sie darauf (oder ziehen Sie sie in Claude Desktop → *Einstellungen → Erweiterungen*) und klicken Sie auf **Installieren**.
3. Optional: Liegt DesignCraft nicht an einem Standardort, geben Sie in den Einstellungen der Erweiterung den Ordner oder den Pfad zu `designcraft-cli` an.

### Claude Code / andere MCP-Clients

```bash
git clone https://github.com/jhonsu01/designcraft-mcp-server.git
cd designcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add designcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add designcraft -- node "$PWD/dist/bundle.cjs"
```

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `DESIGNCRAFT_DIR` | DesignCraft-Ordner, eine seiner ausführbaren Dateien, eine `.tar.gz`-Wurzel (mit `bin/`) oder `DesignCraft.app`. Standard: automatische Erkennung |
| `DESIGNCRAFT_CLI` | Pfad zu `designcraft-cli` / `designcraft-cli.exe` (hat Vorrang vor `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Pfad der Desktop-App, wenn sie woanders liegt (z. B. ein Linux-AppImage) |
| `DESIGNCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Aufruf (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`: In Ordnern wird ein freier Name (`_2`) verwendet, ein vorhandener `output_path` ist ein Fehler. Dokumente, Bilder und Daten werden nur gelesen; ein bearbeitetes Dokument wird nur als neue Kopie gespeichert.
- Alle Pfade müssen absolut sein. Die Engine läuft ohne Oberfläche mit Dokumenten im Speicher und berührt die DesignCraft-App nie, außer mit `live: true`.
- Alles läuft lokal ohne Netzwerkzugriff. Jeder Auftrag nutzt eine eigene Engine in einem temporären Ordner, der am Ende gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Ein-Datei-Bundle (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 26 End-to-End-Prüfungen über echtes MCP-stdio (synthetische Bilder und CSV)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
```

Linux-Test in Docker (zuerst `designcraft-<version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. DesignCraft ist © seiner Autoren (Storytold), MIT oder Apache-2.0.
Dieses Projekt ist weder mit DesignCraft noch mit Storytold verbunden oder von ihnen unterstützt. InDesign ist eine Marke von Adobe.
