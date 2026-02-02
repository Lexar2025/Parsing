/**
 * Экспорт всех адаптеров парсеров
 */

export { BaseVacancyAdapter, type VacancyAdapter } from './base.adapter.js';
export { RabotaMdAdapter } from './rabota.adapter.js';
export { NineNineNineMdAdapter } from './999.adapter.js';
export { MaklerMdAdapter } from './makler.adapter.js';
export { HHRuAdapter } from './hh.adapter.js';

// Фабрика адаптеров
import { RabotaMdAdapter } from './rabota.adapter.js';
import { NineNineNineMdAdapter } from './999.adapter.js';
import { MaklerMdAdapter } from './makler.adapter.js';
import { HHRuAdapter } from './hh.adapter.js';
import { VacancyAdapter } from './base.adapter.js';

type SourceName = 'rabota.md' | '999.md' | 'makler.md' | 'hh.ru';

const adapters: Record<SourceName, VacancyAdapter> = {
  'rabota.md': new RabotaMdAdapter(),
  '999.md': new NineNineNineMdAdapter(),
  'makler.md': new MaklerMdAdapter(),
  'hh.ru': new HHRuAdapter(),
};

/**
 * Получить адаптер для указанного источника
 */
export function getAdapter(source: SourceName): VacancyAdapter {
  const adapter = adapters[source];
  if (!adapter) {
    throw new Error(`Adapter for source "${source}" not found`);
  }
  return adapter;
}

/**
 * Получить все доступные адаптеры
 */
export function getAllAdapters(): VacancyAdapter[] {
  return Object.values(adapters);
}
