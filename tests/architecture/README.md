# Architecture Tests

This directory contains automated tests that enforce the architecture rules defined in `memory-bank/architectureRules.md`. These tests run as part of the Jest test suite and will fail when architecture violations are detected.

## Overview

The architecture tests use simple, fast text-based scanning to detect violations without requiring complex AST parsing. This keeps the tests lightweight and maintainable while still catching important architecture rule violations.

## Test Structure

### Layer Dependencies Tests (`layer-dependencies.test.ts`)

Enforces proper separation between architectural layers:

- **Domain Layer Independence**: Ensures domain layer doesn't import data-access layer
- **Entity-UseCase Separation**: Prevents entities from referencing use cases
- **Shared Code Independence**: Ensures shared code remains domain-agnostic
- **Cross-Layer Import Validation**: Prevents improper layer coupling
- **Circular Dependency Prevention**: Detects circular imports between layers

### Naming & Structure Tests (`naming-structure.test.ts`)

Enforces naming conventions and structural patterns:

- **Naming Conventions**: camelCase entity fields, quoted SQL identifiers
- **Use Case Structure**: Single primary method, correct method signatures
- **Code Pattern Rules**: Explicit field mapping, no type reflection, transaction usage
- **File Structure Rules**: Entity-repository correspondence, timestamp columns
- **Domain Error Patterns**: Proper error handling, context requirements

## How It Works

### File Scanner Utility (`utils/file-scanner.ts`)

The `FileScanner` class provides methods for:

- **Directory Scanning**: Recursively scan directories for files matching patterns
- **Import Analysis**: Check import statements for forbidden dependencies
- **Code Pattern Detection**: Use regex to find specific code patterns
- **Naming Convention Checks**: Validate naming standards
- **Specialized Checks**: SQL analysis, use case method counting, etc.

### Test Pattern

Each test follows this pattern:

1. **Scan**: Find relevant files using `FileScanner`
2. **Check**: Apply specific rule checks (imports, patterns, naming, etc.)
3. **Report**: Fail with detailed violation information if issues found

```typescript
test('Rule description', () => {
  const files = scanner.scanDirectory('src/domain');
  const violations = scanner.checkImportViolations(files, /forbidden-pattern/, 'Rule explanation');
  
  expect(violations.length).toBe(0);
  if (violations.length > 0) {
    throw new Error(`Violations found:\n\n${FileScanner.formatViolations(violations)}`);
  }
});
```

## Running the Tests

```bash
# Run only architecture tests
npm test -- tests/architecture

# Run all tests (includes architecture tests)
npm test
```

## Violation Examples

When violations are detected, tests provide detailed feedback:

```
Entity field naming violations found:

  src/domain/entities/User.ts:15 - Entity fields must be in camelCase format
    public readonly firstName: string;

  src/web-controller/routes/AuthRoutes.ts:45 - Web Controller must not directly import from data-access layer
    import { UserRepository } from '@/data-access/repositories/UserRepository';
```

## Current Status

The tests currently detect several violations in the codebase:

- **Entity field naming**: 7 violations
- **SQL quoted identifiers**: 3 violations  
- **Object spread usage**: 6 violations
- **Type reflection**: 2 violations
- **Missing repository interfaces**: 1 violation
- **Generic error usage**: 2 violations
- **Layer dependency violations**: 2 violations

These violations indicate areas where the codebase doesn't yet fully comply with the architecture rules. The tests serve as:

1. **Documentation**: Living specification of architecture requirements
2. **Enforcement**: Prevent new violations from being introduced
3. **Refactoring Guide**: Identify specific areas needing improvement

## Extending the Tests

To add new architecture rule checks:

1. **Add to FileScanner**: Create new scanning methods if needed
2. **Create Test Case**: Add test to appropriate test file
3. **Document Rule**: Update architecture rules documentation

### Example: Adding a New Rule

```typescript
test('New rule description', () => {
  const files = scanner.scanDirectory('src/target-directory');
  const violations = scanner.checkCodePatterns(
    files, 
    /pattern-to-detect/g,
    'Explanation of what this rule enforces'
  );
  
  expect(violations.length).toBe(0);
  if (violations.length > 0) {
    throw new Error(`Rule violations found:\n\n${FileScanner.formatViolations(violations)}`);
  }
});
```

## Benefits

1. **Fast Execution**: Text-based scanning is much faster than AST parsing
2. **Simple Implementation**: Easy to understand and maintain
3. **Comprehensive Coverage**: Covers most important architecture rules
4. **Clear Feedback**: Specific file/line violation reporting
5. **CI Integration**: Runs automatically with other tests

## Limitations

- **Text-Based**: May have false positives/negatives for complex patterns
- **No Semantic Analysis**: Doesn't understand code semantics, only text patterns
- **Regex Complexity**: Complex rules may require intricate regex patterns

These limitations are acceptable trade-offs for the simplicity and speed gained.
