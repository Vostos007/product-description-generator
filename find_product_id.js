/**
 * WooCommerce Product ID Finder
 * 
 * Этот скрипт помогает найти ID товара в WooCommerce по его названию.
 * Требует настроенный файл .env с параметрами WooCommerce API.
 * 
 * Использование:
 * node find_product_id.js "Название товара"
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

// API Settings
const WC_API_URL = process.env.WOOCOMMERCE_URL;
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_SECRET;
const WC_API_CONFIGURED = WC_API_URL && WC_CONSUMER_KEY && WC_CONSUMER_SECRET;

/**
 * Ищет товар в WooCommerce по названию
 * @param {string} productName - Название товара для поиска
 * @returns {Promise<Object|null>} - Найденный товар или null
 */
async function findProductByName(productName) {
  try {
    console.log(chalk.blue(`Поиск товара "${productName}" в WooCommerce...`));
    
    if (!WC_API_CONFIGURED) {
      console.error(chalk.red('WooCommerce API не настроен. Проверьте файл .env'));
      console.error(chalk.yellow('Требуемые параметры: WOOCOMMERCE_URL, WOOCOMMERCE_KEY, WOOCOMMERCE_SECRET'));
      return null;
    }
    
    // Выполняем поиск товара
    const response = await axios.get(`${WC_API_URL}/wp-json/wc/v3/products`, {
      auth: {
        username: WC_CONSUMER_KEY,
        password: WC_CONSUMER_SECRET
      },
      params: {
        search: productName,
        per_page: 10
      }
    });
    
    if (response.data && response.data.length > 0) {
      // Ищем точное совпадение
      const exactMatch = response.data.find(product => 
        product.name.toLowerCase() === productName.toLowerCase() ||
        product.slug.includes(productName.toLowerCase().replace(/\s+/g, '-'))
      );
      
      if (exactMatch) {
        console.log(chalk.green(`✓ Найден товар: ID=${exactMatch.id}, Название="${exactMatch.name}"`));
        return exactMatch;
      }
      
      // Если точного совпадения нет, выводим все результаты поиска
      console.log(chalk.yellow(`Точное совпадение не найдено. Возможные варианты (${response.data.length}):`));
      
      response.data.forEach((product, index) => {
        console.log(chalk.cyan(`${index + 1}. ID=${product.id}, Название="${product.name}"`));
      });
      
      return response.data[0]; // Возвращаем первый результат
    }
    
    console.log(chalk.yellow(`Товар "${productName}" не найден в WooCommerce.`));
    return null;
  } catch (error) {
    console.error(chalk.red('Ошибка при поиске товара:'));
    
    if (error.response) {
      console.error(chalk.red(`Статус ошибки: ${error.response.status}`));
      console.error(chalk.red('Детали ошибки:'), error.response.data);
    } else if (error.request) {
      console.error(chalk.red('Нет ответа от сервера. Проверьте подключение к интернету или доступность API.'));
    } else {
      console.error(chalk.red('Ошибка:'), error.message);
    }
    
    return null;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const productName = args[0];
    
    if (!productName) {
      console.error(chalk.red('ОШИБКА: Необходимо указать название товара!'));
      console.log(chalk.yellow('Использование: node find_product_id.js "Название товара"'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Поиск ID товара для: "${productName}"`));
    
    const product = await findProductByName(productName);
    
    if (product) {
      console.log(chalk.green(''));
      console.log(chalk.green('✅ Результат поиска:'));
      console.log(chalk.green('-----------------'));
      console.log(chalk.green(`ID товара: ${product.id}`));
      console.log(chalk.green(`Название: ${product.name}`));
      console.log(chalk.green(`Slug: ${product.slug}`));
      console.log(chalk.green(`Ссылка: ${product.permalink}`));
      console.log(chalk.green(''));
      console.log(chalk.blue('Для загрузки описания используйте команду:'));
      console.log(chalk.cyan(`node update_woo_product.js "${productName}" --id ${product.id}`));
    } else {
      console.error(chalk.red(`❌ Товар "${productName}" не найден в WooCommerce.`));
      console.log(chalk.yellow('Проверьте правильность названия или попробуйте другое ключевое слово.'));
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
  findProductByName
}; 