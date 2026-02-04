/**
 * Сервис для работы со словариками специальностей
 * Поддержка семантического поиска и маппинга между сайтами
 */

import { prisma } from '../../db/index.js';
import CANONICAL_PROFESSIONS from '../../utils/dictionaries/canonical-professions.js';
import type { CanonicalProfession } from '../../utils/dictionaries/canonical-professions.js';

export interface ProfessionMapping {
  searchQuery: string;
  mappings: {
    source: string;
    profession: string;
    professionId?: string;
    similarity: number; // 0-1, насколько похоже
  }[];
}

export class ProfessionDictionaryService {
  /**
   * Сохранить словарик для источника
   * С автоматическим заполнением синонимов
   */
  async saveProfessions(
    source: string,
    professions: Array<{
      profession: string;
      professionId?: string;
      category?: string;
      synonyms?: string[];
      vacancyCount?: number;
      lastCheckedAt?: Date;
    }>
  ): Promise<{ successful: number; failed: number }> {
    console.log(`💾 Сохраняю ${professions.length} специальностей для ${source}`);

    const results = await Promise.allSettled(
      professions.map(async (prof) => {
        // Автоматически генерируем синонимы если не указаны
        const synonyms = prof.synonyms || this.generateSynonyms(prof.profession);
        
        return prisma.professionDictionary.upsert({
          where: {
            source_profession: {
              source,
              profession: prof.profession
            }
          },
          create: {
            source,
            profession: prof.profession,
            professionId: prof.professionId,
            category: prof.category,
            synonyms,
            vacancyCount: prof.vacancyCount,
            lastCheckedAt: prof.lastCheckedAt
          },
          update: {
            professionId: prof.professionId,
            category: prof.category,
            synonyms,
            vacancyCount: prof.vacancyCount,
            lastCheckedAt: prof.lastCheckedAt
          }
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Сохранено: ${successful}, ошибок: ${failed}`);

    return { successful, failed };
  }

  /**
   * Автоматическая генерация синонимов
   * На основе слов в названии
   */
  private generateSynonyms(profession: string): string[] {
    const synonyms: string[] = [];
    const profLower = profession.toLowerCase();

    // Словарь синонимов
    const synonymMap: Record<string, string[]> = {
      'программист': ['разработчик', 'developer', 'кодер'],
      'разработчик': ['программист', 'developer'],
      'developer': ['программист', 'разработчик'],
      'it': ['ит', 'информационные технологии'],
      'менеджер': ['manager', 'управляющий'],
      'водитель': ['driver', 'шофер'],
      'бухгалтер': ['счетовод', 'accountant'],
      'дизайнер': ['designer'],
      'маркетолог': ['marketer', 'специалист по маркетингу'],
      'продавец': ['продажник', 'sales'],
    };

    // Ищем совпадения в словаре
    for (const [key, syns] of Object.entries(synonymMap)) {
      if (profLower.includes(key)) {
        synonyms.push(...syns);
      }
    }

    // Убираем дубликаты
    return [...new Set(synonyms)];
  }

  /**
   * Получить все специальности для источника
   */
  async getProfessionsBySource(source: string): Promise<Array<{
    id: string;
    source: string;
    profession: string;
    professionId: string | null;
    category: string | null;
    synonyms: string[];
    vacancyCount: number | null;
    lastCheckedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    return prisma.professionDictionary.findMany({
      where: { source },
      orderBy: { profession: 'asc' }
    });
  }

  /**
   * Получить все специальности (для всех источников)
   */
  async getAllProfessions(): Promise<Record<string, Array<{
    id: string;
    source: string;
    profession: string;
    professionId: string | null;
    category: string | null;
    synonyms: string[];
    vacancyCount: number | null;
    lastCheckedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>>> {
    const professions = await prisma.professionDictionary.findMany({
      orderBy: [{ source: 'asc' }, { profession: 'asc' }]
    });

    // Группируем по источникам
    const grouped: Record<string, Array<{
      id: string;
      source: string;
      profession: string;
      professionId: string | null;
      category: string | null;
      synonyms: string[];
      vacancyCount: number | null;
      lastCheckedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>> = {};
    professions.forEach(prof => {
      if (!grouped[prof.source]) {
        grouped[prof.source] = [];
      }
      grouped[prof.source].push(prof);
    });

    return grouped;
  }

  /**
   * Семантический поиск - находит подходящие специальности для каждого источника
   * 
   * Логика:
   * 1. Ищем точные совпадения в канонических названиях и синонимах (через канонический справочник)
   * 2. Ищем совпадения в словариках источников (через синонимы)
   * 3. Ищем частичные совпадения (подстрока)
   * 4. Возвращаем каноническое название для каждой найденной профессии (если есть)
   */
  async findProfessionMappings(searchQuery: string, sources?: string[]): Promise<ProfessionMapping> {
    const targetSources = sources || ['rabota.md', '999.md', 'makler.md'];
    const searchLower = searchQuery.toLowerCase().trim();

    console.log(`🔍 Семантический поиск специальностей для "${searchQuery}"`);

    // 1. Ищем в каноническом справочнике сначала (приоритет)
    const canonicalMatch = this.findCanonicalProfession(searchQuery);
    
    if (canonicalMatch) {
      console.log(`   ✅ Найдено каноническое название: "${canonicalMatch.canonicalName}"`);
      console.log(`   📂 Категория: ${canonicalMatch.category || 'не указана'}`);
    }

    const mappings = await Promise.all(
      targetSources.map(async (source) => {
        // Получаем все специальности для источника из БД (уже с синонимами)
        const professions = await this.getProfessionsBySource(source);

        // Ищем совпадения (сначала точные, потом синонимы, потом подстрока)
        const matches = professions
          .map(prof => {
            const profLower = prof.profession.toLowerCase();
            
            // 1. Точное совпадение (приоритет)
            if (profLower === searchLower) {
              return { ...prof, similarity: 1.0 };
            }

            // 2. Совпадение в синонимах из БД (приоритет)
            const synonymMatch = prof.synonyms.find(
              syn => syn.toLowerCase() === searchLower
            );
            if (synonymMatch) {
              return { ...prof, similarity: 0.95 };
            }

            // 3. Если есть каноническое совпадение - ищем маппинг для этого источника (приоритет)
            if (canonicalMatch) {
              const sourceMapping = canonicalMatch.sourceMappings[source as keyof typeof canonicalMatch.sourceMappings];
              if (sourceMapping && sourceMapping.includes(prof.profession)) {
                return { ...prof, similarity: 0.9 };
              }
            }

            // 4. Частичное совпадение (подстрока)
            if (profLower.includes(searchLower) || searchLower.includes(profLower)) {
              return { ...prof, similarity: 0.7 };
            }

            // 5. Совпадение первых слов (низкий приоритет)
            const searchWords = searchLower.split(/\s+/);
            const profWords = profLower.split(/\s+/);
            
            const commonWords = searchWords.filter(w => profWords.includes(w));
            if (commonWords.length > 0) {
              const similarity = commonWords.length / Math.max(searchWords.length, profWords.length);
              if (similarity > 0.5) {
                return { ...prof, similarity };
              }
            }

            return null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null)
          .sort((a, b) => b.similarity - a.similarity) // Сортируем по релевантности (убывание)
          .slice(0, 4); // Берем топ-4 самых релевантных совпадений на источник (не больше)
        // Логируем результаты (для отладки)
        if (matches.length > 0) {
          console.log(`   ${source}: найдено ${matches.length} совпадений (лучшая: "${matches[0].profession}", similarity: ${matches[0].similarity})`);
        } else {
          console.log(`   ${source}: совпадений не найдено`);
        }

        return {
          source,
          matches: matches.map(m => ({
            profession: m.profession,
            professionId: m.professionId || undefined,
            similarity: m.similarity
          }))
        };
      })
    );

    return {
      searchQuery,
      mappings: mappings
        .filter(m => m.matches.length > 0)
        .flatMap(m => m.matches.map(match => ({
          source: m.source,
          profession: match.profession,
          professionId: match.professionId,
          similarity: match.similarity
        })))
    };
  }

  /**
   * Найти каноническое название профессии по запросу (через канонический справочник)
   * 
   * Логика:
   * 1. Ищем точное совпадение в каноническом названии (приоритет)
   * 2. Ищем точное совпадение в синонимах канонического справочника (приоритет)
   * 3. Ищем частичное совпадение в каноническом названии (низкий приоритет)
   * 4. Ищем частичное совпадение в синонимах канонического справочника (низкий приоритет)
   * 
   * Возвращает первое совпадение с самым высоким приоритетом.
   */
  private findCanonicalProfession(searchQuery: string): CanonicalProfession | null {
    const searchLower = searchQuery.toLowerCase().trim();

    // 1. Точное совпадение в каноническом названии (высший приоритет)
    const exactMatch = CANONICAL_PROFESSIONS.find(
      prof => prof.canonicalName.toLowerCase() === searchLower
    );
    if (exactMatch) return exactMatch;

    // 2. Точное совпадение в синонимах канонического справочника (высший приоритет)
    const synonymMatch = CANONICAL_PROFESSIONS.find(
      prof => prof.synonyms.some(syn => syn.toLowerCase() === searchLower)
    );
    if (synonymMatch) return synonymMatch;

    // 3. Частичное совпадение в каноническом названии (низкий приоритет)
    const partialMatch = CANONICAL_PROFESSIONS.find(
      prof => prof.canonicalName.toLowerCase().includes(searchLower)
    );
    if (partialMatch) return partialMatch;

    // 4. Частичное совпадение в синонимах канонического справочника (низкий приоритет)
    const partialSynonymMatch = CANONICAL_PROFESSIONS.find(
      prof => prof.synonyms.some(syn => syn.toLowerCase().includes(searchLower))
    );
    if (partialSynonymMatch) return partialSynonymMatch;

    // 5. Не найдено ни одного совпадения (возвращаем null)
    return null;
  }

  /**
   * Получить статистику по словарикам
   */
  async getStats(): Promise<Array<{
    source: string;
    count: number;
    lastUpdated: Date | null;
  }>> {
    const sources = ['rabota.md', '999.md', 'makler.md'];
    
    const stats = await Promise.all(
      sources.map(async (source) => {
        const count = await prisma.professionDictionary.count({
          where: { source }
        });

        const lastUpdated = await prisma.professionDictionary.findFirst({
          where: { source },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        });

        return {
          source,
          count,
          lastUpdated: lastUpdated?.updatedAt || null
        };
      })
    );

    return stats;
  }

  /**
   * Очистить словарик для источника
   */
  async clearProfessions(source: string): Promise<number> {
    const result = await prisma.professionDictionary.deleteMany({
      where: { source }
    });

    console.log(`🗑️  Удалено ${result.count} специальностей для ${source}`);
    return result.count;
  }
}

export const professionDictionaryService = new ProfessionDictionaryService();
