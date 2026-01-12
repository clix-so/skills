# Error Handling & Troubleshooting

Common errors and solutions when integrating Clix SDK.

## Initialization Errors

### Error: "Project ID is required"

**Symptoms:**

- SDK fails to initialize
- Error message indicates missing project ID

**Solutions:**

1. Verify `.env` file exists and contains `CLIX_PROJECT_ID`
2. Check environment variable name matches exactly (case-sensitive)
3. Ensure environment variables are loaded before initialization
4. For frameworks with prefixes, use correct prefix (e.g., `NEXT_PUBLIC_`,
   `VITE_`)

**Prevention:**

- Always check for environment variables before initialization
- Provide default empty string if optional
- Log warning if project ID is missing

### Error: "Invalid API key"

**Symptoms:**

- SDK initializes but API calls fail
- 401 Unauthorized errors

**Solutions:**

1. Verify API key is correct in environment variables
2. Check for extra spaces or newlines in `.env` file
3. Ensure API key hasn't been rotated/revoked
4. Verify API key has correct permissions

**Prevention:**

- Never commit API keys to version control
- Use environment variables, never hardcode
- Validate API key format if possible

### Error: "SDK already initialized"

**Symptoms:**

- Warning or error about double initialization
- May cause unexpected behavior

**Solutions:**

1. Ensure initialization happens only once
2. Check for multiple initialization calls
3. Use singleton pattern or guard clause

**Prevention:**

```typescript
let initialized = false;

if (!initialized) {
  Clix.initialize(config);
  initialized = true;
}
```

## Environment Variable Issues

### Variables Not Loading

**Symptoms:**

- `process.env.CLIX_PROJECT_ID` is `undefined`
- Values are empty strings

**Solutions:**

**Node.js:**

- Ensure `dotenv` is installed and configured
- Call `require('dotenv').config()` before using variables
- Check `.env` file is in project root

**React/Vite:**

- Use correct prefix: `VITE_CLIX_PROJECT_ID`
- Restart dev server after adding variables
- Check `.env` file is in project root

**Next.js:**

- Use `NEXT_PUBLIC_` prefix for client-side variables
- Restart dev server after changes
- Check `.env.local` for local development

**React Native:**

- Use `react-native-config` package
- Rebuild native apps after adding variables
- Check `.env` file is in project root

### Wrong Variable Names

**Symptoms:**

- Variables exist but have different names
- SDK can't find credentials

**Solutions:**

1. Check existing `.env` files for variable names
2. Use consistent naming: `CLIX_PROJECT_ID` and `CLIX_PUBLIC_API_KEY`
3. Update all references to use correct names

## Platform-Specific Errors

### iOS: "No such module 'Clix'"

**Solutions:**

1. Run `pod install` in project directory
2. Clean build folder (Cmd+Shift+K)
3. Verify Podfile includes Clix dependency
4. Check Xcode project settings for Swift Package Manager

### Android: "Unresolved reference: Clix"

**Solutions:**

1. Sync Gradle files
2. Verify `build.gradle` includes Clix dependency
3. Check package name matches: `so.clix.core.Clix`
4. Rebuild project

### React Native: "Cannot find module '@clix-so/react-native-sdk'"

**Solutions:**

1. Run `npm install` or `yarn install`
2. Run `pod install` in `ios/` directory
3. Rebuild native apps
4. Check `package.json` includes dependency

### Node.js: "Cannot find module '@clix/node-sdk'"

**Solutions:**

1. Run `npm install` or `yarn install`
2. Check `package.json` includes dependency
3. Verify node_modules directory exists
4. Clear npm cache and reinstall

### Web: "Clix is not defined"

**Solutions:**

1. Ensure SDK is imported before use
2. Check bundle includes SDK code
3. Verify initialization happens before SDK usage
4. Check for build/bundling errors

## MCP Server Errors

### Error: "MCP server not found"

**Solutions:**

1. Verify MCP server is installed: `npx -y @clix-so/clix-mcp-server@latest`
2. Check MCP config file syntax is valid JSON
3. Verify config file is in correct location for agent
4. Restart AI agent after configuration changes

### Error: "MCP tool calls failing"

**Solutions:**

1. Check MCP server can be invoked manually
2. Verify credentials are accessible to MCP server
3. Check network connectivity
4. Review MCP server logs for errors

## Integration Verification

### Verify SDK Initialization

**Checklist:**

1. ✅ SDK initialized before any usage
2. ✅ Initialization completed without errors
3. ✅ Environment variables are accessible
4. ✅ No console errors or warnings during initialization
5. ✅ SDK is properly imported/required

**Verification Steps:**

1. Run `bash scripts/validate-sdk.sh` to check installation
2. Check console logs for initialization messages
3. Verify SDK import/require statements are correct
4. Confirm environment variables are loaded correctly

## Best Practices for Error Handling

### Always Handle Errors Gracefully

```typescript
try {
  Clix.initialize(config);
} catch (error) {
  console.error("Clix initialization failed:", error);
  // Don't crash the app - continue execution
}
```

### Validate Configuration

```typescript
if (!config.projectId) {
  console.warn("Clix: Project ID is missing");
  return;
}

Clix.initialize(config);
```

### Log Errors for Debugging

```typescript
try {
  Clix.trackEvent("event", properties);
} catch (error) {
  console.error("Clix tracking failed:", error);
  // Optionally send to error tracking service
}
```

### Provide Fallbacks

```typescript
const projectId = process.env.CLIX_PROJECT_ID || process.env.REACT_APP_CLIX_PROJECT_ID || "";

if (!projectId) {
  console.warn("Clix: No project ID found, analytics disabled");
  return;
}
```

## Getting Help

If you encounter errors not covered here:

1. Check SDK documentation for your platform
2. Review GitHub issues for similar problems
3. Enable debug mode and check logs
4. Verify SDK version is up to date
5. Contact Clix support with:
   - Error message
   - Platform and version
   - SDK version
   - Steps to reproduce
