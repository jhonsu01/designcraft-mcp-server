<p align="center"><img src="icon.png" width="120" alt="Icône de DesignCraft Bridge"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude mettre en page avec le <b>DesignCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  flyers, affiches, brochures, cartes et pages de livre, fusion de données, fichiers IDML d'InDesign, et PDF prêt pour l'impression, PNG, EPUB et HTML.
</p>

---

## Pourquoi

[DesignCraft](https://github.com/storytold/designcraft) est une application de PAO open source du niveau d'InDesign, avec une CLI sans interface (`designcraft-cli`), 444 commandes, l'import et l'export IDML et un mode MCP. Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier en entrée / fichier en sortie** pour Claude, pour demander par exemple :

> *« Fais un flyer A5 pour mon café : une photo, le nom en grandes lettres à empattements, les horaires et un tableau de prix, en PDF d'impression avec 3 mm de fond perdu. »*
> *« Crée un badge pour chaque personne de `equipe.csv`, avec sa photo, son nom et son poste. »*
> *« Imprime 30 étiquettes d'adresse par page à partir de cette liste. »*
> *« Dans `catalogue.idml`, remplace tous les '2025' par '2026', remplace Arial par Inter et exporte en PDF/X-4. »*
> *« Exporte tous les documents de `D:\Maquettes` en PDF et en pages PNG à 150 dpi. »*

Frère de [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) et [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| OS | Paquet DesignCraft à installer | Où le serveur le trouve (sans configuration) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portable | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'application) **plus** `designcraft-cli-<version>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur un Mac |

Tous les téléchargements : [versions de DesignCraft](https://github.com/storytold/designcraft/releases) (il existe aussi un tar.gz pour FreeBSD ; pointez `DESIGNCRAFT_DIR` dessus). Ailleurs : définissez `DESIGNCRAFT_DIR` (dossier, racine du `.tar.gz` ou `DesignCraft.app`) ou `DESIGNCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'application. Décompressez le zip séparé de `designcraft-cli` et déplacez `designcraft-cli` vers `/usr/local/bin` (ou pointez `DESIGNCRAFT_CLI` dessus). Le premier lancement vérifie en ligne la notarisation d'Apple.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'application, pas `designcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Pour une application AppImage, définissez `DESIGNCRAFT_APP` pour que `open_in_designcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Fonctionnement

| Partie | Ce que c'est |
| --- | --- |
| **Moteur DesignCraft** (`designcraft-cli mcp`) | Le moteur de DesignCraft lui-même : composeur de texte, styles, blocs, tableaux, fusion de données, contrôle en amont et les exportateurs PDF / IDML / EPUB / HTML. Lancé à neuf et **sans interface** pour chaque tâche avec des documents en mémoire, il ne touche jamais à l'application DesignCraft ni à un document ouvert. |
| **Serveur MCP** (Node.js) | 10 outils de haut niveau. Construit les documents à partir d'une simple liste d'éléments (positions par page, dans n'importe quelle unité), crée les nuances de couleur dont le moteur a besoin, place vos images par référence (elles sont seulement lues) et vérifie chaque sortie d'abord : DesignCraft lui-même remplacerait les fichiers existants sans prévenir. |
| **Application en direct** (facultatif) | `open_in_designcraft control=true` lance l'application avec son canal de contrôle local uniquement (port 7981) et `run_designcraft_commands live=true` la pilote. Le canal n'a pas de mot de passe : fermez l'application quand vous avez fini. |

## Outils

| Outil | Ce qu'il fait |
| --- | --- |
| `create_layout` | Un nouveau document (format prédéfini ou personnalisé, pages, pages en vis-à-vis, marges, colonnes, fond perdu, couleur de fond, styles de paragraphe) à partir d'éléments placés sur les pages : blocs de texte (police, style, corps, interlignage, approche, couleur, alignement, espacements, colonnes, alignement vertical), images (remplir / ajuster / étirer / centrer), rectangles, ellipses, polygones et lignes (fond, dégradé, contour, coins arrondis, opacité, ombre portée, habillage, rotation) et tableaux (ligne d'en-tête et sa couleur). Signale le texte en excès |
| `data_merge` | Un CSV ou une liste de lignes fusionnés dans un modèle `.designcraft` / `.idml` existant ou construit à partir d'éléments : texte `<<Champ>>` et champs d'image ; une page par enregistrement ou plusieurs enregistrements par page (étiquettes, cartes) |
| `export_document` | Un document, une liste ou un dossier → PDF (plage de pages, PDF/X-4, PDF/A-2b, fond perdu, traits de coupe, planches, balisé), pages PNG / JPG à toute résolution, IDML, EPUB (redistribuable ou fixe), HTML, PDF en livret, assemblage |
| `edit_document` | Rechercher / remplacer (aussi GREP), remplacer le texte d'un article, mettre de nouvelles images dans les blocs, remplacer des polices, ajouter des pages et des éléments ; enregistré comme nouvelle copie |
| `get_document_info` | Pages, éléments par page, articles (et texte en excès), styles, nuances, polices (y compris manquantes), liens (manquants, basse résolution), problèmes de contrôle en amont |
| `render_pages` | Pages montrées à Claude et, en option, enregistrées en PNG |
| `list_designcraft_catalog` | 444 commandes avec leurs paramètres, formats de page prédéfinis, disponibilité des polices (ou les polices d'un document), formats |
| `run_designcraft_commands` | N'importe quelles commandes du moteur plus `inspect_document`, `get_story`, `place_image`... dans une session (références `$steps[N].champ`), sans interface ou en direct, puis export |
| `open_in_designcraft` | Ouvre des documents dans l'application DesignCraft (avec le canal de contrôle en option) |
| `get_designcraft_status` | Plateforme, installation, version, commandes, application / port de contrôle |

| | |
| --- | --- |
| **Ouvre** | `.designcraft`, `.idml` d'InDesign ; place PNG, JPEG, WebP, GIF, TIFF, PDF et SVG ; fusionne CSV / TSV |
| **Exporte** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (redistribuable et à mise en page fixe), HTML, PDF en livret, dossier d'assemblage |

Les dimensions sont en **pt** sauf si `units` indique `mm`, `cm`, `in` ou `px` ; `x` / `y` se mesurent depuis le **coin supérieur gauche de chaque page** (par défaut : les marges). Inter, Source Sans 3 et Source Serif 4 sont fournies avec DesignCraft et fonctionnent sur tous les systèmes.

## Exemple

```json
{
  "name": "flyer-cafe",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Titre", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Texte", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café du Ñandú", "style": "Titre", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\cafe.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Torréfié chaque matin.\nDu lundi au samedi, 7:00–19:00.", "style": "Texte" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Boisson", "Prix"], ["Expresso", "2,50"], ["Cappuccino", "3,20"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Maquettes"
}
```

## Prérequis

- **DesignCraft** avec `designcraft-cli` (testé avec **0.5.0**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `designcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) et cliquez sur **Installer**.
3. Facultatif : si DesignCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `designcraft-cli` dans les paramètres de l'extension.

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/designcraft-mcp-server.git
cd designcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add designcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add designcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `DESIGNCRAFT_DIR` | Dossier de DesignCraft, l'un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `DesignCraft.app`. Par défaut : détection automatique |
| `DESIGNCRAFT_CLI` | Chemin de `designcraft-cli` / `designcraft-cli.exe` (prioritaire sur `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Chemin de l'application de bureau si elle est ailleurs (par ex. une AppImage Linux) |
| `DESIGNCRAFT_CONTROL_PORT` | Port de contrôle de l'application de bureau (7981 par défaut) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Nombre maximal de secondes par appel au moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sauf avec `overwrite: true` : un nom libre (`_2`) est utilisé dans les dossiers et un `output_path` existant est une erreur. Les documents, images et données sont seulement lus ; un document modifié n'est enregistré que comme nouvelle copie.
- Tous les chemins doivent être absolus. Le moteur tourne sans interface avec des documents en mémoire et ne touche jamais à l'application DesignCraft sauf avec `live: true`.
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé à la fin.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique des chemins Windows, macOS et Linux)
npm run test:e2e    # 26 vérifications de bout en bout via un vrai MCP stdio (images et CSV synthétiques)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
```

Test Linux dans Docker (décompressez d'abord `designcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. DesignCraft est © ses auteurs (Storytold), MIT ou Apache-2.0.
Ce projet n'est ni affilié ni approuvé par DesignCraft ou Storytold. InDesign est une marque d'Adobe.
