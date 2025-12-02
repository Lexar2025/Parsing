/**
 * Утилиты для управления актуальностью вакансий
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Vacancy } from '../types/vacancy.js';

export interface VacancyManagerOptions {
  inactiveThresholdDays?: number; // После скольких дней считать неактивной
  autoCleanup?: boolean; // Автоматически удалять старые неактивные
}

export class VacancyManager {
  private options: Required<VacancyManagerOptions>;

  constructor(options?: VacancyManagerOptions) {
    this.options = {
      inactiveThresholdDays: options?.inactiveThresholdDays ?? 7, // По умолчанию 7 дней
      autoCleanup: options?.autoCleanup ?? false,
    };
  }

  /**
   * Загрузить существующие вакансии из файла
   */
  async loadExisting(filePath: string): Promise<Vacancy[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const vacancies = JSON.parse(data) as Vacancy[];
      
      // Преобразуем строки дат обратно в Date
      return vacancies.map(v => ({
        ...v,
        firstSeenAt: v.firstSeenAt ? new Date(v.firstSeenAt) : undefined,
        lastSeenAt: v.lastSeenAt ? new Date(v.lastSeenAt) : undefined,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : undefined,
      }));
    } catch (error) {
      // Файл не существует или пустой
      return [];
    }
  }

  /**
   * Объединить новые вакансии с существующими
   * Обновляет актуальность и помечает неактивные
   */
  mergeVacancies(existing: Vacancy[], newVacancies: Vacancy[]): Vacancy[] {
    const now = new Date();
    const newVacanciesMap = new Map(newVacancies.map(v => [v.id, v]));
    const result: Vacancy[] = [];

    // Обрабатываем существующие вакансии
    for (const vacancy of existing) {
      const newVacancy = newVacanciesMap.get(vacancy.id);

      if (newVacancy) {
        // Вакансия всё ещё есть на сайте - обновляем
        result.push({
          ...newVacancy,
          firstSeenAt: vacancy.firstSeenAt || now,
          lastSeenAt: now,
          isActive: true,
        });
        newVacanciesMap.delete(vacancy.id);
      } else {
        // Вакансии больше нет на сайте - помечаем неактивной
        result.push({
          ...vacancy,
          lastSeenAt: vacancy.lastSeenAt || now,
          isActive: false,
        });
      }
    }

    // Добавляем совершенно новые вакансии
    for (const newVacancy of newVacanciesMap.values()) {
      result.push({
        ...newVacancy,
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true,
      });
    }

    return result;
  }

  /**
   * Удалить неактивные вакансии старше N дней
   */
  cleanupInactive(vacancies: Vacancy[]): Vacancy[] {
    const now = new Date();

    return vacancies.filter(vacancy => {
      // Оставляем активные
      if (vacancy.isActive) return true;

      // Для неактивных проверяем дату
      const lastSeen = vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : new Date(0);
      const daysSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (24 * 60 * 60 * 1000);

      return daysSinceLastSeen < this.options.inactiveThresholdDays;
    });
  }

  /**
   * Сохранить вакансии в файл
   */
  async save(filePath: string, vacancies: Vacancy[]): Promise<void> {
    // Убедимся что папка существует
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true }).catch(() => {});

    // Применяем очистку если включено
    let toSave = vacancies;
    if (this.options.autoCleanup) {
      toSave = this.cleanupInactive(vacancies);
    }

    await fs.writeFile(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
  }

  /**
   * Получить статистику по вакансиям
   */
  getStats(vacancies: Vacancy[]): {
    total: number;
    active: number;
    inactive: number;
    new: number;
    bySource: Record<string, number>;
    oldInactive: number;
  } {
    const now = new Date();
    const thresholdMs = this.options.inactiveThresholdDays * 24 * 60 * 60 * 1000;
    
    const stats = {
      total: vacancies.length,
      active: 0,
      inactive: 0,
      new: 0,
      bySource: {} as Record<string, number>,
      oldInactive: 0,
    };

    for (const vacancy of vacancies) {
      // Активность
      if (vacancy.isActive) {
        stats.active++;
      } else {
        stats.inactive++;
        
        // Старые неактивные (будут удалены при autoCleanup)
        const lastSeen = vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : new Date(0);
        if (now.getTime() - lastSeen.getTime() > thresholdMs) {
          stats.oldInactive++;
        }
      }

      // Новые (меньше 24 часов)
      const firstSeen = vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : new Date(0);
      if (now.getTime() - firstSeen.getTime() < 24 * 60 * 60 * 1000) {
        stats.new++;
      }

      // По источникам
      stats.bySource[vacancy.source] = (stats.bySource[vacancy.source] || 0) + 1;
    }

    return stats;
  }

  /**
   * Проверить актуальность конкретной вакансии по URL
   */
  async checkVacancyStatus(url: string): Promise<boolean> {
    // Здесь можно добавить реальную проверку через HTTP запрос
    // Пока просто заглушка
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Форматировать дату для вывода
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return 'Неизвестно';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Сколько дней назад была дата
 */
export function daysAgo(date: Date | string | undefined): number {
  if (!date) return 0;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}
