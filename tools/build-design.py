"""Build the local interface font and diagonal Bayer backdrop from our glyphs."""
import json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

root = Path(__file__).resolve().parent.parent
glyphs = json.loads((root / 'tools/glyphs.json').read_text(encoding='utf-8'))
names = ['.notdef'] + [f'uni{ord(c):04X}' for c in glyphs]
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({ord(c): f'uni{ord(c):04X}' for c in glyphs})
outlines = {}
for name, rows in [('.notdef', ['11111','10001','10101','10101','10001','10001','11111'])] + [(f'uni{ord(c):04X}', rows) for c, rows in glyphs.items()]:
    pen = TTGlyphPen(None)
    for y, row in enumerate(rows):
        for x, dot in enumerate(row):
            if dot == '1':
                left, bottom = x * 100, (8 - y) * 100
                pen.moveTo((left, bottom)); pen.lineTo((left, bottom + 100))
                pen.lineTo((left + 100, bottom + 100)); pen.lineTo((left + 100, bottom)); pen.closePath()
    outlines[name] = pen.glyph()
fb.setupGlyf(outlines)
fb.setupHorizontalMetrics({name: (600, 0) for name in names})
fb.setupHorizontalHeader(ascent=900, descent=-200)
fb.setupNameTable({'familyName':'Papier Pixel','styleName':'Regular','uniqueFontIdentifier':'PapierPixel1','fullName':'Papier Pixel','psName':'PapierPixel-Regular','version':'Version 1.0'})
fb.setupOS2(sTypoAscender=900, sTypoDescender=-200, usWinAscent=900, usWinDescent=200)
fb.setupPost()
fb.setupMaxp()
(root / 'assets').mkdir(exist_ok=True)
fb.save(root / 'assets/papier-pixel.ttf')

matrix = [[0]]
while len(matrix) < 8:
    n = len(matrix)
    matrix = [[4 * matrix[y % n][x % n] + [[0,2],[3,1]][y//n][x//n] for x in range(n*2)] for y in range(n*2)]
rects = []
for y in range(240):
    for x in range(240):
        level = max(0, min(.70, (x + y) / 478 * .85 - .10))
        if (matrix[y % 8][x % 8] + .5) / 64 < level:
            rects.append(f'<rect x="{x*3}" y="{y*3}" width="3" height="3"/>')
(root / 'assets/dither.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" shape-rendering="crispEdges"><path fill="white" d="M0 0h720v720H0z"/>' + ''.join(rects) + '</svg>', encoding='utf-8')
print('Built Papier Pixel and diagonal dither background.')
