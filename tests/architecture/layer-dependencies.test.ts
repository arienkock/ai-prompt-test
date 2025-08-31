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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Domain layer dependency violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(allViolations.length).toBe(0);
      if (allViolations.length > 0) {
        throw new Error(`Entity-UseCase dependency violations found:\n\n${FileScanner.formatViolations(allViolations)}`);
      }
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

      expect(allViolations.length).toBe(0);
      if (allViolations.length > 0) {
        throw new Error(`Shared code dependency violations found:\n\n${FileScanner.formatViolations(allViolations)}`);
      }
    });
  });

  describe('Cross-Layer Import Validation', () => {
    test('Web Controller must not import Data Access directly', () => {
      // Scan web controller files
      const webControllerFiles = scanner.scanDirectory('src/web-controller');
      
      // Check for direct data-access imports (should go through domain layer)
      const violations = scanner.checkImportViolations(
        webControllerFiles,
        /from\s+['"](\.\.\/)*data-access/,
        'Web Controller must not directly import from data-access layer (use domain layer interfaces)'
      );

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Web Controller data-access dependency violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });

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
        /from\s+['"](\.\.\/)*src\/(domain|data-access|web-controller)/,
        'Frontend must not import backend implementation details'
      );

      expect(backendImportViolations.length).toBe(0);
      if (backendImportViolations.length > 0) {
        throw new Error(`Frontend-Backend dependency violations found:\n\n${FileScanner.formatViolations(backendImportViolations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Repository circular dependency violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Use case web controller dependency violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
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

      expect(violations.length).toBe(0);
      if (violations.length > 0) {
        throw new Error(`Architecture test dependency violations found:\n\n${FileScanner.formatViolations(violations)}`);
      }
    });
  });
});
