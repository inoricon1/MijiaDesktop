package io.github.inoricon1.mijia

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.chaquo.python.PyObject
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import org.json.JSONObject
import java.util.TimeZone
import java.util.concurrent.Executors
import java.util.concurrent.Future

/**
 * 整个界面是 assets 里的网页（和桌面版同一份 app/web），
 * 后端是 Chaquopy 内嵌的 Python（和桌面版同一份 app 目录下的 .py 文件）。
 * 网页通过 AndroidBridge.call() 异步调用 Python，结果用 window.__bridgeResolve() 回传。
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val pool = Executors.newCachedThreadPool()
    private lateinit var py: Future<PyObject>

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Python.isStarted()) Python.start(AndroidPlatform(this))
        // Python 初始化要一两秒，放到后台线程；网页的调用会等它就绪
        py = pool.submit<PyObject> {
            Python.getInstance().getModule("android_entry").also {
                it.callAttr("init", filesDir.absolutePath, TimeZone.getDefault().id)
            }
        }

        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
        }
        web.webViewClient = object : WebViewClient() {
            // 页面里的外部链接（比如青萍开发者平台）用系统浏览器打开
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                if (req.url.scheme == "file") return false
                startActivity(Intent(Intent.ACTION_VIEW, req.url))
                return true
            }
        }
        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        web.loadUrl("file:///android_asset/index.html")
    }

    inner class Bridge {
        @JavascriptInterface
        fun call(id: String, name: String, args: String) {
            pool.execute {
                val res = try {
                    py.get().callAttr("call", name, args).toString()
                } catch (e: Throwable) {
                    JSONObject().put("ok", false).put("error", e.message ?: e.toString()).toString()
                }
                web.post {
                    web.evaluateJavascript("window.__bridgeResolve(${JSONObject.quote(id)}, ${JSONObject.quote(res)})", null)
                }
            }
        }

        /** 把 data:image/png;base64,... 存到相册（用于米家 App 从相册识别登录二维码）。 */
        @JavascriptInterface
        fun saveImage(dataUrl: String, name: String): Boolean = try {
            val bytes = Base64.decode(dataUrl.substringAfter(","), Base64.DEFAULT)
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, name)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                if (Build.VERSION.SDK_INT >= 29) put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/米家看板")
            }
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            uri != null && contentResolver.openOutputStream(uri)!!.use { it.write(bytes); true }
        } catch (e: Exception) {
            false
        }

        @JavascriptInterface
        fun openMiHome(): Boolean {
            val intent = packageManager.getLaunchIntentForPackage("com.xiaomi.smarthome") ?: return false
            startActivity(intent)
            return true
        }

        @JavascriptInterface
        fun openUrl(url: String) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }

        @JavascriptInterface
        fun copyText(text: String) {
            (getSystemService(CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("text", text))
        }
    }

    /** 返回键先交给网页处理（关详情、关设置、回到环境总览），网页不处理再退出。 */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("window.__onBack ? window.__onBack() : false") { handled ->
            if (handled != "true") finish()
        }
    }
}
