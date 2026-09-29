#!/usr/bin/env python3
"""Draw tactical terrain tiles, connection variants, and the review sheet."""

from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs/assets/terrain-review"
GAME_OUT = Path(__file__).resolve().parents[1] / "src/assets/images/terrain"
OUT.mkdir(parents=True, exist_ok=True)
GAME_OUT.mkdir(parents=True, exist_ok=True)

COLORS = {
    "plain": "#ad9a6b", "grass": "#77935e", "forest": "#426d50",
    "mountain": "#777e73", "river": "#397f92", "bridge": "#397f92",
    "city": "#a98b67", "village": "#a89b70", "camp": "#8f8965",
}
NAMES = {"plain":"平原", "grass":"草地", "forest":"森林", "mountain":"山地",
         "river":"河流", "bridge":"桥梁", "city":"城池", "village":"村庄", "camp":"营寨"}


def art(kind, variant=0, bank_left=False, bank_right=False, bank_top=False, bank_bottom=False, bridge_vertical=False):
    shift = (variant % 3) * 3
    if kind == "plain":
        return f'''<path d="M0 11h32v3H0zM0 27h32v2H0z" fill="#c0aa74" opacity=".55"/>
<path d="M{3+shift} 5h5m9 3h4M5 19h4m13 4h6M{10+shift} 30h3" stroke="#e4ca88" stroke-width="2"/>
<path d="M7 9h2m14 9h3M13 24h2" stroke="#716d4b" stroke-width="2"/>'''
    if kind == "grass":
        return f'''<path d="M0 24h32v8H0z" fill="#6d8958" opacity=".65"/>
<path d="M{4+shift} 5v5m-2-3 2 3 2-3M19 6v5m-2-3 2 3 2-3M9 20v5m-2-3 2 3 2-3M26 22v5m-2-3 2 3 2-3" stroke="#b6c982" stroke-width="2" fill="none"/>
<path d="M3 16h3m15-1h4m-11 15h3" stroke="#4c7550" stroke-width="2"/>'''
    if kind == "forest":
        return f'''<path d="M0 24h32v8H0z" fill="#315941"/>
<path d="M{7+shift} 14v16M24 10v20M12 18v12" stroke="#4b4939" stroke-width="3"/>
<path d="M{1+shift} 20V14l7-10 7 10v6zM15 18V10l9-8 8 8v8z" fill="#254d3b"/>
<path d="M{4+shift} 15V11l4-6 4 6v4zM18 13V9l6-6 6 6v4z" fill="#70a16c"/>
<path d="M3 25h4m17 2h4" stroke="#98b477" stroke-width="2"/>'''
    if kind == "mountain":
        return f'''<path d="M0 26 10 6l8 11 5-8 9 16v7H0z" fill="#4d5d5d"/>
<path d="M10 6 16 17l-5-3-5 11H0zM23 9l9 16v7H18l6-15-5 2z" fill="#aeb6a6"/>
<path d="M0 27h32v5H0z" fill="#65715f"/><path d="M{3+shift} 29h9m7 1h8" stroke="#899476" stroke-width="2"/>
<path d="M9 9l2-3 3 5m8 1 1-3 3 5" fill="none" stroke="#d8d5b7" stroke-width="2"/>'''
    if kind in ("river", "bridge"):
        water = f'''<path d="M0 3h32v4H0zM0 17h32v4H0zM0 29h32v3H0z" fill="#4d9aab" opacity=".7"/>
<path d="M{2+shift} 10h8m12 2h6M5 25h8m11 1h5" stroke="#a6ced1" stroke-width="2"/>'''
        if kind == "river":
            if bank_left:
                water += '<path d="M0 0h3v32H0z" fill="#d3c18a"/><path d="M3 0h2v32H3z" fill="#697f68"/>'
            if bank_right:
                water += '<path d="M29 0h3v32h-3z" fill="#d3c18a"/><path d="M27 0h2v32h-2z" fill="#697f68"/>'
            if bank_top:
                water += '<path d="M0 0h32v3H0z" fill="#d3c18a"/><path d="M0 3h32v2H0z" fill="#697f68"/>'
            if bank_bottom:
                water += '<path d="M0 29h32v3H0z" fill="#d3c18a"/><path d="M0 27h32v2H0z" fill="#697f68"/>'
            return water
        if bridge_vertical:
            return water + '''<path d="M7 0h20v32H7z" fill="#4c473b"/>
<path d="M10 0h14v32H10z" fill="#a77c55"/>
<path d="M10 0v32M24 0v32" stroke="#e2c38c" stroke-width="2"/>
<path d="M10 4h14m-14 7h14m-14 7h14m-14 7h14" stroke="#73543f" stroke-width="2"/>'''
        return water + '''<path d="M0 7h32v20H0z" fill="#4c473b"/>
<path d="M0 10h32v14H0z" fill="#a77c55"/>
<path d="M0 10h32M0 24h32" stroke="#e2c38c" stroke-width="2"/>
<path d="M4 10v14m7-14v14m7-14v14m7-14v14" stroke="#73543f" stroke-width="2"/>'''
    if kind == "city":
        return '''<path d="M0 27h32v5H0z" fill="#746b57"/>
<path d="M2 12h28v16H2z" fill="#d4b78a" stroke="#574c40" stroke-width="2"/>
<path d="M2 8h6v5H2zm10 0h7v5h-7zm12 0h6v5h-6z" fill="#a66f55"/>
<path d="M11 28v-9l5-4 5 4v9z" fill="#454943"/>
<path d="M15 4V0m0 3h11l-3 5h-8" fill="#b94f43" stroke="#413e38" stroke-width="2"/>'''
    if kind == "village":
        return '''<path d="M0 27h32v5H0z" fill="#7a7858"/>
<path d="M3 16h13v12H3zM18 14h12v14H18z" fill="#d6bd87" stroke="#685944" stroke-width="2"/>
<path d="M1 16 9 9l9 7m-2-2 8-8 8 8" fill="none" stroke="#9a6446" stroke-width="4"/>
<path d="M8 22h4v6H8zM22 20h4v4h-4z" fill="#524737"/>'''
    return '''<path d="M0 27h32v5H0z" fill="#6d745b"/>
<path d="M3 25 15 6l14 19z" fill="#c3a377" stroke="#514f3d" stroke-width="2"/>
<path d="M15 6v19m-6 0 6-9 6 9" stroke="#866746" stroke-width="2"/>
<path d="M27 4v20m0-20h5l-2 5h-3" fill="#bb6752" stroke="#e4cf9f" stroke-width="2"/>'''


def tile_svg(kind, variant=0, bank_left=False, bank_right=False, bank_top=False, bank_bottom=False, bridge_vertical=False):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
<rect width="32" height="32" fill="{COLORS[kind]}"/>{art(kind, variant, bank_left, bank_right, bank_top, bank_bottom, bridge_vertical)}</svg>'''


for kind in COLORS:
    (OUT / f"{kind}.svg").write_text(tile_svg(kind) + "\n", encoding="utf-8")
    (GAME_OUT / f"{kind}.svg").write_text(tile_svg(kind) + "\n", encoding="utf-8")

for kind in ("plain", "grass", "forest", "mountain"):
    for variant in range(3):
        (GAME_OUT / f"{kind}-{variant}.svg").write_text(tile_svg(kind, variant) + "\n", encoding="utf-8")


def road_tile_svg(kind, mask):
    lines = []
    if mask & 1: lines.append("M16 16V0")
    if mask & 2: lines.append("M16 16H32")
    if mask & 4: lines.append("M16 16V32")
    if mask & 8: lines.append("M16 16H0")
    route = " ".join(lines) or "M16 16h1"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
<rect width="32" height="32" fill="{COLORS[kind]}"/>{art(kind)}
<path d="{route}" fill="none" stroke="#685d46" stroke-width="13" stroke-linecap="square"/>
<path d="{route}" fill="none" stroke="#d2b781" stroke-width="9" stroke-linecap="square"/>
<path d="M14 13h4m-5 6h6" stroke="#edce90" stroke-width="1"/>
</svg>'''


for kind in ("plain", "grass"):
    for mask in range(16):
        (GAME_OUT / f"{kind}-road-{mask}.svg").write_text(road_tile_svg(kind, mask) + "\n", encoding="utf-8")

field = f'''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
<rect width="32" height="32" fill="{COLORS['plain']}"/>
<path d="M0 4h32v26H0z" fill="#bda370"/>
<path d="M0 7h32M0 13h32M0 19h32M0 25h32" stroke="#816f50" stroke-width="2"/>
<path d="M3 6v3m9 2v3m10 3v3m-15 3v3m20-17v3" stroke="#789251" stroke-width="3"/>
<path d="M0 2h32M0 30h32" stroke="#d8c48d" stroke-width="2"/>
</svg>'''
(GAME_OUT / "plain-field.svg").write_text(field + "\n", encoding="utf-8")

for mask in range(16):
    (GAME_OUT / f"river-{mask}.svg").write_text(tile_svg(
        "river", bank_top=bool(mask & 1), bank_right=bool(mask & 2),
        bank_bottom=bool(mask & 4), bank_left=bool(mask & 8)) + "\n", encoding="utf-8")

for name, vertical in (("bridge-h", False), ("bridge-v", True)):
    (GAME_OUT / f"{name}.svg").write_text(tile_svg("bridge", bridge_vertical=vertical) + "\n", encoding="utf-8")


def cell(kind, x, y, variant=0, left=False, right=False):
    return f'<g transform="translate({x} {y})"><rect width="32" height="32" fill="{COLORS[kind]}"/>{art(kind,variant,left,right)}</g>'


types = list(COLORS)
cards = []
for i, kind in enumerate(types):
    x, y = 24 + (i % 9) * 105, 68
    cards.append(f'''<g transform="translate({x} {y})"><rect width="90" height="110" rx="6" fill="#263831" stroke="#637c66"/>
<g transform="translate(13 9) scale(2)"><rect width="32" height="32" fill="{COLORS[kind]}"/>{art(kind)}</g>
<text x="45" y="96" text-anchor="middle" fill="#e9ddba" font-size="15">{NAMES[kind]}</text></g>''')

layout = [
    "MMMMGGGGWWGGGG",
    "MMMMPGGGWWGFFG",
    "MMMPPPGGWWFFFG",
    "MMPKPPGGWWFFGG",
    "PPPPPPPPBBPPCP",
    "PPPVPPGGWWPPPP",
    "GPPPPGGGWWGPGG",
    "GGPPGGGGWWGGGG",
]
letters = {"M":"mountain","G":"grass","F":"forest","P":"plain","K":"camp",
           "V":"village","C":"city","W":"river","B":"bridge"}
map_cells = []
for y, row in enumerate(layout):
    for x, code in enumerate(row):
        kind = letters[code]
        left = kind == "river" and x > 0 and row[x-1] != "W"
        right = kind == "river" and x < len(row)-1 and row[x+1] != "W"
        map_cells.append(cell(kind, 27+x*32, 228+y*32, (x*7+y*11)%3, left, right))

sheet = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1010" height="534" viewBox="0 0 1010 534" shape-rendering="crispEdges">
<rect width="1010" height="534" fill="#192a25"/>
<text x="24" y="36" fill="#efd7a0" font-size="24" font-weight="700">战场地形视觉评审 · 原版图块的新版表现</text>
{''.join(cards)}
<text x="27" y="215" fill="#efd7a0" font-size="18">连续地形示例：山脊、林带、双格河道与桥</text>
{''.join(map_cells)}
<text x="520" y="258" fill="#e7dbbb" font-size="17">原版：46 张 16×16 图块</text>
<text x="520" y="289" fill="#e7dbbb" font-size="17">新版：32×32 战场格，保留拼接语法</text>
<text x="520" y="336" fill="#aac0a2" font-size="15">• 颜色先区分可走地、山地和水域</text>
<text x="520" y="367" fill="#aac0a2" font-size="15">• 河岸与桥按相邻格组合</text>
<text x="520" y="398" fill="#aac0a2" font-size="15">• 山林成片；建筑只占规则上的一格</text>
<text x="520" y="447" fill="#d4bd8e" font-size="14">地形图块已接入战场；道路与田畦另行拼接</text>
</svg>\n'''
(OUT / "review-sheet.svg").write_text(sheet, encoding="utf-8")
