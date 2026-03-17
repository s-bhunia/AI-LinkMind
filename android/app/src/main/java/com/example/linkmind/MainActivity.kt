package com.example.linkmind

import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    // Your Link Saver web app URL
    private val defaultUrl = "https://ai-link-sever.vercel.app/"

    private var urlToInject: String? = null
    private var isLaunchedFromShare = false
    private var isWebAppReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        handleIntent(intent)

        webView.loadUrl(defaultUrl)
        handleBackButton()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent) // Important: Update the activity intent
        handleIntent(intent)
    }

    private fun handleIntent(incomingIntent: Intent?) {
        if (incomingIntent?.action == Intent.ACTION_SEND && "text/plain" == incomingIntent.type) {
            val sharedText = incomingIntent.getStringExtra(Intent.EXTRA_TEXT)
            if (sharedText != null) {
                urlToInject = sharedText
                isLaunchedFromShare = true

                // Instantly push the app to the background
                moveTaskToBack(true)

                Toast.makeText(this, "Saving to Link Saver...", Toast.LENGTH_SHORT).show()
                Log.d("ShareDebug", "Captured URL: $urlToInject. Pushed to background.")
                
                // If web app is already loaded and ready, inject immediately
                if (isWebAppReady) {
                    injectUrlIfReady()
                }
            }
        } else {
            isLaunchedFromShare = false
        }
    }

    private fun setupWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true

        // Attach the communication bridge
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                if (!isLaunchedFromShare) {
                    progressBar.visibility = View.VISIBLE
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                progressBar.visibility = View.GONE

                if (!isLaunchedFromShare) {
                    view?.loadUrl("file:///android_asset/error.html")
                } else {
                    Toast.makeText(this@MainActivity, "Link Saver: Network error. Failed to save.", Toast.LENGTH_LONG).show()
                    finish()
                }
            }
        }
    }

    // --- THE JAVASCRIPT BRIDGE ---
    inner class WebAppInterface {

        @JavascriptInterface
        fun notifyAppReady() {
            Log.d("ShareDebug", "Web App reported ready! Injecting URL now.")
            isWebAppReady = true
            runOnUiThread {
                injectUrlIfReady()
            }
        }

        @JavascriptInterface
        fun notifyLinkSaved() {
            Log.d("ShareDebug", "Web App finished saving. Closing Android App.")
            runOnUiThread {
                if (isLaunchedFromShare) {
                    Toast.makeText(this@MainActivity, "Link saved successfully!", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }

        @JavascriptInterface
        fun notifySaveFailed() {
            Log.d("ShareDebug", "Web App reported a save failure.")
            runOnUiThread {
                if (isLaunchedFromShare) {
                    Toast.makeText(this@MainActivity, "Link Saver: Failed to save the link.", Toast.LENGTH_LONG).show()
                    finish()
                }
            }
        }
    }

    private fun injectUrlIfReady() {
        urlToInject?.let { link ->
            val script = "javascript:if(window.setSharedUrl) { window.setSharedUrl('$link'); }"
            Log.d("ShareDebug", "Executing injection script.")
            webView.evaluateJavascript(script, null)
            urlToInject = null
        }
    }

    private fun handleBackButton() {
        val callback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        }
        onBackPressedDispatcher.addCallback(this, callback)
    }
}
