/**
 * Файл для тестирования GraphQL парсера 999.md
 */
import { NineNineNineMdGraphQLParser } from './parsers/nineNineNineMdGraphQL.js';
import * as fs from 'fs';
async function main() {
    console.log('🚀 Запуск GraphQL парсера 999.md\n');
    console.log('='.repeat(60));
    const parser = new NineNineNineMdGraphQLParser();
    // Конфигурация для тестирования
    const config = {
        baseUrl: 'https://999.md',
        searchQuery: 'Грузчик', // Можно изменить: Водитель, Курьер, Повар, и т.д.
        maxPages: 2, // для теста берем 2 страницы (156 вакансий)
        delay: 1000,
    };
    try {
        const startTime = Date.now();
        // Парсим вакансии
        const result = await parser.parse(config);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // Итоговая статистика
        console.log('\n' + '='.repeat(60));
        console.log('📊 РЕЗУЛЬТАТЫ ПАРСИНГА');
        console.log('='.repeat(60));
        console.log(`⏱️  Время выполнения: ${duration} сек`);
        console.log(`📋 Всего найдено вакансий: ${result.totalFound}`);
        console.log(`📄 Страниц обработано: ${config.maxPages}`);
        console.log('='.repeat(60));
        // Статистика
        if (result.vacancies.length > 0) {
            // По графику работы
            const scheduleStats = new Map();
            result.vacancies.forEach((v) => {
                const schedule = v.schedule || 'Не указан';
                scheduleStats.set(schedule, (scheduleStats.get(schedule) || 0) + 1);
            });
            console.log('\n📅 Распределение по графику работы:');
            Array.from(scheduleStats.entries())
                .sort((a, b) => b[1] - a[1])
                .forEach(([schedule, count]) => {
                console.log(`   ${schedule}: ${count}`);
            });
            // По опыту
            const experienceStats = new Map();
            result.vacancies.forEach((v) => {
                const exp = v.experience || 'Не указан';
                experienceStats.set(exp, (experienceStats.get(exp) || 0) + 1);
            });
            console.log('\n💼 Распределение по опыту:');
            Array.from(experienceStats.entries())
                .sort((a, b) => b[1] - a[1])
                .forEach(([exp, count]) => {
                console.log(`   ${exp}: ${count}`);
            });
            // По зарплатам
            const withSalary = result.vacancies.filter((v) => v.salary).length;
            console.log(`\n💰 С указанной зарплатой: ${withSalary} из ${result.totalFound}`);
        }
        // Сохраняем результаты в JSON
        const resultsJson = JSON.stringify(result.vacancies, null, 2);
        fs.writeFileSync('vacancies_999md_graphql.json', resultsJson, 'utf-8');
        console.log(`\n✅ Результаты сохранены в файл: vacancies_999md_graphql.json`);
        // Выводим первые 10 вакансий для примера
        console.log('\n' + '='.repeat(60));
        console.log('📋 ПЕРВЫЕ 10 ВАКАНСИЙ:');
        console.log('='.repeat(60) + '\n');
        result.vacancies.slice(0, 10).forEach((vacancy, index) => {
            console.log(`${index + 1}. ${vacancy.title}`);
            if (vacancy.salary)
                console.log(`   💰 Зарплата: ${vacancy.salary}`);
            if (vacancy.schedule)
                console.log(`   📅 График: ${vacancy.schedule}`);
            if (vacancy.experience)
                console.log(`   💼 Опыт: ${vacancy.experience}`);
            if (vacancy.education)
                console.log(`   🎓 Образование: ${vacancy.education}`);
            console.log(`   🔗 ${vacancy.url}`);
            console.log('');
        });
        console.log('='.repeat(60));
        console.log('✅ Парсинг завершен успешно!');
        console.log('='.repeat(60));
    }
    catch (error) {
        console.error('\n❌ Произошла ошибка:');
        if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
        }
        else {
            console.error(error);
        }
        process.exit(1);
    }
}
// Запуск
main();
//# sourceMappingURL=testGraphQL.js.map