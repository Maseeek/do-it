import UIKit

public final class HapticsService {
    public static let shared = HapticsService()

    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()

    private init() {
        prepare()
    }

    public func prepare() {
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        selectionFeedback.prepare()
        notificationFeedback.prepare()
    }

    public func checkInCompleted() {
        mediumImpact.impactOccurred()
    }

    public func checkInRemoved() {
        lightImpact.impactOccurred()
    }

    public func parReached() {
        notificationFeedback.notificationOccurred(.success)
    }

    public func streakExtended() {
        heavyImpact.impactOccurred(intensity: 0.9)
    }

    public func reactionSent() {
        lightImpact.impactOccurred()
    }

    public func reactionReceived() {
        mediumImpact.impactOccurred()
    }

    public func selectionChanged() {
        selectionFeedback.selectionChanged()
    }

    public func errorOccurred() {
        notificationFeedback.notificationOccurred(.error)
    }
}
