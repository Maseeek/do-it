import SwiftUI

public struct HabitCheckInCard: View {
    public let habit: Habit
    public let isCompleted: Bool
    public let checkIn: CheckIn?
    public let playerColor: Color
    public let weeklyCompletionsCount: Int
    public let onToggle: () -> Void
    public let onQuantitativeTap: () -> Void
    public let onProofTap: () -> Void

    public init(
        habit: Habit,
        isCompleted: Bool,
        checkIn: CheckIn?,
        playerColor: Color,
        weeklyCompletionsCount: Int = 0,
        onToggle: @escaping () -> Void,
        onQuantitativeTap: @escaping () -> Void,
        onProofTap: @escaping () -> Void
    ) {
        self.habit = habit
        self.isCompleted = isCompleted
        self.checkIn = checkIn
        self.playerColor = playerColor
        self.weeklyCompletionsCount = weeklyCompletionsCount
        self.onToggle = onToggle
        self.onQuantitativeTap = onQuantitativeTap
        self.onProofTap = onProofTap
    }

    public var body: some View {
        HStack(spacing: 12) {
            // Category Icon with glow
            ZStack {
                Circle()
                    .fill(isCompleted ? playerColor.opacity(0.18) : Color.linearCardElevated)
                    .frame(width: 42, height: 42)
                    .overlay(
                        Circle()
                            .stroke(isCompleted ? playerColor.opacity(0.4) : Color.linearBorder, lineWidth: 0.5)
                    )

                Image(systemName: habit.iconName.isEmpty ? habit.category.systemIcon : habit.iconName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(isCompleted ? playerColor : habit.category.badgeColor)
            }

            // Habit Details
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(habit.title)
                        .font(.bodyEmphasized)
                        .foregroundColor(isCompleted ? .linearTextMuted : .linearTextPrimary)
                        .strikethrough(isCompleted, color: .linearTextMuted)

                    if habit.requiresProof {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 10))
                            .foregroundColor(checkIn?.hasProof == true ? .linearGreen : .linearTextMuted)
                    }
                }

                if let note = checkIn?.note, !note.isEmpty {
                    Text(note)
                        .font(.captionMuted)
                        .foregroundColor(playerColor)
                } else {
                    Text(habit.description)
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                        .lineLimit(1)
                }

                // Metadata Chips: Weekly cadence or Automation
                HStack(spacing: 6) {
                    if habit.isWeekly {
                        let target = habit.effectiveWeeklyTarget
                        HStack(spacing: 3) {
                            ForEach(0..<target, id: \.self) { idx in
                                Circle()
                                    .fill(idx < weeklyCompletionsCount ? playerColor : Color.linearBorder)
                                    .frame(width: 6, height: 6)
                            }
                            Text("\(weeklyCompletionsCount)/\(target) wk")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.linearTextMuted)
                        }
                    }

                    if let auto = habit.automation {
                        HStack(spacing: 3) {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.linearRed)
                            Text(auto.metric.title)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.linearTextMuted)
                        }
                    }

                    if habit.isQuantitative {
                        Button(action: onQuantitativeTap) {
                            HStack(spacing: 2) {
                                Text(checkIn?.quantity != nil ? "\(checkIn!.quantity!) \(habit.quantityUnit ?? "")" : "Log \(habit.quantityUnit ?? "")")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(playerColor)
                                Image(systemName: "slider.horizontal.3")
                                    .font(.system(size: 9))
                                    .foregroundColor(playerColor)
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(playerColor.opacity(0.12))
                            .cornerRadius(4)
                        }
                        .buttonStyle(.plain)
                    }

                    if habit.requiresProof {
                        Button(action: onProofTap) {
                            HStack(spacing: 2) {
                                Text(checkIn?.hasProof == true ? "Proof Attached" : "Add Proof")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(checkIn?.hasProof == true ? .linearGreen : .linearTextMuted)
                                Image(systemName: "paperclip")
                                    .font(.system(size: 9))
                                    .foregroundColor(checkIn?.hasProof == true ? .linearGreen : .linearTextMuted)
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.linearCardElevated)
                            .cornerRadius(4)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Spacer()

            // Points & Completion Checkmark Button
            VStack(alignment: .trailing, spacing: 6) {
                Text("+\(isCompleted ? (checkIn?.pointsEarned ?? habit.points) : habit.points)")
                    .font(.scoreNumberSmall)
                    .foregroundColor(isCompleted ? playerColor : .linearTextMuted)

                Button(action: onToggle) {
                    ZStack {
                        Circle()
                            .fill(isCompleted ? playerColor : Color.clear)
                            .frame(width: 28, height: 28)
                            .overlay(
                                Circle()
                                    .stroke(isCompleted ? playerColor : Color.linearBorder, lineWidth: 1.5)
                            )

                        if isCompleted {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.linearDarkBg)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(isCompleted ? Color.linearCardBg : Color.linearCardBg.opacity(0.8))
        .cornerRadius(12)
        .hairlineBorder(color: isCompleted ? playerColor.opacity(0.3) : Color.linearBorder)
    }
}
