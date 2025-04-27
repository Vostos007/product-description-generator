/**
 * Simplified Product Description Generator
 * 
 * Этот скрипт предоставляет упрощенный интерфейс для генерации описаний товаров.
 * Он использует модуль generate_single_description.js в неинтерактивном режиме.
 * 
 * Использование:
 * - Импортировать функцию generateProductDescription
 * - Вызвать ее с названием товара и опциями
 */

const { simplifiedMain } = require('./generate_single_description');
const chalk = require('chalk');

/**
 * Генерирует описание для товара
 * 
 * @param {string} productName - Название товара
 * @param {Object} options - Дополнительные опции
 * @param {string} options.language - Язык описания (en, ru)
 * @param {string} options.templatePath - Путь к файлу шаблона (опционально)
 * @param {boolean} options.force - Принудительная перезапись существующего файла
 * @param {boolean} options.uploadToWoo - Отправить результат в WooCommerce
 * @param {string} options.wooProductId - ID товара в WooCommerce
 * @returns {Promise<Object>} - Результат генерации (category, description, savedPath)
 */
async function generateProductDescription(productName, options = {}) {
  // Проверка наличия названия товара
  if (!productName || typeof productName !== 'string' || productName.trim() === '') {
    throw new Error('Необходимо указать название товара');
  }
  
  // Проверка и форматирование опций
  const validOptions = {
    language: options.language || process.env.DEFAULT_LANGUAGE || 'en',
    templatePath: options.templatePath || '',
    force: options.force || false,
    uploadToWoo: options.outputToWoo || options.uploadToWoo || false,
    wooProductId: options.wooProdId || options.wooProductId || ''
  };
  
  try {
    console.log(chalk.blue(`🚀 Запуск генерации описания только для "${productName}"`));
    const result = await simplifiedMain(productName, validOptions);
    console.log(chalk.green(`✅ Описание сгенерировано успешно: ${result.savedPath}`));
    return result;
  } catch (error) {
    console.error(chalk.red('❌ Ошибка при генерации описания:'));
    console.error(error);
    throw error;
  }
}

// Пример использования, если скрипт запущен напрямую
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Извлекаем название товара (первый аргумент без "--")
  const productName = args.find(arg => !arg.startsWith('--'));
  
  // Проверяем флаги
  const forceFlag = args.includes('--force');
  const wooFlag = args.includes('--woo');
  
  // Проверяем наличие WooCommerce ID
  let wooProductId = '';
  const wooIdIndex = args.findIndex(arg => arg === '--woo');
  if (wooIdIndex !== -1 && wooIdIndex < args.length - 1 && !args[wooIdIndex + 1].startsWith('--')) {
    wooProductId = args[wooIdIndex + 1];
  }
  
  if (!productName) {
    console.error(chalk.red('ОШИБКА: Необходимо указать название товара!'));
    console.log(chalk.yellow('Использование: node generate_for_product.js "Название товара" [--force] [--woo [ID]]'));
    console.log(chalk.yellow('Примеры:'));
    console.log(chalk.yellow('  node generate_for_product.js "Drops Air" --force'));
    console.log(chalk.yellow('  node generate_for_product.js "Drops Air" --woo'));
    console.log(chalk.yellow('  node generate_for_product.js "Drops Air" --woo 1234'));
    process.exit(1);
  }
  
  console.log(chalk.cyan('⚠️ ВАЖНО: Генерация только для одного товара: "' + productName + '"'));
  
  // Отладочное логирование
  console.log(chalk.blue('Запуск с параметрами:'));
  console.log(chalk.blue(`- force: ${forceFlag}`));
  console.log(chalk.blue(`- uploadToWoo: ${wooFlag}`));
  console.log(chalk.blue(`- wooProductId: ${wooProductId || 'автопоиск по названию'}`));
  
  generateProductDescription(productName, { 
    force: forceFlag,
    uploadToWoo: wooFlag,
    wooProductId: wooProductId
  })
    .then(result => {
      console.log(chalk.green('🎉 Генерация для товара "' + productName + '" успешно завершена!'));
    })
    .catch(error => {
      console.error(chalk.red('❌ Скрипт завершился с ошибкой.'));
      process.exit(1);
    });
}

module.exports = {
  generateProductDescription
}; 