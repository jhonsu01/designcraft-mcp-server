<p align="center"><img src="icon.png" width="120" alt="Icono de DesignCraft Bridge"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude maquete páginas con el <b>DesignCraft</b> instalado en tu equipo — <b>Windows, macOS y Linux</b>:<br>
  volantes, pósteres, folletos, tarjetas y páginas de libro, combinación de datos, archivos IDML de InDesign y PDF listo para imprenta, PNG, EPUB y HTML.
</p>

---

## Por qué

[DesignCraft](https://github.com/storytold/designcraft) es una aplicación de autoedición de código abierto al estilo de InDesign, con una CLI sin interfaz (`designcraft-cli`), 444 comandos, importación y exportación IDML y un modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo de entrada / archivo de salida** para Claude, para que puedas pedir cosas como:

> *"Haz un volante A5 para mi café: una foto, el nombre en letras serif grandes, el horario y una tabla de precios, como PDF de imprenta con 3 mm de sangrado."*
> *"Crea un gafete para cada persona de `equipo.csv`, con su foto, nombre y cargo."*
> *"Imprime 30 etiquetas de dirección por página a partir de esta lista."*
> *"En `catalogo.idml`, cambia todos los '2025' por '2026', reemplaza Arial por Inter y exporta PDF/X-4."*
> *"Exporta todos los documentos de `D:\Maquetas` como PDF y como páginas PNG a 150 ppp."*

Hermano de [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) y [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| SO | Paquete de DesignCraft que instalar | Dónde lo encuentra el servidor (sin configurar nada) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI o zip portable | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `designcraft-cli-<versión>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Todas las descargas: [versiones de DesignCraft](https://github.com/storytold/designcraft/releases) (también hay un tar.gz para FreeBSD; apunta `DESIGNCRAFT_DIR` a él). En cualquier otra ubicación: define `DESIGNCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `DesignCraft.app`) o `DESIGNCRAFT_CLI`.

- **macOS:** el DMG solo contiene la app. Descomprime el zip aparte de `designcraft-cli` y mueve `designcraft-cli` a `/usr/local/bin` (o apunta `DESIGNCRAFT_CLI` a él). La primera ejecución comprueba en línea la notarización de Apple.
- **Linux:** la AppImage y el Flatpak solo contienen la app, no `designcraft-cli`; usa el deb, el rpm o el tar.gz. Para una app AppImage, define `DESIGNCRAFT_APP` para que `open_in_designcraft` pueda abrirla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de DesignCraft** (`designcraft-cli mcp`) | El propio motor de DesignCraft: compositor de texto, estilos, marcos, tablas, combinación de datos, verificación previa y los exportadores PDF / IDML / EPUB / HTML. Se inicia limpio y **sin interfaz** en cada tarea con documentos en memoria, así que nunca toca la app de DesignCraft ni un documento abierto. |
| **Servidor MCP** (Node.js) | 10 herramientas de alto nivel. Construye documentos a partir de una lista sencilla de elementos (posiciones por página, en cualquier unidad), crea las muestras de color que necesita el motor, coloca tus imágenes por referencia (solo se leen) y comprueba antes cada salida: DesignCraft por sí solo reemplazaría archivos existentes sin avisar. |
| **App en vivo** (opcional) | `open_in_designcraft control=true` abre la app con su canal de control solo local (puerto 7981) y `run_designcraft_commands live=true` la maneja. El canal no tiene contraseña: cierra la app cuando termines. |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `create_layout` | Un documento nuevo (tamaño predefinido o propio, páginas, páginas enfrentadas, márgenes, columnas, sangrado, color de fondo, estilos de párrafo) a partir de elementos colocados en páginas: marcos de texto (fuente, estilo, tamaño, interlineado, tracking, color, alineación, espaciado, columnas, alineación vertical), imágenes (rellenar / encajar / estirar / centrar), rectángulos, elipses, polígonos y líneas (relleno, degradado, trazo, esquinas redondeadas, opacidad, sombra, ceñido de texto, rotación) y tablas (fila de encabezado y su color). Informa del texto desbordado |
| `data_merge` | Un CSV o una lista de filas combinados en una plantilla `.designcraft` / `.idml` existente o creada a partir de elementos: texto `<<Campo>>` y campos de imagen; una página por registro o varios registros por página (etiquetas, tarjetas) |
| `export_document` | Un documento, una lista o una carpeta → PDF (rango de páginas, PDF/X-4, PDF/A-2b, sangrado, marcas de corte, pliegos, etiquetado), páginas PNG / JPG a cualquier resolución, IDML, EPUB (fluido o fijo), HTML, PDF en cuadernillo, paquete |
| `edit_document` | Buscar / cambiar (también GREP), reemplazar el texto de un artículo, poner imágenes nuevas en marcos, reemplazar fuentes, añadir páginas y elementos; se guarda como copia nueva |
| `get_document_info` | Páginas, elementos por página, artículos (y desbordes), estilos, muestras, fuentes (también las que faltan), vínculos (faltantes, baja resolución), problemas de verificación previa |
| `render_pages` | Páginas que Claude puede ver y, opcionalmente, guardadas como PNG |
| `list_designcraft_catalog` | 444 comandos con parámetros, tamaños de página predefinidos, disponibilidad de fuentes (o las fuentes que usa un documento), formatos |
| `run_designcraft_commands` | Cualquier comando del motor más `inspect_document`, `get_story`, `place_image`... en una sesión (referencias `$steps[N].campo`), sin interfaz o en vivo, y después exporta |
| `open_in_designcraft` | Abre documentos en la app de DesignCraft (opcionalmente con el canal de control) |
| `get_designcraft_status` | Plataforma, instalación, versión, comandos, app / puerto de control |

| | |
| --- | --- |
| **Abre** | `.designcraft`, `.idml` de InDesign; coloca PNG, JPEG, WebP, GIF, TIFF, PDF y SVG; combina CSV / TSV |
| **Exporta** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (fluido y de diseño fijo), HTML, PDF en cuadernillo, carpeta de paquete |

Las medidas van en **pt** salvo que `units` diga `mm`, `cm`, `in` o `px`; `x` / `y` se miden desde la **esquina superior izquierda de cada página** (por defecto: los márgenes). Inter, Source Sans 3 y Source Serif 4 vienen incluidas en DesignCraft y funcionan en cualquier sistema.

## Ejemplo

```json
{
  "name": "volante-cafe",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Título", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Cuerpo", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "Título", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Fotos\\cafe.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Tostado cada mañana.\nDe lunes a sábado, 7:00–19:00.", "style": "Cuerpo" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Bebida", "Precio"], ["Espresso", "2,50"], ["Capuchino", "3,20"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Maquetas"
}
```

## Requisitos

- **DesignCraft** con `designcraft-cli` (probado con **0.5.0**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `designcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si DesignCraft no está en una ubicación estándar, indica su carpeta o la ruta de `designcraft-cli` en la configuración de la extensión.

### Codex (OpenAI)

1. Descarga `designcraft-mcp-server-<versión>-codex.zip` de la [última versión](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. En Codex: *Complementos → Añadir → Nuevo complemento*, elige el zip y pulsa **Añadir complemento**.
3. Codex arranca el servidor con `node`, así que Node.js ≥ 20 debe estar en el `PATH`. Si DesignCraft no está en una ubicación estándar, define `DESIGNCRAFT_DIR` o `DESIGNCRAFT_CLI` como variables de entorno del sistema (Codex no tiene formulario de configuración para complementos locales).

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `DESIGNCRAFT_DIR` | Carpeta de DesignCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `DesignCraft.app`. Por defecto: detección automática |
| `DESIGNCRAFT_CLI` | Ruta de `designcraft-cli` / `designcraft-cli.exe` (tiene prioridad sobre `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Ruta de la app de escritorio cuando está en otro sitio (p. ej. una AppImage de Linux) |
| `DESIGNCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Segundos máximos por llamada al motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`: en carpetas se usa un nombre libre (`_2`) y un `output_path` existente es un error. Los documentos, imágenes y datos solo se leen; un documento editado solo se guarda como copia nueva.
- Todas las rutas deben ser absolutas. El motor se ejecuta sin interfaz con documentos en memoria y nunca toca la app de DesignCraft salvo con `live: true`.
- Todo se ejecuta en local, sin acceso a la red. Cada tarea usa un motor privado en una carpeta temporal que se borra al final.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 28 comprobaciones de extremo a extremo sobre MCP stdio real (imágenes y CSV sintéticos)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
npm run pack:codex  # zip de complemento para Codex
```

Prueba de Linux en Docker (descomprime antes `designcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. DesignCraft es © de sus autores (Storytold), MIT o Apache-2.0.
Este proyecto no está afiliado ni respaldado por DesignCraft ni Storytold. InDesign es una marca de Adobe.
