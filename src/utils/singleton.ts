/**
 * Singleton factory utilities
 * Provides a generic way to create singleton instances of classes
 */

/**
 * Creates a singleton getter function for a given class
 * @template T - The type of the class to create a singleton for
 * @param ClassConstructor - The class constructor
 * @returns A function that returns the singleton instance of the class
 *
 * @example
 * ```typescript
 * class MyService {
 *   doSomething() { ... }
 * }
 *
 * export const getMyService = createSingleton(MyService);
 *
 * // Usage
 * const service = getMyService();
 * ```
 */
export function createSingleton<T>(ClassConstructor: new () => T): () => T {
  let instance: T | null = null;

  return function getInstance(): T {
    if (!instance) {
      instance = new ClassConstructor();
    }
    return instance;
  };
}

/**
 * Creates a singleton getter function for a class that requires constructor arguments
 * @template T - The type of the class to create a singleton for
 * @template Args - The types of the constructor arguments
 * @param ClassConstructor - The class constructor
 * @returns A function that accepts constructor args and returns the singleton instance
 *
 * @example
 * ```typescript
 * class ConfigService {
 *   constructor(private config: Config) { ... }
 * }
 *
 * export const getConfigService = createSingletonWithArgs(ConfigService);
 *
 * // Usage (first call initializes with args, subsequent calls ignore args)
 * const service = getConfigService(myConfig);
 * ```
 */
export function createSingletonWithArgs<T, Args extends unknown[]>(
  ClassConstructor: new (...args: Args) => T
): (...args: Args) => T {
  let instance: T | null = null;

  return function getInstance(...args: Args): T {
    if (!instance) {
      instance = new ClassConstructor(...args);
    }
    return instance;
  };
}
