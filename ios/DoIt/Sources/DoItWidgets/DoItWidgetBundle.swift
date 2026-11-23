import WidgetKit
import SwiftUI

@main
public struct DoItWidgetBundle: WidgetBundle {
    public init() {}

    public var body: some Widget {
        TodayDuelWidget()
        LockScreenDuelWidget()
    }
}
