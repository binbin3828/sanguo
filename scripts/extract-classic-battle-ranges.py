#!/usr/bin/env python3
"""Extract the original iBaye attack and skill target masks.

Usage: python3 scripts/extract-classic-battle-ranges.py \
  /path/to/iBaye/src/dat.lib.orig /path/to/iBaye/src/pconst.c
"""

import hashlib
import json
import re
import struct
import sys
from pathlib import Path


def resource(data, resource_id):
    offset = struct.unpack_from("<I", data, (resource_id - 1) * 4)[0]
    length, actual_id, count, item_length, key = struct.unpack_from(
        "<IHHHH", data, offset
    )
    if actual_id != resource_id or offset + length > len(data):
        raise ValueError(f"invalid resource {resource_id}")
    return data[offset + 12 : offset + length], count, item_length, key


def rows(values, width):
    return [list(values[start : start + width]) for start in range(0, len(values), width)]


def extract(lib_path, constants_path):
    lib = lib_path.read_bytes()
    names_payload, name_count, name_width, name_key = resource(lib, 11)
    # This library declares 43 names but stores only 30 four-byte entries.
    if (name_count, name_width, name_key, len(names_payload)) != (43, 4, 192, 120):
        raise ValueError("unexpected skill name resource layout")
    names = []
    for index in range(30):
        encrypted = names_payload[index * 4 : (index + 1) * 4]
        decoded = bytes((byte - name_key) % 256 for byte in encrypted).rstrip(b"\0")
        names.append(decoded.decode("gbk"))

    ranges_payload, range_count, range_width, range_key = resource(lib, 13)
    if (range_count, range_width, range_key) != (1, 0, 0) or len(ranges_payload) != 30 * 81:
        raise ValueError("unexpected skill range resource layout")

    source = constants_path.read_text(encoding="utf-8")
    match = re.search(r"const U8 dFgtAtRange\[\]\s*=\s*\{(.*?)\};", source, re.S)
    if not match:
        raise ValueError("dFgtAtRange not found")
    attack_bytes = bytes(int(number) for number in re.findall(r"\d+", match.group(1)))
    if len(attack_bytes) != 6 * 25:
        raise ValueError("unexpected troop attack range length")

    troop_names = ["骑兵", "步兵", "弓兵", "水军", "极兵", "玄兵"]
    attacks = [
        {"troopId": index, "troopName": name, "cells": rows(attack_bytes[index * 25 : (index + 1) * 25], 5)}
        for index, name in enumerate(troop_names)
    ]
    skills = []
    for index, name in enumerate(names):
        raw = ranges_payload[index * 81 : (index + 1) * 81]
        skills.append({
            "skillId": index + 1,
            "name": name,
            "requiresTarget": index + 1 not in (22, 30),
            "cells": rows(raw, 9),
        })

    return {
        "source": {
            "project": "iBaye",
            "repository": "https://gitee.com/bgwp/iBaye",
            "librarySha256": hashlib.sha256(lib).hexdigest(),
            "rangeResourceId": 13,
            "skillNameResourceId": 11,
            "attackConstant": "dFgtAtRange",
        },
        "convention": {
            "origin": "center cell, x to the right, y downward",
            "targetableCellValue": 1,
            "markerCellValue": 2,
            "attackMaskSize": 5,
            "skillMaskSize": 9,
            "note": "Other values are preserved as raw data, not treated as targets. Skill 30 does not require target selection in original Fight.c.",
        },
        "attack": attacks,
        "skills": skills,
    }


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        raise SystemExit("usage: extract-classic-battle-ranges.py DAT_LIB PCONST_C [OUTPUT_JSON]")
    output = Path(sys.argv[3]) if len(sys.argv) == 4 else Path("data/classic-battle-ranges.json")
    result = extract(Path(sys.argv[1]), Path(sys.argv[2]))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {output}: {len(result['attack'])} troop masks, {len(result['skills'])} skill blocks")
