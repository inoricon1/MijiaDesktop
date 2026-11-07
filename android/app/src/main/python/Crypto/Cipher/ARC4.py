"""纯 Python 的 RC4，代替 pycryptodome（安卓上不想引入原生库）。

mijiaAPI 只用到 `Crypto.Cipher.ARC4.new(key).encrypt(data)`，这里只实现这一部分。
"""


class _ARC4:
    def __init__(self, key: bytes):
        s = list(range(256))
        j = 0
        for i in range(256):
            j = (j + s[i] + key[i % len(key)]) & 0xFF
            s[i], s[j] = s[j], s[i]
        self._s, self._i, self._j = s, 0, 0

    def encrypt(self, data: bytes) -> bytes:
        s, i, j = self._s, self._i, self._j
        out = bytearray(len(data))
        for n, b in enumerate(data):
            i = (i + 1) & 0xFF
            j = (j + s[i]) & 0xFF
            s[i], s[j] = s[j], s[i]
            out[n] = b ^ s[(s[i] + s[j]) & 0xFF]
        self._i, self._j = i, j
        return bytes(out)

    decrypt = encrypt


def new(key: bytes, *args, **kwargs) -> _ARC4:
    return _ARC4(bytes(key))
