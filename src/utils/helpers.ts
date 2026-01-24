/**
 * Утилиты для работы с парсером
 */

/**
 * Пауза между запросами
 */
export function pause(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Очистка текста от лишних пробелов и переносов
 */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface ElementWithText {
  text?: () => string;
  textContent?: string;
}

/**
 * Безопасное извлечение текста из элемента
 */
export function safeText(element: unknown): string {
  if (!element) return '';
  
  const el = element as ElementWithText;
  return cleanText(el.text?.() || el.textContent || '');
}

/**
 * Извлечение зарплаты из текста
 */
export function extractSalary(text: string): string | undefined {
  const cleanedText = cleanText(text);
  if (!cleanedText || cleanedText === '' || cleanedText === '-') {
    return undefined;
  }
  return cleanedText;
}

/**
 * Логирование с временной меткой
 */
export function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}
