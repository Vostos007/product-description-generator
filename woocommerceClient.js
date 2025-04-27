// woocommerceClient.js
// Модуль для взаимодействия с WooCommerce API

const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env файла, если он существует
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Класс для работы с WooCommerce API
 */
class WooCommerceClient {
  constructor() {
    const { 
      WOOCOMMERCE_URL,
      WOOCOMMERCE_CONSUMER_KEY,
      WOOCOMMERCE_CONSUMER_SECRET
    } = process.env;

    if (!WOOCOMMERCE_URL || !WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      console.warn('WooCommerce API credentials not found in environment variables.');
      console.warn('Please create a .env file with WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET.');
      this.isConfigured = false;
      return;
    }

    this.api = new WooCommerceRestApi({
      url: WOOCOMMERCE_URL,
      consumerKey: WOOCOMMERCE_CONSUMER_KEY,
      consumerSecret: WOOCOMMERCE_CONSUMER_SECRET,
      version: 'wc/v3',
      queryStringAuth: true
    });
    
    this.isConfigured = true;
  }

  /**
   * Получает информацию о товаре по ID
   * @param {number} productId - ID товара в WooCommerce
   * @returns {Promise<Object|null>} - Информация о товаре или null при ошибке
   */
  async getProduct(productId) {
    if (!this.isConfigured) {
      console.error('WooCommerce API not configured');
      return null;
    }

    try {
      const response = await this.api.get(`products/${productId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting product ${productId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Обновляет информацию о товаре
   * @param {number} productId - ID товара в WooCommerce
   * @param {Object} productData - Данные для обновления товара
   * @returns {Promise<Object|null>} - Обновленная информация о товаре или null при ошибке
   */
  async updateProduct(productId, productData) {
    if (!this.isConfigured) {
      console.error('WooCommerce API not configured');
      return null;
    }

    try {
      const response = await this.api.put(`products/${productId}`, productData);
      return response.data;
    } catch (error) {
      console.error(`Error updating product ${productId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Получает список товаров с возможностью фильтрации
   * @param {Object} params - Параметры запроса (фильтры, пагинация и т.д.)
   * @returns {Promise<Array|null>} - Список товаров или null при ошибке
   */
  async getProducts(params = {}) {
    if (!this.isConfigured) {
      console.error('WooCommerce API not configured');
      return null;
    }

    try {
      const response = await this.api.get('products', params);
      return response.data;
    } catch (error) {
      console.error(`Error getting products: ${error.message}`);
      return null;
    }
  }

  /**
   * Создает новый товар
   * @param {Object} productData - Данные нового товара
   * @returns {Promise<Object|null>} - Созданный товар или null при ошибке
   */
  async createProduct(productData) {
    if (!this.isConfigured) {
      console.error('WooCommerce API not configured');
      return null;
    }

    try {
      const response = await this.api.post('products', productData);
      return response.data;
    } catch (error) {
      console.error(`Error creating product: ${error.message}`);
      return null;
    }
  }

  /**
   * Удаляет товар
   * @param {number} productId - ID товара в WooCommerce
   * @param {boolean} force - Флаг принудительного удаления (минуя корзину)
   * @returns {Promise<Object|null>} - Результат удаления или null при ошибке
   */
  async deleteProduct(productId, force = false) {
    if (!this.isConfigured) {
      console.error('WooCommerce API not configured');
      return null;
    }

    try {
      const response = await this.api.delete(`products/${productId}`, { force });
      return response.data;
    } catch (error) {
      console.error(`Error deleting product ${productId}: ${error.message}`);
      return null;
    }
  }
}

module.exports = { WooCommerceClient }; 