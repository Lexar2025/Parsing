/**
 * TypeScript типы для Prisma моделей
 * Используются для строгой типизации в менеджерах и сервисах
 */

import { Prisma } from '@prisma/client';

// ============ SUBSCRIPTION TYPES ============
export type SubscriptionWithUser = Prisma.SubscriptionGetPayload<{
  include: {
    user: {
      select: {
        telegramId: true;
        firstName: true;
      };
    };
  };
}>;

export type SubscriptionWithFullUser = Prisma.SubscriptionGetPayload<{
  include: {
    user: true;
  };
}>;

// ============ USER TYPES ============
export type UserWithSettings = Prisma.UserGetPayload<{
  include: {
    settings: true;
  };
}>;

export type UserWithSubscriptions = Prisma.UserGetPayload<{
  include: {
    subscriptions: true;
  };
}>;

// ============ VACANCY TYPES ============
export type VacancyRawData = Record<string, unknown>;
