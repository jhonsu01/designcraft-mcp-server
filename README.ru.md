<p align="center"><img src="icon.png" width="120" alt="Значок DesignCraft Bridge"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude верстать страницы в <b>DesignCraft</b>, установленном на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  флаеры, плакаты, буклеты, визитки и книжные страницы, слияние данных, файлы IDML из InDesign, а также PDF для печати, PNG, EPUB и HTML.
</p>

---

## Зачем

[DesignCraft](https://github.com/storytold/designcraft) — программа настольной издательской системы с открытым исходным кодом уровня InDesign: консольный интерфейс без окна (`designcraft-cli`), 444 команды, импорт и экспорт IDML и режим MCP. Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает её движок в **инструменты «файл на входе — файл на выходе»** для Claude, чтобы можно было попросить, например:

> *«Сделай флаер A5 для моего кафе: фото, название крупным шрифтом с засечками, часы работы и таблица цен — PDF для печати с вылетом 3 мм».*
> *«Создай бейдж для каждого человека из `team.csv` с фото, именем и должностью».*
> *«Напечатай по этому списку 30 адресных наклеек на страницу».*
> *«В `catalog.idml` замени все „2025“ на „2026“, Arial — на Inter и экспортируй PDF/X-4».*
> *«Экспортируй все документы из `D:\Layouts` в PDF и в страницы PNG с разрешением 150 dpi».*

Родственные проекты: [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) и [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| ОС | Какой пакет DesignCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI или переносной zip | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **плюс** `designcraft-cli-<версия>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Все загрузки: [релизы DesignCraft](https://github.com/storytold/designcraft/releases) (есть и tar.gz для FreeBSD — укажите его в `DESIGNCRAFT_DIR`). В любом другом месте задайте `DESIGNCRAFT_DIR` (папка, корень `.tar.gz` или `DesignCraft.app`) или `DESIGNCRAFT_CLI`.

- **macOS:** в DMG только само приложение. Распакуйте отдельный zip с `designcraft-cli` и переместите `designcraft-cli` в `/usr/local/bin` (или укажите его в `DESIGNCRAFT_CLI`). При первом запуске нотаризация Apple проверяется через интернет.
- **Linux:** AppImage и Flatpak содержат только приложение, без `designcraft-cli`; используйте deb, rpm или tar.gz. Для приложения в AppImage задайте `DESIGNCRAFT_APP`, чтобы `open_in_designcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок DesignCraft** (`designcraft-cli mcp`) | Собственный движок DesignCraft: набор текста, стили, фреймы, таблицы, слияние данных, предпечатная проверка и экспорт в PDF / IDML / EPUB / HTML. Для каждой задачи запускается заново и **без окна**, с документами в памяти, поэтому никогда не трогает приложение DesignCraft или открытый документ. |
| **MCP-сервер** (Node.js) | 10 высокоуровневых инструментов. Собирает документы из простого списка элементов (позиции на каждой странице, в любых единицах), создаёт нужные движку образцы цвета, размещает ваши изображения по ссылке (они только читаются) и заранее проверяет каждый выходной файл: сам DesignCraft молча заменил бы существующие файлы. |
| **Приложение вживую** (по желанию) | `open_in_designcraft control=true` запускает приложение с каналом управления, доступным только локально (порт 7981), а `run_designcraft_commands live=true` управляет им. У канала нет пароля: закройте приложение, когда закончите. |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `create_layout` | Новый документ (готовый или свой формат, страницы, развороты, поля, колонки, вылеты, цвет фона, стили абзацев) из элементов на страницах: текстовые фреймы (шрифт, начертание, кегль, интерлиньяж, трекинг, цвет, выключка, отбивки, колонки, вертикальное выравнивание), изображения (заполнить / вписать / растянуть / по центру), прямоугольники, эллипсы, многоугольники и линии (заливка, градиент, обводка, скруглённые углы, прозрачность, тень, обтекание текстом, поворот) и таблицы (строка заголовка и её цвет). Сообщает о невместившемся тексте |
| `data_merge` | CSV или список строк, слитые с готовым шаблоном `.designcraft` / `.idml` или с шаблоном из элементов: текст `<<Поле>>` и поля изображений; одна страница на запись или несколько записей на странице (наклейки, визитки) |
| `export_document` | Документ, список или папка → PDF (диапазон страниц, PDF/X-4, PDF/A-2b, вылеты, метки обреза, развороты, теги), страницы PNG / JPG с любым разрешением, IDML, EPUB (адаптивный или фиксированный), HTML, PDF-брошюра, пакет |
| `edit_document` | Найти / заменить (в том числе GREP), заменить текст материала, вставить новые изображения во фреймы, заменить шрифты, добавить страницы и элементы; сохраняется как новая копия |
| `get_document_info` | Страницы, элементы на каждой странице, материалы (и невместившийся текст), стили, образцы, шрифты (в том числе отсутствующие), связи (отсутствующие, низкое разрешение), проблемы предпечатной проверки |
| `render_pages` | Страницы, которые видит Claude, с возможностью сохранить их в PNG |
| `list_designcraft_catalog` | 444 команды с параметрами, готовые форматы страниц, наличие шрифтов (или шрифты документа), форматы |
| `run_designcraft_commands` | Любые команды движка плюс `inspect_document`, `get_story`, `place_image`... в одном сеансе (ссылки `$steps[N].поле`), без окна или вживую, затем экспорт |
| `open_in_designcraft` | Открывает документы в приложении DesignCraft (по желанию — с каналом управления) |
| `get_designcraft_status` | Платформа, установка, версия, команды, приложение / порт управления |

| | |
| --- | --- |
| **Открывает** | `.designcraft`, `.idml` из InDesign; размещает PNG, JPEG, WebP, GIF, TIFF, PDF и SVG; сливает CSV / TSV |
| **Экспортирует** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (адаптивный и с фиксированной вёрсткой), HTML, PDF-брошюру, папку пакета |

Размеры указываются в **pt**, если в `units` не задано `mm`, `cm`, `in` или `px`; `x` / `y` отсчитываются от **левого верхнего угла каждой страницы** (по умолчанию — от полей). Шрифты Inter, Source Sans 3 и Source Serif 4 входят в DesignCraft и работают в любой системе.

## Пример

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Заголовок", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Текст", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Кофейня «Нанду»", "style": "Заголовок", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\coffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Обжариваем каждое утро.\nС понедельника по субботу, 7:00–19:00.", "style": "Текст" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Напиток", "Цена"], ["Эспрессо", "250"], ["Капучино", "320"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## Требования

- **DesignCraft** с `designcraft-cli` (проверено на **0.5.0**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `designcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. Дважды щёлкните по файлу (или перетащите его в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. По желанию: если DesignCraft установлен не в стандартное место, укажите его папку или путь к `designcraft-cli` в настройках расширения.

### Codex (OpenAI)

**Рекомендуется — маркетплейс (получает обновления):** *Плагины → Добавить → Добавить маркетплейс*, источник `jhonsu01/craft-marketplace`, ссылка `main`, затем установите **DesignCraft Bridge** из **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Новые версии приходят при обновлении маркетплейса. Или загрузите zip (Codex сохранит его в вашей учётной записи и отклонит более новый zip с тем же именем):

1. Скачайте `designcraft-mcp-server-<версия>-codex.zip` из [последнего релиза](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. В Codex: *Плагины → Добавить → Новый плагин*, выберите zip и нажмите **Добавить плагин**.
3. Codex запускает сервер через `node`, поэтому Node.js ≥ 20 должен быть в `PATH`. Если DesignCraft установлен не в стандартное место, задайте `DESIGNCRAFT_DIR` или `DESIGNCRAFT_CLI` как системные переменные окружения (у Codex нет формы настроек для локальных плагинов).

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `DESIGNCRAFT_DIR` | Папка DesignCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `DesignCraft.app`. По умолчанию: автоопределение |
| `DESIGNCRAFT_CLI` | Путь к `designcraft-cli` / `designcraft-cli.exe` (важнее, чем `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Путь к настольному приложению, если оно лежит в другом месте (например, AppImage в Linux) |
| `DESIGNCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Максимум секунд на один вызов движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются**, если не указано `overwrite: true`: в папках берётся свободное имя (`_2`), а существующий `output_path` вызывает ошибку. Документы, изображения и данные только читаются; изменённый документ сохраняется лишь как новая копия.
- Все пути должны быть абсолютными. Движок работает без окна с документами в памяти и никогда не трогает приложение DesignCraft, если не указано `live: true`.
- Всё выполняется локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая удаляется в конце.

## Разработка

```bash
npm run build       # TypeScript + бандл в одном файле (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 29 сквозных проверок через настоящий MCP stdio (синтетические изображения и CSV)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
npm run pack:codex  # zip-плагин для Codex
```

Проверка Linux в Docker (сначала распакуйте `designcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. DesignCraft © его авторы (Storytold), MIT или Apache-2.0.
Этот проект не связан с DesignCraft или Storytold и не одобрен ими. InDesign — товарный знак Adobe.
