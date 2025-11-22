import { describe, it, expect } from 'vitest';
import { cleanText, extractSalary, safeText } from '../../src/utils/helpers.js';

describe('Utils helpers', () => {
  describe('cleanText', () => {
    it('should remove extra spaces and trim', () => {
      expect(cleanText('  hello   world  ')).toBe('hello world');
      expect(cleanText('hello\n\nworld')).toBe('hello world');
    });
  });

  describe('extractSalary', () => {
    it('should return undefined for empty or invalid text', () => {
      expect(extractSalary('')).toBeUndefined();
      expect(extractSalary('-')).toBeUndefined();
      expect(extractSalary('   ')).toBeUndefined();
    });

    it('should return cleaned salary text', () => {
      expect(extractSalary('1000 MDL')).toBe('1000 MDL');
      expect(extractSalary('  2000-3000  ')).toBe('2000-3000');
    });
  });

  describe('safeText', () => {
    it('should return empty string for null or undefined', (): void => {
      expect(safeText(null)).toBe('');
      expect(safeText(undefined)).toBe('');
    });

    it('should extract text from cheerio-like object', () => {
      const mockElement = {
        text: (): string => '  Hello World  ',
      };
      expect(safeText(mockElement)).toBe('Hello World');
    });
  });
});
