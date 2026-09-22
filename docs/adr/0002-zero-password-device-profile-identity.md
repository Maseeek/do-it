# 0002: Zero-Password Device-Profile Identity Model

We chose a zero-trust, passwordless device profile selection model ("Who are you? Machek or Myra") persisted via local storage and secure cookies rather than full OAuth/passwords.

### Context & Trade-off
Traditional auth (passwords, OTP email magic links) introduces daily friction for a private two-person app. A first-time device selector with persistent cookies provides instant app access with zero login fatigue, while keeping the interface isolated to the current device's active player.
