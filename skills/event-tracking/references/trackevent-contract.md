# Clix.trackEvent Contract

## Contents

- Contract summary
- Payload shape (conceptual)
- Property serialization rules
- Platform differences (practical)
- Pitfalls (what breaks campaigns)

## Contract summary

- **Event name**: a stable string (recommended `snake_case`)
- **Properties**: a key/value map; prefer JSON primitives
- **Initialization**: tracking requires the SDK to be initialized first
- **Campaign usage**: event-triggered campaigns require **exact matches** for
  event name + property keys

## Payload shape (conceptual)

SDKs send events to the Clix API as an array under `events`:

- `device_id`
- `name`
- `event_property.custom_properties` (your properties)
- Optional metadata fields used by the SDK (varies by platform):
  - `message_id`
  - `user_journey_id`
  - `user_journey_node_id`

## Property serialization rules

Keep properties simple:

- **Allowed**: `string`, `number`, `boolean`, ISO datetime strings
- **Avoid**: nested objects/arrays, large blobs, free-text user content, PII
- **Avoid nulls**: some SDKs drop nulls; others may stringify or encode null →
  inconsistent analytics

Dates:

- Prefer passing a native date type (SDK will serialize) or an ISO string you
  control.

## Platform differences (practical)

- **iOS**:
  - Drops `nil` properties.
  - Serializes `Date` to ISO.
  - Supports extra metadata params in the internal event layer.
- **Android**:
  - Converts unknown objects to ISO (if recognized) else string.
  - Null handling can be inconsistent; avoid null values.
- **React Native**:
  - Serializes `Date` properties to ISO strings.
  - Supports `messageId` + journey IDs at the API layer.
- **Flutter**:
  - Drops null properties.
  - Supports `messageId` (journey IDs may not be exposed in the Dart event API
    layer).

## Pitfalls (what breaks campaigns)

- Event-triggered campaign never fires because:
  - Event name mismatch (`signup_completed` vs `sign_up_completed`)
  - Property key mismatch (`productId` vs `product_id`)
  - Property type mismatch (number sent as string)
  - Event fired too early / too often (duplicates)
