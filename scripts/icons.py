# Gera os ícones PNG do app a partir de assets/icon-source.png (o ícone desenhado pelo dono do app).
# O original tem cantos arredondados transparentes. O iOS arredonda sozinho, então o fundo
# é estendido até os cantos para virar um quadrado cheio.
# Uso: python3 scripts/icons.py   (precisa de Pillow e numpy)
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
im = np.asarray(Image.open(root / 'assets/icon-source.png').convert('RGBA')).astype(float)
h, w = im.shape[:2]
rgb, a = im[..., :3], im[..., 3] / 255
ys, xs = np.mgrid[0:h, 0:w]

# ajusta um plano de cor ao degradê do fundo, usando só pixels opacos e claros (fora do texto)
mask = (a > 0.99) & (rgb.mean(axis=2) > 150)
A = np.c_[np.ones(mask.sum()), xs[mask], ys[mask]]
coef = [np.linalg.lstsq(A, rgb[..., c][mask], rcond=None)[0] for c in range(3)]
bg = np.stack([coef[c][0] + coef[c][1] * xs + coef[c][2] * ys for c in range(3)], axis=2).clip(0, 255)

full = rgb * a[..., None] + bg * (1 - a[..., None])
base = Image.fromarray(full.round().astype('uint8'), 'RGB')
out = root / 'public/icons'
out.mkdir(parents=True, exist_ok=True)
for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512), ('icon-maskable-512.png', 512), ('favicon-32.png', 32)]:
    base.resize((size, size), Image.LANCZOS).save(out / name, optimize=True)
print('ícones gerados em public/icons')
