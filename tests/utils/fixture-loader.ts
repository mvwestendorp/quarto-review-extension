import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

/**
 * Utility for loading test fixtures
 */
export class FixtureLoader {
  private fixturesDir: string;

  constructor(fixturesDir: string) {
    this.fixturesDir = fixturesDir;
  }

  /**
   * Load a text fixture file
   */
  loadText(relativePath: string): string {
    const fullPath = join(this.fixturesDir, relativePath);
    if (!existsSync(fullPath)) {
      throw new Error(`Fixture not found: ${fullPath}`);
    }
    return readFileSync(fullPath, 'utf-8');
  }

  /**
   * Load a JSON fixture file
   */
  loadJSON<T>(relativePath: string): T {
    const content = this.loadText(relativePath);
    return JSON.parse(content) as T;
  }

  /**
   * Check if a fixture exists
   */
  exists(relativePath: string): boolean {
    const fullPath = join(this.fixturesDir, relativePath);
    return existsSync(fullPath);
  }

  /**
   * List all fixture files in a directory
   */
  list(relativePath: string): string[] {
    const fullPath = join(this.fixturesDir, relativePath);
    if (!existsSync(fullPath)) {
      return [];
    }
    return readdirSync(fullPath);
  }

  /**
   * Get all transformation test cases
   * Returns an array of test case objects with input, edit, and expected outputs
   */
  getTransformationTestCases(): TransformationTestCase[] {
    const inputFiles = this.list('transformation/inputs');
    const testCases: TransformationTestCase[] = [];

    for (const inputFile of inputFiles) {
      const baseName = basename(inputFile, '.md');
      const editFile = `transformation/edits/${inputFile}`;

      if (!this.exists(editFile)) {
        console.warn(`Warning: Missing edit file for ${inputFile}`);
        continue;
      }

      const testCase: TransformationTestCase = {
        name: baseName,
        input: this.loadText(`transformation/inputs/${inputFile}`),
        edit: this.loadText(`transformation/edits/${inputFile}`),
        expected: {
          criticMarkup: this.exists(`transformation/expected/critic-markup/${inputFile}`)
            ? this.loadText(`transformation/expected/critic-markup/${inputFile}`)
            : undefined,
          accepted: this.exists(`transformation/expected/accepted/${inputFile}`)
            ? this.loadText(`transformation/expected/accepted/${inputFile}`)
            : undefined,
          rejected: this.exists(`transformation/expected/rejected/${inputFile}`)
            ? this.loadText(`transformation/expected/rejected/${inputFile}`)
            : undefined,
          changes: this.exists(`transformation/expected/changes/${baseName}.json`)
            ? this.loadJSON(`transformation/expected/changes/${baseName}.json`)
            : undefined,
        },
      };

      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Get all rendering test cases
   */
  getRenderingTestCases(): RenderingTestCase[] {
    const inputFiles = this.list('rendering/inputs');
    const testCases: RenderingTestCase[] = [];

    for (const inputFile of inputFiles) {
      const baseName = basename(inputFile, '.md');
      const expectedFile = `rendering/expected/${baseName}.html`;

      if (!this.exists(expectedFile)) {
        console.warn(`Warning: Missing expected output for ${inputFile}`);
        continue;
      }

      testCases.push({
        name: baseName,
        input: this.loadText(`rendering/inputs/${inputFile}`),
        expected: this.loadText(expectedFile),
      });
    }

    return testCases;
  }

  /**
   * Get all operation sequence test cases
   */
  getOperationTestCases(): OperationTestCase[] {
    const scenarioFiles = this.list('operations/scenarios');
    const testCases: OperationTestCase[] = [];

    for (const scenarioFile of scenarioFiles) {
      const baseName = basename(scenarioFile, '.json');
      const scenario = this.loadJSON<OperationScenario>(
        `operations/scenarios/${scenarioFile}`
      );

      const expectedFile = `operations/expected/${baseName}.json`;
      const expected = this.exists(expectedFile)
        ? this.loadJSON<OperationExpectedState>(expectedFile)
        : undefined;

      testCases.push({
        name: baseName,
        scenario,
        expected,
      });
    }

    return testCases;
  }
}

export interface TransformationTestCase {
  name: string;
  input: string;
  edit: string;
  expected: {
    criticMarkup?: string;
    accepted?: string;
    rejected?: string;
    changes?: any;
  };
}

export interface RenderingTestCase {
  name: string;
  input: string;
  expected: string;
}

export interface OperationTestCase {
  name: string;
  scenario: OperationScenario;
  expected?: OperationExpectedState;
}

export interface OperationScenario {
  description: string;
  initialState: {
    elements: Array<{
      id: string;
      type: string;
      markdown: string;
    }>;
  };
  operations: Array<{
    type: string;
    elementId?: string;
    newContent?: string;
    [key: string]: any;
  }>;
  expectedState?: Record<string, any>;
}

export interface OperationExpectedState {
  [elementId: string]: {
    currentContent?: string;
    trackedChanges?: string;
    [key: string]: any;
  };
}

/**
 * Default fixture loader instance
 */
export const fixtureLoader = new FixtureLoader(
  join(process.cwd(), 'tests', 'fixtures')
);
