import { updateAllDictionaries, updateDictionary } from '../../utils/dictionaries/index.js';
import { log } from '../../utils/helpers.js';
import { professionDictionaryService } from '../../api/services/profession-dictionary.service.js';

/**
 * Задача для автоматического обновления словарей специальностей
 * Выполняется раз в день
 */
export async function runDictionaryUpdateTask(): Promise<void> {
  try {
    log('🔄 Запуск автоматического обновления словарей...');
    
    await updateAllDictionaries();
    
    log('✅ Обновление словарей завершено');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('❌ Ошибка при обновлении словарей:', errorMessage);
    throw error;
  }
}

/**
 * Проверка актуальности словарей при запуске сервиса
 */
export async function checkDictionaryFreshness(): Promise<void> {
  try {
    log('🔍 Проверка актуальности словарей...');
    
    // Получаем статистику из реального сервиса
    const stats = await professionDictionaryService.getStats();
    const now = Date.now();
    const THRESHOLD = 24 * 60 * 60 * 1000; // 24 часа
    
    for (const stat of stats) {
      if (!stat.lastUpdated || (now - stat.lastUpdated.getTime()) > THRESHOLD) {
        log(`⚠️  Словарь ${stat.source} устарел, запускаю обновление...`);
        await updateDictionary(stat.source as 'rabota.md' | '999.md' | 'makler.md');
      }
    }
    
    log('✅ Проверка актуальности словарей завершена');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('⚠️ Ошибка при проверке актуальности словарей:', errorMessage);
    // Не выбрасываем ошибку, чтобы не прерывать запуск
  }
}