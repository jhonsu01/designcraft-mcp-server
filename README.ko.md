<p align="center"><img src="icon.png" width="120" alt="DesignCraft Bridge 아이콘"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>DesignCraft</b>로 Claude가 페이지 레이아웃을 하게 하세요 — <b>Windows, macOS, Linux</b>:<br>
  전단지, 포스터, 브로슈어, 명함, 책 페이지, 데이터 병합, InDesign IDML 파일, 그리고 인쇄용 PDF, PNG, EPUB, HTML.
</p>

---

## 왜 필요한가

[DesignCraft](https://github.com/storytold/designcraft)는 InDesign급 오픈 소스 전자출판 앱으로, 화면 없이 동작하는 CLI(`designcraft-cli`), 444개의 명령, IDML 가져오기와 내보내기, MCP 모드를 제공합니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **"파일 입력 / 파일 출력" 도구**로 바꿔 주므로, 다음과 같이 요청할 수 있습니다:

> *"우리 카페 A5 전단지를 만들어 줘. 사진, 큰 세리프체 가게 이름, 영업시간, 가격표를 넣고 3 mm 도련이 있는 인쇄용 PDF로."*
> *"`team.csv`에 있는 모든 사람의 사진, 이름, 직책이 들어간 명찰을 만들어 줘."*
> *"이 목록으로 한 페이지에 30장씩 주소 라벨을 만들어 줘."*
> *"`catalog.idml`에서 '2025'를 모두 '2026'으로 바꾸고, Arial을 Inter로 바꾼 뒤 PDF/X-4로 내보내 줘."*
> *"`D:\Layouts`의 모든 문서를 PDF와 150 dpi PNG 페이지로 내보내 줘."*

자매 프로젝트: [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 플랫폼

| OS | 설치할 DesignCraft 패키지 | 서버가 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI 또는 포터블 zip | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음) |
| **macOS** 11+ (Apple 실리콘 및 Intel) | `.dmg`(앱) **와 함께** `designcraft-cli-<버전>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원됨, Mac에서는 아직 미검증 |

모든 다운로드: [DesignCraft 릴리스](https://github.com/storytold/designcraft/releases) (FreeBSD용 tar.gz도 있습니다. `DESIGNCRAFT_DIR`로 지정하세요). 다른 위치라면 `DESIGNCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `DesignCraft.app`)이나 `DESIGNCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도의 `designcraft-cli` zip을 풀고 `designcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `DESIGNCRAFT_CLI`로 지정). 처음 실행할 때 Apple 공증을 온라인으로 확인합니다.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `designcraft-cli`는 없습니다. deb, rpm 또는 tar.gz를 사용하세요. 앱이 AppImage라면 `open_in_designcraft`가 실행할 수 있도록 `DESIGNCRAFT_APP`을 설정하세요. GPU가 없는 서버에서 검증한 환경은 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`를 사용했습니다.

## 작동 방식

| 구성 요소 | 설명 |
| --- | --- |
| **DesignCraft 엔진** (`designcraft-cli mcp`) | DesignCraft 자체 엔진: 텍스트 조판, 스타일, 프레임, 표, 데이터 병합, 프리플라이트, PDF / IDML / EPUB / HTML 내보내기. 작업마다 메모리 안의 문서로 **화면 없이** 새로 시작하므로 DesignCraft 앱이나 열려 있는 문서를 절대 건드리지 않습니다. |
| **MCP 서버** (Node.js) | 10개의 고수준 도구. 간단한 항목 목록(페이지별 위치, 어떤 단위든)으로 문서를 만들고, 엔진에 필요한 색상 견본을 생성하며, 이미지를 참조로 배치하고(읽기만 함), 쓰기 전에 모든 출력을 확인합니다. DesignCraft 자체는 기존 파일을 아무 경고 없이 덮어쓰기 때문입니다. |
| **라이브 앱** (선택) | `open_in_designcraft control=true`는 로컬 전용 제어 채널(포트 7981)과 함께 앱을 시작하고, `run_designcraft_commands live=true`가 앱을 조작합니다. 이 채널에는 비밀번호가 없으니 작업이 끝나면 앱을 닫으세요. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `create_layout` | 페이지에 배치한 항목으로 새 문서 만들기(프리셋 또는 사용자 크기, 페이지 수, 펼침 페이지, 여백, 단, 도련, 배경색, 단락 스타일): 텍스트 프레임(글꼴, 스타일, 크기, 행간, 자간, 색상, 정렬, 단락 간격, 단, 세로 정렬), 이미지(채우기 / 맞추기 / 늘이기 / 가운데), 사각형, 타원, 다각형, 선(칠, 그레이디언트, 획, 둥근 모서리, 불투명도, 그림자, 텍스트 감싸기, 회전), 표(머리글 행과 색상). 넘친 텍스트를 알려 줍니다 |
| `data_merge` | CSV나 행 목록을 기존 `.designcraft` / `.idml` 템플릿 또는 항목으로 만든 템플릿에 병합: `<<필드>>` 텍스트와 이미지 필드. 레코드당 한 페이지 또는 한 페이지에 여러 레코드(라벨, 명함) |
| `export_document` | 문서 하나, 목록 또는 폴더 → PDF(페이지 범위, PDF/X-4, PDF/A-2b, 도련, 재단선, 펼침면, 태그), 원하는 해상도의 PNG / JPG 페이지, IDML, EPUB(리플로우 또는 고정 레이아웃), HTML, 소책자 PDF, 패키지 |
| `edit_document` | 찾기 / 바꾸기(GREP 포함), 스토리 텍스트 교체, 프레임에 새 이미지 넣기, 글꼴 교체, 페이지와 항목 추가. 새 사본으로 저장 |
| `get_document_info` | 페이지, 페이지별 항목, 스토리(및 넘친 텍스트), 스타일, 견본, 글꼴(누락된 글꼴 포함), 링크(누락, 저해상도), 프리플라이트 문제 |
| `render_pages` | 페이지를 Claude에게 보여 주고, 원하면 PNG로 저장 |
| `list_designcraft_catalog` | 매개변수가 포함된 444개 명령, 페이지 프리셋, 글꼴 사용 가능 여부(또는 문서가 쓰는 글꼴), 형식 |
| `run_designcraft_commands` | 모든 엔진 명령과 `inspect_document`, `get_story`, `place_image`...를 한 세션에서 실행(`$steps[N].필드` 참조), 화면 없이 또는 라이브로, 이후 내보내기 |
| `open_in_designcraft` | DesignCraft 앱에서 문서 열기(선택적으로 제어 채널 포함) |
| `get_designcraft_status` | 플랫폼, 설치 위치, 버전, 명령 수, 앱 / 제어 포트 |

| | |
| --- | --- |
| **열기** | `.designcraft`, InDesign `.idml`; PNG, JPEG, WebP, GIF, TIFF, PDF, SVG 배치; CSV / TSV 병합 |
| **내보내기** | PDF(PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB(리플로우 및 고정 레이아웃), HTML, 소책자 PDF, 패키지 폴더 |

크기는 `units`에 `mm`, `cm`, `in`, `px`를 지정하지 않으면 **pt** 단위입니다. `x` / `y`는 **각 페이지의 왼쪽 위 모서리**부터 잽니다(기본값: 여백). Inter, Source Sans 3, Source Serif 4는 DesignCraft에 포함되어 있어 어느 시스템에서나 사용할 수 있습니다.

## 예시

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "제목", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "본문", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "제목", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\coffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "매일 아침 직접 로스팅합니다.\n월요일–토요일 7:00–19:00", "style": "본문" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["음료", "가격"], ["에스프레소", "3,500"], ["카푸치노", "4,500"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## 요구 사항

- `designcraft-cli`가 포함된 **DesignCraft**(**0.5.0**으로 검증), [플랫폼](#플랫폼) 참고
- Node.js ≥ 20 (`.mcpb`로 설치할 때는 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest)에서 `designcraft-mcp-server.mcpb`를 내려받습니다.
2. 두 번 클릭하거나 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓고 **설치**를 누릅니다.
3. 선택: DesignCraft가 표준 위치에 없다면 확장 프로그램 설정에서 해당 폴더나 `designcraft-cli` 경로를 입력합니다.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **DesignCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest)에서 `designcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. DesignCraft가 표준 위치에 없다면 `DESIGNCRAFT_DIR` 또는 `DESIGNCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### Claude Code / 기타 MCP 클라이언트

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

## 설정

| 변수 | 의미 |
| --- | --- |
| `DESIGNCRAFT_DIR` | DesignCraft 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `DesignCraft.app`. 기본값: 자동 감지 |
| `DESIGNCRAFT_CLI` | `designcraft-cli` / `designcraft-cli.exe` 경로(`DESIGNCRAFT_DIR`보다 우선) |
| `DESIGNCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux AppImage) |
| `DESIGNCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본값 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | 엔진 호출당 최대 초(기본값 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않습니다**. 폴더에서는 빈 이름(`_2`)을 사용하고, 이미 있는 `output_path`는 오류가 됩니다. 문서, 이미지, 데이터는 읽기만 하며, 편집한 문서는 새 사본으로만 저장됩니다.
- 모든 경로는 절대 경로여야 합니다. 엔진은 메모리 안의 문서로 화면 없이 실행되며, `live: true`가 아니면 DesignCraft 앱을 건드리지 않습니다.
- 모든 작업은 네트워크 접근 없이 로컬에서 실행됩니다. 작업마다 임시 폴더에서 전용 엔진을 사용하고, 끝나면 폴더를 삭제합니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 처리)
npm run test:e2e    # 실제 MCP stdio를 통한 29개 종단 간 검사(합성 이미지와 CSV)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
npm run pack:codex  # Codex 플러그인 zip
```

Docker에서 Linux 테스트(먼저 `designcraft-<버전>-linux-x86_64.tar.gz`를 풀어 두세요):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. DesignCraft의 저작권은 저작자(Storytold)에게 있으며 MIT 또는 Apache-2.0으로 제공됩니다.
이 프로젝트는 DesignCraft 또는 Storytold와 관련이 없으며 이들의 보증을 받지 않았습니다. InDesign은 Adobe의 상표입니다.
