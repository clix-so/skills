---
title: Firewall Port Configuration
impact: MEDIUM
tags: firewall, ports, network, apns, fcm
platforms: both
---

# Firewall Port Configuration

Open required ports in corporate firewalls for push notification delivery.

## Required Ports

**iOS (APNS):**
- Port 5223 (TCP)

**Android (FCM):**
- Port 5228 (TCP)
- Port 5229 (TCP)
- Port 5230 (TCP)

**Additional:**
- Allow Google ASN 15169 IP addresses

## Testing

```bash
# Test APNS
nc -zv 17.0.0.0 5223

# Test FCM
nc -zv fcm.googleapis.com 5228
```

## Related Rules

- [ios-apns-auth-key.md](./ios-apns-auth-key.md)
- [android-google-services.md](./android-google-services.md)
