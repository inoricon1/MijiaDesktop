# 米家桌面版

Windows 桌面上的米家看板：直观显示各房间的温湿度 / CO₂ / PM2.5 及其变化趋势，并能控制支持的设备。

- 后端：[mijiaAPI](https://github.com/Do1e/mijia-api)（扫码登录、读写 MIoT 属性）+ miot-spec.org 设备规格
- 界面：pywebview（Edge WebView2）+ 原生 HTML/JS，无前端构建步骤

## 目录

| 路径 | 说明 |
|---|---|
| `app/main.py` | 入口，pywebview 窗口和暴露给前端的 API |
| `app/core.py` | 登录、设备列表、属性读写、云端历史 + 本地历史合并 |
| `app/spec.py` | 设备规格解析、中文翻译、「简洁模式」过滤规则 |
| `app/web/` | 界面（index.html / app.js / style.css） |
| `app/install.ps1` | 安装到 `%LOCALAPPDATA%\Programs\MijiaDesktop` 并在桌面建快捷方式 |
| `tools/realserver.py` | 调试用：在浏览器里用真实数据预览界面，控制命令一律不执行 |

## 常用操作

```powershell
# 安装 / 更新（会覆盖已安装的程序，不影响登录和数据）
powershell -ExecutionPolicy Bypass -File app\install.ps1

# 在浏览器里调界面（只读）：之后打开 http://127.0.0.1:8766/dev
& "$env:LOCALAPPDATA\Programs\MijiaDesktop\.venv\Scripts\python.exe" tools\realserver.py app
```

用户数据在 `%LOCALAPPDATA%\Programs\MijiaDesktop\data`：`auth.json`（登录凭证，约 30 天自动续期）、`settings.json`（含青萍 App Key/Secret）、`specs/`（规格缓存）、`history.db`（本地历史，米家读数保留 14 天，青萍历史长期保留）、`app.log`（运行日志）。

> 不放 `%APPDATA%` 的原因：从打包应用（比如 Claude 桌面版）里启动的进程，写 AppData 会被 Windows 重定向到该应用的私有目录，双击快捷方式打开时就会读到另一份数据。

## 安卓版（米家看板）

`android/` 是安卓版：用 [Chaquopy](https://chaquo.com/chaquopy/) 把同一份 `app/*.py` 后端打进 APK，界面是同一份 `app/web` 跑在 WebView 里。
pycryptodome 用 `android/app/src/main/python/Crypto` 里的纯 Python RC4 代替，所以 APK 里没有额外的原生库。

- 构建：推送到 main 后由 GitHub Actions（`.github/workflows/android.yml`）自动构建，在 Actions 页面的 Artifacts 里下载 `MijiaDashboard-apk`
- 登录：手机上没法扫自己的屏幕，点「保存二维码到相册」，再在米家 App「扫一扫」里从相册选这张图
- 数据（登录、设置、青萍 Key、历史缓存）存在 App 私有目录，和电脑版互不影响
