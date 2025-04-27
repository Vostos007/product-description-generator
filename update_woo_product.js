/**
 * WooCommerce Product Description Updater
 * 
 * Этот скрипт позволяет загрузить уже сгенерированное HTML-описание в WooCommerce.
 * 
 * Использование:
 * node update_woo_product.js "Название товара" --id 12345
 * 
 * Где:
 * - "Название товара" - точное название товара, для которого было сгенерировано описание
 * - --id 12345 - ID товара в WooCommerce
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');

// API Settings
const WC_API_URL = process.env.WOOCOMMERCE_URL;
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_SECRET;
const WC_API_CONFIGURED = WC_API_URL && WC_CONSUMER_KEY && WC_CONSUMER_SECRET;

/**
 * Загружает сгенерированное HTML-описание из файла
 * @param {string} productName - Название товара
 * @returns {string|null} - HTML-описание или null в случае ошибки
 */
function loadGeneratedDescription(productName) {
  try {
    // Формируем путь к файлу с описанием
    const outputDir = path.join(__dirname, 'data', 'output');
    const fileName = `${productName.replace(/\s+/g, '_')}_description.html`;
    const filePath = path.join(outputDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Файл с описанием не найден: ${filePath}`));
      return null;
    }
    
    // Загружаем содержимое файла
    const html = fs.readFileSync(filePath, 'utf8');
    console.log(chalk.green(`Описание загружено из файла: ${filePath}`));
    
    return html;
  } catch (error) {
    console.error(chalk.red('Ошибка при загрузке описания:'), error);
    return null;
  }
}

/**
 * Обновляет описание товара в WooCommerce
 * @param {string} productId - ID товара в WooCommerce
 * @param {string} description - HTML-описание товара
 * @returns {Promise<boolean>} - true, если описание успешно обновлено
 */
async function updateWooCommerceProduct(productId, description) {
  try {
    console.log(chalk.blue(`Обновляем описание товара с ID ${productId} в WooCommerce...`));
    
    if (!WC_API_CONFIGURED) {
      console.error(chalk.red('WooCommerce API не настроен. Проверьте файл .env'));
      console.error(chalk.yellow('Требуемые параметры: WOOCOMMERCE_URL, WOOCOMMERCE_KEY, WOOCOMMERCE_SECRET'));
      return false;
    }
    
    // Проверяем, что ID имеет правильный формат
    const numericId = parseInt(productId);
    if (isNaN(numericId)) {
      console.error(chalk.red(`Неверный ID товара: ${productId}. Должно быть число.`));
      return false;
    }
    
    // Формируем URL запроса
    const apiUrl = `${WC_API_URL}/wp-json/wc/v3/products/${numericId}`;
    
    // Выполняем запрос к API WooCommerce
    const response = await axios.put(apiUrl, 
      { 
        description: description
      },
      {
        auth: {
          username: WC_CONSUMER_KEY,
          password: WC_CONSUMER_SECRET
        }
      }
    );
    
    // Проверяем успешность запроса
    if (response && response.data && response.data.id) {
      console.log(chalk.green(`✓ Описание товара с ID ${productId} успешно обновлено в WooCommerce`));
      console.log(chalk.blue(`Ссылка на товар: ${response.data.permalink}`));
      return true;
    } else {
      console.error(chalk.red('Ошибка при обновлении товара. Неверный ответ от API.'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('Ошибка при обновлении товара в WooCommerce:'));
    
    if (error.response) {
      // Если есть ответ от сервера с ошибкой
      console.error(chalk.red(`Статус ошибки: ${error.response.status}`));
      console.error(chalk.red('Детали ошибки:'), error.response.data);
    } else if (error.request) {
      // Если запрос был сделан, но ответ не получен
      console.error(chalk.red('Нет ответа от сервера. Проверьте подключение к интернету или доступность API.'));
    } else {
      // Непредвиденная ошибка
      console.error(chalk.red('Ошибка:'), error.message);
    }
    
    return false;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Извлекаем название товара (первый аргумент без "--")
    const productName = args.find(arg => !arg.startsWith('--'));
    
    // Извлекаем ID товара в WooCommerce (аргумент после "--id")
    const idArgIndex = args.findIndex(arg => arg === '--id');
    const productId = idArgIndex >= 0 && idArgIndex < args.length - 1 ? args[idArgIndex + 1] : null;
    
    if (!productName) {
      console.error(chalk.red('ОШИБКА: Необходимо указать название товара!'));
      console.log(chalk.yellow('Использование: node update_woo_product.js "Название товара" --id 12345'));
      process.exit(1);
    }
    
    if (!productId) {
      console.error(chalk.red('ОШИБКА: Необходимо указать ID товара в WooCommerce с помощью --id!'));
      console.log(chalk.yellow('Использование: node update_woo_product.js "Название товара" --id 12345'));
      process.exit(1);
    }
    
    // Загружаем описание из файла
    const description = loadGeneratedDescription(productName);
    if (!description) {
      console.error(chalk.red(`Не удалось загрузить описание для товара "${productName}". Завершение программы.`));
      process.exit(1);
    }
    
    // Обновляем товар в WooCommerce
    const updated = await updateWooCommerceProduct(productId, description);
    if (updated) {
      console.log(chalk.green(`✅ Описание товара "${productName}" (ID: ${productId}) успешно обновлено в WooCommerce!`));
    } else {
      console.error(chalk.red(`❌ Не удалось обновить описание товара "${productName}" (ID: ${productId}) в WooCommerce.`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('Произошла ошибка в процессе выполнения программы:'));
    console.error(error);
    process.exit(1);
  }
}

// Запускаем основную функцию, если скрипт запущен напрямую
if (require.main === module) {
  main();
}

module.exports = {
  loadGeneratedDescription,
  updateWooCommerceProduct
}; 