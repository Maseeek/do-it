import SwiftUI

public struct QuantitativeInputSheet: View {
    public let habit: Habit
    public let currentQuantity: Int
    public let playerColor: Color
    public let onSave: (Int) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var quantity: Int

    public init(
        habit: Habit,
        currentQuantity: Int,
        playerColor: Color,
        onSave: @escaping (Int) -> Void
    ) {
        self.habit = habit
        self.currentQuantity = currentQuantity
        self.playerColor = playerColor
        self.onSave = onSave
        _quantity = State(initialValue: currentQuantity > 0 ? currentQuantity : (habit.maxQuantity ?? 25))
    }

    private var maxQty: Int {
        habit.maxQuantity ?? 25
    }

    private var pointsEarned: Int {
        let ppu = habit.pointsPerUnit ?? 1
        return min(100, quantity * ppu)
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 6) {
                    Text(habit.title)
                        .font(.titleMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text("1 point per \(habit.quantityUnit?.singularized ?? "unit") (max \(maxQty) pts)")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                }

                // Big Quantity Number
                VStack(spacing: 4) {
                    Text("\(quantity)")
                        .font(.scoreNumberHuge)
                        .foregroundColor(playerColor)
                    Text(habit.quantityUnit ?? "Units")
                        .font(.bodyEmphasized)
                        .foregroundColor(.linearTextSecondary)
                    Text("+\(pointsEarned) points toward Par")
                        .font(.captionMuted)
                        .foregroundColor(.linearGreen)
                }
                .padding(.vertical, 16)

                // Slider
                VStack(spacing: 8) {
                    Slider(
                        value: Binding(
                            get: { Double(quantity) },
                            set: { quantity = Int($0) }
                        ),
                        in: 0...Double(maxQty),
                        step: 1
                    )
                    .tint(playerColor)

                    HStack {
                        Text("0")
                            .font(.captionMuted)
                            .foregroundColor(.linearTextMuted)
                        Spacer()
                        Text("\(maxQty)")
                            .font(.captionMuted)
                            .foregroundColor(.linearTextMuted)
                    }
                }
                .padding(.horizontal, 20)

                // Stepper Controls
                HStack(spacing: 20) {
                    Button(action: { if quantity > 0 { quantity -= 1 } }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.linearTextMuted)
                    }

                    Button(action: { if quantity < maxQty { quantity += 1 } }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(playerColor)
                    }
                }

                Spacer()

                // Save Button
                Button(action: {
                    onSave(quantity)
                    dismiss()
                }) {
                    Text("Save Progress")
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
            .padding(.top, 24)
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Quantitative Check-In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.linearTextMuted)
                }
            }
        }
    }
}

private extension String {
    var singularized: String {
        if hasSuffix("s") {
            return String(dropLast())
        }
        return self
    }
}
