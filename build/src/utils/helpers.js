/**
 * Утилиты для работы с парсером
 */
/**
 * Пауза между запросами
 */
export function pause(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Очистка текста от лишних пробелов и переносов
 */
export function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
/**
 * Безопасное извлечение текста из элемента
 */
export function safeText(element) {
    if (!element)
        return '';
    const el = element;
    return cleanText(el.text?.() || el.textContent || '');
}
/**
 * Извлечение зарплаты из текста
 */
export function extractSalary(text) {
    const cleanedText = cleanText(text);
    if (!cleanedText || cleanedText === '' || cleanedText === '-') {
        return undefined;
    }
    return cleanedText;
}
/**
 * Логирование с временной меткой
 */
export function log(message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}
//# sourceMappingURL=helpers.js.map