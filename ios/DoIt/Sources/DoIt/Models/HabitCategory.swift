import Foundation
import SwiftUI

public enum HabitCategory: String, Codable, CaseIterable, Identifiable {
    case foundation
    case physical
    case cardio
    case intellect
    case deep_work
    case skills
    case nutrition
    case environment
    case mind
    case language
    case finance

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .foundation: return "Sleep & Recovery"
        case .physical: return "Gym & Strength"
        case .cardio: return "Sport & Running"
        case .intellect: return "Reading & Books"
        case .deep_work: return "Personal Project"
        case .skills: return "Deliberate Craft"
        case .nutrition: return "Nutrition & Fuel"
        case .environment: return "Clean Space"
        case .mind: return "Mind & Meditation"
        case .language: return "Language Study"
        case .finance: return "Finance"
        }
    }

    public var systemIcon: String {
        switch self {
        case .foundation: return "moon.stars.fill"
        case .physical: return "dumbbell.fill"
        case .cardio: return "figure.run"
        case .intellect: return "book.fill"
        case .deep_work: return "briefcase.fill"
        case .skills: return "scope"
        case .nutrition: return "fork.knife"
        case .environment: return "sparkles"
        case .mind: return "brain.head.profile"
        case .language: return "globe.europe.africa.fill"
        case .finance: return "chart.line.uptrend.xyaxis"
        }
    }

    public var badgeColor: Color {
        switch self {
        case .foundation: return Color(hex: "818cf8")
        case .physical: return Color(hex: "f87171")
        case .cardio: return Color(hex: "fb923c")
        case .intellect: return Color(hex: "38bdf8")
        case .deep_work: return Color(hex: "a78bfa")
        case .skills: return Color(hex: "34d399")
        case .nutrition: return Color(hex: "4ade80")
        case .environment: return Color(hex: "2dd4bf")
        case .mind: return Color(hex: "e879f9")
        case .language: return Color(hex: "facc15")
        case .finance: return Color(hex: "22c55e")
        }
    }
}
