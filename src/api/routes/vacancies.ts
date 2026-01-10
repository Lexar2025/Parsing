/**
 * API роут для работы с вакансиями
 * Использует VacancyManager для умного поиска
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { vacancyManager } from '../../shared/managers/vacancyManager.js';
import { vacancyService } from '../services/vacancy.service.js';

interface VacancyQuery {
  keywords?: string;
  locations?: string;
  salaryMin?: number;
  experience?: string;
  schedule?: string;
  source?: string;  // ОДИН источник (новое)
  sources?: string; // Несколько источников
  useSemanticSearch?: string; // Семантический поиск
  limit?: number;
  offset?: number;
}

export async function vacancyRoutes(fastify: FastifyInstance) {
  // GET /vacancies - Умный поиск через VacancyManager
  fastify.get<{ Querystring: VacancyQuery }>(
    '/vacancies',
    async (request: FastifyRequest<{ Querystring: VacancyQuery }>, reply: FastifyReply) => {
      try {
        const {
          keywords,
          locations,
          salaryMin,
          experience,
          schedule,
          source,  // ОДИН источник
          sources, // Несколько
          useSemanticSearch,
          limit = 200, // а как сделать максимум?
          offset = 0,
        } = request.query;

        // Определяем источники
        let sourcesArray: any = undefined;
        
        if (source) {
          // Если указан ОДИН источник
          sourcesArray = [source.trim()];
        } else if (sources) {
          // Если указано НЕСКОЛЬКО
          sourcesArray = sources.split(',').map((s) => s.trim());
        }
        // Если не указано ничего - возьмется по умолчанию все 3

        // Формируем фильтры
        const filters = {
          keywords: keywords ? keywords.split(',').map((k) => k.trim()) : undefined,
          locations: locations ? locations.split(',').map((l) => l.trim()) : undefined,
          salaryMin: salaryMin ? Number(salaryMin) : undefined,
          experience: experience ? experience.split(',').map((e) => e.trim()) : undefined,
          schedule: schedule ? schedule.split(',').map((s) => s.trim()) : undefined,
          sources: sourcesArray,
          useSemanticSearch: useSemanticSearch === 'true',
          limit: Number(limit),
          offset: Number(offset),
        };

        // Используем VacancyManager для умного поиска
        const result = await vacancyManager.search(filters);

        return reply.send({
          success: true,
          data: result.vacancies,
          meta: {
            total: result.meta.total,
            limit: filters.limit,
            offset: filters.offset,
            source: result.meta.source,
            lastUpdate: result.meta.lastUpdate,
            updating: result.meta.updating
          },
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch vacancies',
          message: error.message,
        });
      }
    }
  );

  // POST /vacancies/force-parse - Принудительный парсинг
  fastify.post<{ Body: { sources?: string[]; searchQuery?: string } }>(
    '/vacancies/force-parse',
    async (request: FastifyRequest<{ Body: { sources?: string[]; searchQuery?: string } }>, reply: FastifyReply) => {
      try {
        const { sources, searchQuery } = request.body || {};

        // Запускаем принудительный парсинг
        const result = await vacancyManager.forceParse(sources, searchQuery);

        return reply.send({
          success: true,
          message: 'Parsing completed',
          data: {
            sources: sources || ['rabota.md', '999.md', 'makler.md'],
            searchQuery: searchQuery || 'работа',
            vacanciesParsed: result.results.length
          }
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to parse',
          message: error.message,
        });
      }
    }
  );
  // GET /vacancies/:id - Получить конкретную вакансию
  fastify.get<{ Params: { id: string } }>(
    '/vacancies/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const vacancy = await vacancyService.getById(request.params.id);

        if (!vacancy) {
          return reply.status(404).send({
            success: false,
            error: 'Vacancy not found',
          });
        }

        return reply.send({
          success: true,
          data: vacancy,
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch vacancy',
          message: error.message,
        });
      }
    }
  );

  // GET /vacancies/stats - Статистика
  fastify.get('/vacancies/stats', async (request, reply) => {
    try {
      const stats = await vacancyManager.getStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch stats',
        message: error.message,
      });
    }
  });
}
