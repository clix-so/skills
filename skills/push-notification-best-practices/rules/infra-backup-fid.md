---
title: Firebase Installation ID Backup Exclusion
impact: MEDIUM
tags: firebase, fid, backup, 404-error
platforms: both
---

# Firebase Installation ID Backup Exclusion

Exclude Firebase Installation data from backups to prevent token conflicts.

## Quick Pattern

**Problem:** 404 errors after backup/restore

**Cause:** Firebase Installation ID (FID) duplicated across devices

**Solution:**

**iOS (Info.plist):**
```xml
<key>BackupExcludedKeys</key>
<array>
    <string>com.google.firebase.installations.*</string>
</array>
```

**Android (res/xml/backup_rules.xml):**
```xml
<full-backup-content>
    <exclude domain="sharedpref" path="com.google.firebase.installations.xml" />
    <exclude domain="file" path="PersistedInstallation" />
</full-backup-content>
```

## Related Rules

- [android-google-services.md](./android-google-services.md)
