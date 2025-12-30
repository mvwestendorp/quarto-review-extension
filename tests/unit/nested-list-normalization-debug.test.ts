/**
 * Debug test for nested list normalization trailing space issue
 */

import { describe, it, expect } from 'vitest';
import { generateChanges, changesToCriticMarkup, stripCriticMarkup } from '@/modules/changes/converters';

describe('Nested List Normalization Debug', () => {
  it('should not add trailing space when rejecting changes', () => {
    const input = `- Level 1 item 1
  - Level 2 item 1.1
    - Level 3 item 1.1.1
      - Level 4 item 1.1.1.1
        - Level 5 item 1.1.1.1.1
  - Level 2 item 1.2
- Level 1 item 2`;

    const edit = `- Level 1 item 1
  - Level 2 item 1.1
    - Level 3 item 1.1.1 modified
      - Level 4 item 1.1.1.1
        - Level 5 item 1.1.1.1.1
  - Level 2 item 1.2
- Level 1 item 2`;

    console.log('\n=== INPUT ===');
    console.log(JSON.stringify(input));

    console.log('\n=== EDIT ===');
    console.log(JSON.stringify(edit));

    // Generate changes
    const changes = generateChanges(input, edit);
    console.log('\n=== CHANGES ===');
    console.log(JSON.stringify(changes, null, 2));

    // Convert to CriticMarkup
    const criticMarkup = changesToCriticMarkup(input, changes);
    console.log('\n=== CRITIC MARKUP ===');
    console.log(JSON.stringify(criticMarkup));

    // Reject changes
    const rejected = stripCriticMarkup(criticMarkup, false);
    console.log('\n=== REJECTED ===');
    console.log(JSON.stringify(rejected));

    // Compare character by character
    if (rejected !== input) {
      console.log('\n=== DIFF ===');
      for (let i = 0; i < Math.max(input.length, rejected.length); i++) {
        const inputChar = input[i] || '';
        const rejectedChar = rejected[i] || '';
        if (inputChar !== rejectedChar) {
          console.log(`Position ${i}: input='${inputChar}' (${inputChar.charCodeAt(0)}) rejected='${rejectedChar}' (${rejectedChar.charCodeAt(0)})`);
        }
      }
    }

    expect(rejected).toBe(input);
  });
});
