import { FileScanner, ScanResult } from './utils/file-scanner';

describe('Architecture Rules - Naming & Structure', () => {
  let scanner: FileScanner;

  beforeAll(() => {
    scanner = new FileScanner();
  });

  describe('Naming Conventions', () => {
    test('Entity fields must be in camelCase', () => {
      // Scan entity files
      const entityFiles = scanner.scanDirectory('src/domain/entities');
      
      // Check for non-camelCase field declarations
      const violations = scanner.checkNamingConventions(
        entityFiles,
        /(?:public|private|readonly)\s+(?![a-z]+(?:[A-Z][a-z]+)*)\s*:/,
        'Entity fields must be in camelCase format'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Entity field naming violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });

    test('Database column names must match entity field names (camelCase)', () => {
      // Scan SQL files for CREATE TABLE statements
      const sqlFiles = scanner.scanDirectory('src/data-access/migrations', /\.sql$/);
      
      // Check for snake_case column names (should be camelCase)
      const violations = scanner.checkNamingConventions(
        sqlFiles,
        /"([a-z]+_[a-z_]+)"/g,
        'Database column names must be camelCase to match entity fields (not snake_case)'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Database column naming violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });

  describe('Use Case Structure', () => {
    test('Use case objects must have a single primary method', () => {
      // Scan use case files
      const useCaseFiles = scanner.scanDirectory('src/domain/use-cases');
      
      // Use the specialized use case method checker
      const violations = scanner.checkUseCaseMethodCount(useCaseFiles);

      if (violations.length > 0) {
        console.error(`\n❌ Use case method count violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });

    test('Use case execute method must have correct signature', () => {
      // Scan use case files
      const useCaseFiles = scanner.scanDirectory('src/domain/use-cases');
      
      // Check for correct execute method signature: execute(context: Context, command: CQ)
      const violations = scanner.checkCodePatterns(
        useCaseFiles,
        /execute\s*\([^)]*\)\s*:\s*Promise</,
        'Use case execute method found'
      );

      // Filter to find cases where the signature is incorrect
      const signatureViolations = violations.filter(v => {
        const line = v.content;
        // Check if it doesn't follow the pattern: execute(context: Context, commandOrQuery: T)
        return !line.match(/execute\s*\(\s*context\s*:\s*Context\s*,\s*\w+\s*:\s*\w+.*\)\s*:\s*Promise/);
      });

      if (signatureViolations.length > 0) {
        console.error(`\n❌ Use case method signature violations found:\n\n${FileScanner.formatViolations(signatureViolations)}\n`);
      }
      expect(signatureViolations.length).toBe(0);
    });
  });

  describe('Code Pattern Rules', () => {
    test('Error handling must not use type reflection', () => {
      // Scan web controller and error handling files
      const webControllerFiles = scanner.scanDirectory('src/web-controller');
      
      // Check for type reflection patterns
      const typeofViolations = scanner.checkCodePatterns(
        webControllerFiles,
        /typeof\s+\w+\s*===?\s*['"]|===?\s*['"].*typeof/,
        'Must not use typeof for error handling logic - use domain error codes instead'
      );

      const instanceofViolations = scanner.checkCodePatterns(
        webControllerFiles,
        /instanceof\s+\w*Error/,
        'Must not use instanceof for error type checking - expose error codes in domain layer instead'
      ).filter(v => !v.file.endsWith("/ErrorHandler.ts"));

      const allViolations = [...typeofViolations, ...instanceofViolations];

      if (allViolations.length > 0) {
        console.error(`\n❌ Type reflection violations found:\n\n${FileScanner.formatViolations(allViolations)}\n`);
      }
      expect(allViolations.length).toBe(0);
    });

    test('Web controllers must use transaction helper function', () => {
      // Scan web controller route files
      const routeFiles = scanner.scanDirectory('src/web-controller/routes');
      
      // Look for use case calls that should be wrapped in transactions
      const useCaseCallPattern = /\.execute\s*\(/;
      const transactionPattern = /transaction|Transaction/;

      const violations: ScanResult[] = [];

      for (const file of routeFiles) {
        const lines = file.content.split('\n');
        let hasUseCaseCalls = false;
        let hasTransactionWrapper = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (useCaseCallPattern.test(line)) {
            hasUseCaseCalls = true;
          }
          
          if (transactionPattern.test(line)) {
            hasTransactionWrapper = true;
          }
        }

        if (hasUseCaseCalls && !hasTransactionWrapper) {
          violations.push({
            file: file.relativePath,
            line: 1,
            content: 'File contains use case calls but no transaction wrapper',
            violation: 'Web controllers must use transaction helper function to call use cases'
          });
        }
      }

      if (violations.length > 0) {
        console.error(`\n❌ Transaction helper violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });

  describe('File Structure Rules', () => {
    test('Migration files must have timestamp columns', () => {
      // Scan SQL migration files
      const sqlFiles = scanner.scanDirectory('src/data-access/migrations', /\.sql$/);
      
      const violations: ScanResult[] = [];

      for (const file of sqlFiles) {
        const content = file.content.toLowerCase();
        
        // Check if it's a CREATE TABLE statement
        if (content.includes('create table')) {
          const hasCreatedAt = content.includes('createdat') || content.includes('created_at');
          const hasUpdatedAt = content.includes('updatedat') || content.includes('updated_at');

          if (!hasCreatedAt) {
            violations.push({
              file: file.relativePath,
              line: 1,
              content: 'CREATE TABLE statement missing createdAt column',
              violation: 'Database tables must have createdAt timestamp column'
            });
          }

          if (!hasUpdatedAt) {
            violations.push({
              file: file.relativePath,
              line: 1,
              content: 'CREATE TABLE statement missing updatedAt column',
              violation: 'Database tables must have updatedAt timestamp column'
            });
          }
        }
      }

      if (violations.length > 0) {
        console.error(`\n❌ Missing timestamp column violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });

  describe('Domain Error Patterns', () => {
    test('Domain errors must be distinguishable by error codes', () => {
      // Scan domain error files and use case files
      const domainFiles = scanner.scanDirectory('src/domain');
      
      // Look for error throwing without proper error codes
      const violations = scanner.checkCodePatterns(
        domainFiles,
        /throw\s+new\s+Error\s*\(/,
        'Must use domain-specific error types with error codes, not generic Error'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Generic error usage violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });

    test('Context objects must contain user identity', () => {
      // Scan context type definitions
      const typeFiles = scanner.scanDirectory('src/shared/types');
      const domainTypeFiles = scanner.scanDirectory('src/domain/types');
      
      const allTypeFiles = [...typeFiles, ...domainTypeFiles];
      
      // Look for Context interface/type definitions
      const contextDefinitions = scanner.checkCodePatterns(
        allTypeFiles,
        /interface\s+Context|type\s+Context/,
        'Context definition found'
      );

      const violations: ScanResult[] = [];

      for (const contextDef of contextDefinitions) {
        const file = allTypeFiles.find(f => f.relativePath === contextDef.file);
        if (!file) continue;

        // Check if the Context definition includes userId field
        const contextBlock = extractContextDefinition(file.content);
        if (contextBlock && !contextBlock.includes('userId')) {
          violations.push({
            file: contextDef.file,
            line: contextDef.line,
            content: contextDef.content,
            violation: 'Context objects must contain user identity field (userId)'
          });
        }
      }

      if (violations.length > 0) {
        console.error(`\n❌ Context user identity violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });

});

// Helper function to extract Context definition block
function extractContextDefinition(content: string): string | null {
  const lines = content.split('\n');
  let inContext = false;
  let braceCount = 0;
  let contextBlock = '';

  for (const line of lines) {
    if (line.includes('interface Context') || line.includes('type Context')) {
      inContext = true;
      contextBlock = line;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      continue;
    }

    if (inContext) {
      contextBlock += '\n' + line;
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      
      if (braceCount <= 0) {
        break;
      }
    }
  }

  return inContext ? contextBlock : null;
}
