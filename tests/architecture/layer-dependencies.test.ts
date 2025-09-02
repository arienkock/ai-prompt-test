import { FileScanner, ScanResult } from './utils/file-scanner';

describe('Architecture Rules - Layer Dependencies', () => {
  let scanner: FileScanner;

  beforeAll(() => {
    scanner = new FileScanner();
  });

  describe('Domain Layer Independence', () => {
    test('Domain layer must not reference Data Access layer', () => {
      // Scan all domain files
      const domainFiles = scanner.scanDirectory('src/domain');
      
      // Check for imports from data-access layer
      const violations = scanner.checkImportViolations(
        domainFiles,
        /from\s+['"](\.\.\/)*data-access/,
        'Domain layer must not directly import from data-access layer (use dependency inversion)'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Domain layer dependency violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });

    test('Entities must not call or reference use case objects', () => {
      // Scan entity files
      const entityFiles = scanner.scanDirectory('src/domain/entities');
      
      // Check for use case imports
      const useCaseImportViolations = scanner.checkImportViolations(
        entityFiles,
        /from\s+['"](\.\.\/)*use-cases/,
        'Entities must not import use case objects'
      );

      // Check for use case references in code
      const useCaseReferenceViolations = scanner.checkCodePatterns(
        entityFiles,
        /\bUseCase\b/,
        'Entities must not reference UseCase types or objects'
      );

      const allViolations = [...useCaseImportViolations, ...useCaseReferenceViolations];

      if (allViolations.length > 0) {
        console.error(`\n❌ Entity-UseCase dependency violations found:\n\n${FileScanner.formatViolations(allViolations)}\n`);
      }
      expect(allViolations.length).toBe(0);
    });
  });

  describe('Shared Code Independence', () => {
    test('Shared code must not reference entity and use case types', () => {
      // Scan shared files
      const sharedFiles = scanner.scanDirectory('src/shared');
      
      // Check for entity imports
      const entityImportViolations = scanner.checkImportViolations(
        sharedFiles,
        /from\s+['"](\.\.\/)*domain\/(entities|use-cases)/,
        'Shared code must not import domain entities or use cases (must be generic and domain-agnostic)'
      );

      // Check for specific domain type references
      const domainTypeViolations = scanner.checkCodePatterns(
        sharedFiles,
        /\b(User|Profile|Order|Product|UseCase)\b/,
        'Shared code must not reference specific domain types'
      );

      const allViolations = [...entityImportViolations, ...domainTypeViolations];

      if (allViolations.length > 0) {
        console.error(`\n❌ Shared code dependency violations found:\n\n${FileScanner.formatViolations(allViolations)}\n`);
      }
      expect(allViolations.length).toBe(0);
    });
  });

  describe('Cross-Layer Import Validation', () => {
    test('Frontend must not import backend implementation details', () => {
      // Scan frontend files if they exist
      const frontendFiles = scanner.scanDirectory('frontend/src');
      
      if (frontendFiles.length === 0) {
        // Skip if no frontend files found
        return;
      }

      // Check for backend imports
      const backendImportViolations = scanner.checkImportViolations(
        frontendFiles,
        /from\s+['"](\.\.\/)*src\/(data-access|web-controller)/,
        'Frontend must not import backend implementation details'
      );

      if (backendImportViolations.length > 0) {
        console.error(`\n❌ Frontend-Backend dependency violations found:\n\n${FileScanner.formatViolations(backendImportViolations)}\n`);
      }
      expect(backendImportViolations.length).toBe(0);
    });
  });

  describe('Circular Dependency Prevention', () => {
    test('Domain repositories must not import their implementations', () => {
      // Scan domain repository interfaces
      const repositoryFiles = scanner.scanDirectory('src/domain/repositories');
      
      // Check for imports of implementation classes
      const violations = scanner.checkImportViolations(
        repositoryFiles,
        /from\s+['"](\.\.\/)*data-access\/repositories/,
        'Domain repository interfaces must not import their implementations'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Repository circular dependency violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });

    test('Use cases must not import web controller types', () => {
      // Scan use case files
      const useCaseFiles = scanner.scanDirectory('src/domain/use-cases');
      
      // Check for web controller imports
      const violations = scanner.checkImportViolations(
        useCaseFiles,
        /from\s+['"](\.\.\/)*web-controller/,
        'Use cases must not import web controller types (maintain separation of concerns)'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Use case web controller dependency violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });

  describe('Test Dependencies', () => {
    test('Architecture tests must not import production code directly', () => {
      // Scan architecture test files (excluding this file and utils)
      const archTestFiles = scanner.scanDirectory('tests/architecture')
        .filter(file => !file.relativePath.includes('utils') && file.relativePath !== 'tests/architecture/layer-dependencies.test.ts');
      
      // Allow imports from utils and test helpers, but not production code
      const violations = scanner.checkImportViolations(
        archTestFiles,
        /from\s+['"](\.\.\/)*src\/(?!shared\/types)/,
        'Architecture tests should only import from utils and avoid tight coupling to production code'
      );

      if (violations.length > 0) {
        console.error(`\n❌ Architecture test dependency violations found:\n\n${FileScanner.formatViolations(violations)}\n`);
      }
      expect(violations.length).toBe(0);
    });
  });
});
