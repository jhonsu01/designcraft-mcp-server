<p align="center"><img src="icon.png" width="120" alt="DesignCraft Bridge 图标"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 用你电脑上安装的 <b>DesignCraft</b> 进行排版 —— <b>Windows、macOS 和 Linux</b>：<br>
  传单、海报、宣传册、名片和书页，数据合并，InDesign IDML 文件，以及可直接印刷的 PDF、PNG、EPUB 和 HTML。
</p>

---

## 为什么

[DesignCraft](https://github.com/storytold/designcraft) 是一款开源的 InDesign 级桌面出版软件，提供无界面命令行（`designcraft-cli`）、444 条命令、IDML 导入导出以及 MCP 模式。这个 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把该引擎变成 Claude 可用的 **"输入文件 / 输出文件" 工具**，你可以这样提问：

> *"为我的咖啡馆做一张 A5 传单：一张照片、大号衬线字体的店名、营业时间和价目表，导出带 3 mm 出血的印刷 PDF。"*
> *"为 `team.csv` 中的每个人制作一张胸牌，包含照片、姓名和职位。"*
> *"根据这份名单，每页打印 30 张地址标签。"*
> *"把 `catalog.idml` 中所有 '2025' 改成 '2026'，把 Arial 换成 Inter，并导出 PDF/X-4。"*
> *"把 `D:\Layouts` 中的所有文档导出为 PDF 和 150 dpi 的 PNG 页面。"*

同系列项目：[effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server)、[lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server)、[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) 和 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 平台

| 系统 | 需要安装的 DesignCraft 包 | 服务器自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI 或便携 zip | `C:\Program Files\DesignCraft`、`%LOCALAPPDATA%\Programs\DesignCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/designcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**加上** `designcraft-cli-<版本>-macos-universal.zip` | `/Applications/DesignCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上测试 |

全部下载：[DesignCraft 发布页](https://github.com/storytold/designcraft/releases)（另有 FreeBSD 的 tar.gz，将 `DESIGNCRAFT_DIR` 指向它即可）。其他位置：设置 `DESIGNCRAFT_DIR`（文件夹、`.tar.gz` 根目录或 `DesignCraft.app`）或 `DESIGNCRAFT_CLI`。

- **macOS：** DMG 只包含应用。解压单独的 `designcraft-cli` zip，把 `designcraft-cli` 移到 `/usr/local/bin`（或用 `DESIGNCRAFT_CLI` 指向它）。首次运行会联网检查 Apple 公证。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `designcraft-cli`；请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `DESIGNCRAFT_APP`，以便 `open_in_designcraft` 能启动它。在没有 GPU 的服务器上，已验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`。

## 工作原理

| 组成 | 说明 |
| --- | --- |
| **DesignCraft 引擎**（`designcraft-cli mcp`） | DesignCraft 自己的引擎：文本排版、样式、框架、表格、数据合并、印前检查以及 PDF / IDML / EPUB / HTML 导出器。每个任务都会以**无界面**方式重新启动，文档只在内存中，因此绝不会影响 DesignCraft 应用或已打开的文档。 |
| **MCP 服务器**（Node.js） | 10 个高层工具。用简单的元素列表（每页的位置，任意单位）构建文档，创建引擎所需的色板，按引用置入你的图片（只读取），并在写出前检查每个输出：DesignCraft 本身会悄悄覆盖已有文件。 |
| **实时应用**（可选） | `open_in_designcraft control=true` 启动应用并开启仅限本机的控制通道（端口 7981），`run_designcraft_commands live=true` 即可操控它。该通道没有密码：用完请关闭应用。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `create_layout` | 新建文档（预设或自定义尺寸、页数、对页、边距、分栏、出血、背景色、段落样式），由放在各页上的元素组成：文本框（字体、字形、字号、行距、字距、颜色、对齐、段前段后、分栏、垂直对齐）、图片（填充 / 适合 / 拉伸 / 居中）、矩形、椭圆、多边形和线条（填色、渐变、描边、圆角、不透明度、投影、文本绕排、旋转）以及表格（表头行及其颜色）。会报告溢流文本 |
| `data_merge` | 把 CSV 或行列表合并到现有的 `.designcraft` / `.idml` 模板或由元素构建的模板：`<<字段>>` 文本和图片字段；每条记录一页，或每页多条记录（标签、名片） |
| `export_document` | 单个文档、列表或文件夹 → PDF（页面范围、PDF/X-4、PDF/A-2b、出血、裁切标记、跨页、带标签）、任意分辨率的 PNG / JPG 页面、IDML、EPUB（可重排或固定版式）、HTML、小册子 PDF、打包 |
| `edit_document` | 查找 / 替换（也支持 GREP）、替换文章文本、在框架中放入新图片、替换字体、添加页面和元素；另存为新副本 |
| `get_document_info` | 页面、每页的元素、文章（及溢流）、样式、色板、字体（包括缺失字体）、链接（缺失、低分辨率）、印前检查问题 |
| `render_pages` | 把页面展示给 Claude，并可选择保存为 PNG |
| `list_designcraft_catalog` | 444 条命令及参数、页面预设、字体是否可用（或文档使用的字体）、格式 |
| `run_designcraft_commands` | 在一个会话中运行任意引擎命令以及 `inspect_document`、`get_story`、`place_image`...（支持 `$steps[N].字段` 引用），可无界面或实时，然后导出 |
| `open_in_designcraft` | 在 DesignCraft 应用中打开文档（可选开启控制通道） |
| `get_designcraft_status` | 平台、安装位置、版本、命令数、应用 / 控制端口 |

| | |
| --- | --- |
| **打开** | `.designcraft`、InDesign `.idml`；置入 PNG、JPEG、WebP、GIF、TIFF、PDF 和 SVG；合并 CSV / TSV |
| **导出** | PDF（PDF/X-4、PDF/A-2b）、PNG、JPG、IDML、`.designcraft`、EPUB（可重排和固定版式）、HTML、小册子 PDF、打包文件夹 |

尺寸单位为 **pt**，除非 `units` 指定为 `mm`、`cm`、`in` 或 `px`；`x` / `y` 从**每页左上角**开始量（默认：边距处）。Inter、Source Sans 3 和 Source Serif 4 随 DesignCraft 内置，在任何系统上都可用。

## 示例

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "标题", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "正文", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "标题", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\coffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "每天早晨新鲜烘焙。\n周一至周六 7:00–19:00。", "style": "正文" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["饮品", "价格"], ["浓缩咖啡", "18"], ["卡布奇诺", "25"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## 要求

- 带 `designcraft-cli` 的 **DesignCraft**（已用 **0.5.0** 测试）；见[平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时由 Claude Desktop 自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从[最新发布](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest)下载 `designcraft-mcp-server.mcpb`。
2. 双击它（或拖入 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 DesignCraft 不在标准位置，在扩展设置中填写其文件夹或 `designcraft-cli` 的路径。

### Codex（OpenAI）

1. 从[最新发布](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest)下载 `designcraft-mcp-server-<版本>-codex.zip`。
2. 在 Codex 中：*插件 → 添加 → 新插件*，选择该 zip，然后点击 **添加插件**。
3. Codex 用 `node` 启动服务器，因此 `PATH` 中必须有 Node.js ≥ 20。如果 DesignCraft 不在标准位置，请把 `DESIGNCRAFT_DIR` 或 `DESIGNCRAFT_CLI` 设为系统环境变量（Codex 没有本地插件的设置表单）。

### Claude Code / 其他 MCP 客户端

```bash
git clone https://github.com/jhonsu01/designcraft-mcp-server.git
cd designcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add designcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add designcraft -- node "$PWD/dist/bundle.cjs"
```

## 配置

| 变量 | 含义 |
| --- | --- |
| `DESIGNCRAFT_DIR` | DesignCraft 文件夹、其中某个可执行文件、`.tar.gz` 根目录（含 `bin/`）或 `DesignCraft.app`。默认：自动检测 |
| `DESIGNCRAFT_CLI` | `designcraft-cli` / `designcraft-cli.exe` 的路径（优先于 `DESIGNCRAFT_DIR`） |
| `DESIGNCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `DESIGNCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 7981） |
| `DESIGNCRAFT_MCP_TIMEOUT` | 每次调用引擎的最长秒数（默认 3600） |

## 安全

- 除非 `overwrite: true`，文件**绝不会被覆盖**：在文件夹中会使用空闲的名称（`_2`），已存在的 `output_path` 会报错。文档、图片和数据只读取；编辑后的文档只会另存为新副本。
- 所有路径必须是绝对路径。引擎以无界面方式运行，文档只在内存中，除非 `live: true`，绝不会影响 DesignCraft 应用。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎，运行在结束后会被删除的临时文件夹中。

## 开发

```bash
npm run build       # TypeScript + 单文件 bundle（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS 和 Linux 路径逻辑）
npm run test:e2e    # 通过真实 MCP stdio 的 28 项端到端检查（合成图片和 CSV）
npm run pack:mcpb   # designcraft-mcp-server.mcpb
npm run pack:codex  # Codex 插件 zip
```

在 Docker 中测试 Linux（先解压 `designcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。DesignCraft 版权归其作者（Storytold）所有，采用 MIT 或 Apache-2.0。
本项目与 DesignCraft 或 Storytold 无关，也未获其认可。InDesign 是 Adobe 的商标。
