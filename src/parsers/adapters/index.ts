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
import CANONICAL_PROFESSIONS from '../../utils/dictionaries/canonical-professions.js';

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

/**
 * Определить категорию вакансии на основе названия
 * Использует канонический справочник для сопоставления
 */
export function determineCategory(title: string, source: string): string | null {
  const titleLower = title.toLowerCase().trim();

  // Ищем в каноническом справочнике
  for (const prof of CANONICAL_PROFESSIONS) {
    // Проверяем каноническое название
    if (titleLower === prof.canonicalName.toLowerCase()) {
      return prof.canonicalName;
    }

    // Проверяем синонимы
    if (prof.synonyms.some(syn => syn.toLowerCase() === titleLower)) {
      return prof.canonicalName;
    }

    // Проверяем маппинг для конкретного источника
    const sourceMapping = prof.sourceMappings[source as keyof typeof prof.sourceMappings];
    if (sourceMapping) {
      if (sourceMapping.some(mapping => mapping.toLowerCase() === titleLower)) {
        return prof.canonicalName;
      }
    }

    // Частичное совпадение (подстрока)
    if (titleLower.includes(prof.canonicalName.toLowerCase())) {
      return prof.canonicalName;
    }
  }

  // Если не нашли категорию - возвращаем null
  return null;
}
