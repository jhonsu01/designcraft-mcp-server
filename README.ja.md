<p align="center"><img src="icon.png" width="120" alt="DesignCraft Bridge のアイコン"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  お使いのコンピューターにインストールされた <b>DesignCraft</b> で、Claude にページレイアウトを任せましょう — <b>Windows、macOS、Linux</b> 対応：<br>
  チラシ、ポスター、パンフレット、名刺、書籍のページ、データ結合、InDesign の IDML ファイル、そして入稿用 PDF、PNG、EPUB、HTML。
</p>

---

## なぜ

[DesignCraft](https://github.com/storytold/designcraft) は、InDesign クラスのオープンソース DTP アプリです。画面なしで動く CLI（`designcraft-cli`）、444 のコマンド、IDML の読み込みと書き出し、MCP モードを備えています。この [Model Context Protocol](https://modelcontextprotocol.io) サーバーはそのエンジンを Claude 用の **「ファイルを入れてファイルを出す」ツール** にするので、次のように頼めます：

> *「カフェの A5 チラシを作って。写真、大きなセリフ体の店名、営業時間、価格表を入れて、塗り足し 3 mm の入稿用 PDF にして。」*
> *「`team.csv` の全員分の名札を、写真・名前・役職入りで作って。」*
> *「このリストから 1 ページ 30 枚の宛名ラベルを作って。」*
> *「`catalog.idml` の '2025' をすべて '2026' に変え、Arial を Inter に置き換えて PDF/X-4 で書き出して。」*
> *「`D:\Layouts` のすべてのドキュメントを PDF と 150 dpi の PNG ページで書き出して。」*

姉妹プロジェクト：[effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server)、[lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server)、[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server)、[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 対応プラットフォーム

| OS | インストールする DesignCraft パッケージ | サーバーが探す場所（設定不要） | 状態 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI またはポータブル zip | `C:\Program Files\DesignCraft`、`%LOCALAPPDATA%\Programs\DesignCraft`、`PATH` | ✅ 検証済み（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` または `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/designcraft/bin`、`~/.local/bin`、`PATH` | ✅ 検証済み（Debian 12、画面なし） |
| **macOS** 11+（Apple シリコンと Intel） | `.dmg`（アプリ）**に加えて** `designcraft-cli-<バージョン>-macos-universal.zip` | `/Applications/DesignCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 対応済み、Mac では未検証 |

ダウンロード：[DesignCraft のリリース](https://github.com/storytold/designcraft/releases)（FreeBSD 用の tar.gz もあります。`DESIGNCRAFT_DIR` で指定してください）。それ以外の場所なら `DESIGNCRAFT_DIR`（フォルダー、`.tar.gz` のルート、`DesignCraft.app`）または `DESIGNCRAFT_CLI` を設定します。

- **macOS：** DMG にはアプリしか入っていません。別配布の `designcraft-cli` の zip を展開し、`designcraft-cli` を `/usr/local/bin` に移動してください（または `DESIGNCRAFT_CLI` で指定）。初回起動時に Apple の公証がオンラインで確認されます。
- **Linux：** AppImage と Flatpak にはアプリしか入っておらず、`designcraft-cli` は含まれません。deb、rpm、tar.gz を使ってください。アプリが AppImage の場合は、`open_in_designcraft` が起動できるよう `DESIGNCRAFT_APP` を設定します。GPU のないサーバーでの検証環境では `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig` を使いました。

## 仕組み

| 構成要素 | 内容 |
| --- | --- |
| **DesignCraft エンジン**（`designcraft-cli mcp`） | DesignCraft 自身のエンジン：文字組み、スタイル、フレーム、表、データ結合、プリフライト、そして PDF / IDML / EPUB / HTML の書き出し。ジョブごとにメモリ上のドキュメントで **画面なし** で新しく起動するため、DesignCraft アプリや開いているドキュメントには一切触れません。 |
| **MCP サーバー**（Node.js） | 10 個の高水準ツール。シンプルな要素リスト（ページごとの位置、任意の単位）からドキュメントを組み立て、エンジンが必要とするカラースウォッチを作り、画像を参照で配置し（読み取るだけ）、書き出す前にすべての出力先を確認します。DesignCraft 単体では既存ファイルを黙って上書きしてしまうためです。 |
| **ライブアプリ**（任意） | `open_in_designcraft control=true` でアプリをローカル専用の制御チャネル（ポート 7981）付きで起動し、`run_designcraft_commands live=true` で操作します。チャネルにはパスワードがないので、作業が終わったらアプリを閉じてください。 |

## ツール

| ツール | 機能 |
| --- | --- |
| `create_layout` | ページに配置した要素から新規ドキュメントを作成（プリセットまたは任意のサイズ、ページ数、見開き、マージン、段組み、塗り足し、背景色、段落スタイル）：テキストフレーム（フォント、スタイル、サイズ、行送り、トラッキング、色、揃え、段落前後のアキ、段組み、縦揃え）、画像（塗りつぶし / 収める / 引き伸ばし / 中央）、長方形、楕円、多角形、線（塗り、グラデーション、線、角丸、不透明度、ドロップシャドウ、テキストの回り込み、回転）、表（見出し行とその色）。オーバーセットテキストも報告します |
| `data_merge` | CSV または行のリストを、既存の `.designcraft` / `.idml` テンプレートや要素から作ったテンプレートに結合：`<<フィールド>>` テキストと画像フィールド。1 レコード 1 ページ、または 1 ページに複数レコード（ラベル、名刺） |
| `export_document` | 1 つのドキュメント、リスト、フォルダー → PDF（ページ範囲、PDF/X-4、PDF/A-2b、塗り足し、トンボ、見開き、タグ付き）、任意の解像度の PNG / JPG ページ、IDML、EPUB（リフロー型または固定レイアウト）、HTML、中綴じ PDF、パッケージ |
| `edit_document` | 検索と置換（GREP も可）、ストーリーのテキスト置き換え、フレームへの新しい画像の配置、フォントの置き換え、ページと要素の追加。新しいコピーとして保存します |
| `get_document_info` | ページ、ページごとの要素、ストーリー（とオーバーセット）、スタイル、スウォッチ、フォント（不足分も）、リンク（見つからない、低解像度）、プリフライトの問題 |
| `render_pages` | ページを Claude に見せ、必要なら PNG として保存 |
| `list_designcraft_catalog` | パラメーター付きの 444 コマンド、ページのプリセット、フォントの有無（またはドキュメントが使うフォント）、形式 |
| `run_designcraft_commands` | 任意のエンジンコマンドと `inspect_document`、`get_story`、`place_image`... を 1 つのセッションで実行（`$steps[N].フィールド` 参照）。画面なしでもライブでも可、その後に書き出し |
| `open_in_designcraft` | DesignCraft アプリでドキュメントを開く（制御チャネルも任意で） |
| `get_designcraft_status` | プラットフォーム、インストール先、バージョン、コマンド数、アプリ / 制御ポート |

| | |
| --- | --- |
| **開ける形式** | `.designcraft`、InDesign の `.idml`。PNG、JPEG、WebP、GIF、TIFF、PDF、SVG を配置。CSV / TSV を結合 |
| **書き出し形式** | PDF（PDF/X-4、PDF/A-2b）、PNG、JPG、IDML、`.designcraft`、EPUB（リフロー型と固定レイアウト）、HTML、中綴じ PDF、パッケージフォルダー |

サイズは `units` に `mm`、`cm`、`in`、`px` を指定しない限り **pt** です。`x` / `y` は **各ページの左上隅** から測ります（既定値：マージン）。Inter、Source Sans 3、Source Serif 4 は DesignCraft に同梱されており、どのシステムでも使えます。

## 例

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "見出し", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "本文", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "見出し", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\coffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "毎朝焙煎しています。\n月曜〜土曜 7:00–19:00", "style": "本文" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["ドリンク", "価格"], ["エスプレッソ", "400"], ["カプチーノ", "500"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## 必要なもの

- `designcraft-cli` 付きの **DesignCraft**（**0.5.0** で検証）。[対応プラットフォーム](#対応プラットフォーム)を参照
- Node.js ≥ 20（`.mcpb` でインストールする場合は Claude Desktop に同梱）

## インストール

### Claude Desktop（推奨、全プラットフォーム）

1. [最新リリース](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest)から `designcraft-mcp-server.mcpb` をダウンロードします。
2. ダブルクリック（または Claude Desktop → *設定 → 拡張機能* にドラッグ）して **インストール** をクリックします。
3. 任意：DesignCraft が標準の場所にない場合は、拡張機能の設定でそのフォルダーか `designcraft-cli` のパスを入力します。

### Claude Code / その他の MCP クライアント

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

## 設定

| 変数 | 意味 |
| --- | --- |
| `DESIGNCRAFT_DIR` | DesignCraft のフォルダー、その実行ファイルのいずれか、`.tar.gz` のルート（`bin/` を含む）または `DesignCraft.app`。既定：自動検出 |
| `DESIGNCRAFT_CLI` | `designcraft-cli` / `designcraft-cli.exe` のパス（`DESIGNCRAFT_DIR` より優先） |
| `DESIGNCRAFT_APP` | デスクトップアプリが別の場所にある場合のパス（例：Linux の AppImage） |
| `DESIGNCRAFT_CONTROL_PORT` | デスクトップアプリの制御ポート（既定 7981） |
| `DESIGNCRAFT_MCP_TIMEOUT` | エンジン呼び出し 1 回あたりの最大秒数（既定 3600） |

## 安全性

- `overwrite: true` でない限り、ファイルは **決して上書きされません**。フォルダーでは空いている名前（`_2`）を使い、既存の `output_path` はエラーになります。ドキュメント、画像、データは読み取るだけで、編集したドキュメントは新しいコピーとしてのみ保存されます。
- パスはすべて絶対パスで指定します。エンジンはメモリ上のドキュメントで画面なしで動き、`live: true` でない限り DesignCraft アプリには触れません。
- すべてローカルで実行され、ネットワークにはアクセスしません。ジョブごとに専用のエンジンを一時フォルダーで動かし、最後に削除します。

## 開発

```bash
npm run build       # TypeScript + 単一ファイルのバンドル（dist/bundle.cjs）
npm test            # ユニットテスト（Windows、macOS、Linux のパス処理）
npm run test:e2e    # 実際の MCP stdio による 26 項目のエンドツーエンド検査（合成画像と CSV）
npm run pack:mcpb   # designcraft-mcp-server.mcpb
```

Docker での Linux テスト（先に `designcraft-<バージョン>-linux-x86_64.tar.gz` を展開）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## ライセンス

Apache-2.0。DesignCraft の著作権はその作者（Storytold）に帰属し、MIT または Apache-2.0 で提供されています。
本プロジェクトは DesignCraft および Storytold とは無関係であり、承認も受けていません。InDesign は Adobe の商標です。
