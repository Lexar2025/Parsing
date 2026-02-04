// src/adapters/exchange-rate-provider.interface.ts

/**
 * Интерфейс для предоставления курсов обмена валют.
 */
export interface ExchangeRateProvider {
  /**
   * Возвращает курс для конвертации из `fromCurrency` в `toCurrency`.
   * @param fromCurrency Валюта, из которой конвертируем (например, 'MDL').
   * @param toCurrency Валюта, в которую конвертируем (например, 'RUB_PMR').
   * @returns Курс конвертации или undefined, если курс недоступен.
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): number | undefined;

  /**
   * Получает все известные курсы.
   * @returns Запись вида { 'FROM_TO': rate }.
   */
  getAllRates(): Record<string, number>;
}
