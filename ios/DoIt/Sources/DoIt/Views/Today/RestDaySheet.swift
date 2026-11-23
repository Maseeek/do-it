import SwiftUI

public struct RestDaySheet: View {
    public let dateStr: String
    public let isCurrentlyRestDay: Bool
    public let playerColor: Color
    public let onDeclare: (String?) -> Void
    public let onCancel: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var reason: String = ""

    private let presetReasons = [
        "Deliberate recovery & wellness",
        "Traveling / In transit",
        "Feeling under the weather",
        "Special celebration with family"
    ]

    public init(
        dateStr: String,
        isCurrentlyRestDay: Bool,
        playerColor: Color,
        onDeclare: @escaping (String?) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.dateStr = dateStr
        self.isCurrentlyRestDay = isCurrentlyRestDay
        self.playerColor = playerColor
        self.onDeclare = onDeclare
        self.onCancel = onCancel
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 6) {
                    Image(systemName: "bed.double.fill")
                        .font(.system(size: 36))
                        .foregroundColor(playerColor)
                    Text("Rest Day Declaration")
                        .font(.titleMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text("An explicit recovery day preserves your active habit streak without awarding Leaderboard points.")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
                .padding(.top, 16)

                if isCurrentlyRestDay {
                    VStack(spacing: 12) {
                        Text("Rest day is currently active for \(dateStr).")
                            .font(.bodyEmphasized)
                            .foregroundColor(.linearGreen)

                        Button(action: {
                            onCancel()
                            dismiss()
                        }) {
                            Text("Cancel Rest Day (Resume Battle)")
                                .font(.bodyEmphasized)
                                .foregroundColor(.linearRed)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.linearRed.opacity(0.12))
                                .cornerRadius(10)
                        }
                    }
                    .padding(20)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Reason / Reflection (optional)")
                            .font(.badgeLabel)
                            .foregroundColor(.linearTextMuted)

                        TextField("e.g. Scheduled rest day after heavy training", text: $reason)
                            .padding(12)
                            .background(Color.linearCardBg)
                            .cornerRadius(10)
                            .hairlineBorder()
                            .foregroundColor(.linearTextPrimary)

                        ForEach(presetReasons, id: \.self) { preset in
                            Button(action: { reason = preset }) {
                                Text(preset)
                                    .font(.captionMuted)
                                    .foregroundColor(.linearTextSecondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(8)
                                    .background(Color.linearCardBg)
                                    .cornerRadius(6)
                                    .hairlineBorder()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)

                    Spacer()

                    Button(action: {
                        onDeclare(reason.isEmpty ? nil : reason)
                        dismiss()
                    }) {
                        Text("Declare Rest Day")
                            .font(.bodyEmphasized)
                            .foregroundColor(.linearDarkBg)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(playerColor)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 16)
                }
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Rest Day")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.linearTextMuted)
                }
            }
        }
    }
}
