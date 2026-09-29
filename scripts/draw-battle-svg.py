#!/usr/bin/env python3
"""Draw legacy terrain tiles; soldier sprites use draw-army-sprite-proposals.py."""

from pathlib import Path
import runpy


ROOT = Path(__file__).resolve().parents[1] / "src/assets/images"


def badge(fill, motif):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
<circle cx="24" cy="24" r="22" fill="#152a2a" stroke="#e6c485" stroke-width="2"/>
<circle cx="24" cy="24" r="18" fill="{fill}" stroke="#f6e6bb" stroke-opacity=".4" stroke-width="1"/>
{motif}
</svg>\n'''


ARMY = {
    "cavalry": badge("#8d463d", '''<path d="M11 33l6-3 2-6-2-7 6-7 3 4 7 2 4 7-4 5-2 8h-5l-1-7-5 3-2 4h-7z" fill="#f5ddb2" stroke="#432d2b" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M22 12l-5-4 1 9m10 4h3" fill="none" stroke="#432d2b" stroke-width="2" stroke-linecap="square"/>'''),
    "infantry": badge("#3d6370", '''<path d="M24 10l12 5v9c0 8-5 13-12 16-7-3-12-8-12-16v-9z" fill="#efd9a8" stroke="#334948" stroke-width="2"/>
<path d="M24 14v21m-7-14h14m-11 7h8" stroke="#496a74" stroke-width="3" stroke-linecap="square"/>
<path d="M10 11l5 5m23-5l-5 5" stroke="#f4e7c8" stroke-width="2"/>'''),
    "archer": badge("#4c7655", '''<path d="M17 10c-7 7-7 21 0 28m1-28c13 3 13 25 0 28" fill="none" stroke="#f3d99f" stroke-width="3" stroke-linecap="round"/>
<path d="M17 10v28M14 24h23m-8-5l8 5-8 5" fill="none" stroke="#edf4cf" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M18 24l-5-4v8z" fill="#f3d99f"/>'''),
    "navy": badge("#316e7c", '''<path d="M24 9v22m0-19l12 13H24z" fill="#ebebd2" stroke="#173e4b" stroke-width="2" stroke-linejoin="round"/>
<path d="M12 28h26l-5 8H17z" fill="#e1ac69" stroke="#463e36" stroke-width="2" stroke-linejoin="round"/>
<path d="M10 39c3-2 6-2 9 0 3-2 6-2 9 0 3-2 6-2 10 0" fill="none" stroke="#b8e7df" stroke-width="2"/>'''),
    "elite": badge("#6b558b", '''<path d="M15 37l17-26m1 26L16 11" stroke="#f8e6bb" stroke-width="3" stroke-linecap="square"/>
<path d="M29 10l7 1-1 7-4-2-5 6-3-2zM12 11l7-1 5 10-3 2-5-6-4 2z" fill="#d9d7d7" stroke="#443d55" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M21 28h6v7h-6z" fill="#e6b976"/>'''),
    "mystic": badge("#775b51", '''<circle cx="24" cy="24" r="12" fill="none" stroke="#f0d8a2" stroke-width="2.5"/>
<path d="M24 12c-8 4-8 20 0 24 8-4 8-20 0-24z" fill="#e7cf9c"/>
<circle cx="24" cy="18" r="2.4" fill="#715749"/><circle cx="24" cy="30" r="2.4" fill="#f7f0d7"/>
<path d="M9 24h5m20 0h5M24 8v5m0 22v5" stroke="#d6ece1" stroke-width="2"/>'''),
}


def tile(base, art):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
<rect width="32" height="32" fill="{base}"/>
{art}
</svg>\n'''


TERRAIN = {
    "plain": tile("#a79868", '''<path d="M-2 26h12l6-7h18v8H18l-5 7H-2z" fill="#d2bf80"/><path d="M1 8h8m12 18h7M5 18h5" stroke="#776b4c" stroke-width="2"/>
<path d="M24 5v6m-2-3h4M8 4v5m-2-2h4" stroke="#dfce94" stroke-width="2"/>'''),
    "grass": tile("#688d57", '''<path d="M0 25h32v7H0z" fill="#537948"/><path d="M3 10l2 8 2-8m3-3l2 9 3-7m9 4l2 9 3-9M6 25l2 5 3-5m9 0l2 5 3-5" fill="none" stroke="#c3d78a" stroke-width="2" stroke-linecap="square"/>
<path d="M18 3v5m-2-2h4" stroke="#f0d284" stroke-width="2"/>'''),
    "mountain": tile("#68716d", '''<path d="M0 28L11 7l6 10 5-8 10 19v4H0z" fill="#444f52"/><path d="M11 7l4 11-4-2-5 10H1zM22 9l4 10-5-3-4 10h-5z" fill="#adb1a0"/>
<path d="M2 27h11m11 1h8" stroke="#d2ccab" stroke-width="2"/>'''),
    "forest": tile("#355c48", '''<path d="M6 31V17m10 14V14m10 17V18" stroke="#493e31" stroke-width="3"/>
<path d="M1 20l5-15 6 15zM9 19l7-18 7 18zM20 21l6-16 6 16z" fill="#1e4235"/><path d="M3 17L6 8l4 9zM12 16l4-11 5 11zM22 18l4-9 4 9z" fill="#78a278"/>'''),
    "village": tile("#9c8a64", '''<path d="M0 25h32v7H0z" fill="#766d54"/><path d="M3 15l7-6 7 6v13H3zM17 13l6-5 7 5v15H17z" fill="#d6bd88" stroke="#544a3c" stroke-width="1"/>
<path d="M2 14l8-7 8 7m-2-1l7-7 8 7" fill="none" stroke="#7f4a3d" stroke-width="4" stroke-linejoin="round"/>
<path d="M8 22h4v6H8zM23 21h3v4h-3z" fill="#574b3b"/>'''),
    "city": tile("#a17859", '''<path d="M0 28h32v4H0z" fill="#5c5144"/><path d="M2 11h28v18H2z" fill="#c7ab7e" stroke="#4b463d" stroke-width="2"/>
<path d="M2 8h5v4H2zm9 0h5v4h-5zm9 0h5v4h-5zm5 0h5v4h-5z" fill="#b58b64"/>
<path d="M11 27v-8c0-6 10-6 10 0v8z" fill="#3e4240"/><path d="M16 3v8m0-7h8l-2 4h-6" fill="#be664b" stroke="#3e4240" stroke-width="1.5"/>'''),
    "camp": tile("#80745a", '''<path d="M0 27h32v5H0z" fill="#5f6954"/><path d="M4 25L16 6l12 19z" fill="#bd9f6c" stroke="#4c4b3b" stroke-width="2"/><path d="M16 6v19m-5 0l5-8 5 8" stroke="#715943" stroke-width="2"/>
<path d="M27 4v21m0-20h5l-2 5h-3" fill="#ad664a" stroke="#e1c797" stroke-width="1.5"/><path d="M1 25h31" stroke="#d0b98c" stroke-width="2"/>'''),
    "river": tile("#39748b", '''<path d="M0 7c6-4 10-4 16 0s10 4 16 0v7c-6 4-10 4-16 0S6 10 0 14zm0 15c6-4 10-4 16 0s10 4 16 0v7c-6 4-10 4-16 0S6 25 0 29z" fill="#5298a8"/>
<path d="M2 11h7m8 8h9M5 27h7" stroke="#b4d9d4" stroke-width="2"/>'''),
    "bridge": tile("#39748b", '''<path d="M0 5c8 5 14 5 22 0m-17 23c9-4 16-4 27 0" fill="none" stroke="#70aeb6" stroke-width="3"/>
<path d="M2 11h28v13H2z" fill="#8f694b" stroke="#dfc390" stroke-width="2"/>
<path d="M7 11v13m6-13v13m6-13v13m6-13v13" stroke="#e3c58f" stroke-width="2"/><path d="M2 13h28m-28 9h28" stroke="#4d4239" stroke-width="2"/>'''),
}


if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("draw-terrain-review.py")), run_name="__main__")
    runpy.run_path(str(Path(__file__).with_name("draw-army-sprite-proposals.py")), run_name="__main__")
    runpy.run_path(str(Path(__file__).with_name("bundle-battle-art.py")), run_name="__main__")
