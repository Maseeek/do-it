import SwiftUI

public struct PhotoProofSheet: View {
    public let habit: Habit
    public let currentProofUrl: String?
    public let playerColor: Color
    public let onSave: (String, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var note: String = ""
    @State private var selectedProofBase64: String? = nil

    public init(
        habit: Habit,
        currentProofUrl: String?,
        playerColor: Color,
        onSave: @escaping (String, String?) -> Void
    ) {
        self.habit = habit
        self.currentProofUrl = currentProofUrl
        self.playerColor = playerColor
        self.onSave = onSave
        _selectedProofBase64 = State(initialValue: currentProofUrl)
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 4) {
                    Text(habit.title)
                        .font(.titleMedium)
                        .foregroundColor(.linearTextPrimary)
                    Text("Attach photographic confirmation for accountability")
                        .font(.captionMuted)
                        .foregroundColor(.linearTextMuted)
                }
                .padding(.top, 16)

                // Proof Preview Area
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.linearCardBg)
                        .frame(height: 220)
                        .hairlineBorder()

                    if let proof = selectedProofBase64, !proof.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 48))
                                .foregroundColor(playerColor)
                            Text("Proof Photo Attached")
                                .font(.bodyEmphasized)
                                .foregroundColor(.linearTextPrimary)
                            Button("Replace Photo") {
                                // Simulate photo selection / camera capture
                                selectedProofBase64 = "proof-data-\(UUID().uuidString)"
                            }
                            .font(.captionMuted)
                            .foregroundColor(playerColor)
                        }
                    } else {
                        VStack(spacing: 12) {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 40))
                                .foregroundColor(.linearTextMuted)
                            Text("Tap to capture or select photo")
                                .font(.captionMuted)
                                .foregroundColor(.linearTextMuted)
                            Button(action: {
                                selectedProofBase64 = "proof-data-\(UUID().uuidString)"
                            }) {
                                HStack(spacing: 6) {
                                    Image(systemName: "camera.fill")
                                    Text("Take Photo")
                                }
                                .font(.captionMuted)
                                .foregroundColor(.linearDarkBg)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(playerColor)
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)

                // Micro Note Field
                VStack(alignment: .leading, spacing: 6) {
                    Text("Micro-note (optional)")
                        .font(.badgeLabel)
                        .foregroundColor(.linearTextMuted)

                    TextField("e.g. Desk reset & bed made", text: $note)
                        .padding(12)
                        .background(Color.linearCardBg)
                        .cornerRadius(10)
                        .hairlineBorder()
                        .foregroundColor(.linearTextPrimary)
                }
                .padding(.horizontal, 20)

                Spacer()

                // Save Button
                Button(action: {
                    if let proof = selectedProofBase64 {
                        onSave(proof, note.isEmpty ? nil : note)
                        dismiss()
                    }
                }) {
                    Text("Confirm Proof & Check In")
                        .font(.bodyEmphasized)
                        .foregroundColor(.linearDarkBg)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(selectedProofBase64 != nil ? playerColor : Color.linearBorder)
                        .cornerRadius(12)
                }
                .disabled(selectedProofBase64 == nil)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
            .background(Color.linearDarkBg.ignoresSafeArea())
            .navigationTitle("Attach Proof")
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
