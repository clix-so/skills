# JSON Schemas

This document defines the JSON structures used throughout the push notification design process. All output is saved to `.clix-campaigns/app-profile.json` in the user's project root.

## Strict Schema Files

Formal JSON Schema (draft 2020-12) files live in `references/schemas/`:

- **`app-profile.schema.json`** — validates the complete app profile (all phases)
- **`campaign.schema.json`** — validates each individual campaign object

These schemas enforce strict rules: required fields, value types, string patterns (kebab-case IDs, snake_case events), length limits (title ≤ 35 chars, body ≤ 90 chars), array bounds (2–5 messages per campaign, 1–4 user journeys), and no extra properties.

After generating the app profile JSON in Phase 2 and adding campaigns in Phase 3, validate the output against these schemas before presenting to the user. If validation fails, fix the issues and re-validate.

---

## App Profile Schema

The app profile captures everything learned in Phase 1. It starts without campaigns, then campaigns are added in Phase 3.

```json
{
  "appName": "FitTrack",
  "platform": "ios",
  "category": "fitness",
  "description": "A fitness app that helps users follow personalized workout plans, track progress, and build exercise habits.",
  "coreUserActivity": {
    "action": "complete a workout",
    "description": "The primary success metric — if users complete workouts regularly, the app is delivering value."
  },
  "userJourneys": [
    {
      "id": "first-workout",
      "name": "First Workout Completion",
      "steps": [
        "User signs up and creates a profile",
        "User browses and selects a workout plan",
        "User starts and completes their first workout",
        "User views the post-workout summary and progress"
      ],
      "significance": "Converting a new signup into an active user. This is the most critical drop-off point."
    },
    {
      "id": "daily-routine",
      "name": "Daily Workout Routine",
      "steps": [
        "User receives a reminder or opens the app",
        "User views today's scheduled workout",
        "User completes the workout",
        "User logs any additional activity or notes"
      ],
      "significance": "Building the daily habit is what drives long-term retention."
    }
  ],
  "personalizationVariables": [
    {
      "key": "userName",
      "description": "User's display name",
      "dataType": "string",
      "example": "Alex"
    },
    {
      "key": "streakCount",
      "description": "Current consecutive days of workout completion",
      "dataType": "number",
      "example": 7
    },
    {
      "key": "lastWorkoutType",
      "description": "Name of the most recently completed workout",
      "dataType": "string",
      "example": "Upper Body Strength"
    },
    {
      "key": "nextWorkoutName",
      "description": "Name of the next scheduled workout in the user's plan",
      "dataType": "string",
      "example": "Leg Day"
    },
    {
      "key": "totalWorkouts",
      "description": "Total number of workouts completed all-time",
      "dataType": "number",
      "example": 23
    }
  ],
  "existingNotifications": [
    {
      "id": "daily-reminder",
      "title": "Time to work out!",
      "body": "Your workout is waiting for you.",
      "trigger": "Daily at the user's preferred workout time",
      "timing": "Recurring, every day at user-selected time",
      "notes": "Already implemented. Users can toggle this on/off in settings."
    }
  ],
  "campaigns": []
}
```

### Field Reference

| Field                                    | Type     | Required | Description                                                            |
| ---------------------------------------- | -------- | -------- | ---------------------------------------------------------------------- |
| `appName`                                | string   | yes      | The app's name                                                         |
| `platform`                               | string   | yes      | One of: `ios`, `android`, `flutter`, `react-native`                    |
| `category`                               | string   | yes      | App category (fitness, finance, education, social, productivity, etc.) |
| `description`                            | string   | yes      | 1–2 sentence description of what the app does                          |
| `coreUserActivity.action`                | string   | yes      | The single most important user action                                  |
| `coreUserActivity.description`           | string   | yes      | Why this action matters                                                |
| `userJourneys[]`                         | array    | yes      | 1–4 critical user journeys                                             |
| `userJourneys[].id`                      | string   | yes      | Kebab-case identifier                                                  |
| `userJourneys[].name`                    | string   | yes      | Human-readable journey name                                            |
| `userJourneys[].steps`                   | string[] | yes      | Ordered list of steps in the journey                                   |
| `userJourneys[].significance`            | string   | yes      | Why this journey matters for engagement                                |
| `personalizationVariables[]`             | array    | yes      | Available variables for message personalization                        |
| `personalizationVariables[].key`         | string   | yes      | Variable name used in templates (e.g., `userName`)                     |
| `personalizationVariables[].description` | string   | yes      | What this variable represents                                          |
| `personalizationVariables[].dataType`    | string   | yes      | `string`, `number`, `boolean`, or `date`                               |
| `personalizationVariables[].example`     | any      | yes      | Example value                                                          |
| `existingNotifications[]`                | array    | yes      | Existing local push notifications (empty array if none)                |
| `existingNotifications[].id`             | string   | yes      | Identifier for the existing notification                               |
| `existingNotifications[].title`          | string   | yes      | Current notification title                                             |
| `existingNotifications[].body`           | string   | yes      | Current notification body                                              |
| `existingNotifications[].trigger`        | string   | yes      | What triggers this notification                                        |
| `existingNotifications[].timing`         | string   | yes      | When/how often it fires                                                |
| `existingNotifications[].notes`          | string   | no       | Any additional context                                                 |
| `campaigns[]`                            | array    | yes      | Campaigns added in Phase 3 (empty initially)                           |

---

## Campaign Schema

Each campaign is added to the `campaigns` array in the app profile. A campaign represents a sequence of related notifications with a unified purpose.

```json
{
  "id": "first-workout-onboarding",
  "name": "First Workout Onboarding",
  "purpose": "Guide new users to complete their first workout within the first 5 days after signup. This is the single most important conversion event for long-term retention.",
  "targetAudience": {
    "description": "New users who have signed up but haven't completed their first workout yet",
    "triggerEvent": "user_signup_completed",
    "entryCondition": "totalWorkouts == 0"
  },
  "cancelConditions": [
    {
      "event": "workout_completed",
      "description": "User completed any workout — the campaign goal is achieved"
    },
    {
      "event": "notifications_disabled",
      "description": "User disabled notifications in app settings"
    }
  ],
  "messages": [
    {
      "id": "first-workout-1",
      "sequence": 1,
      "title": "Your plan is ready, {userName}!",
      "body": "You picked a great workout plan. Let's get started — your first session takes just 15 minutes.",
      "trigger": {
        "type": "delay_from_event",
        "event": "user_signup_completed",
        "delay": "2h",
        "description": "2 hours after completing signup, giving the user time to explore the app first"
      },
      "deliveryWindow": {
        "startHour": 9,
        "endHour": 21,
        "timezone": "local",
        "description": "Only deliver between 9am–9pm in the user's local timezone. If the 2-hour delay falls outside this window, defer to the next morning at 9am."
      },
      "personalizationVariables": ["userName"],
      "rationale": "A warm, low-pressure first touch. Mentioning '15 minutes' reduces the perceived effort barrier. Sent 2 hours after signup because immediate notifications feel pushy, but waiting too long loses the initial motivation."
    },
    {
      "id": "first-workout-2",
      "sequence": 2,
      "title": "Ready for {nextWorkoutName}?",
      "body": "Your first workout is waiting. Tap to start — you've got this! 💪",
      "trigger": {
        "type": "delay_from_previous",
        "delay": "18h",
        "description": "18 hours after message 1. This typically means if message 1 went out in the evening, message 2 arrives the next morning."
      },
      "deliveryWindow": {
        "startHour": 8,
        "endHour": 10,
        "timezone": "local",
        "description": "Morning delivery window. Morning messages tend to drive higher same-day engagement for fitness apps."
      },
      "personalizationVariables": ["nextWorkoutName"],
      "rationale": "Slightly more direct than message 1. Naming the specific workout makes it concrete — not 'a workout' but 'YOUR workout.' Morning delivery catches users during planning time."
    },
    {
      "id": "first-workout-3",
      "sequence": 3,
      "title": "Your workout plan misses you",
      "body": "You're just one tap away from starting. We saved your progress — pick up where you left off.",
      "trigger": {
        "type": "delay_from_previous",
        "delay": "48h",
        "description": "48 hours after message 2 (approximately day 3-4 after signup)"
      },
      "deliveryWindow": {
        "startHour": 17,
        "endHour": 20,
        "timezone": "local",
        "description": "Evening delivery. By this point, morning messages haven't converted, so try an evening time slot when the user might have more free time."
      },
      "personalizationVariables": [],
      "rationale": "Emotional appeal ('misses you') combined with friction reduction ('saved your progress'). Different time of day from previous messages to find a better engagement window."
    },
    {
      "id": "first-workout-4",
      "sequence": 4,
      "title": "Last chance: free plan expiring",
      "body": "Your personalized plan is waiting. Start today and see what {appName} can do for you.",
      "trigger": {
        "type": "delay_from_previous",
        "delay": "48h",
        "description": "48 hours after message 3 (approximately day 5 after signup). This is the final message in the sequence."
      },
      "deliveryWindow": {
        "startHour": 9,
        "endHour": 12,
        "timezone": "local",
        "description": "Late morning delivery for the final nudge"
      },
      "personalizationVariables": [],
      "rationale": "Creates mild urgency without being dishonest. This is the last message — if this doesn't convert, stop messaging. Continuing beyond this point risks annoying the user and triggering notification opt-out."
    }
  ],
  "existingNotificationReferences": [],
  "designNotes": "This campaign is the highest priority because first-workout completion is the strongest predictor of 30-day retention. The message sequence escalates from gentle to slightly urgent, tries different times of day, and caps at 4 messages over 5 days to avoid fatigue."
}
```

### Campaign Fields

| Field                                   | Type     | Required    | Description                                                     |
| --------------------------------------- | -------- | ----------- | --------------------------------------------------------------- |
| `id`                                    | string   | yes         | Kebab-case unique identifier                                    |
| `name`                                  | string   | yes         | Human-readable campaign name                                    |
| `purpose`                               | string   | yes         | Detailed explanation of the campaign's goal and why it matters  |
| `targetAudience.description`            | string   | yes         | Who receives this campaign                                      |
| `targetAudience.triggerEvent`           | string   | yes         | The event that starts this campaign                             |
| `targetAudience.entryCondition`         | string   | yes         | Condition that must be true to enter the campaign               |
| `cancelConditions[]`                    | array    | yes         | Events that stop the campaign                                   |
| `cancelConditions[].event`              | string   | yes         | Event name                                                      |
| `cancelConditions[].description`        | string   | yes         | Why this cancels the campaign                                   |
| `messages[]`                            | array    | yes         | Ordered sequence of notifications (2–5 messages)                |
| `messages[].id`                         | string   | yes         | Unique message identifier                                       |
| `messages[].sequence`                   | number   | yes         | Order in the sequence (1-based)                                 |
| `messages[].title`                      | string   | yes         | Notification title (max 35 chars). May include `{variables}`    |
| `messages[].body`                       | string   | yes         | Notification body (max 90 chars). May include `{variables}`     |
| `messages[].trigger.type`               | string   | yes         | `delay_from_event` or `delay_from_previous`                     |
| `messages[].trigger.event`              | string   | conditional | The triggering event (required when type is `delay_from_event`) |
| `messages[].trigger.delay`              | string   | yes         | Duration string: `30m`, `2h`, `1d`, `48h`, etc.                 |
| `messages[].trigger.description`        | string   | yes         | Human-readable explanation of the timing logic                  |
| `messages[].deliveryWindow`             | object   | yes         | When the message can be delivered                               |
| `messages[].deliveryWindow.startHour`   | number   | yes         | Earliest delivery hour (0–23, local time)                       |
| `messages[].deliveryWindow.endHour`     | number   | yes         | Latest delivery hour (0–23, local time)                         |
| `messages[].deliveryWindow.timezone`    | string   | yes         | Always `"local"` for local push notifications                   |
| `messages[].deliveryWindow.description` | string   | yes         | Explanation of why this delivery window                         |
| `messages[].personalizationVariables`   | string[] | yes         | List of variable keys used in this message                      |
| `messages[].rationale`                  | string   | yes         | Why this message exists, why this timing, why this wording      |
| `existingNotificationReferences`        | string[] | no          | IDs of existing notifications incorporated into this campaign   |
| `designNotes`                           | string   | yes         | Overall strategy notes about the campaign                       |

### Timing Format

Delay values use shorthand: `30m` (30 minutes), `2h` (2 hours), `1d` (1 day), `48h` (48 hours), `3d` (3 days).

When `delay_from_event` is used, the delay is calculated from the specified event. When `delay_from_previous` is used, the delay is calculated from when the previous message in the sequence was delivered (or would have been delivered if deferred due to quiet hours).

### Delivery Window Rules

If a message's calculated delivery time falls outside its delivery window, defer to the start of the next valid window. For example, if a message should fire at 11pm but its window is 9am–9pm, deliver at 9am the next day.
