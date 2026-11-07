plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

android {
    namespace = "io.github.inoricon1.mijia"
    compileSdk = 34

    defaultConfig {
        applicationId = "io.github.inoricon1.mijia"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        ndk {
            // 真机基本都是 arm64；x86_64 给 MuMu 等电脑上的模拟器用
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    sourceSets {
        getByName("main") {
            // 界面直接用桌面版的 app/web，保证两边一致
            assets.srcDirs("../../app/web")
        }
    }

    // 正式签名来自 GitHub Actions Secret（CI 解码到 KEYSTORE_FILE）；本地没有时退回调试签名
    val keystoreFile = System.getenv("KEYSTORE_FILE")?.let { file(it) }?.takeIf { it.exists() }
    signingConfigs {
        if (keystoreFile != null) {
            create("release") {
                storeFile = keystoreFile
                storeType = "pkcs12"
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = "mijia"
                keyPassword = System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            // 签名固定不变，新版才能直接覆盖安装旧版
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

chaquopy {
    defaultConfig {
        version = "3.12"
        pip {
            // mijiaAPI 声明依赖 pycryptodome / Pillow（原生库），安卓上用不到：
            // RC4 由 src/main/python/Crypto 里的纯 Python 实现代替，二维码用 SVG 生成
            options("--no-deps")
            install("mijiaAPI==5.0.0")
            install("requests")
            install("urllib3")
            install("idna")
            install("certifi")
            install("charset-normalizer")
            install("tzlocal")
            install("qrcode")
        }
    }
    sourceSets {
        getByName("main") {
            // 后端 Python 代码和桌面版共用
            srcDir("../../app")
        }
    }
}
