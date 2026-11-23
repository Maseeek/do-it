import SwiftUI

public struct SendReactionSheet: View {
    public let partnerName: String
    public let playerColor: Color
    public let onSend: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedEmoji: String = "🔥"
    @State private var message: String = ""

    private let quickEmojis = ["🔥", "⚡", "💪", "👏", "❤️", "🏆", "☕", "🎯"]
    private let presetMessages = [
        "Crushing it today! Keep going!",
        "Watch your back, I'm closing the gap!",
        "Par reached! Your turn!",
        "Proud of your discipline today ❤️",
        "Coffee's on you this Sunday! 😉"
    ]

    public init(
        partnerName: String,
        playerColor: Color,
        onSend: @escaping (String, String) -> Void
    ) {
        self.partnerName = partnerName
        self.playerColor = playerColor
        self.onSend = onSend
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 4) {
                    Text("Cheer on \(partnerName)")
                        .font(.titleMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text("Send a real-time battle cheer or playful nudge")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                }
                .padding(.top, 16)

                // Emoji Picker Grid
                HStack(spacing: 12) {
                    ForEach(quickEmojis, id: \.self) { emoji in
                        Button(action: { selectedEmoji = emoji }) {
                            Text(emoji)
                                .font(.system(size: 28))
                                .padding(10)
                                .background(selectedEmoji == emoji ? playerColor.opacity(0.2) : Color.linearCardBg)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(selectedEmoji == emoji ? playerColor : Color.linearBorder, lineWidth: 1)
                                )
                        }
                    }
                }
                .padding(.horizontal, 16)

                // Message Text Field
                VStack(alignment: .leading, spacing: 8) {
                    Text("Cheer message")
                        .font(.badgeLabel)
                        .foregroundColor(.linearTextMuted)

                    TextField("Add your message...", text: $message)
                        .padding(12)
                        .background(Color.linearCardBg)
                        .cornerRadius(10)
                        .hairlineBorder()
                        .foregroundColor(.linearTextPrimary)
                }
                .padding(.horizontal, 20)

                // Quick Presets
                VStack(alignment: .leading, spacing: 8) {
                    Text("Quick inspirations")
                        .font(.badgeLabel)
                        .foregroundColor(.linearTextMuted)

                    ForEach(presetMessages, id: \.self) { preset in
                        Button(action: { message = preset }) {
                            Text(preset)
                                .font(.captionMuted)
                                .foregroundColor(.linearTextSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(10)
                                .background(Color.linearCardBg)
                                .cornerRadius(8)
                                .hairlineBorder()
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)

                Spacer()

                // Send Button
                Button(action: {
                    let finalMessage = message.isEmpty ? "Cheering you on!" : message
                    onSend(selectedEmoji, finalMessage)
                    dismiss()
                }) {
                    HStack {
                        Text(selectedEmoji)
                        Text("Send Cheer to \(partnerName)")
                            .font(.bodyEmphasized)
                    }
                    .foregroundColor(.linearDarkBg)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(playerColor)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Battle Cheer")
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
