// src/adapters/static-exchange-rate-provider.ts

import { ExchangeRateProvider } from './exchange-rate-provider.interface.js';

/**
 * Простая реализация ExchangeRateProvider с фиксированными курсами.
 * Курсы условные!
 */
export class StaticExchangeRateProvider implements ExchangeRateProvider {
  private readonly rates: Record<string, number> = {
    'MDL_RUB_PMR': 0.93, // 1 MDL = 0.93 RUB_PMR (условно)
    'USD_RUB_PMR': 16.30, // 1 USD = 16.30 RUB_PMR (условно)
    'EUR_RUB_PMR': 19.15, // 1 EUR = 19.15 RUB_PMR (условно)
    'RUB_RUB_PMR': 0.198, // 1 RUB_RU = 0.198 RUB_PMR (условно)
    'BYN_RUB_PMR': 145.0, // 1 BYN = ~145 RUB_PMR (условный курс)
    // Добавьте другие курсы по необходимости
  };

  getExchangeRate(fromCurrency: string, toCurrency: string): number | undefined {
    const key = `${fromCurrency}_${toCurrency}`;
    return this.rates[key];
  }

  getAllRates(): Record<string, number> {
    return { ...this.rates }; // Возврат копии для безопасности
  }
}
