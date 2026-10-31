"""生成应用图标 icon.ico（橙色圆角方块 + 白色小房子）。"""
from pathlib import Path

from PIL import Image, ImageDraw

S = 256
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
for y in range(S):  # 竖向渐变
    t = y / S
    c = (255, int(138 - 48 * t), int(31 - 10 * t), 255)
    d.line([(0, y), (S, y)], fill=c)
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=58, fill=255)
img.putalpha(mask)
d = ImageDraw.Draw(img)
w = 18
d.line([(56, 128), (128, 66), (200, 128)], fill="white", width=w, joint="curve")
d.rounded_rectangle([78, 120, 178, 200], radius=10, outline="white", width=w)
d.rounded_rectangle([114, 150, 142, 200], radius=4, fill="white")
img.save(Path(__file__).parent / "icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
