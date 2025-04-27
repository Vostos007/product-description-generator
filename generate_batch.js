/**
 * Batch Product Description Generator
 * 
 * Этот скрипт позволяет генерировать описания для списка товаров из файла
 * в пакетном режиме. ВНИМАНИЕ: для обработки одного товара используйте generate_for_product.js
 * 
 * Формат файла со списком товаров:
 * - В файле должны быть перечислены названия товаров, по одному на строку
 * - Пустые строки игнорируются
 * - Строки, начинающиеся с # считаются комментариями и игнорируются
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { generateProductDescription } = require('./generate_for_product');

/**
 * Запрашивает у пользователя подтверждение действия
 * 
 * @param {string} question - Вопрос для пользователя
 * @returns {Promise<boolean>} - Promise с результатом (true/false)
 */
async function askForConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Читает список товаров из файла
 * 
 * @param {string} filePath - Путь к файлу со списком товаров
 * @returns {Promise<string[]>} - Массив с названиями товаров
 */
async function readProductListFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Удаляем пустые строки и комментарии
  } catch (error) {
    console.error(chalk.red(`Ошибка при чтении файла ${filePath}:`), error);
    throw error;
  }
}

/**
 * Выполняет пакетную генерацию описаний товаров
 * 
 * @param {string} filePath - Путь к файлу со списком товаров
 * @param {Object} options - Опции генерации
 * @param {boolean} options.skipConfirmation - Пропустить запрос подтверждения
 * @returns {Promise<Object[]>} - Результаты генерации
 */
async function generateBatchDescriptions(filePath, options = {}) {
  try {
    // Проверяем существование файла
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Файл со списком товаров не найден: ${filePath}`);
    }
    
    // Читаем список товаров
    const productList = await readProductListFromFile(filePath);
    if (!productList.length) {
      throw new Error('Файл не содержит товаров для обработки');
    }
    
    console.log(chalk.blue(`🔍 Найдено ${productList.length} товаров для обработки`));
    
    // Если найден только один товар, предлагаем использовать generate_for_product.js
    if (productList.length === 1) {
      console.log(chalk.yellow(`⚠️ В файле указан только один товар: "${productList[0]}"`));
      console.log(chalk.yellow(`💡 Рекомендуется использовать: node generate_for_product.js "${productList[0]}"`));
      
      if (!options.skipConfirmation) {
        const proceed = await askForConfirmation(chalk.cyan('Продолжить с пакетной обработкой? (y/n): '));
        if (!proceed) {
          console.log(chalk.blue('Операция отменена. Используйте generate_for_product.js для обработки одного товара.'));
          process.exit(0);
        }
      }
    } else {
      // Запрашиваем подтверждение перед обработкой нескольких товаров
      if (!options.skipConfirmation) {
        console.log(chalk.yellow(`⚠️ ВНИМАНИЕ: Вы собираетесь обработать ${productList.length} товаров:`));
        productList.forEach((product, index) => {
          console.log(chalk.yellow(`  ${index + 1}. ${product}`));
        });
        
        console.log(chalk.cyan(`\n💡 Для обработки одного конкретного товара рекомендуется использовать:`));
        console.log(chalk.cyan(`   node generate_for_product.js "Название товара"`));
        
        const proceed = await askForConfirmation(chalk.magenta('\nВы уверены, что хотите обработать ВСЕ эти товары? (y/n): '));
        if (!proceed) {
          console.log(chalk.blue('Операция отменена.'));
          process.exit(0);
        }
      }
    }
    
    // Результаты генерации
    const results = [];
    const failures = [];
    
    // Обрабатываем каждый товар
    for (let i = 0; i < productList.length; i++) {
      const productName = productList[i];
      console.log(chalk.blue(`\n[${i + 1}/${productList.length}] Обработка товара: "${productName}"`));
      
      try {
        // Генерируем описание с заданными опциями и принудительной перезаписью (force: true)
        const result = await generateProductDescription(productName, {
          ...options,
          force: true // В пакетном режиме всегда перезаписываем файлы
        });
        
        results.push({
          productName,
          category: result.category,
          success: true,
          path: result.savedPath
        });
        
        console.log(chalk.green(`✅ Успешно обработан товар: "${productName}"`));
      } catch (error) {
        console.error(chalk.red(`❌ Ошибка при обработке товара "${productName}":`));
        console.error(error.message);
        
        failures.push({
          productName,
          error: error.message
        });
      }
    }
    
    // Выводим итоговую статистику
    console.log(chalk.blue(`\n📊 Статистика обработки:`));
    console.log(chalk.green(`✅ Успешно обработано: ${results.length} товаров`));
    
    if (failures.length) {
      console.log(chalk.red(`❌ Ошибки при обработке: ${failures.length} товаров`));
      failures.forEach(failure => {
        console.log(chalk.red(`   - "${failure.productName}": ${failure.error}`));
      });
    }
    
    // Сохраняем отчет о выполнении
    const reportData = {
      date: new Date().toISOString(),
      totalProducts: productList.length,
      successful: results.length,
      failed: failures.length,
      successfulItems: results,
      failedItems: failures
    };
    
    const reportPath = path.join(__dirname, 'data', 'output', `batch_report_${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
    console.log(chalk.blue(`📝 Отчет о выполнении сохранен в: ${reportPath}`));
    
    return {
      success: results,
      failures,
      reportPath
    };
  } catch (error) {
    console.error(chalk.red('❌ Критическая ошибка при пакетной обработке:'));
    console.error(error);
    throw error;
  }
}

// Выполняем скрипт, если он вызван напрямую
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  
  // Извлекаем параметры командной строки
  const forceFlag = args.includes('--force');
  const skipConfirmation = args.includes('--yes') || args.includes('-y');
  const language = args.find(arg => arg.startsWith('--lang='))?.split('=')[1] || process.env.DEFAULT_LANGUAGE || 'en';
  
  // Проверяем, не передали ли название товара напрямую вместо файла
  if (filePath && !filePath.startsWith('--') && !filePath.includes('/') && !filePath.includes('.')) {
    console.log(chalk.yellow(`⚠️ Похоже, вы пытаетесь обработать один товар: "${filePath}"`));
    console.log(chalk.cyan(`💡 Для этого рекомендуется использовать:`));
    console.log(chalk.cyan(`   node generate_for_product.js "${filePath}" ${forceFlag ? '--force' : ''}`));
    process.exit(1);
  }
  
  if (!filePath || filePath.startsWith('--')) {
    console.error(chalk.red('Необходимо указать путь к файлу со списком товаров!'));
    console.log(chalk.blue('Использование: node generate_batch.js path/to/products_list.txt [параметры]'));
    console.log(chalk.blue('Параметры:'));
    console.log(chalk.blue('  --force    Принудительная перезапись существующих файлов'));
    console.log(chalk.blue('  --yes,-y   Пропустить запрос подтверждения'));
    console.log(chalk.blue('  --lang=xx  Указать язык (en, ru)'));
    console.log(chalk.yellow('\nДля обработки одного товара используйте:'));
    console.log(chalk.yellow('  node generate_for_product.js "Название товара"'));
    process.exit(1);
  }
  
  generateBatchDescriptions(filePath, { 
    language, 
    force: forceFlag,
    skipConfirmation
  })
    .then(() => {
      console.log(chalk.green('🎉 Пакетная обработка завершена'));
    })
    .catch(error => {
      console.error(chalk.red('❌ Пакетная обработка завершилась с ошибкой.'));
      process.exit(1);
    });
}

module.exports = {
  generateBatchDescriptions,
  readProductListFromFile
}; 