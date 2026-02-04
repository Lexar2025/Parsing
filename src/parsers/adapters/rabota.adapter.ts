/**
 * Адаптер для преобразования вакансий с rabota.md в формат БД
 *
 * Ключевой нюанс: поля "График работы" и "Рабочее место" на rabota.md семантически
 * перепутаны относительно нашей схемы. Здесь переопределяем логику нормализации,
 * чтобы не трогать базовый адаптер и не ломать другие источники.
 *
 * Маппинг rabota.md → наша схема:
 *   "Рабочее место"  (office/remote/hybrid) → schedule
 *   "График работы"  (full/part/project)    → employment
 *   "Город" = "За границей"                → workLocationType; location берётся из "Главный офис"
 */
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class RabotaMdAdapter extends BaseVacancyAdapter {
  sourceName = 'rabota.md';

  // ---------------------------------------------------------------------------
  // Rabota-specific нормализация
  // ---------------------------------------------------------------------------

  /**
   * "Рабочее место" rabota.md → наш schedule (office / remote / hybrid)
   *
   * Возможные значения с сайта:
   *   "По месту нахождения работодателя"  → office
   *   "Гибридный режим (офис/дом)"        → hybrid
   *   "Удаленный"                          → remote
   *   "В полевых условиях"                 → office
   */
  private normalizeRabotaSchedule(value?: string): string | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase().trim();

    if (v.includes('удален')) return 'remote';
    if (v.includes('гибрид') || v.includes('офис/дом')) return 'hybrid';
    if (v.includes('месту нахождения') || v.includes('полевых')) return 'office';

    // Фоллбэк на базовый fuzzy-matcher
    return this.extractNormalizedSchedule(value);
  }

  /**
   * "График работы" rabota.md → наш employment (full / part / project)
   *
   * Возможные значения с сайта:
   *   "На постоянной основе"          → full
   *   "Посменно"                      → full
   *   "Неполная занятость"            → part
   *   "Расписание отсутствует"        → project
   *   "Гибкий"                        → project
   */
  private normalizeRabotaEmployment(value?: string): string | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase().trim();

    if (v.includes('постоянной основе') || v.includes('посменно')) return 'full';
    if (v.includes('неполная')) return 'part';
    if (v.includes('расписание отсутствует') || v.includes('гибкий')) return 'project';

    // Фоллбэк на базовый fuzzy-matcher
    return this.extractNormalizedEmployment(value);
  }

  /**
   * Резолвит location + workLocationType из полей парсера.
   *
   * Если "Город" = "За границей" — это не город, а тип локации.
   * В этом случае location берём из "Главный офис" (workPlace).
   */
  private resolveLocation(vacancy: ParsedVacancy): {
    location: string | null;
    workLocationType: string;
  } {
    const city = vacancy.location?.trim();

    if (city?.toLowerCase() === 'за границей') {
      return {
        workLocationType: 'За границей',
        location: vacancy.workPlace?.trim() || null,
      };
    }

    return {
      location: city || null,
      workLocationType: 'В Молдове',
    };
  }

  // ---------------------------------------------------------------------------
  // toPrisma
  // ---------------------------------------------------------------------------

  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    try {
      if (!vacancy.title || !vacancy.url || !vacancy.id) {
        throw new Error(`Отсутствуют обязательные поля для вакансии: ${vacancy.id}`);
      }

      // --- Дата публикации ---
      let publishedAt: Date;
      if (vacancy.publishedAt instanceof Date) {
        publishedAt = vacancy.publishedAt;
      } else if (typeof vacancy.publishedAt === 'string') {
        const parsed = new Date(vacancy.publishedAt);
        publishedAt = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else {
        publishedAt = new Date();
      }

      const company = vacancy.company?.trim() || 'Не указана';

      // --- Location / workLocationType ---
      const { location, workLocationType } = this.resolveLocation(vacancy);

      // --- Schedule / Employment (rabota-specific swap) ---
      // vacancy.employmentType содержит "Рабочее место" → наш schedule
      const schedule = this.normalizeRabotaSchedule(vacancy.employmentType);
      // vacancy.schedule содержит "График работы" → наш employment
      const employment = this.normalizeRabotaEmployment(vacancy.schedule);

      // --- Description & Skills ---
      const description = vacancy.description?.trim() || vacancy.fullDescription?.trim() || '';
      const skills = this.extractNormalizedSkills(description, vacancy.fullDescription);

      // --- Зарплата ---
      const currencyInfo = this.extractSourceAndTargetCurrency(vacancy.salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(vacancy.salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(vacancy.salary);

      // --- Определяем категорию ---
      const category = this.determineCategory(vacancy.title);

      return {
        title: vacancy.title.trim(),
        company,
        description,
        location,
        workLocationType,
        category, // Добавляем категорию

        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        salaryCurrency: currencyInfo?.source || 'MDL',

        experience: this.extractNormalizedExperience(vacancy.experience),
        employment,
        schedule,

        skills,

        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt,

        rawData: {
          education: vacancy.education?.trim() || null,
          fullDescription: vacancy.fullDescription?.trim() || null,
          mainOffice: vacancy.workPlace?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          originalSalary: vacancy.salary || null,
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source || null,
          conversionTargetCurrency: currencyInfo?.target || null,
          // Сырые значения rabota.md для диагностики
          rawGrafikRaboty: vacancy.schedule || null,
          rawRabocheeMesto: vacancy.employmentType || null,
          rawGorod: vacancy.location || null,
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error: unknown) {
      console.error(`❌ Ошибка в адаптере rabota.md для вакансии ${vacancy.id}:`, {
        error: error instanceof Error ? error.message : String(error),
        vacancy: { id: vacancy.id, title: vacancy.title, url: vacancy.url },
      });
      throw error;
    }
  }
}
