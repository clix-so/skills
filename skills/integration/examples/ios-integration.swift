// iOS Clix SDK Integration Example
//
// This file is constructed directly from Clix SDK `search_sdk` sample sources:
// - Samples/BasicApp/Sources/AppDelegate.swift
// - Samples/BasicApp/Sources/ClixConfiguration.swift
// - Samples/BasicApp/Sources/AppState.swift
//
// It demonstrates:
// - Using a standard `AppDelegate` that conforms to `UIApplicationDelegate`
// - Creating `ClixConfig` from environment variables (e.g., CLIX_PROJECT_ID, CLIX_PUBLIC_API_KEY)
// - Initializing `Clix` early in `application(_:didFinishLaunchingWithOptions:)`

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

