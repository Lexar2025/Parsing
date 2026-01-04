/**
 * API роут для работы с вакансиями
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { vacancyService } from '../services/vacancy.service.js';

interface VacancyQuery {
  keywords?: string;
  locations?: string;
  salaryMin?: number;
  experience?: string;
  schedule?: string;
  sources?: string;
  limit?: number;
  offset?: number;
}

export async function vacancyRoutes(fastify: FastifyInstance) {
  // GET /vacancies - Получить список вакансий
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
          sources,
          limit = 50,
          offset = 0,
        } = request.query;

        const filters = {
          keywords: keywords ? keywords.split(',').map((k) => k.trim()) : undefined,
          locations: locations ? locations.split(',').map((l) => l.trim()) : undefined,
          salaryMin: salaryMin ? Number(salaryMin) : undefined,
          experience: experience ? experience.split(',').map((e) => e.trim()) : undefined,
          schedule: schedule ? schedule.split(',').map((s) => s.trim()) : undefined,
          sources: sources ? sources.split(',').map((s) => s.trim()) : undefined,
          limit: Number(limit),
          offset: Number(offset),
        };

        const vacancies = await vacancyService.findByFilters(filters);

        return reply.send({
          success: true,
          data: vacancies,
          meta: {
            total: vacancies.length,
            limit: filters.limit,
            offset: filters.offset,
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
      const stats = await vacancyService.getStats();

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
