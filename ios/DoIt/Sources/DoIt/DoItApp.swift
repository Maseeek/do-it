import SwiftUI

@main
public struct DoItApp: App {
    @StateObject private var viewModel = DuelViewModel()
    @Environment(\.scenePhase) private var scenePhase

    public init() {}

    public var body: some Scene {
        WindowGroup {
            TabView {
                TodayDuelView(viewModel: viewModel)
                    .tabItem {
                        Label("Today", systemImage: "flame.fill")
                    }

                BattleAnalyticsView(viewModel: viewModel)
                    .tabItem {
                        Label("Battle", systemImage: "chart.bar.xaxis")
                    }

                StakesLedgerView(viewModel: viewModel)
                    .tabItem {
                        Label("Stakes", systemImage: "crown.fill")
                    }

                TrophyCabinetView(viewModel: viewModel)
                    .tabItem {
                        Label("Trophies", systemImage: "trophy.fill")
                    }

                SettingsView(viewModel: viewModel)
                    .tabItem {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
            }
            .tint(viewModel.activePlayerColor)
            .preferredColorScheme(.dark)
            .onChange(of: scenePhase) { newPhase in
                if newPhase == .active {
                    Task {
                        await viewModel.syncHealthKit()
                        await viewModel.refreshFromCloud()
                    }
                }
            }
        }
    }
}
