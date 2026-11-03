import SwiftUI

@main
struct HumanDetectApp: App {
    init() {
        SensitivityDetector.logEnvironment()
    }
    var body: some Scene {
        WindowGroup("HumanDetect") {
            ContentView()
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
    }
}
