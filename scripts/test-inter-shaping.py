"""Verify public-font shaping with HarfBuzz, including NFC/NFD and numerals."""
from __future__ import annotations

import hashlib
import io
import json
import pathlib
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "artifacts/font-tools"))


def verify_shaping(source, target):
    import uharfbuzz as hb
    from fontTools.pens.recordingPen import DecomposingRecordingPen

    assert hb.__version__ == "0.57.0"
    fonts = []
    for font in [source, target]:
        buffer = io.BytesIO()
        flavor = font.flavor
        font.flavor = None
        font.recalcTimestamp = False
        font.save(buffer)
        font.flavor = flavor
        shaped = hb.Font(hb.Face(buffer.getvalue()))
        hb.ot_font_set_funcs(shaped)
        fonts.append(shaped)
    samples = [
        "ĂăÂâÎîȘșȚțŞşŢţ",
        "Știință și creație. Îți prezentăm o factură corectă: 1.234,56 RON, TVA 21%. Fă-ți afacerea cunoscută!",
        "AV To office affinity 1/2 0123456789 € 123,45%",
    ]
    features = [{}, {"tnum": True, "pnum": False}, {"pnum": True, "tnum": False}, {"frac": True}, {"zero": True}, {"sups": True}, {"subs": True}, {"numr": True}, {"dnom": True}]
    weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    outlines = {}
    outline_comparisons = runs = 0
    orders = [font.getGlyphOrder() for font in [source, target]]
    for weight in weights:
        glyph_sets = [font.getGlyphSet(location={"wght": weight}) for font in [source, target]]

        def outline(index, glyph_id):
            key = (index, weight, glyph_id)
            if key not in outlines:
                pen = DecomposingRecordingPen(glyph_sets[index])
                glyph_sets[index][orders[index][glyph_id]].draw(pen)
                outlines[key] = pen.value
            return outlines[key]

        for original in samples:
            for text in [original, unicodedata.normalize("NFD", original)]:
                for enabled in features:
                    results = []
                    for font in fonts:
                        font.set_variations({"wght": weight})
                        buffer = hb.Buffer()
                        buffer.add_str(text)
                        buffer.guess_segment_properties()
                        buffer.language = "ro"
                        hb.shape(font, buffer, enabled)
                        results.append((list(buffer.glyph_infos), [(glyph.cluster, position.x_advance, position.y_advance, position.x_offset, position.y_offset) for glyph, position in zip(buffer.glyph_infos, buffer.glyph_positions)]))
                    assert results[0][1] == results[1][1], f"Shaping position mismatch: wght={weight}, features={enabled}, text={text!r}"
                    for before, after in zip(results[0][0], results[1][0]):
                        assert outline(0, before.codepoint) == outline(1, after.codepoint), f"Shaped glyph outline mismatch: wght={weight}, features={enabled}, text={text!r}"
                        outline_comparisons += 1
                    runs += 1
    return {"engine": "HarfBuzz", "uharfbuzz": hb.__version__, "runs": runs, "shapedGlyphOutlineComparisons": outline_comparisons, "weights": weights, "forms": ["NFC", "NFD"], "language": "ro", "differences": 0}


if __name__ == "__main__":
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    manifest = json.loads((ROOT / "docs/fonts/nextlevel-inter-latin.json").read_text(encoding="utf-8"))
    asset = ROOT / "public" / manifest["asset"].lstrip("/")
    assert hashlib.sha256(asset.read_bytes()).hexdigest() == manifest["sha256"]
    source = ROOT / "artifacts/font-source/Inter-source.ttf"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest["sources"]["Inter-source.ttf"]["sha256"]
    pinned = instantiateVariableFont(TTFont(source, recalcTimestamp=False), {"opsz": 14}, inplace=False)
    canonical = io.BytesIO()
    pinned.recalcTimestamp = False
    pinned.save(canonical)
    canonical.seek(0)
    print(json.dumps(verify_shaping(TTFont(canonical, recalcTimestamp=False), TTFont(asset, recalcTimestamp=False))))
