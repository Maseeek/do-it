import AudioToolbox
import AVFoundation

public final class SoundService {
    public static let shared = SoundService()

    private init() {}

    public func playClick() {
        // System sound 1104: Crisp keyboard click or tick
        AudioServicesPlaySystemSound(1104)
    }

    public func playCheckIn() {
        // System sound 1057: Tink/pop
        AudioServicesPlaySystemSound(1057)
    }

    public func playParReached() {
        // System sound 1025: Calibrated victory bell / fanfare
        AudioServicesPlaySystemSound(1025)
    }

    public func playReaction() {
        // System sound 1004: Swoosh
        AudioServicesPlaySystemSound(1004)
    }
}
