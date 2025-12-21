#!/bin/bash
# Security tools setup for Treasury Plane development
#
# This script installs gitleaks for secret detection.
# Run this once after cloning the repository.

set -e

echo "========================================="
echo "Treasury Plane - Security Tools Setup"
echo "========================================="
echo ""

# Detect OS
OS="$(uname -s)"

install_gitleaks() {
    case "$OS" in
        Darwin)
            echo "Installing gitleaks via Homebrew..."
            if command -v brew &> /dev/null; then
                brew install gitleaks
            else
                echo "Error: Homebrew not found. Please install from https://brew.sh"
                echo "Or manually install gitleaks from https://github.com/gitleaks/gitleaks"
                exit 1
            fi
            ;;
        Linux)
            echo "Installing gitleaks..."
            # Try apt first (Debian/Ubuntu)
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y gitleaks
            # Try yum (RHEL/CentOS)
            elif command -v yum &> /dev/null; then
                sudo yum install -y gitleaks
            # Fallback to binary download
            else
                echo "Downloading gitleaks binary..."
                GITLEAKS_VERSION="8.21.2"
                curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" | tar xz -C /tmp
                sudo mv /tmp/gitleaks /usr/local/bin/
            fi
            ;;
        *)
            echo "Unsupported OS: $OS"
            echo "Please manually install gitleaks from https://github.com/gitleaks/gitleaks"
            exit 1
            ;;
    esac
}

# Check if gitleaks is already installed
if command -v gitleaks &> /dev/null; then
    echo "✓ gitleaks is already installed ($(gitleaks version))"
else
    echo "gitleaks not found. Installing..."
    install_gitleaks
    echo "✓ gitleaks installed successfully"
fi

# Verify installation
echo ""
echo "Verifying installation..."
gitleaks version

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Security tools are now configured:"
echo "  • gitleaks: Scans for secrets before each commit"
echo "  • GitHub Actions: Scans PRs for secrets and vulnerabilities"
echo ""
echo "The pre-commit hook will automatically run gitleaks on staged files."
echo ""
