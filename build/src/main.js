/**
 * Главный файл для тестирования парсера
 */
import { RabotaMdParser } from './parsers/rabotaMd.js';
async function main() {
    console.log('🚀 Запуск парсера rabota.md\n');
    console.log('='.repeat(60));
    const parser = new RabotaMdParser();
    // Конфигурация для тестирования
    const config = {
        baseUrl: 'https://www.rabota.md',
        searchQuery: 'программист', // измените на нужную профессию
        maxPages: 10, // максимум страниц для парсинга
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
        // Статистика по локациям
        const locationStats = new Map();
        result.vacancies.forEach((v) => {
            const loc = v.location || 'Не указана';
            locationStats.set(loc, (locationStats.get(loc) || 0) + 1);
        });
        console.log('\n📍 Распределение по локациям:');
        Array.from(locationStats.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([location, count]) => {
            console.log(`   ${location}: ${count}`);
        });
        // Статистика по зарплатам
        const withSalary = result.vacancies.filter((v) => v.salary).length;
        console.log(`\n💰 Вакансий с указанной зарплатой: ${withSalary} из ${result.totalFound}`);
        // Сохраняем результаты в JSON
        const fs = await import('fs');
        const resultsJson = JSON.stringify(result.vacancies, null, 2);
        fs.writeFileSync('vacancies.json', resultsJson, 'utf-8');
        console.log(`\n✅ Результаты сохранены в файл: vacancies.json`);
        // Выводим первые 10 вакансий для примера
        console.log('\n' + '='.repeat(60));
        console.log('📋 ПЕРВЫЕ 10 ВАКАНСИЙ:');
        console.log('='.repeat(60) + '\n');
        result.vacancies.slice(0, 10).forEach((vacancy, index) => {
            console.log(`${index + 1}. ${vacancy.title}`);
            if (vacancy.company)
                console.log(`   🏢 ${vacancy.company}`);
            if (vacancy.location)
                console.log(`   📍 ${vacancy.location}`);
            if (vacancy.salary)
                console.log(`   💰 ${vacancy.salary}`);
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
//# sourceMappingURL=main.js.map