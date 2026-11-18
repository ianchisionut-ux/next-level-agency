# Public Inter subset

`NextLevelLatin` is a renamed derivative of Inter 4.001, built from the pinned
Google Fonts source and licensed under the included [SIL OFL 1.1](OFL-Inter.txt).
The asset is **51,956 bytes**, compared with **133,704 bytes** for the two Inter
files currently needed for ordinary Romanian text, a 61.1% reduction.

The [manifest](nextlevel-inter-latin.json) records the source URLs and hashes,
content-addressed output filename, exact CSS `unicode-range`, metric fallback,
tool versions and validation results. Its coverage includes ASCII, Romanian
modern and historical forms, NFC/NFD combining marks, common punctuation,
numbers and currencies. Other languages continue through the original Inter
fallback. Apply the subset to public pages only; keep the original font on the
dashboard and as a fallback outside the recorded range.

Weight remains variable from 100 to 900. Optical size is pinned to 14, matching
the current Google Fonts WOFF2s. Default shaping, kerning, ligatures, marks and
numeric features are retained. Unused stylistic SS/CV alternatives are omitted.
No hinting is removed. Copyright and OFL metadata remain in the font; internal
family and PostScript names are changed to `NextLevelLatin`.

To reproduce with an available Python interpreter, install tools into the
project's ignored artifacts folder rather than changing a system environment:

```powershell
python -B -m pip --isolated install --index-url https://pypi.org/simple --target artifacts/font-tools --no-cache-dir --no-compile fonttools==4.68.0 brotli==1.2.1 uharfbuzz==0.57.0
python -B scripts/subset-inter.py --download
python -B scripts/test-inter-shaping.py
```

The build verifies every pinned download before use. It compares advance widths
and decomposed outlines at nine weights against the canonical source and the
current immutable Google Fonts references, checks Romanian coverage and global
metrics, and checks default/numeric shaping with HarfBuzz before publication.
The exact asset filename is
derived from its SHA-256, so immutable caching cannot serve a changed font under
the same URL. HarfBuzz verifies long Romanian NFC/NFD text, glyph outlines,
advances, offsets and clusters at all nine weights. Fontkit is not used for
shaping checks: its NFD kerning behavior differed for equivalent full/subset
fonts even though HarfBuzz gave identical results. Tools and validation TTFs
stay in artifacts.

Byte reproducibility was verified with Python 3.13.13 and the recorded tool
versions. The build pins Python's hash seed to zero in its own child process so
FontTools serializes GSUB/GPOS sets consistently; it changes no system setting.

Use the manifest's exact range on both the public WOFF2 face and its local Arial
metric fallback. The Arial face is static: do not declare it as a variable
100–900 face. The application integrates its font stack separately; this build
script does not edit layouts, CSS, headers or dashboard behavior.
