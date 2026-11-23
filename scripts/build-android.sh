#!/usr/bin/env bash
# ==============================================================================
# build-android.sh - Android Local & CI Build Automation for Do It
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_ROOT="$REPO_ROOT/android"
DOIT_ANDROID_DIR="$ANDROID_ROOT/DoIt"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Defaults
CLEAN=false
RUN_TESTS=false
ASSEMBLE_DEBUG=false
BUNDLE_RELEASE=false
ASSEMBLE_RELEASE=false
DRY_RUN=false

usage() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -c, --clean             Clean previous build artifacts
  -t, --test              Run unit tests (testDebugUnitTest)
  -d, --assemble-debug    Build debug APK (assembleDebug)
  -b, --bundle-release    Build release Android App Bundle (bundleRelease)
  -r, --assemble-release  Build release APK (assembleRelease)
  -a, --all               Run clean, test, assembleDebug, and bundleRelease
  -n, --dry-run           Check environment and project configuration without compiling
  -h, --help              Show this help message

If no build action is specified, defaults to --assemble-debug --bundle-release.
EOF
  exit 0
}

# Parse CLI arguments
if [[ $# -eq 0 ]]; then
  ASSEMBLE_DEBUG=true
  BUNDLE_RELEASE=true
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--clean)
      CLEAN=true
      shift
      ;;
    -t|--test)
      RUN_TESTS=true
      shift
      ;;
    -d|--assemble-debug)
      ASSEMBLE_DEBUG=true
      shift
      ;;
    -b|--bundle-release)
      BUNDLE_RELEASE=true
      shift
      ;;
    -r|--assemble-release)
      ASSEMBLE_RELEASE=true
      shift
      ;;
    -a|--all)
      CLEAN=true
      RUN_TESTS=true
      ASSEMBLE_DEBUG=true
      BUNDLE_RELEASE=true
      shift
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      usage
      ;;
  esac
done

echo -e "${BLUE}${BOLD}========================================${NC}"
echo -e "${BLUE}${BOLD}   Do It - Android Build Pipeline       ${NC}"
echo -e "${BLUE}${BOLD}========================================${NC}"

# Check Java Installation
if ! command -v java &>/dev/null; then
  echo -e "${RED}Error: Java is not installed or not in PATH.${NC}" >&2
  exit 1
fi

JAVA_VERSION_OUTPUT=$(java -version 2>&1 | head -n 1)
echo -e "Java runtime  : ${GREEN}${JAVA_VERSION_OUTPUT}${NC}"

# Verify Java version is 17 or 21
if echo "$JAVA_VERSION_OUTPUT" | grep -qE "17\.|21\."; then
  echo -e "Java version  : ${GREEN}Compatible (17/21)${NC}"
else
  echo -e "${YELLOW}Warning: Recommended JDK is 17 or 21.${NC}"
fi

# Locate project and Gradle wrapper
GRADLE_DIR=""
GRADLEW_BIN=""
if [[ -f "$DOIT_ANDROID_DIR/gradlew" ]]; then
  GRADLE_DIR="$DOIT_ANDROID_DIR"
  GRADLEW_BIN="$DOIT_ANDROID_DIR/gradlew"
elif [[ -f "$ANDROID_ROOT/gradlew" ]]; then
  GRADLE_DIR="$ANDROID_ROOT"
  GRADLEW_BIN="$ANDROID_ROOT/gradlew"
else
  echo -e "${RED}Error: gradlew not found in $DOIT_ANDROID_DIR or $ANDROID_ROOT${NC}" >&2
  exit 1
fi

chmod +x "$GRADLEW_BIN"
echo -e "Gradle project: ${YELLOW}${GRADLE_DIR}${NC}"
echo -e "Gradle wrapper: ${YELLOW}${GRADLEW_BIN}${NC}"

# Dry run verification
if [[ "$DRY_RUN" == true ]]; then
  echo -e "${BLUE}Running dry run environment and wrapper verification...${NC}"
  (cd "$GRADLE_DIR" && "$GRADLEW_BIN" --version)
  echo -e "${GREEN}✓ Dry run verification completed successfully.${NC}"
  exit 0
fi

# Construct Gradle task list
TASKS=()
if [[ "$CLEAN" == true ]]; then
  TASKS+=("clean")
fi
if [[ "$RUN_TESTS" == true ]]; then
  TASKS+=("testDebugUnitTest")
fi
if [[ "$ASSEMBLE_DEBUG" == true ]]; then
  TASKS+=("assembleDebug")
fi
if [[ "$ASSEMBLE_RELEASE" == true ]]; then
  TASKS+=("assembleRelease")
fi
if [[ "$BUNDLE_RELEASE" == true ]]; then
  TASKS+=("bundleRelease")
fi

if [[ ${#TASKS[@]} -eq 0 ]]; then
  TASKS=("assembleDebug" "bundleRelease")
fi

echo -e "Tasks to run  : ${YELLOW}${TASKS[*]}${NC}"

# Check for Android SDK / ANDROID_HOME
if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  # Standard fallbacks
  if [[ -d "$HOME/Android/Sdk" ]]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [[ -d "/usr/local/lib/android/sdk" ]]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
  fi
fi

if [[ -n "${ANDROID_HOME:-}" ]]; then
  echo -e "Android SDK   : ${GREEN}${ANDROID_HOME}${NC}"
else
  echo -e "${YELLOW}Notice: ANDROID_HOME is not set. Gradle may download required SDK components or look in standard locations.${NC}"
fi

# Execute Gradle build
echo -e "${BLUE}Executing Gradle build...${NC}"
cd "$GRADLE_DIR"
./gradlew "${TASKS[@]}" --no-daemon --stacktrace

echo -e "${GREEN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}✓ Android build tasks completed!       ${NC}"
echo -e "${GREEN}${BOLD}========================================${NC}"

# Report generated output artifacts
if [[ "$ASSEMBLE_DEBUG" == true ]]; then
  DEBUG_APKS=$(find "$GRADLE_DIR/app/build/outputs/apk/debug" -name "*.apk" 2>/dev/null || true)
  if [[ -n "$DEBUG_APKS" ]]; then
    echo -e "Debug APK(s) generated:"
    for apk in $DEBUG_APKS; do
      echo -e "  → ${GREEN}$apk${NC}"
    done
  fi
fi

if [[ "$BUNDLE_RELEASE" == true ]]; then
  RELEASE_AABS=$(find "$GRADLE_DIR/app/build/outputs/bundle/release" -name "*.aab" 2>/dev/null || true)
  if [[ -n "$RELEASE_AABS" ]]; then
    echo -e "Release AAB(s) generated:"
    for aab in $RELEASE_AABS; do
      echo -e "  → ${GREEN}$aab${NC}"
    done
  fi
fi

if [[ "$ASSEMBLE_RELEASE" == true ]]; then
  RELEASE_APKS=$(find "$GRADLE_DIR/app/build/outputs/apk/release" -name "*.apk" 2>/dev/null || true)
  if [[ -n "$RELEASE_APKS" ]]; then
    echo -e "Release APK(s) generated:"
    for apk in $RELEASE_APKS; do
      echo -e "  → ${GREEN}$apk${NC}"
    done
  fi
fi

exit 0
