# Permission UX Best Practices (iOS and Android)

This reference summarizes official guidance for notification permission UX.
It is intended to support audits and improvement recommendations.

## iOS Application

What the platform docs emphasize (high-signal):

- **Consent first**: get permission before sending notifications.
- **Contextual timing**: ask after a clear user action, not at first launch.
- **Value primer**: explain the benefit in-app, then show the system prompt.
- **Denial handling**: avoid repeated prompts; provide a clear settings path.
- **System prompt**: it cannot be customized.
- **Trust and safety**: keep content concise and avoid repeated, low-value, or
  sensitive information.

## Android Application

What the platform docs emphasize (high-signal):

- **Contextual timing**: ask after a user action that implies value.
- **Education UI**: use a short, dismissible explainer when needed.
- **No forced prompt**: if education is dismissed, do not immediately show the
  system dialog.
- **Graceful denial**: keep core flows usable and be specific about what is
  unavailable.
- **Respect intent**: avoid repeated prompts after multiple denials.
- **Channels and importance**: choose the lowest appropriate importance.
- **Target SDK 33+**: control prompt timing on Android 13+.
