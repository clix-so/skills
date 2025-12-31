// iOS Clix SDK Integration Example
//
// This file is constructed directly from Clix SDK `search_sdk` sample sources:
// - Samples/BasicApp/Sources/AppDelegate.swift
// - Samples/BasicApp/Sources/ClixConfiguration.swift
// - Samples/BasicApp/Sources/AppState.swift
//
// It demonstrates:
// - Subclassing `ClixAppDelegate`
// - Loading config from `ClixConfig.json` in the app bundle
// - Initializing `Clix` early in app launch

import Clix
import FirebaseCore
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Initialize ClixConfig with params (verified pattern)
        let config = ClixConfig(
            projectId: ProcessInfo.processInfo.environment["CLIX_PROJECT_ID"] ?? "YOUR_PROJECT_ID",
            apiKey: ProcessInfo.processInfo.environment["CLIX_PUBLIC_API_KEY"] ?? "YOUR_PUBLIC_API_KEY",
            logLevel: .info
        )
        
        // Pass config to initialize
        try? Clix.initialize(config: config)
        
        return true
    }
}

