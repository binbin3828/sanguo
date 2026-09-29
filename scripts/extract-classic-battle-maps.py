#!/usr/bin/env python3
"""Extract iBaye's seven 32x32 battle maps and 46 original 16x16 tile bitmaps.

Usage: python3 scripts/extract-classic-battle-maps.py \
  /path/to/iBaye/src/dat.lib.orig /path/to/iBaye/src/pconst.c data/dat.xml
"""

import hashlib
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
import zlib
from collections import Counter
from pathlib import Path


TERRAIN = ("invalid", "plain", "grass", "city", "village", "forest", "mountain", "river", "camp")
COLORS = {
    "invalid": (28, 33, 31), "plain": (202, 185, 136), "grass": (141, 173, 112),
    "city": (204, 137, 91), "village": (195, 153, 105), "forest": (69, 126, 82),
    "mountain": (126, 127, 105), "river": (95, 150, 172), "camp": (172, 139, 91),
}
FONT = {
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "001", "001", "001"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
}


def resource(data, resource_id):
    offset = struct.unpack_from("<I", data, (resource_id - 1) * 4)[0]
    length, actual_id, count, item_length, key = struct.unpack_from("<IHHHH", data, offset)
    if actual_id != resource_id or offset + length > len(data):
        raise ValueError(f"invalid resource {resource_id}")
    return data[offset + 12 : offset + length], (length, count, item_length, key)


def terrain(tile):
    if tile == 0: return "invalid"
    if tile == 1: return "plain"
    if tile == 2: return "grass"
    if tile == 3: return "city"
    if tile == 4: return "village"
    if tile == 5: return "forest"
    if tile == 41: return "camp"
    if tile <= 15: return "mountain"
    return "river"


def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def write_png(path, canvas):
    height, width = len(canvas), len(canvas[0]) // 3
    raw = b"".join(b"\0" + bytes(row) for row in canvas)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def fill(canvas, x, y, width, height, color):
    packed = bytes(color)
    for yy in range(y, y + height):
        canvas[yy][x * 3 : (x + width) * 3] = packed * width


def draw_number(canvas, number, x, y, scale=2):
    for digit in str(number):
        for row, line in enumerate(FONT[digit]):
            for col, mark in enumerate(line):
                if mark == "1": fill(canvas, x + col * scale, y + row * scale, scale, scale, (241, 222, 180))
        x += 4 * scale


def draw_tile(canvas, tile_hex, x, y, background, scale=1):
    fill(canvas, x, y, 16 * scale, 16 * scale, background)
    raw = bytes.fromhex(tile_hex)
    dark = tuple(max(0, round(component * 0.43)) for component in background)
    for yy in range(16):
        bits = int.from_bytes(raw[yy * 2 : yy * 2 + 2], "big")
        for xx in range(16):
            if bits & (1 << (15 - xx)):
                fill(canvas, x + xx * scale, y + yy * scale, scale, scale, dark)


def render_atlas(maps, bitmaps, output):
    gap, heading, size = 12, 28, 32 * 16
    width, height = 4 * (size + gap) + gap, 2 * (size + heading + gap) + gap
    canvas = [bytearray((29, 43, 39) * width) for _ in range(height)]
    for index, battle_map in enumerate(maps):
        x0 = gap + index % 4 * (size + gap)
        y0 = gap + index // 4 * (size + heading + gap)
        draw_number(canvas, index, x0 + 8, y0 + 5, 3)
        for y, row in enumerate(battle_map["tileIds"]):
            for x, tile_id in enumerate(row):
                draw_tile(canvas, bitmaps[tile_id], x0 + x * 16, y0 + heading + y * 16, COLORS[terrain(tile_id)])
    write_png(output, canvas)


def render_tile_atlas(bitmaps, output):
    scale, cell, gap = 3, 16 * 3, 12
    width, height = 8 * (cell + gap) + gap, 6 * (cell + 23 + gap) + gap
    canvas = [bytearray((29, 43, 39) * width) for _ in range(height)]
    for tile_id, bitmap in enumerate(bitmaps):
        x = gap + tile_id % 8 * (cell + gap)
        y = gap + tile_id // 8 * (cell + 23 + gap)
        draw_number(canvas, tile_id, x, y + 2, 2)
        draw_tile(canvas, bitmap, x, y + 23, COLORS[terrain(tile_id)], scale)
    write_png(output, canvas)


def extract(lib_path, constants_path, xml_path):
    data = lib_path.read_bytes()
    tile_payload, tile_meta = resource(data, 4)
    if (tile_meta, tile_payload[:6]) != ((1490, 1, 0, 0), struct.pack("<HHH", 16, 16, 46)):
        raise ValueError("unexpected original battle tile layout")
    bitmaps = [tile_payload[6 + index * 32 : 6 + (index + 1) * 32].hex() for index in range(46)]
    source = constants_path.read_text(encoding="utf-8")
    match = re.search(r"const U8 dCityMapId\[\]\s*=\s*\{(.*?)\};", source, re.S)
    if not match: raise ValueError("city-to-map mapping not found")
    city_map_ids = [int(value) for value in re.findall(r"\d+", match.group(1))]
    root = ET.parse(xml_path).getroot()
    city_names = [node.attrib["名称"] for node in root.find("patch").find("城池清单").findall("城池")]
    if len(city_names) != 38 or len(city_map_ids) != 38:
        raise ValueError("expected 38 cities")
    maps = []
    for index in range(7):
        payload, meta = resource(data, 110 + index)
        if meta != (1052, 1, 0, 0) or payload[:4] != struct.pack("<HH", 32, 32):
            raise ValueError(f"unexpected original battle map {index} layout")
        tiles = payload[16:]
        if len(tiles) != 1024 or max(tiles) >= len(bitmaps):
            raise ValueError(f"invalid tile data in map {index}")
        counts = Counter(terrain(value) for value in tiles)
        maps.append({
            "mapId": index,
            "resourceId": 110 + index,
            "width": 32,
            "height": 32,
            "cityNames": [name for name, map_id in zip(city_names, city_map_ids) if map_id == index],
            "cityCore": [[cell % 32, cell // 32] for cell, value in enumerate(tiles) if value == 3],
            "terrainCounts": {name: counts[name] for name in TERRAIN if counts[name]},
            "tileIds": [list(tiles[row * 32 : (row + 1) * 32]) for row in range(32)],
        })
    return {
        "source": {"repository": "https://gitee.com/bgwp/iBaye", "librarySha256": hashlib.sha256(data).hexdigest(), "mapResourceIds": list(range(110, 117)), "tileResourceId": 4},
        "tileFormat": {"width": 16, "height": 16, "count": 46, "bitsPerPixel": 1, "bitOrder": "MSB first in each 16-bit row", "tileIdConvention": "zero based"},
        "terrainByTileId": [terrain(value) for value in range(46)],
        "tileBitmapHex": bitmaps,
        "maps": maps,
    }


if __name__ == "__main__":
    if len(sys.argv) not in (4, 5, 6):
        raise SystemExit("usage: extract-classic-battle-maps.py DAT_LIB PCONST_C DAT_XML [OUTPUT_JSON] [OUTPUT_PNG]")
    output_json = Path(sys.argv[4]) if len(sys.argv) > 4 else Path("data/classic-battle-maps.json")
    output_png = Path(sys.argv[5]) if len(sys.argv) > 5 else Path("docs/assets/classic-battle-maps.png")
    result = extract(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    render_atlas(result["maps"], result["tileBitmapHex"], output_png)
    tile_png = output_png.with_name("classic-battle-tiles.png")
    render_tile_atlas(result["tileBitmapHex"], tile_png)
    print(f"wrote {output_json}, {output_png} and {tile_png}")
