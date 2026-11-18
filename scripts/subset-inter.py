"""Rebuild the public Latin/Romanian font from pinned, OFL-licensed Inter.

Use Python -B and isolated dependencies in artifacts/font-tools. No application
configuration is changed. --download fetches only the pinned public sources.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import pathlib
import runpy
import subprocess
import sys
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
REVISION = "0b58fb370093f9a9f4ff785d94405710b79de67c"
PREFIX = f"https://raw.githubusercontent.com/google/fonts/{REVISION}/ofl/inter/"
SOURCES = {
    "Inter-source.ttf": (PREFIX + "Inter%5Bopsz,wght%5D.ttf", "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031"),
    "OFL.txt": (PREFIX + "OFL.txt", "5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57"),
    "live-inter-5.woff2": ("https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5n-wU.woff2", "a28eb6d3ccb534ae0c94ca999371df024aab60b08c3c8a5720ee9e32fa0faaa2"),
    "live-inter-6.woff2": ("https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2", "c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4"),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def unicode_range(points: set[int]) -> str:
    ranges = []
    start = end = None
    for point in sorted(points):
        if end is not None and point == end + 1:
            end = point
            continue
        if start is not None:
            ranges.append(f"U+{start:04X}" + (f"-{end:04X}" if end != start else ""))
        start = end = point
    if start is not None:
        ranges.append(f"U+{start:04X}" + (f"-{end:04X}" if end != start else ""))
    return ",".join(ranges)


def main() -> None:
    # FontTools iterates some GSUB/GPOS sets. Pin Python's process-local hash
    # order so equivalent layout tables serialize/compress identically.
    if os.environ.get("PYTHONHASHSEED") != "0":
        subprocess.run([sys.executable, "-B", str(pathlib.Path(__file__).resolve()), *sys.argv[1:]], env={**os.environ, "PYTHONHASHSEED": "0"}, check=True)
        return
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--tools-dir", type=pathlib.Path, default=ROOT / "artifacts/font-tools")
    parser.add_argument("--source-dir", type=pathlib.Path, default=ROOT / "artifacts/font-source")
    args = parser.parse_args()
    sys.path.insert(0, str(args.tools_dir.resolve()))
    import brotli
    import fontTools
    from fontTools import subset
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    assert fontTools.__version__ == "4.68.0", "Use the recorded FontTools version for reproducible output"
    assert brotli.__version__ == "1.2.1", "Use the recorded Brotli version for reproducible output"
    args.source_dir.mkdir(parents=True, exist_ok=True)
    for filename, (url, digest) in SOURCES.items():
        file = args.source_dir / filename
        if args.download and not file.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "NextLevel-FontBuild/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                file.write_bytes(response.read())
        assert file.exists(), f"Missing {file}; use --download to fetch pinned public sources"
        assert sha256(file.read_bytes()) == digest, f"Source checksum mismatch: {file}"

    source = TTFont(args.source_dir / "Inter-source.ttf", recalcTimestamp=False)
    references = [TTFont(args.source_dir / f"live-inter-{n}.woff2", recalcTimestamp=False) for n in (5, 6)]
    for font in [source, *references]:
        assert font["name"].getDebugName(5) == "Version 4.001;git-66647c0bb"
        assert font["head"].unitsPerEm == 2048
    assert [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in source["fvar"].axes] == [("opsz", 14, 14, 32), ("wght", 100, 400, 900)]
    for reference in references:
        assert [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in reference["fvar"].axes] == [("wght", 100, 400, 900)]

    pinned = instantiateVariableFont(source, {"opsz": 14}, inplace=False)
    pinned.recalcTimestamp = False
    # Canonicalize the instancer's sparse in-memory gvar dictionary. Empty
    # variations (for example U+200B) are explicit again after the TTF roundtrip.
    canonical = io.BytesIO()
    pinned.save(canonical)
    canonical.seek(0)
    pinned = TTFont(canonical, recalcTimestamp=False)
    source_cmap = pinned.getBestCmap()
    reference_cmaps = [font.getBestCmap() for font in references]
    live_points = set().union(*[set(cmap) for cmap in reference_cmaps])
    candidates = set(range(0x20, 0x7F)) | {ord(character) for character in "ĂăÂâÎîȘșȚțŞşŢţ"}
    candidates |= {0x00A0, 0x00A2, 0x00A3, 0x00A5, 0x00A9, 0x00AB, 0x00AE, 0x00B0, 0x00B7, 0x00BB, 0x00D7, 0x00F7}
    candidates |= set(range(0x2000, 0x2070)) | set(range(0x20A0, 0x20C5))
    candidates |= {0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD}
    points = candidates & live_points & set(source_cmap)
    # Include combining marks needed by NFD equivalents of the retained Latin
    # letters. Unlike broad symbol ranges, these preserve the same Inter forms.
    decomposed = {ord(character) for point in points for character in unicodedata.normalize("NFD", chr(point))}
    points |= decomposed & set(source_cmap)
    required = {ord(character) for character in "ĂăÂâÎîȘșȚțŞşŢţ0123456789€%.,:;!?()[]{}@#&+-=/"}
    required |= {ord(character) for character in unicodedata.normalize("NFD", "ĂăÂâÎîȘșȚțŞşŢţ")}
    assert required <= points, f"Missing required characters: {required - points}"

    options = subset.Options()
    options.layout_features = ["rvrn", "rlig", "rclt", "ccmp", "locl", "mark", "mkmk", "kern", "liga", "clig", "calt", "tnum", "pnum", "zero", "frac", "numr", "dnom", "sups", "subs", "ordn"]
    options.layout_scripts = ["*"]
    options.hinting = True
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(pinned)

    names = pinned["name"]
    instance_postscript_ids = {instance.postscriptNameID for instance in pinned["fvar"].instances if instance.postscriptNameID != 0xFFFF}
    family_ids = {1, 3, 4, 6, 16, 21, 25} | instance_postscript_ids
    for record in names.names:
        if record.nameID in family_ids:
            value = record.toUnicode().replace("Inter", "NextLevelLatin")
            record.string = value.encode(record.getEncoding())
    for name_id, value in {1: "NextLevelLatin", 3: "4.001;NextLevel;NextLevelLatin-Regular", 4: "NextLevelLatin Regular", 6: "NextLevelLatin-Regular", 16: "NextLevelLatin"}.items():
        names.setName(value, name_id, 3, 1, 0x409)

    candidate = args.source_dir / "NextLevelLatin-candidate.woff2"
    pinned.flavor = "woff2"
    pinned.save(candidate)
    derived = TTFont(candidate, recalcTimestamp=False)
    derived_cmap = derived.getBestCmap()
    assert set(derived_cmap) == points, "The CSS range must exactly match the output cmap"
    assert [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in derived["fvar"].axes] == [("wght", 100, 400, 900)]
    assert {"GSUB", "GPOS", "GDEF", "gvar", "HVAR"} <= set(derived.keys())
    assert derived["name"].getDebugName(1) == "NextLevelLatin"
    assert derived["name"].getDebugName(6) == "NextLevelLatin-Regular"

    # A fresh full source instance is the reference for retained shaping glyphs
    # and added NFD marks; live WOFF2s independently verify existing text forms.
    full = TTFont(io.BytesIO(canonical.getvalue()), recalcTimestamp=False)
    full_cmap = full.getBestCmap()
    compared_live = compared_source = 0
    weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]

    def recording(glyph_set, name):
        pen = DecomposingRecordingPen(glyph_set)
        glyph_set[name].draw(pen)
        return pen.value

    for weight in weights:
        glyph_sets = [font.getGlyphSet(location={"wght": weight}) for font in [derived, full, *references]]
        for point, glyph_name in derived_cmap.items():
            actual = glyph_sets[0][glyph_name]
            expected = glyph_sets[1][full_cmap[point]]
            assert actual.width == expected.width, f"Source advance differs at U+{point:04X}, wght={weight}"
            assert recording(glyph_sets[0], glyph_name) == recording(glyph_sets[1], full_cmap[point]), f"Source outline differs at U+{point:04X}, wght={weight}"
            compared_source += 1
            for index, cmap in enumerate(reference_cmaps):
                if point not in cmap:
                    continue
                reference = glyph_sets[2 + index][cmap[point]]
                assert actual.width == reference.width, f"Live advance differs at U+{point:04X}, wght={weight}"
                assert recording(glyph_sets[0], glyph_name) == recording(glyph_sets[2 + index], cmap[point]), f"Live outline differs at U+{point:04X}, wght={weight}"
                compared_live += 1

    hhea = [derived["hhea"].ascent, derived["hhea"].descent, derived["hhea"].lineGap]
    os2 = derived["OS/2"]
    for font in [full, *references]:
        assert hhea == [font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap]
        assert [os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap, os2.sxHeight, os2.sCapHeight] == [getattr(font["OS/2"], key) for key in ["sTypoAscender", "sTypoDescender", "sTypoLineGap", "sxHeight", "sCapHeight"]]

    shaping = runpy.run_path(str(ROOT / "scripts/test-inter-shaping.py"))["verify_shaping"](full, derived)
    docs = ROOT / "docs/fonts"
    docs.mkdir(parents=True, exist_ok=True)
    (docs / "OFL-Inter.txt").write_bytes((args.source_dir / "OFL.txt").read_bytes())
    data = candidate.read_bytes()
    output = ROOT / f"public/fonts/nextlevel-inter-latin.{sha256(data)[:12]}.woff2"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    manifest = {
        "family": "NextLevelLatin", "style": "normal", "version": source["name"].getDebugName(5),
        "sourceRevision": REVISION, "sources": {name: {"url": url, "sha256": digest} for name, (url, digest) in SOURCES.items()},
        "tools": {"python": sys.version.split()[0], "fontTools": fontTools.__version__, "brotli": brotli.__version__, "uharfbuzz": shaping["uharfbuzz"], "pythonHashSeed": 0},
        "asset": f"/fonts/{output.name}", "bytes": len(data), "sha256": sha256(data),
        "unicodeRange": unicode_range(points), "codepointCount": len(points),
        "additionalNfdCodepoints": [f"U+{point:04X}" for point in sorted(points - live_points)],
        "axes": {"wght": {"min": 100, "default": 400, "max": 900}, "opsz": {"pinned": 14}},
        "metrics": {"unitsPerEm": 2048, "hhea": hhea, "xHeight": os2.sxHeight, "capHeight": os2.sCapHeight},
        "matchingCurrentArialFallback": {"sizeAdjust": "107.12%", "ascentOverride": "90.44%", "descentOverride": "22.52%", "lineGapOverride": "0.0%"},
        "parity": {"weights": weights, "sourceAdvanceAndOutlineComparisons": compared_source, "liveAdvanceAndOutlineComparisons": compared_live, "differences": 0},
        "shapingParity": shaping,
        "preserved": ["GSUB", "GPOS", "GDEF", "gvar", "HVAR", "default shaping and numeric layout features", "hinting", "OFL copyright and license"],
        "requestedLayoutFeatures": options.layout_features,
        "removedUnusedFeatures": "Stylistic SS/CV alternates are not used by the public CSS. Original Inter remains available separately.",
        "integration": {"fontDisplay": "optional", "originalInterFallbackRequired": True, "note": "Apply only to public pages; retain original Inter for Unicode outside this exact CSS range."},
    }
    (docs / "nextlevel-inter-latin.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Fontkit's variable-WOFF2 reader cannot access cmap after getVariation;
    # these untracked TTF equivalents enable independent shaping regression tests.
    derived.flavor = None
    derived.save(args.source_dir / "NextLevelLatin-validation.ttf")
    full.save(args.source_dir / "Inter-opsz14-validation.ttf")
    print(json.dumps({"bytes": len(data), "codepoints": len(points), "sourceComparisons": compared_source, "liveComparisons": compared_live, "sha256": manifest["sha256"]}))


if __name__ == "__main__":
    main()
