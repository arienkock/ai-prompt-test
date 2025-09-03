import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  path: string;
  content: string;
  relativePath: string;
}

export interface ScanResult {
  file: string;
  line: number;
  content: string;
  violation: string;
}

/**
 * Utility class for scanning files and analyzing code patterns
 * Used by architecture tests to enforce rules
 */
export class FileScanner {
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  /**
   * Recursively scan directory for files matching pattern
   */
  scanDirectory(dirPath: string, filePattern: RegExp = /\.ts$/): FileInfo[] {
    const files: FileInfo[] = [];
    const fullDirPath = path.join(this.rootDir, dirPath);

    if (!fs.existsSync(fullDirPath)) {
      return files;
    }

    const scan = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile() && filePattern.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relativePath = path.relative(this.rootDir, fullPath);
          
          files.push({
            path: fullPath,
            content,
            relativePath
          });
        }
      }
    };

    scan(fullDirPath);
    return files;
  }

  /**
   * Check for import violations in files
   */
  checkImportViolations(files: FileInfo[], forbiddenImportPattern: RegExp, violationMessage: string): ScanResult[] {
    const violations: ScanResult[] = [];

    for (const file of files) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('import ') && forbiddenImportPattern.test(trimmedLine)) {
          violations.push({
            file: file.relativePath,
            line: i + 1,
            content: trimmedLine,
            violation: violationMessage
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check for code pattern violations using regex
   */
  checkCodePatterns(files: FileInfo[], pattern: RegExp, violationMessage: string): ScanResult[] {
    const violations: ScanResult[] = [];

    for (const file of files) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        if (pattern.test(line)) {
          violations.push({
            file: file.relativePath,
            line: i + 1,
            content: line.trim(),
            violation: violationMessage
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check naming conventions in files
   */
  checkNamingConventions(files: FileInfo[], pattern: RegExp, violationMessage: string): ScanResult[] {
    const violations: ScanResult[] = [];

    for (const file of files) {
      const lines = file.content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const matches = line.match(pattern);
        
        if (matches) {
          violations.push({
            file: file.relativePath,
            line: i + 1,
            content: line.trim(),
            violation: violationMessage
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check use case method count
   */
  checkUseCaseMethodCount(files: FileInfo[]): ScanResult[] {
    const violations: ScanResult[] = [];

    for (const file of files) {
      // Only check use case files
      if (!file.relativePath.includes('use-cases') && !file.relativePath.includes('UseCase')) {
        continue;
      }

      const content = file.content;
      
      // Look for class definitions
      const classMatch = content.match(/class\s+(\w+UseCase)/);
      if (!classMatch) continue;

      // Count public methods (excluding constructor, isRead, isPublic)
      const publicMethodPattern = /^\s*public\s+(?!constructor|isRead|isPublic)(\w+)\s*\(/gm;
      const publicMethods = [...content.matchAll(publicMethodPattern)];
      
      // Count async methods that aren't isRead/isPublic
      const asyncMethodPattern = /^\s*async\s+(?!isRead|isPublic)(\w+)\s*\(/gm;
      const asyncMethods = [...content.matchAll(asyncMethodPattern)];

      const totalPublicMethods = publicMethods.length + asyncMethods.length;

      if (totalPublicMethods > 1) {
        violations.push({
          file: file.relativePath,
          line: 1,
          content: `Found ${totalPublicMethods} public methods: ${[...publicMethods, ...asyncMethods].map(m => m[1]).join(', ')}`,
          violation: 'Use case objects should have a single primary method (execute)'
        });
      }
    }

    return violations;
  }

  /**
   * Format violations for display
   */
  static formatViolations(violations: ScanResult[]): string {
    if (violations.length === 0) return '';

    return violations
      .map(v => `  ${v.file}:${v.line} - ${v.violation}\n    ${v.content}`)
      .join('\n\n');
  }
}
