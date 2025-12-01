/**
 * Утилита для управления вакансиями
 * Позволяет просматривать, очищать и управлять сохраненными вакансиями
 */

import { VacancyManager, formatDate, daysAgo } from './utils/vacancyManager.js';
import * as fs from 'fs';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const site = args[1] || '999_md';

  const filename = `vacancies_${site}.json`;

  if (!fs.existsSync(filename)) {
    console.log(`❌ Файл ${filename} не найден`);
    console.log('\nДоступные файлы:');
    const files = fs.readdirSync('.').filter((f) => f.startsWith('vacancies_') && f.endsWith('.json'));
    files.forEach((f) => console.log(`  - ${f}`));
    return;
  }

  const manager = new VacancyManager({
    inactiveThresholdDays: 3,
    autoCleanup: false,
  });

  const vacancies = await manager.loadExisting(filename);

  switch (command) {
    case 'stats':
    case 'статистика': {
      console.log('📊 СТАТИСТИКА ВАКАНСИЙ\n');
      const stats = manager.getStats(vacancies);

      console.log(`Всего в базе: ${stats.total}`);
      console.log(`✅ Активных: ${stats.active}`);
      console.log(`❌ Неактивных: ${stats.inactive}`);
      console.log(`🆕 Новых (за 24ч): ${stats.new}`);
      console.log(`🗑️  Старых неактивных (>3 дней): ${stats.oldInactive}\n`);

      console.log('По источникам:');
      Object.entries(stats.bySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });
      break;
    }

    case 'inactive':
    case 'неактивные': {
      const inactive = vacancies.filter((v) => !v.isActive);
      console.log(`❌ НЕАКТИВНЫЕ ВАКАНСИИ (${inactive.length})\n`);

      inactive.slice(0, 20).forEach((v, i) => {
        const days = daysAgo(v.lastSeenAt);
        console.log(`${i + 1}. ${v.title}`);
        console.log(`   Последний раз видели: ${days} дней назад`);
        console.log(`   ${v.url}\n`);
      });

      if (inactive.length > 20) {
        console.log(`... и еще ${inactive.length - 20} вакансий`);
      }
      break;
    }

    case 'cleanup':
    case 'очистить': {
      console.log('🗑️  ОЧИСТКА НЕАКТИВНЫХ ВАКАНСИЙ\n');
      
      const before = vacancies.length;
      const cleaned = manager.cleanupInactive(vacancies);
      const removed = before - cleaned.length;

      console.log(`Было вакансий: ${before}`);
      console.log(`Осталось: ${cleaned.length}`);
      console.log(`Удалено: ${removed}\n`);

      if (removed > 0) {
        await manager.save(filename, cleaned);
        console.log(`✅ Файл ${filename} обновлен`);
      } else {
        console.log('Нет вакансий для удаления');
      }
      break;
    }

    case 'new':
    case 'новые': {
      const newVacancies = vacancies.filter((v) => {
        const days = daysAgo(v.firstSeenAt);
        return days === 0 && v.isActive;
      });

      console.log(`🆕 НОВЫЕ ВАКАНСИИ (${newVacancies.length})\n`);

      newVacancies.slice(0, 10).forEach((v, i) => {
        console.log(`${i + 1}. ${v.title}`);
        if (v.company) console.log(`   🏢 ${v.company}`);
        if (v.salary) console.log(`   💰 ${v.salary}`);
        console.log(`   ${v.url}\n`);
      });

      if (newVacancies.length > 10) {
        console.log(`... и еще ${newVacancies.length - 10} новых вакансий`);
      }
      break;
    }

    case 'active':
    case 'активные': {
      const active = vacancies.filter((v) => v.isActive);
      console.log(`✅ АКТИВНЫЕ ВАКАНСИИ (${active.length})\n`);

      active.slice(0, 10).forEach((v, i) => {
        const days = daysAgo(v.firstSeenAt);
        console.log(`${i + 1}. ${v.title}`);
        if (v.company) console.log(`   🏢 ${v.company}`);
        if (v.salary) console.log(`   💰 ${v.salary}`);
        console.log(`   📅 ${days} дн. в базе`);
        console.log(`   ${v.url}\n`);
      });

      if (active.length > 10) {
        console.log(`... и еще ${active.length - 10} активных вакансий`);
      }
      break;
    }

    case 'help':
    case 'помощь':
    default: {
      console.log('📋 УПРАВЛЕНИЕ ВАКАНСИЯМИ\n');
      console.log('Использование:');
      console.log('  npm run manage <команда> [сайт]\n');
      console.log('Команды:');
      console.log('  stats      - Статистика по вакансиям');
      console.log('  active     - Показать активные вакансии');
      console.log('  new        - Показать новые вакансии (за 24ч)');
      console.log('  inactive   - Показать неактивные вакансии');
      console.log('  cleanup    - Удалить старые неактивные вакансии\n');
      console.log('Сайты (по умолчанию 999_md):');
      console.log('  999_md     - Вакансии с 999.md');
      console.log('  rabota_md  - Вакансии с rabota.md\n');
      console.log('Примеры:');
      console.log('  npm run manage stats 999_md');
      console.log('  npm run manage new');
      console.log('  npm run manage cleanup 999_md');
      break;
    }
  }
}

main().catch(console.error);
