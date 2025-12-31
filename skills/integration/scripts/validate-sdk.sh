#!/usr/bin/env bash
#
# Clix SDK Validation Script (bash)
#
# Validates that Clix SDK is properly installed and initialized for mobile platforms:
# - iOS (Swift Package Manager or CocoaPods)
# - Android (Gradle)
# - Flutter (pubspec.yaml)
# - React Native (package.json)
#
# Usage:
#   bash scripts/validate-sdk.sh
#   bash scripts/validate-sdk.sh --check-install
#   bash scripts/validate-sdk.sh --check-init
#
# Exit codes:
#   0 = success
#   1 = validation failed

set -euo pipefail

BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

log() {
  # shellcheck disable=SC2059
  printf "%b\n" "$1"
}

die() {
  log "${RED}❌ $1${RESET}"
  exit 1
}

usage() {
  cat <<'EOF'
Clix SDK Validation Script (bash)

Usage:
  bash scripts/validate-sdk.sh [--check-install] [--check-init]

If no flags are provided, all checks run.

Checks:
  --check-install  Validate Clix SDK dependency is present (iOS Podfile/Package.swift, Android build.gradle.kts, Flutter pubspec.yaml, React Native package.json)
  --check-init     Search platform-specific entrypoints for Clix.initialize(...) calls

EOF
}

detect_platform() {
  if [[ -f "Podfile" ]] || [[ -f "Package.swift" ]] || [[ -d "*.xcodeproj" ]] || find . -maxdepth 2 -name "*.xcodeproj" -o -name "*.xcworkspace" 2>/dev/null | grep -q .; then
    echo "ios"
  elif [[ -f "build.gradle.kts" ]] || [[ -f "build.gradle" ]] || [[ -f "settings.gradle.kts" ]] || [[ -f "settings.gradle" ]]; then
    echo "android"
  elif [[ -f "pubspec.yaml" ]]; then
    echo "flutter"
  elif [[ -f "package.json" ]] && (grep -q "react-native" package.json 2>/dev/null || [[ -d "ios" ]] && [[ -d "android" ]]); then
    echo "react-native"
  else
    echo "unknown"
  fi
}

check_install_ios() {
  log "${BLUE}📦 Checking iOS SDK installation...${RESET}"
  
  local found=0
  
  # Check CocoaPods Podfile
  if [[ -f "Podfile" ]] || [[ -f "ios/Podfile" ]]; then
    local podfile="${PODFILE:-Podfile}"
    [[ -f "ios/Podfile" ]] && podfile="ios/Podfile"
    
    if grep -Eq "pod\s+['\"]ClixSDK['\"]|pod\s+['\"]Clix['\"]|:git\s*=>\s*['\"].*clix-ios-sdk" "$podfile" 2>/dev/null; then
      log "${GREEN}✓ Clix SDK found in Podfile${RESET}"
      found=1
    fi
  fi
  
  # Check Swift Package Manager (Package.swift or Xcode project)
  if [[ -f "Package.swift" ]]; then
    if grep -Eq "clix-ios-sdk|github.com/clix-so/clix-ios-sdk" Package.swift 2>/dev/null; then
      log "${GREEN}✓ Clix SDK found in Package.swift${RESET}"
      found=1
    fi
  fi
  
  if [[ "$found" -eq 0 ]]; then
    log "${RED}✗ Clix SDK not found in Podfile or Package.swift${RESET}"
    log "${YELLOW}  iOS: Add 'pod \"ClixSDK\"' to Podfile or add package via Xcode${RESET}"
    return 1
  fi
  
  return 0
}

check_install_android() {
  log "${BLUE}📦 Checking Android SDK installation...${RESET}"
  
  local found=0
  local gradle_files=()
  
  # Find build.gradle.kts or build.gradle files
  if [[ -f "app/build.gradle.kts" ]]; then
    gradle_files+=("app/build.gradle.kts")
  elif [[ -f "build.gradle.kts" ]]; then
    gradle_files+=("build.gradle.kts")
  elif [[ -f "app/build.gradle" ]]; then
    gradle_files+=("app/build.gradle")
  elif [[ -f "build.gradle" ]]; then
    gradle_files+=("build.gradle")
  fi
  
  for gradle_file in "${gradle_files[@]}"; do
    if grep -Eq "so\.clix:clix-android-sdk|so\.clix:clix-android-sdk" "$gradle_file" 2>/dev/null; then
      log "${GREEN}✓ Clix SDK found in ${gradle_file}${RESET}"
      found=1
      break
    fi
  done
  
  if [[ "$found" -eq 0 ]]; then
    log "${RED}✗ Clix SDK not found in build.gradle files${RESET}"
    log "${YELLOW}  Android: Add 'implementation(\"so.clix:clix-android-sdk:1.X.X\")' to build.gradle.kts${RESET}"
    return 1
  fi
  
  return 0
}

check_install_flutter() {
  log "${BLUE}📦 Checking Flutter SDK installation...${RESET}"
  
  if [[ ! -f "pubspec.yaml" ]]; then
    log "${YELLOW}⚠️  No pubspec.yaml found${RESET}"
    return 0
  fi
  
  if grep -Eq "clix_flutter:" pubspec.yaml 2>/dev/null; then
    log "${GREEN}✓ clix_flutter found in pubspec.yaml${RESET}"
    return 0
  else
    log "${RED}✗ clix_flutter not found in pubspec.yaml${RESET}"
    log "${YELLOW}  Flutter: Add 'clix_flutter: ^0.0.1' to pubspec.yaml dependencies${RESET}"
    return 1
  fi
}

check_install_react_native() {
  log "${BLUE}📦 Checking React Native SDK installation...${RESET}"
  
  if [[ ! -f "package.json" ]]; then
    log "${YELLOW}⚠️  No package.json found${RESET}"
    return 0
  fi
  
  if grep -Eq "@clix-so/react-native-sdk" package.json 2>/dev/null; then
    log "${GREEN}✓ @clix-so/react-native-sdk found in package.json${RESET}"
    return 0
  else
    log "${RED}✗ @clix-so/react-native-sdk not found in package.json${RESET}"
    log "${YELLOW}  React Native: Run 'npm install @clix-so/react-native-sdk'${RESET}"
    return 1
  fi
}

check_init_ios() {
  log "${BLUE}🔍 Checking iOS SDK initialization...${RESET}"
  
  local entrypoints=(
    "AppDelegate.swift"
    "ios/AppDelegate.swift"
    "Sources/AppDelegate.swift"
    "*.swift"
  )
  
  # Search for Clix.initialize in Swift files
  local found=0
  while IFS= read -r -d '' file; do
    if grep -Eq "Clix\.initialize|ClixConfiguration\.shared\.config" "$file" 2>/dev/null; then
      log "${GREEN}✓ Found initialization in ${file}${RESET}"
      found=1
      break
    fi
  done < <(find . -maxdepth 4 -name "AppDelegate.swift" -o -name "*App*.swift" 2>/dev/null | head -5 | tr '\n' '\0' 2>/dev/null || true)
  
  if [[ "$found" -eq 0 ]]; then
    log "${YELLOW}⚠️  SDK initialization not found in AppDelegate or app entry point${RESET}"
    log "${YELLOW}  iOS: Ensure Clix.initialize(config: ClixConfiguration.shared.config) is called in AppDelegate${RESET}"
    return 1
  fi
  
  return 0
}

check_init_android() {
  log "${BLUE}🔍 Checking Android SDK initialization...${RESET}"
  
  local entrypoints=(
    "src/main/kotlin/**/Application.kt"
    "src/main/java/**/Application.java"
  )
  
  local found=0
  while IFS= read -r -d '' file; do
    if grep -Eq "Clix\.initialize|so\.clix\.core\.Clix" "$file" 2>/dev/null; then
      log "${GREEN}✓ Found initialization in ${file}${RESET}"
      found=1
      break
    fi
  done < <(find . -path "*/src/main/kotlin/*/*Application.kt" -o -path "*/src/main/java/*/*Application.java" 2>/dev/null | head -5 | tr '\n' '\0' 2>/dev/null || true)
  
  if [[ "$found" -eq 0 ]]; then
    log "${YELLOW}⚠️  SDK initialization not found in Application class${RESET}"
    log "${YELLOW}  Android: Ensure Clix.initialize(applicationContext, config) is called in Application.onCreate()${RESET}"
    return 1
  fi
  
  return 0
}

check_init_flutter() {
  log "${BLUE}🔍 Checking Flutter SDK initialization...${RESET}"
  
  local entrypoints=(
    "lib/main.dart"
  )
  
  if [[ -f "lib/main.dart" ]]; then
    if grep -Eq "Clix\.initialize|clix_flutter" lib/main.dart 2>/dev/null; then
      log "${GREEN}✓ Found initialization in lib/main.dart${RESET}"
      return 0
    fi
  fi
  
  log "${YELLOW}⚠️  SDK initialization not found in lib/main.dart${RESET}"
  log "${YELLOW}  Flutter: Ensure await Clix.initialize(config) is called before runApp()${RESET}"
  return 1
}

check_init_react_native() {
  log "${BLUE}🔍 Checking React Native SDK initialization...${RESET}"
  
  local entrypoints=(
    "index.js"
    "index.ts"
    "src/index.js"
    "src/index.ts"
    "App.tsx"
    "src/App.tsx"
  )
  
  local found=0
  for entrypoint in "${entrypoints[@]}"; do
    if [[ -f "$entrypoint" ]]; then
      if grep -Eq "Clix\.initialize|@clix-so/react-native-sdk" "$entrypoint" 2>/dev/null; then
        log "${GREEN}✓ Found initialization in ${entrypoint}${RESET}"
        found=1
        break
      fi
    fi
  done
  
  if [[ "$found" -eq 0 ]]; then
    log "${YELLOW}⚠️  SDK initialization not found in common entry points${RESET}"
    log "${YELLOW}  React Native: Ensure Clix.initialize(config) is called in index.js or App.tsx${RESET}"
    return 1
  fi
  
  return 0
}

check_install() {
  local platform
  platform="$(detect_platform)"
  
  case "$platform" in
    ios)
      check_install_ios
      ;;
    android)
      check_install_android
      ;;
    flutter)
      check_install_flutter
      ;;
    react-native)
      check_install_react_native
      ;;
    *)
      log "${YELLOW}⚠️  Could not detect platform (iOS/Android/Flutter/React Native)${RESET}"
      log "${YELLOW}  Skipping installation check${RESET}"
      return 0
      ;;
  esac
}

check_init() {
  local platform
  platform="$(detect_platform)"
  
  case "$platform" in
    ios)
      check_init_ios
      ;;
    android)
      check_init_android
      ;;
    flutter)
      check_init_flutter
      ;;
    react-native)
      check_init_react_native
      ;;
    *)
      log "${YELLOW}⚠️  Could not detect platform (iOS/Android/Flutter/React Native)${RESET}"
      log "${YELLOW}  Skipping initialization check${RESET}"
      return 0
      ;;
  esac
}

main() {
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  local run_install=0
  local run_init=0

  if [[ "$#" -eq 0 ]]; then
    run_install=1
    run_init=1
  else
    while [[ "$#" -gt 0 ]]; do
      case "$1" in
        --check-install) run_install=1 ;;
        --check-init) run_init=1 ;;
        *)
          usage
          die "Unknown option: $1"
          ;;
      esac
      shift
    done
  fi

  log "${BLUE}🔍 Clix SDK Validation${RESET}"
  log "${BLUE}========================================${RESET}"

  local platform
  platform="$(detect_platform)"
  log "${BLUE}Detected platform: ${platform}${RESET}"

  local all_ok=1

  if [[ "$run_install" -eq 1 ]]; then
    if ! check_install; then all_ok=0; fi
  fi

  if [[ "$run_init" -eq 1 ]]; then
    if ! check_init; then all_ok=0; fi
  fi

  log "${BLUE}\n========================================${RESET}"
  if [[ "$all_ok" -eq 1 ]]; then
    log "${GREEN}✅ Validation passed!${RESET}"
    exit 0
  else
    log "${RED}❌ Validation failed. Please fix the issues above.${RESET}"
    exit 1
  fi
}

main "$@"
