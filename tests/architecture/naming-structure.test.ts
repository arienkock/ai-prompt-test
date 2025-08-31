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
        /(?:public|private|readonly)\s+([a-z]+[A-Z_][a-zA-Z0-9_]*|[A-Z][a-zA-Z0-9_]*)\s*:/,
        'Entity fields must be in camelCase format'
      );

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Entity field naming violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });

    test('Database column names must be quoted in SQL files', () => {
      // Scan SQL migration files
      const sqlFiles = scanner.scanDirectory('src/data-access/migrations', /\.sql$/);
      
      // Use the specialized SQL checker from file scanner
      const violations = scanner.checkSQLQuotedIdentifiers(sqlFiles);

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`SQL quoted identifier violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Database column naming violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });
  });

  describe('Use Case Structure', () => {
    test('Use case objects must have a single primary method', () => {
      // Scan use case files
      const useCaseFiles = scanner.scanDirectory('src/domain/use-cases');
      
      // Use the specialized use case method checker
      const violations = scanner.checkUseCaseMethodCount(useCaseFiles);

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Use case method count violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(signatureViolations.length).toBe(0);
      if (signatureViolations.length > 0) {
        throw new Error(`Use case method signature violations found:\n\n${FileScanner.formatViolations(signatureViolations)}`);
      }
    });
  });

  describe('Code Pattern Rules', () => {
    test('DTO to entity mapping must copy fields explicitly (no object spread)', () => {
      // Scan all TypeScript files for mapping code
      const allFiles = scanner.scanDirectory('src');
      
      // Check for object spread operator in mapping contexts
      const violations = scanner.checkCodePatterns(
        allFiles,
        /\.\.\.[a-zA-Z_$][a-zA-Z0-9_$]*/,
        'Object spread operator found - DTO to entity mapping must copy fields explicitly by name'
      );

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Object spread violations found (security risk):\n\n${FileScanner.formatViolations(violations)}`);
      }
    });

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
      );

      const allViolations = [...typeofViolations, ...instanceofViolations];

      expect(allViolations.length).toBe(0);
      if (allViolations.length > 0) {
        throw new Error(`Type reflection violations found:\n\n${FileScanner.formatViolations(allViolations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Transaction helper violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });
  });

  describe('File Structure Rules', () => {
    test('Entity files must have corresponding repository interface', () => {
      // Get all entity files
      const entityFiles = scanner.scanDirectory('src/domain/entities')
        .filter(file => !file.relativePath.includes('Entity.ts')); // Skip base Entity class

      // Get all repository interface files
      const repositoryFiles = scanner.scanDirectory('src/domain/repositories');

      const violations: ScanResult[] = [];

      for (const entityFile of entityFiles) {
        const entityName = entityFile.relativePath.split('/').pop()?.replace('.ts', '');
        if (!entityName) continue;

        // Look for corresponding repository interface (e.g., User.ts -> IUserRepository.ts)
        const expectedRepoName = `I${entityName}Repository.ts`;
        const hasRepository = repositoryFiles.some(repo => 
          repo.relativePath.endsWith(expectedRepoName)
        );

        if (!hasRepository) {
          violations.push({
            file: entityFile.relativePath,
            line: 1,
            content: `Entity ${entityName} found`,
            violation: `Entity must have corresponding repository interface: ${expectedRepoName}`
          });
        }
      }

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Missing repository interface violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });

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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Missing timestamp column violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Generic error usage violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Context user identity violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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
