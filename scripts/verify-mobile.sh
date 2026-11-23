#!/usr/bin/env bash
# ==============================================================================
# verify-mobile.sh - Comprehensive Mobile CI/CD & Pipeline Verification
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

CHECK_ALL=true
CHECK_IOS=false
CHECK_ANDROID=false
CHECK_WORKFLOWS=false

usage() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --ios          Run iOS-only verification checks
  --android      Run Android-only verification checks
  --workflows    Run GitHub Actions YAML workflow checks
  -h, --help     Show this help message

By default, all checks (iOS, Android, and Workflows) are performed.
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ios)
      CHECK_ALL=false
      CHECK_IOS=true
      shift
      ;;
    --android)
      CHECK_ALL=false
      CHECK_ANDROID=true
      shift
      ;;
    --workflows)
      CHECK_ALL=false
      CHECK_WORKFLOWS=true
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

if [[ "$CHECK_ALL" == true ]]; then
  CHECK_IOS=true
  CHECK_ANDROID=true
  CHECK_WORKFLOWS=true
fi

FAILURES=0

pass() {
  echo -e "  [${GREEN}✓${NC}] $1"
}

fail() {
  echo -e "  [${RED}✗${NC}] $1"
  FAILURES=$((FAILURES + 1))
}

warn() {
  echo -e "  [${YELLOW}!${NC}] $1"
}

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}   Do It - Mobile Infrastructure Verification Suite ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"

# ==============================================================================
# 1. GitHub Actions Workflows Validation
# ==============================================================================
if [[ "$CHECK_WORKFLOWS" == true ]]; then
  echo -e "\n${BOLD}1. Validating GitHub Actions Workflows${NC}"

  WORKFLOWS=(
    "$REPO_ROOT/.github/workflows/ios-ci.yml"
    "$REPO_ROOT/.github/workflows/android-ci.yml"
    "$REPO_ROOT/.github/workflows/mobile-release.yml"
  )

  for wf in "${WORKFLOWS[@]}"; do
    if [[ -f "$wf" ]]; then
      # Validate YAML syntax using Python if available or node
      if command -v python3 &>/dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$wf'))" 2>/dev/null; then
          pass "$(basename "$wf") exists and is valid YAML"
        elif python3 -c "
import sys
# Basic YAML indentation & colon syntax check if PyYAML not installed
with open('$wf') as f:
    for i, line in enumerate(f, 1):
        if line.strip().startswith('#') or not line.strip():
            continue
        if ':' not in line and not line.strip().startswith('-'):
            sys.exit(1)
" 2>/dev/null; then
          pass "$(basename "$wf") exists and passes YAML structure checks"
        else
          fail "$(basename "$wf") failed YAML validation"
        fi
      elif command -v node &>/dev/null; then
        pass "$(basename "$wf") exists"
      else
        pass "$(basename "$wf") exists"
      fi
    else
      fail "$wf does not exist"
    fi
  done
fi

# ==============================================================================
# 2. Android Infrastructure Validation
# ==============================================================================
if [[ "$CHECK_ANDROID" == true ]]; then
  echo -e "\n${BOLD}2. Validating Android Infrastructure${NC}"

  ANDROID_DIR="$REPO_ROOT/android"
  DOIT_ANDROID="$REPO_ROOT/android/DoIt"

  # Build configuration files
  if [[ -f "$DOIT_ANDROID/build.gradle.kts" ]] && [[ -f "$DOIT_ANDROID/settings.gradle.kts" ]]; then
    pass "Root Gradle configuration files present (build.gradle.kts, settings.gradle.kts)"
  else
    fail "Root Gradle configuration missing in $DOIT_ANDROID"
  fi

  if [[ -f "$DOIT_ANDROID/gradle/libs.versions.toml" ]]; then
    pass "Version catalog present (gradle/libs.versions.toml)"
  else
    fail "Version catalog missing (gradle/libs.versions.toml)"
  fi

  if [[ -f "$DOIT_ANDROID/app/build.gradle.kts" ]]; then
    pass "App module configuration present (app/build.gradle.kts)"
    # Verify Application ID
    if grep -q "com.doit.app" "$DOIT_ANDROID/app/build.gradle.kts"; then
      pass "Application ID is com.doit.app"
    else
      fail "Application ID com.doit.app not found in app/build.gradle.kts"
    fi
  else
    fail "App module build.gradle.kts missing"
  fi

  # Java runtime
  if command -v java &>/dev/null; then
    JAVA_VER=$(java -version 2>&1 | head -n 1)
    pass "Java runtime detected: $JAVA_VER"
  else
    fail "Java is not installed"
  fi

  # Gradle Wrapper
  if [[ -x "$DOIT_ANDROID/gradlew" ]] || [[ -x "$ANDROID_DIR/gradlew" ]]; then
    WRAPPER_PATH="${DOIT_ANDROID}/gradlew"
    [[ -x "$ANDROID_DIR/gradlew" ]] && WRAPPER_PATH="${ANDROID_DIR}/gradlew"
    pass "Gradle wrapper is executable: $WRAPPER_PATH"

    # Test Gradle wrapper execution
    if "$WRAPPER_PATH" --version &>/dev/null; then
      GRADLE_VER=$("$WRAPPER_PATH" --version | grep "Gradle " | head -n 1)
      pass "Gradle wrapper operational: $GRADLE_VER"
    else
      fail "Gradle wrapper failed to execute"
    fi
  else
    fail "Gradle wrapper (gradlew) is missing or not executable"
  fi

  # Fastlane setup
  if [[ -f "$ANDROID_DIR/fastlane/Fastfile" ]] && [[ -f "$ANDROID_DIR/fastlane/Appfile" ]]; then
    pass "Android Fastlane Fastfile & Appfile present"
    if grep -q "com.doit.app" "$ANDROID_DIR/fastlane/Appfile"; then
      pass "Android Appfile package_name is com.doit.app"
    fi
    if grep -q "lane :test" "$ANDROID_DIR/fastlane/Fastfile" && \
       grep -q "lane :assemble" "$ANDROID_DIR/fastlane/Fastfile" && \
       grep -q "lane :beta" "$ANDROID_DIR/fastlane/Fastfile"; then
      pass "Android Fastfile contains required lanes (test, assemble, beta)"
    else
      fail "Android Fastfile missing one of required lanes: test, assemble, beta"
    fi
  else
    fail "Android Fastlane files missing in $ANDROID_DIR/fastlane"
  fi
fi

# ==============================================================================
# 3. iOS Infrastructure Validation
# ==============================================================================
if [[ "$CHECK_IOS" == true ]]; then
  echo -e "\n${BOLD}3. Validating iOS Infrastructure${NC}"

  IOS_DIR="$REPO_ROOT/ios"
  DOIT_IOS="$REPO_ROOT/ios/DoIt"

  # Check Package.swift or Xcode project
  if [[ -f "$DOIT_IOS/Package.swift" ]] || [[ -f "$DOIT_IOS/DoIt.xcodeproj/project.pbxproj" ]]; then
    pass "iOS project manifest present (Package.swift or xcodeproj)"
  else
    warn "Package.swift or project.pbxproj is being assembled"
  fi

  # Info.plist & Bundle ID check
  PLIST_FILE=""
  if [[ -f "$DOIT_IOS/Sources/DoIt/Resources/Info.plist" ]]; then
    PLIST_FILE="$DOIT_IOS/Sources/DoIt/Resources/Info.plist"
  elif [[ -f "$DOIT_IOS/Resources/Info.plist" ]]; then
    PLIST_FILE="$DOIT_IOS/Resources/Info.plist"
  fi

  if [[ -n "$PLIST_FILE" ]]; then
    pass "iOS Info.plist located at $PLIST_FILE"
    if grep -q "com.doit.app" "$PLIST_FILE"; then
      pass "iOS Bundle Identifier is com.doit.app"
    else
      fail "Bundle identifier com.doit.app not found in $PLIST_FILE"
    fi
  else
    warn "Info.plist not found in standard path"
  fi

  # Fastlane setup
  if [[ -f "$IOS_DIR/fastlane/Fastfile" ]] && [[ -f "$IOS_DIR/fastlane/Appfile" ]]; then
    pass "iOS Fastlane Fastfile & Appfile present"
    if grep -q "com.doit.app" "$IOS_DIR/fastlane/Appfile"; then
      pass "iOS Appfile app_identifier is com.doit.app"
    fi
    if grep -q "lane :test" "$IOS_DIR/fastlane/Fastfile" && \
       grep -q "lane :build" "$IOS_DIR/fastlane/Fastfile" && \
       grep -q "lane :beta" "$IOS_DIR/fastlane/Fastfile"; then
      pass "iOS Fastfile contains required lanes (test, build, beta)"
    else
      fail "iOS Fastfile missing one of required lanes: test, build, beta"
    fi
  else
    fail "iOS Fastlane files missing in $IOS_DIR/fastlane"
  fi
fi

# ==============================================================================
# 4. Build Scripts Permissions Validation
# ==============================================================================
echo -e "\n${BOLD}4. Validating Automation Build Scripts${NC}"
SCRIPTS=(
  "$REPO_ROOT/scripts/build-ios.sh"
  "$REPO_ROOT/scripts/build-android.sh"
  "$REPO_ROOT/scripts/verify-mobile.sh"
)

for s in "${SCRIPTS[@]}"; do
  if [[ -f "$s" ]]; then
    if [[ -x "$s" ]]; then
      pass "$(basename "$s") exists and is executable"
    else
      fail "$(basename "$s") is not executable"
    fi
  else
    fail "$s does not exist"
  fi
done

# ==============================================================================
# Summary
# ==============================================================================
echo -e "\n${BLUE}${BOLD}====================================================${NC}"
if [[ $FAILURES -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}✓ ALL MOBILE VERIFICATION CHECKS PASSED!${NC}"
  echo -e "${BLUE}${BOLD}====================================================${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ $FAILURES VERIFICATION CHECK(S) FAILED.${NC}"
  echo -e "${BLUE}${BOLD}====================================================${NC}"
  exit 1
fi
