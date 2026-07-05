# chore: Set up ESLint configuration for TypeScript and Node.js

## Overview

This PR implements a comprehensive ESLint configuration for the zettel-lint project to provide automated code quality checks and linting for our TypeScript codebase running in Node.js.

## Why This Is Needed

1. **Configuration Discovery**: Many code scanning tools (like Codacy) report "configuration not found" when ESLint configuration is missing, preventing proper analysis
2. **Code Quality**: Ensures consistent code style and catches common errors before they reach production
3. **TypeScript Support**: Enables type-aware linting with typescript-eslint for better error detection
4. **Developer Experience**: Provides immediate feedback to developers about code quality issues
5. **CI/CD Integration**: Allows ESLint to run in our GitHub Actions workflows

## What's Included

- Modern ESLint flat config format (ESLint 9+ compatible)
- TypeScript language parser with type-aware linting
- Node.js globals support (@types/node)
- Test file configuration for Vitest
- Strict TypeScript checking rules
- Custom rules for our project requirements

## Changes

### New Files
- `eslint.config.js` - Main ESLint configuration

### Updated Files
- `package.json`:
  - Added `@eslint/js: ^9.0.0`
  - Added `typescript-eslint: ^8.0.0`
  - Updated `lint` script to run `eslint src/`

## Configuration Details

**Configured Rules**:
- Explicit return types for functions
- Unused variable detection (with underscore prefix exceptions)
- No var declarations
- Proper const usage
- Console output allowed (CLI tool)
- TypeScript strict type checking

## Testing

After merging, run:
```bash
npm run lint
```

This should lint all TypeScript files in the `src/` directory and report any issues.

## Related

Resolves code scanning configuration discovery issues seen in Codacy analysis.
