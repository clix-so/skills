// Android Clix SDK Integration Example
//
// Constructed from Clix MCP sources:
// - `search_sdk` (Android): Clix.initialize(context, config) and ClixConfig model
// - `search_sdk` (Android sample): samples/basic-app/AndroidManifest.xml shows Application entrypoint name
//
// Note: the official sample app also uses an assets-based config (`ClixConfig.json`).
// The code for that loader isn't returned in current `search_sdk` results, so this example keeps
// the official SDK API shape (Clix.initialize + ClixConfig) without inventing a loader.

package com.example.app

import android.app.Application
import so.clix.core.Clix
import so.clix.core.ClixConfig

class MyApplication : Application() {
  override fun onCreate() {
    super.onCreate()

    val projectId = BuildConfig.CLIX_PROJECT_ID ?: "YOUR_PROJECT_ID"
    val apiKey = BuildConfig.CLIX_PUBLIC_API_KEY ?: "YOUR_API_KEY"

    // Use verified ClixConfig pattern
    val config = ClixConfig(
      projectId = projectId,
      apiKey = apiKey,
      // logLevel = ClixLogLevel.INFO (optional)
    )

    // Must be application context
    Clix.initialize(this, config)
  }
}

// AndroidManifest.xml:
// <application android:name=".MyApplication" ... />

