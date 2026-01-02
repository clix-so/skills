# Campaign Mapping (Event-triggered)

## Contents

- What matters for event-triggered campaigns
- Mapping checklist
- Common mistakes

## What matters

- Triggers only apply to **new incoming events**
- Campaign trigger config must match:
  - **event name** exactly
  - **property keys** exactly
  - (often) **property types** as expected

## Mapping checklist

- Confirm the app sends `event_name` with the exact spelling used in the console
- Confirm property keys are stable and `snake_case` (recommended)
- If filtering on properties in the console, ensure:
  - values are present (not null)
  - value types are consistent (number vs string)

## Common mistakes

- Tracking `productId` but filtering on `product_id`
- Sending numbers as strings (`"14"` vs `14`)
- Tracking too early (before the action is truly completed)
