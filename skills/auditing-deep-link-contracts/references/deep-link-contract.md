# Deep Link Contract (Reference)

Use a deep link contract to define which routes your app supports, what
parameters are required, and how routing should behave across app states.

## What the contract should cover

- **Routes**: canonical list of supported paths
- **Required params**: which identifiers must be present
- **Optional params**: tracking or attribution keys
- **Auth rules**: whether login is required
- **Fallbacks**: where to send users if data is missing
- **States**: cold start vs warm start behavior

## Contract example

```json
{
  "base": "myapp://",
  "routes": [
    {
      "name": "order_detail",
      "path": "/orders/{order_id}",
      "required_params": ["order_id"],
      "optional_params": ["ref"],
      "auth_required": true,
      "supported_states": ["cold", "warm"],
      "fallback": "orders_list"
    }
  ]
}
```

## Audit checklist

- **Route exists**: the route opens a real screen
- **Params parsed**: required params are extracted correctly
- **Missing data**: fallback is consistent and safe
- **Auth gate**: logged-out users see login or safe fallback
- **Cold start**: link opens the same screen after a cold start
- **Warm start**: link works when app is already open
- **Tracking params**: optional params do not break routing
