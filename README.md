# Agent Skills for Clix

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities for Clix mobile SDK integration and mobile development.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

### Clix Skills

#### clix-integration

Integrates Clix Mobile SDK into iOS, Android, Flutter, and React Native projects. Provides step-by-step guidance for installation, initialization, and verification with MCP-first strategy.

**Use when:**
- Installing or setting up Clix SDK in a mobile project
- Integrating Clix analytics into a new or existing app
- Configuring SDK initialization and verification

#### clix-event-tracking

Implements Clix event tracking (`Clix.trackEvent`) with consistent naming, safe property schemas, and campaign-ready validation.

**Use when:**
- Adding or reviewing event tracking code
- Debugging event tracking issues
- Configuring event-triggered campaigns
- Working with funnels, properties, or tracking patterns

#### clix-user-management

Implements Clix user identification and user properties (`setUserId`, `setUserProperty`) with safe schemas, logout best practices, and campaign-ready personalization.

**Use when:**
- Implementing login/logout user identification
- Setting up user properties for personalization
- Configuring audience targeting with user data

#### clix-personalization

Helps author and debug Clix personalization templates (Liquid-style) for message content, deep links/URLs, and audience targeting rules.

**Use when:**
- Writing personalization templates with variables
- Debugging Liquid-style conditional logic or filters
- Configuring deep link personalization in campaigns

#### clix-api-triggered-campaigns

Configures API-triggered campaigns in the Clix console and triggers them from backend services with safe auth, payload schemas, and dynamic audience filters.

**Use when:**
- Setting up transactional or backend-triggered notifications
- Configuring campaign trigger APIs with `campaign_id`
- Implementing server-to-Clix campaign delivery

#### clix-skill-creator

Creates new Clix agent skills by researching the latest Clix SDK + docs via MCP Server, then generating a complete skill folder aligned with repository conventions.

**Use when:**
- Creating or authoring a new Clix skill
- Extending the skills library with new capabilities

### Skills for Mobile Developers

#### push-notification-best-practices

Comprehensive mobile push notification guide for iOS (APNS) and Android (FCM). Contains platform-specific configurations, token management, message handling, and deep linking patterns.

**Use when:**
- Setting up push notifications for iOS or Android
- Debugging delivery issues or token management
- Implementing background/foreground notification handlers
- Troubleshooting platform-specific push notification issues

**Platforms covered:**
- iOS (APNS)
- Android (FCM)
- React Native
- Expo
- Flutter

#### push-notification-designer

Design and implement local push notification campaigns to boost user engagement. Follows a 5-phase workflow from app analysis to code implementation.

**Use when:**
- Designing local push notification strategies
- Implementing scheduled on-device notifications
- Creating user engagement or retention campaigns
- Building onboarding notification flows

**Platforms covered:**
- iOS (Swift/UNUserNotificationCenter)
- Android (Kotlin/WorkManager+NotificationManager)
- Flutter (flutter_local_notifications)
- React Native (notifee/expo-notifications)

#### auditing-permission-ux

Audits notification permission request UX and settings recovery flows for iOS and Android. Produces structured audit reports with actionable fixes.

**Use when:**
- Reviewing permission request timing and context
- Improving denial handling and settings recovery paths
- Checking platform-specific permission UX compliance

#### auditing-deep-link-contracts

Audits deep link contracts with cold-start/warm-start test vectors and routing checks. Validates supported routes, required parameters, and entry point handling.

**Use when:**
- Defining or validating deep link route contracts
- Testing cold and warm start deep link behavior
- Auditing deep link parameter requirements

## Installation

```bash
npx skills add clix-so/skills
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**
```text
Integrate Clix SDK into my React Native app
```
```text
Set up event tracking for purchase flow
```
```text
Audit my push notification permission UX
```
```text
Design a local notification campaign for user retention
```

## Skill Structure

Each skill contains:
- `SKILL.md` - Instructions for the agent
- `scripts/` - Helper scripts for automation
- `references/` - Supporting documentation
- `examples/` - Code examples (optional)

## Disclaimer

Please be aware that these skills may occasionally fail or execute incorrectly due to the non-deterministic nature of AI. It is critical that you carefully review and verify all actions performed by these skills. While they are designed to be helpful, you remain responsible for checking their output before use. Please use them with caution and supervision.

## License

Each skill in this repository is governed by its own license. For specific terms and conditions, please consult the `LICENSE.txt` file located within each skill's individual directory.
