import { Job } from 'bullmq';
import { log } from '../../utils/helpers.js';
import { updateAllDictionaries } from '../../utils/dictionaries/index.js';

/**
 * Процессор задачи обновления словарей специальностей
 * Запускается раз в день
 */
export async function dictionaryUpdateJobProcessor(job: Job): Promise<{ success: boolean; timestamp: Date }> {
  try {
    log(`🔄 Обновление словарей специальностей (задача ${job.id})...`);
    
    await updateAllDictionaries();
    
    log(`✅ Обновление словарей завершено (задача ${job.id})`);
    
    return { success: true, timestamp: new Date() };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Ошибка в задаче обновления словарей ${job.id}:`, errorMessage);
    
    throw error;
  }
}

/**
 * Добавить задачу обновления словарей с повторением
 */
import { Queue } from 'bullmq';

export async function addDictionaryUpdateJob(queue: Queue): Promise<void> {
  try {
    // Добавляем задачу с повторением раз в день
    await queue.add(
      'daily-dictionary-update',
      {},
      {
        repeat: {
          every: 24 * 60 * 60 * 1000, // 24 часа
        },
        jobId: 'daily-dictionary-update',
      }
    );
    
    log('📋 Задача ежедневного обновления словарей добавлена в очередь');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('❌ Ошибка при добавлении задачи обновления словарей:', errorMessage);
    throw error;
  }
}