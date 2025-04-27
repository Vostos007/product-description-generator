#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getCategoryData, getRandomKeywords, getRandomInternalLinks, getRandomFAQs } = require('./semanticCore');
const readline = require('readline');
const { WooCommerceClient } = require('./woocommerceClient');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { promises: fsPromises } = require('fs');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// API Settings
const WC_API_URL = process.env.WOOCOMMERCE_URL;
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_SECRET;
const WC_API_CONFIGURED = WC_API_URL && WC_CONSUMER_KEY && WC_CONSUMER_SECRET;

// Paths to data and templates
const TEMPLATE_PATH = path.join(__dirname, 'data', 'templates', 'prompt_template.txt');
const SEMANTIC_CORE_PATH = path.join(__dirname, '../semantic_core_draft.json');
const SEO_WOO_DIR = path.join(process.cwd(), 'SEO_WOO');

// Define a variable to store current product name
let currentProductName = '';

// Подключаем модуль работы с семантическим ядром
const semanticCoreModule = require('./semanticCore');

// Определяем константы
const DATA_DIR = path.join(__dirname, 'data');
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');
const PPX_CACHE_DIR = path.join(__dirname, '..', 'PPX_CACHE');
const SEO_DIR = path.join(__dirname, '..', 'SEO_WOO');

/**
 * Загружает семантическое ядро с использованием модуля semanticCore
 * @returns {Object|null} - Объект с данными семантического ядра или null в случае ошибки
 */
async function loadSemanticCore() {
  try {
    return semanticCoreModule.loadSemanticCore(SEMANTIC_CORE_PATH);
  } catch (error) {
    console.error(`Error loading semantic core: ${error.message}`);
    return null;
  }
}

/**
 * Detects the category of a product based on its name
 * @param {string} productName - Product name
 * @param {Object} semanticCore - Semantic core
 * @returns {string} - Product category (e.g., 'yarn')
 */
function detectCategory(productName, semanticCore) {
  console.log(`Определение категории для товара: ${productName}`);
  
  // Step 1: Check if the product is in the product list of each category
  for (const [category, data] of Object.entries(semanticCore)) {
    if (!data.products || !Array.isArray(data.products)) continue;
    
    // Convert product name to slug for comparison
    const productSlug = productName.toLowerCase().replace(/\s+/g, '-');
    
    // Look for a match in the product list
    const match = data.products.find(p => 
      p.slug === productSlug || 
      p.slug.includes(productSlug) || 
      productSlug.includes(p.slug)
    );
    
    if (match) {
      console.log(`Category found by product list match: ${category}`);
      return category;
    }
  }
  
  // Step 2: If no exact match is found, determine by keywords in the name
  const productNameLower = productName.toLowerCase();
  
  // Check for Buttons
  if (productNameLower.includes('button') || 
      productNameLower.includes('buttons') ||
      productNameLower.includes('fastener') ||
      /toggle|snap|clasp|closure/.test(productNameLower)) {
    console.log('Category determined as "buttons" based on product name keywords');
    return 'buttons';
  }
  
  // Check for Patterns
  if (productNameLower.includes('pattern') || 
      productNameLower.includes('tutorial') ||
      productNameLower.includes('instructions') ||
      productNameLower.includes('guide') ||
      /how to|make a|knitting pattern|crochet pattern/.test(productNameLower)) {
    console.log('Category determined as "patterns" based on product name keywords');
    return 'patterns';
  }
  
  // Check for Books
  if (productNameLower.includes('book') || 
      productNameLower.includes('magazine') ||
      productNameLower.includes('publication') ||
      /volume|edition|author|publisher/.test(productNameLower)) {
    console.log('Category determined as "books" based on product name keywords');
    return 'books';
  }
  
  // Check for Kits
  if (productNameLower.includes('kit') || 
      productNameLower.includes('set') ||
      productNameLower.includes('bundle') ||
      productNameLower.includes('collection') ||
      /starter|beginner package|project kit/.test(productNameLower)) {
    console.log('Category determined as "kits" based on product name keywords');
    return 'kits';
  }
  
  // Check for Hooks
  if (productNameLower.includes('hook') || 
      productNameLower.includes('crochet') ||
      /ergonomic handle|prym|clover|addi|tulip/.test(productNameLower) && 
      !/yarn|wool|alpaca|silk|cotton/.test(productNameLower)) {
    console.log('Category determined as "hooks" based on product name keywords');
    return 'hooks';
  }
  
  // Check for Needles
  if (productNameLower.includes('needle') || 
      productNameLower.includes('knitting pin') ||
      /circular|dpn|double pointed|interchangeable|knitting|bamboo needle|metal needle/.test(productNameLower) && 
      !/yarn|wool|hook|crochet/.test(productNameLower)) {
    console.log('Category determined as "needles" based on product name keywords');
    return 'needles';
  }
  
  // Check for Accessories
  if (productNameLower.includes('stitch marker') || 
      productNameLower.includes('knitting accessory') ||
      productNameLower.includes('crochet accessory') ||
      productNameLower.includes('row counter') ||
      productNameLower.includes('gauge') ||
      productNameLower.includes('scissors') ||
      productNameLower.includes('needle stopper') ||
      productNameLower.includes('blocking') ||
      productNameLower.includes('pins') ||
      /case|holder|organizer|tool|accessory|notions|bag/.test(productNameLower) && 
      !/yarn|wool|hook|needle|pattern/.test(productNameLower)) {
    console.log('Category determined as "accessories" based on product name keywords');
    return 'accessories';
  }
  
  // Check for Yarn
  if (productNameLower.includes('yarn') || 
      productNameLower.includes('wool') ||
      productNameLower.includes('alpaca') ||
      productNameLower.includes('cotton') ||
      productNameLower.includes('silk') ||
      productNameLower.includes('mohair') ||
      productNameLower.includes('merino') ||
      productNameLower.includes('cashmere') ||
      productNameLower.includes('linen') ||
      productNameLower.includes('tweed') ||
      /drops|sandnes|bc garn|regia|kremke|lana grossa|rowan|sublime|debbie bliss/.test(productNameLower)) {
    console.log('Category determined as "yarn" based on product name keywords');
    return 'yarn';
  }
  
  // Step 3: If still no match, try to determine category using keywords that might be in categories
  for (const [category, data] of Object.entries(semanticCore)) {
    // Skip if the category doesn't have keywords
    if (!data.keywords || !Array.isArray(data.keywords)) continue;
    
    // Check each keyword to see if it appears in the product name
    for (const keyword of data.keywords) {
      if (typeof keyword === 'string' && 
          productNameLower.includes(keyword.toLowerCase())) {
        console.log(`Category found by keyword match: ${category} (matched "${keyword}")`);
        return category;
      }
    }
  }
  
  // Step 4: Use brand names to determine category if possible
  const yarnBrands = ['drops', 'sandnes', 'bc garn', 'regia', 'kremke', 'rowan', 'debbie bliss', 'lana grossa', 'malabrigo'];
  const accessoryBrands = ['clover', 'addi', 'knit pro', 'chiaogoo', 'prym', 'tulip', 'knitpicks', 'cocoknits'];
  
  for (const brand of yarnBrands) {
    if (productNameLower.includes(brand)) {
      console.log(`Category determined as "yarn" based on brand name: ${brand}`);
      return 'yarn';
    }
  }
  
  for (const brand of accessoryBrands) {
    if (productNameLower.includes(brand)) {
      if (productNameLower.includes('hook') || productNameLower.includes('crochet')) {
        console.log(`Category determined as "hooks" based on brand name: ${brand} and product type`);
        return 'hooks';
      } else if (productNameLower.includes('needle') || productNameLower.includes('knitting')) {
        console.log(`Category determined as "needles" based on brand name: ${brand} and product type`);
        return 'needles';
      } else {
        console.log(`Category determined as "accessories" based on brand name: ${brand}`);
        return 'accessories';
      }
    }
  }
  
  // Default to 'yarn' as the most likely category if nothing else matches
  console.log('No specific category determined, defaulting to "yarn"');
  return 'yarn';
}

/**
 * Загружает шаблон из файла
 * @param {string} templatePath - Путь к файлу шаблона
 * @param {string} category - Категория товара
 * @returns {string|null} - Содержимое шаблона или null в случае ошибки
 */
function loadTemplate(templatePath = '', category = '') {
  try {
    // Если путь не указан, используем шаблон по умолчанию
    if (!templatePath) {
      templatePath = TEMPLATE_PATH;
    }
    
    // Если указана категория, попробуем найти категорийный шаблон
    let categoryTemplatePath = '';
    if (category) {
      const templateDir = path.dirname(templatePath);
      categoryTemplatePath = path.join(templateDir, `${category}_template.txt`);
      
      if (fs.existsSync(categoryTemplatePath)) {
        console.log(chalk.blue(`Используем категорийный шаблон для "${category}": ${categoryTemplatePath}`));
        templatePath = categoryTemplatePath;
      } else {
        console.log(chalk.yellow(`Категорийный шаблон для "${category}" не найден, используем шаблон по умолчанию`));
      }
    }
    
    console.log(chalk.blue(`Загрузка шаблона из: ${templatePath}`));
    
    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red(`Файл шаблона не найден: ${templatePath}`));
      
      // Попробуем резервные пути
      const backupPaths = [
        path.join(__dirname, 'data', 'templates', 'prompt_template.txt'),
        path.join(__dirname, 'prompt_template.txt'),
        path.join(__dirname, '..', 'prompt_template.txt')
      ];
      
      // Если у нас есть категория, попробуем найти категорийный шаблон в резервных путях
      if (category) {
        backupPaths.unshift(
          path.join(__dirname, 'data', 'templates', `${category}_template.txt`),
          path.join(__dirname, `${category}_template.txt`),
          path.join(__dirname, '..', `${category}_template.txt`)
        );
      }
      
      for (const backupPath of backupPaths) {
        console.log(chalk.yellow(`Ищем шаблон по резервному пути: ${backupPath}`));
        if (fs.existsSync(backupPath)) {
          console.log(chalk.green(`Найден шаблон по пути: ${backupPath}`));
          templatePath = backupPath;
          break;
        }
      }
      
      if (!fs.existsSync(templatePath)) {
        return null;
      }
    }
    
    const template = fs.readFileSync(templatePath, 'utf8');
    
    if (template) {
      console.log(chalk.green('Шаблон успешно загружен'));
      return template;
    } else {
      console.error(chalk.red('Ошибка: Шаблон пустой!'));
      return null;
    }
  } catch (error) {
    console.error(chalk.red('Ошибка при загрузке шаблона:', error.message));
    return null;
  }
}

/**
 * Checks for existing HTML description in SEO_WOO directory
 * @param {string} productName - Product name
 * @returns {string|null} - HTML file content or null if file not found
 */
function checkForExistingHTML(productName) {
  // Save product name for use in other functions
  currentProductName = productName;
  
  // Convert product name to file name format
  const possibleFileNames = [
    `${productName.replace(/\s+/g, '-')}.html`,
    `${productName.replace(/\s+/g, '_')}.html`,
    `${productName.replace(/\s+/g, '')}.html`,
    `${productName.replace(/\s+/g, '-').toLowerCase()}.html`,
    `${productName.replace(/\s+/g, '_').toLowerCase()}.html`,
    `${productName.replace(/\s+/g, '').toLowerCase()}.html`
  ];
  
  // Convert product name to match DROPS-Air.html or drops-air.html format
  if (productName.toLowerCase().startsWith('drops ')) {
    possibleFileNames.push(`DROPS-${productName.substring(6).replace(/\s+/g, '-')}.html`);
    possibleFileNames.push(`drops-${productName.substring(6).replace(/\s+/g, '-').toLowerCase()}.html`);
  }
  
  // Check if each possible file exists
  if (fs.existsSync(SEO_WOO_DIR)) {
    for (const fileName of possibleFileNames) {
      const filePath = path.join(SEO_WOO_DIR, fileName);
      if (fs.existsSync(filePath)) {
        console.log(`Found ready HTML file: ${filePath}`);
        return fs.readFileSync(filePath, 'utf8').replace(/```html|```/g, ''); // Remove code markers if present
      }
    }
  }
  
  return null;
}

/**
 * Checks if Perplexity data exists for a product
 * @param {string} productName - Name of the product
 * @returns {Object|null} - Perplexity data or null
 */
async function getPerplexityData(productName) {
  try {
    // Normalize product name for file path (replace spaces with underscores and convert to lowercase)
    const normalizedName = productName.toLowerCase().replace(/\s+/g, '_');
    
    // Generate possible file names with different formatting
    const possibleFileNames = [
      `perplexity_${normalizedName}.json`,
      `perplexity_${productName.replace(/\s+/g, '_')}.json`, // Case-sensitive
      `perplexity_${productName.toLowerCase().replace(/\s+/g, '-')}.json`, // With hyphens
      `perplexity_${productName.toLowerCase().replace(/\s+/g, '')}.json` // No spaces
    ];
    
    console.log(`Looking for Perplexity data for "${productName}" in ${PPX_CACHE_DIR}`);
    
    // Check if PPX_CACHE_DIR exists
    if (!fs.existsSync(PPX_CACHE_DIR)) {
      console.log(chalk.yellow(`Perplexity cache directory does not exist: ${PPX_CACHE_DIR}`));
      return null;
    }
    
    // Try to find any of the possible file names
    for (const fileName of possibleFileNames) {
      const filePath = path.join(PPX_CACHE_DIR, fileName);
      if (fs.existsSync(filePath)) {
        console.log(chalk.blue(`Found Perplexity data: ${filePath}`));
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
      }
    }
    
    // If no exact match, try to find a case-insensitive match by listing directory
    const files = fs.readdirSync(PPX_CACHE_DIR);
    const lowerCaseSearch = normalizedName.toLowerCase();
    const matchingFile = files.find(file => 
      file.toLowerCase().includes('perplexity') && 
      file.toLowerCase().includes(lowerCaseSearch)
    );
    
    if (matchingFile) {
      const filePath = path.join(PPX_CACHE_DIR, matchingFile);
      console.log(chalk.blue(`Found Perplexity data with fuzzy match: ${filePath}`));
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    }
    
    console.log(chalk.yellow(`No Perplexity data found for "${productName}"`));
    return null;
  } catch (error) {
    console.error(chalk.red(`Error checking Perplexity data for "${productName}":`, error.message));
    return null;
  }
}

/**
 * Sanitizes text by removing unwanted characters and sequences
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text) return '';
  
  // Remove markdown syntax
  let sanitized = text.replace(/\*\*(.*?)\*\*/g, '$1') // Bold
                      .replace(/\*(.*?)\*/g, '$1') // Italic
                      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
                      .replace(/#{1,6}\s+/g, '') // Headers
                      .replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // Code blocks
  
  // Remove excess whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Load yarn profile data from JSON file if it exists
 * @param {string} productName - Name of the product/yarn
 * @returns {Object|null} - Yarn profile data or null if not found
 */
async function loadYarnProfile(productName) {
  if (!productName) return null;
  
  // Multiple normalization strategies for maximum matching potential
  const normalizedName = productName.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');
  
  const simpleName = productName.toLowerCase()
    .replace(/[^\w-]/g, '');
  
  const dashedName = productName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  
  // Try with various normalized name formats
  const possibleNames = [
    normalizedName,
    simpleName,
    dashedName,
    // Handle "Drops X" pattern
    productName.toLowerCase().includes('drops') ? productName.toLowerCase().replace('drops ', 'drops_') : null,
    productName.toLowerCase().includes('drops') ? productName.toLowerCase().replace('drops ', 'drops-') : null
  ].filter(Boolean); // Remove null entries
  
  // Try each possible name format
  for (const name of possibleNames) {
    const profilePath = path.join(DATA_DIR, 'yarn_profiles', `${name}.json`);
    if (fs.existsSync(profilePath)) {
      try {
        const profileData = fs.readFileSync(profilePath, 'utf8');
        const profile = JSON.parse(profileData);
        console.log(chalk.green(`Loaded yarn profile for ${profile.name}`));
        return profile;
      } catch (error) {
        console.log(chalk.yellow(`Error reading profile at ${profilePath}: ${error.message}`));
      }
    }
  }
  
  // If no exact match, try to match with available profiles
  try {
    const files = fs.readdirSync(path.join(DATA_DIR, 'yarn_profiles'));
    
    // Find a file that might match the product name
    const possibleMatch = files.find(file => {
      const fileName = file.toLowerCase().replace('.json', '');
      // Extract main parts of product name (e.g., "drops" and "kid-silk" from "Drops Kid-Silk")
      const productParts = productName.toLowerCase().split(/\s+|-/);
      
      // Check if all significant parts of the product name are in the filename
      return productParts.filter(part => part.length > 3).every(part => 
        fileName.includes(part.replace(/[^\w]/g, ''))
      );
    });
    
    if (possibleMatch) {
      const profilePath = path.join(DATA_DIR, 'yarn_profiles', possibleMatch);
      try {
        const profileData = fs.readFileSync(profilePath, 'utf8');
        const profile = JSON.parse(profileData);
        console.log(chalk.green(`Loaded yarn profile for ${profile.name} by partial match`));
        return profile;
      } catch (error) {
        console.log(chalk.yellow(`Error reading profile at ${profilePath}: ${error.message}`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow('No yarn profiles directory found or error reading directory.'));
  }
  
  console.log(chalk.yellow(`No matching yarn profile found for: ${productName}`));
  return null;
}

/**
 * Extracts specifications from Perplexity AI response
 * @param {string} perplexityData - Data from Perplexity AI
 * @returns {Object} - Object containing product specifications
 */
function extractSpecificationsFromPerplexity(perplexityData) {
  if (!perplexityData || !perplexityData.data) return {};
  
  // First, clean and normalize the content
  const content = perplexityData.data
    .replace(/\[\d+\](?:\[\d+\])?/g, '') // Remove citation markers like [1][2]
    .replace(/\(\d+\)/g, '');            // Remove numbered references like (1)
  
  const specs = {};
  
  // Extract fiber content with improved matching
  if (content.includes('Fiber Content') || content.includes('Content:') || content.includes('%')) {
    const fiberMatch = content.match(/(?:Fiber Content|Content:|Composition)[^\n]*?(\d+%\s*[A-Za-z]+(?:[^A-Za-z\n](?:\d+%\s*[A-Za-z]+))*)/i) ||
                      content.match(/(?:Fiber|Content|Composition).*?(\d+%\s*[A-Za-z]+.*?\d+%\s*[A-Za-z]+.*?\d+%\s*[A-Za-z]+)/i) ||
                      content.match(/(\d+%\s*(?:Alpaca|Wool|Cotton|Polyamide|Nylon|Silk)[^\.]*)/i);
    
    if (fiberMatch && fiberMatch[1]) {
      specs.fiberContent = sanitizeText(fiberMatch[1]);
    }
  }
  
  // Extract weight
  if (content.includes('Weight') || content.includes('Ball Weight') || content.includes('g ')) {
    const weightMatch = content.match(/(?:Ball Weight|Weight)[^\n]*?(\d+\s*g)/i) ||
                        content.match(/(\d+\s*g(?:rams)?)[^\n]*?(?:ball|skein)/i);
    
    if (weightMatch && weightMatch[1]) {
      specs.weight = sanitizeText(weightMatch[1]);
    }
  }
  
  // Extract length/yardage
  if (content.includes('Length') || content.includes('Yardage') || content.includes('meters')) {
    const lengthMatch = content.match(/(?:Length|Yardage)[^\n]*?(\d+\s*m(?:eters)?[^\n]*?(?:\d+\s*y(?:ards)?))/i) ||
                        content.match(/(\d+\s*m(?:eters)?(?:\s*\((?:approx\.?)?(?:\s*)\d+\s*y(?:ards)?\))?)/i);
    
    if (lengthMatch && lengthMatch[1]) {
      specs.length = sanitizeText(lengthMatch[1]);
    }
  }
  
  // Extract recommended needle size
  if (content.includes('Needle Size') || content.includes('Recommended Needle')) {
    const needleMatch = content.match(/(?:Recommended Needle|Needle Size)[^\n]*?(\d+(?:\.\d+)?\s*mm)/i) ||
                        content.match(/(?:knitting needles|needle)[^\n]*?(\d+(?:\.\d+)?\s*mm)/i);
    
    if (needleMatch && needleMatch[1]) {
      specs.needleSize = sanitizeText(needleMatch[1]);
    }
  }
  
  // Extract origin
  if (content.includes('Origin') || content.includes('Made in')) {
    const originMatch = content.match(/(?:Origin|Made in)[^\n]*?((?:Peru|Italy|China|USA|UK|Turkey|Norway|Sweden|Finland|Denmark))/i) ||
                        content.match(/(?:produced|made)[^\n]*?(?:in\s+)((?:Peru|Italy|China|USA|UK|Turkey|Norway|Sweden|Finland|Denmark))/i);
    
    if (originMatch && originMatch[1]) {
      specs.origin = sanitizeText(originMatch[1]);
    }
  }
  
  // Extract key features and benefits more effectively
  const features = [];
  
  // Extract features from the content directly
  let cleanedContent = content
    .replace(/\[|\]|\d+/g, '') // Remove reference markers and numbers
    .replace(/(?:\r\n|\r|\n){2,}/g, '\n\n'); // Normalize line breaks
  
  // Look for "Features", "Benefits", "Unique Features" sections
  const featureSections = [
    cleanedContent.match(/(?:Features|Benefits|Unique Features|Key Features)[^\n]*?(?:\n)(.*?)(?:(?:---|\#{2,3}|Summary|Technical))/is),
    cleanedContent.match(/(?:Features|Benefits|Advantages)[^\n]*?(?:\n)(.*?)(?:\n\n\n|\#{2,3})/is)
  ];
  
  for (const section of featureSections) {
    if (section && section[1]) {
      // Look for bullet points
      const bulletPoints = section[1].match(/(?:^|\n)\s*[-•*]\s*(.*?)(?=\n|$)/g);
      
      if (bulletPoints) {
        for (const point of bulletPoints) {
          const cleanPoint = sanitizeText(point.replace(/^[-•*\s]+/, ''));
          if (cleanPoint && cleanPoint.length >= 10 && cleanPoint.length < 500) {
            // Добавляем полные версии пунктов без обрезания
            features.push(cleanPoint);
          }
        }
      }
    }
  }
  
  // If no bullet points were found, try to extract from bold text
  if (features.length === 0) {
    const boldTextMatches = content.match(/\*\*([^*\n]+)\*\*/g);
    if (boldTextMatches) {
      for (const match of boldTextMatches) {
        const cleanMatch = sanitizeText(match.replace(/\*\*/g, ''));
        // Skip section headers and short phrases
        if (cleanMatch.length >= 5 && cleanMatch.length < 80 && 
            !cleanMatch.match(/^(?:Technical Specifications|Features|Benefits|Summary|Key Benefits|Origin|Weight|Length|Content|Maintenance)$/i)) {
          
          // Look for explanatory text after the bold text
          const pattern = new RegExp(`\\*\\*${cleanMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*\\s*(.{10,100})`, 'i');
          const explanationMatch = content.match(pattern);
          
          if (explanationMatch && explanationMatch[1] && !explanationMatch[1].includes('**')) {
            features.push(`${cleanMatch}: ${sanitizeText(explanationMatch[1])}`);
          } else {
            // See if there's a paragraph near this bold text containing relevant information
            const paragraphPattern = new RegExp(`\\*\\*${cleanMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*.*?\\n(.{30,200})\\n`, 'i');
            const paragraphMatch = content.match(paragraphPattern);
            
            if (paragraphMatch && paragraphMatch[1]) {
              features.push(`${cleanMatch}: ${sanitizeText(paragraphMatch[1])}`);
            } else {
              features.push(cleanMatch);
            }
          }
        }
      }
    }
  }
  
  // Преобразуем характеристики для лучшего отображения в HTML
  const enhancedFeatures = features.map(feature => {
    // Проверяем, содержит ли характеристика двоеточие (формат "Заголовок: Описание")
    if (feature.includes(':')) {
      const [title, description] = feature.split(':').map(part => part.trim());
      // Возвращаем структурированную характеристику
      return {
        title: title,
        description: description
      };
    } else {
      // Попробуем разделить характеристику на заголовок и описание
      // Ищем первую фразу до первого знака препинания
      const match = feature.match(/^([^\.,:;]+)[\.,:;](.+)$/);
      if (match && match[1] && match[2]) {
        return {
          title: match[1].trim(),
          description: match[2].trim()
        };
      } else {
        // Если не удается разделить, используем первые несколько слов как заголовок
        const words = feature.split(' ');
        if (words.length > 3) {
          return {
            title: words.slice(0, 3).join(' '),
            description: words.slice(3).join(' ')
          };
        } else {
          // Если характеристика слишком короткая, используем ее как есть
          return {
            title: feature,
            description: ''
          };
        }
      }
    }
  });
  
  // If we still don't have features, try to extract descriptive sentences
  if (features.length < 3) {
    const descriptivePatterns = [
      /(?:provides|offers|features|boasts|delivers|ensures|gives) (.*?)\./gi,
      /is (?:perfect|ideal|excellent|outstanding|remarkable|exceptional) (.*?)\./gi,
      /(?:luxury|premium|high-quality|soft|warm|lightweight) (.*?)\./gi
    ];
    
    for (const pattern of descriptivePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].length >= 15 && match[1].length < 150) {
          const feature = sanitizeText(match[0]);
          if (!features.some(f => f.includes(feature.substring(0, 15)))) {
            features.push(feature);
          }
        }
      }
    }
  }
  
  // Look for project types for the "Perfect For" section
  const projectTypes = [];
  const projectPatterns = [
    /(?:perfect|ideal|suitable|great|excellent)\s+for\s+(.*?)(?:\.|\n|$)/gi,
    /works (?:well|beautifully|excellently|perfectly) (?:for|with) (.*?)(?:\.|\n|$)/gi,
    /recommended (?:for|with) (.*?)(?:\.|\n|$)/gi
  ];
  
  for (const pattern of projectPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && match[1].length >= 5 && match[1].length < 150) {
        const projectItems = match[1].split(/,|and/).map(item => sanitizeText(item));
        projectItems.forEach(item => {
          if (item.length >= 3 && !projectTypes.includes(item)) {
            projectTypes.push(item);
          }
        });
      }
    }
  }
  
  // If the project types list is still empty or contains reference markers, use these defaults
  if (projectTypes.length === 0 || projectTypes.some(p => p.includes('['))) {
    projectTypes.push(
      'cozy sweaters and cardigans',
      'soft scarves and shawls',
      'comfortable hats and accessories',
      'luxurious home decor items',
      'garments for those with sensitive skin'
    );
  }
  
  // Remove duplicates and limit to reasonable number
  specs.features = enhancedFeatures.slice(0, 8);
  specs.projectTypes = [...new Set(projectTypes)].slice(0, 5);
  
  return specs;
}

/**
 * Создает оптимизированное по SEO мета-описание для товара в соответствии с рекомендациями RankMath
 * @param {string} productName - Название товара
 * @param {Object} productSpecs - Характеристики товара из Perplexity
 * @param {string} category - Категория товара
 * @returns {string} - Оптимизированное мета-описание (120-160 символов)
 */
function generateSeoMetaDescription(productName, productSpecs, category) {
  // Базовое мета-описание в зависимости от категории
  let baseMetaDescription = '';
  
  switch(category) {
    case 'yarn':
      baseMetaDescription = `Shop ${productName} at Hollywool, your premium source for quality craft supplies. Fast EU shipping, secure checkout.`;
      
      // Добавляем информацию о составе для пряжи, если доступна
      if (productSpecs.fiberContent) {
        const content = productSpecs.fiberContent.replace(/\d+%\s*/g, '').replace(/,\s*and\s*/g, ', ').trim();
        baseMetaDescription = `Buy high-quality ${productName} from Hollywool - luxurious ${content} blend yarn for knitting and crochet projects. Fast shipping across Europe.`;
      }
      break;
      
    case 'hooks':
      baseMetaDescription = `Shop quality ${productName} at Hollywool. Ergonomic design for comfortable crocheting. Perfect for beginners and professionals.`;
      break;
      
    case 'needles':
      baseMetaDescription = `Premium ${productName} available at Hollywool. Smooth knitting experience, durable materials. Perfect for your next knitting project.`;
      break;
      
    case 'accessories':
      baseMetaDescription = `Shop ${productName} at Hollywool. Essential accessories for your knitting and crochet projects. Fast shipping across Europe.`;
      break;
      
    case 'buttons':
      baseMetaDescription = `Add the perfect finishing touch with our ${productName} at Hollywool. Quality craftsmanship, beautiful design, fast shipping.`;
      break;
      
    case 'patterns':
      baseMetaDescription = `Download ${productName} from Hollywool. Clear instructions, detailed diagrams, and expert tips for successful project completion.`;
      break;
      
    case 'books':
      baseMetaDescription = `Expand your craft knowledge with ${productName} at Hollywool. Expert techniques, inspiration, and patterns for all skill levels.`;
      break;
      
    case 'kits':
      baseMetaDescription = `Get started with our ${productName} at Hollywool. Complete set with all materials needed for your project. Perfect for beginners.`;
      break;
      
    default:
      baseMetaDescription = `Shop quality ${productName} at Hollywool. Your trusted source for premium craft supplies with fast shipping across Europe.`;
  }
  
  // Убедимся, что длина мета-описания в пределах 120-160 символов (оптимально для RankMath)
  if (baseMetaDescription.length > 160) {
    baseMetaDescription = baseMetaDescription.substring(0, 157) + '...';
  } else if (baseMetaDescription.length < 120) {
    // Добавляем общую информацию о доставке/качестве для достижения минимальной длины
    baseMetaDescription += ' Free shipping for orders over 50€. 100% satisfaction guaranteed.';
    
    // Снова проверяем длину после добавления
    if (baseMetaDescription.length > 160) {
      baseMetaDescription = baseMetaDescription.substring(0, 157) + '...';
    }
  }
  
  return baseMetaDescription;
}

/**
 * Генерирует список ключевых слов, оптимизированных для SEO
 * @param {string} productName - Название товара
 * @param {Object} productSpecs - Характеристики товара
 * @param {Array} categoryKeywords - Ключевые слова категории
 * @param {string} category - Категория товара
 * @returns {string} - Строка ключевых слов, разделенных запятыми
 */
function generateSeoKeywords(productName, productSpecs, categoryKeywords, category) {
  // Начинаем с основного ключевого слова (названия продукта)
  const mainKeyword = productName.toLowerCase();
  const keywordArray = [mainKeyword];
  
  // Добавляем ключевые слова в зависимости от категории
  switch(category) {
    case 'yarn':
      keywordArray.push('yarn', 'knitting yarn', 'crochet yarn');
      
      // Добавляем специфичные ключевые слова для пряжи
      if (productSpecs.fiberContent) {
        const fibers = productSpecs.fiberContent.toLowerCase().match(/(\w+)%/g);
        if (fibers && fibers.length > 0) {
          fibers.forEach(fiber => {
            const fiberType = fiber.replace('%', '').trim();
            if (fiberType && fiberType.length > 2) {
              keywordArray.push(`${fiberType} yarn`);
            }
          });
        }
      }
      
      if (productName.toLowerCase().includes('merino')) {
        keywordArray.push('merino wool', 'merino yarn', 'soft wool');
      }
      
      if (productName.toLowerCase().includes('alpaca')) {
        keywordArray.push('alpaca yarn', 'soft alpaca yarn', 'luxury yarn');
      }
      
      if (productName.toLowerCase().includes('cotton')) {
        keywordArray.push('cotton yarn', 'summer yarn', 'plant fiber yarn');
      }
      
      // Добавляем LSI ключевые слова для пряжи
      keywordArray.push('knitting supplies', 'crochet supplies', 'craft yarn');
      break;
      
    case 'hooks':
      keywordArray.push('crochet hook', 'crochet supplies', 'ergonomic crochet hook');
      
      // Добавляем LSI ключевые слова для крючков
      keywordArray.push('crochet tools', 'crochet accessories', 'quality crochet hooks');
      break;
      
    case 'needles':
      keywordArray.push('knitting needles', 'knitting supplies', 'knitting accessories');
      
      // Добавляем LSI ключевые слова для спиц
      keywordArray.push('circular needles', 'bamboo needles', 'metal needles', 'quality knitting needles');
      break;
    
    // Добавляем подобные блоки для других категорий...
    default:
      keywordArray.push('knitting', 'crochet', 'craft supplies', 'hollywool');
  }
  
  // Добавляем ключевые слова из категории (максимум 5)
  if (categoryKeywords && categoryKeywords.length > 0) {
    const filteredCategoryKeywords = categoryKeywords
      .filter(keyword => typeof keyword === 'string' && keyword.length > 0)
      .slice(0, 5);
    
    keywordArray.push(...filteredCategoryKeywords);
  }
  
  // Удаляем дубликаты и пустые значения
  const uniqueKeywords = [...new Set(keywordArray)]
    .filter(keyword => keyword && keyword.trim().length > 0)
    .map(keyword => keyword.trim().toLowerCase());
  
  // Возвращаем строку ключевых слов (максимум 10 для оптимального SEO)
  return uniqueKeywords.slice(0, 10).join(', ');
}

/**
 * Генерирует HTML с внутренними ссылками, оптимизированными для SEO
 * @param {Array} internalLinks - Массив внутренних ссылок из семантического ядра
 * @param {string} productName - Название товара 
 * @param {string} category - Категория товара
 * @returns {string} - HTML с внутренними ссылками
 */
function generateSeoInternalLinks(internalLinks, productName, category) {
  // Начинаем формировать HTML-код для внутренних ссылок
  let linksHtml = '<ul class="related-products">\n';
  
  // Создаем Set для отслеживания уже добавленных ссылок
  const addedLinks = new Set();
  
  // Флаг, указывающий, добавили ли мы специфичные для категории ссылки
  let categorySpecificLinksAdded = false;
  
  // Если есть внутренние ссылки в семантическом ядре, используем их (до 5)
  const validLinks = internalLinks.filter(link => link.title && link.url).slice(0, 5);
  
  if (validLinks.length > 0) {
    for (const link of validLinks) {
      linksHtml += `  <li><a href="${link.url}">${link.title}</a></li>\n`;
      // Добавляем ссылку в Set для отслеживания
      addedLinks.add(link.url);
    }
    categorySpecificLinksAdded = true;
  }
  
  // Если у нас меньше 5 ссылок или нет специфичных ссылок, добавляем ссылки в зависимости от категории
  if (validLinks.length < 5 || !categorySpecificLinksAdded) {
    switch(category) {
      case 'yarn':
        // Для пряжи добавляем ссылки на другие типы пряжи или аксессуары для вязания
        if (!addedLinks.has('https://hollywool.eu/product-category/yarn/')) {
          linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">All Yarns</a></li>\n`;
          addedLinks.add('https://hollywool.eu/product-category/yarn/');
        }
        
        // В зависимости от названия пряжи предлагаем похожие товары
        if (productName.toLowerCase().includes('merino')) {
          const url = 'https://hollywool.eu/product-tag/merino-wool/';
          if (!addedLinks.has(url)) {
            linksHtml += `  <li><a href="${url}">Other Merino Yarns</a></li>\n`;
            addedLinks.add(url);
          }
        } else if (productName.toLowerCase().includes('alpaca')) {
          const url = 'https://hollywool.eu/product-tag/alpaca/';
          if (!addedLinks.has(url)) {
            linksHtml += `  <li><a href="${url}">Other Alpaca Yarns</a></li>\n`;
            addedLinks.add(url);
          }
        } else if (productName.toLowerCase().includes('cotton')) {
          const url = 'https://hollywool.eu/product-tag/cotton/';
          if (!addedLinks.has(url)) {
            linksHtml += `  <li><a href="${url}">Other Cotton Yarns</a></li>\n`;
            addedLinks.add(url);
          }
        }
        
        // Добавляем ссылки на аксессуары для вязания
        if (!addedLinks.has('https://hollywool.eu/product-category/needles/')) {
          linksHtml += `  <li><a href="https://hollywool.eu/product-category/needles/">Knitting Needles</a></li>\n`;
          addedLinks.add('https://hollywool.eu/product-category/needles/');
        }
        
        if (!addedLinks.has('https://hollywool.eu/product-category/hooks/')) {
          linksHtml += `  <li><a href="https://hollywool.eu/product-category/hooks/">Crochet Hooks</a></li>\n`;
          addedLinks.add('https://hollywool.eu/product-category/hooks/');
        }
        break;
        
      case 'hooks':
        // Для крючков добавляем ссылки на пряжу и аксессуары
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/hooks/">All Crochet Hooks</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">Yarns for Crochet</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/accessories/">Crochet Accessories</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/patterns/">Crochet Patterns</a></li>\n`;
        break;
        
      case 'needles':
        // Для спиц добавляем ссылки на пряжу и аксессуары
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/needles/">All Knitting Needles</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">Yarns for Knitting</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/accessories/">Knitting Accessories</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/patterns/">Knitting Patterns</a></li>\n`;
        break;
        
      case 'accessories':
        // Для аксессуаров добавляем ссылки на пряжу, спицы и крючки
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/accessories/">All Accessories</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">Yarns</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/needles/">Knitting Needles</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/hooks/">Crochet Hooks</a></li>\n`;
        break;
        
      case 'buttons':
        // Для пуговиц добавляем ссылки на пряжу и аксессуары
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/buttons/">All Buttons</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">Yarns for Cardigans</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/patterns/">Cardigan Patterns</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/accessories/">Other Accessories</a></li>\n`;
        break;
        
      // Добавляем блоки для других категорий по аналогии
      
      default:
        // По умолчанию добавляем общие ссылки
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/yarn/">Yarns</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/accessories/">Accessories</a></li>\n`;
        linksHtml += `  <li><a href="https://hollywool.eu/product-category/patterns/">Patterns</a></li>\n`;
    }
  }
  
  // Всегда добавляем ссылку на главную страницу, если она еще не добавлена
  if (!addedLinks.has('https://hollywool.eu/')) {
    linksHtml += `  <li><a href="https://hollywool.eu/">Homepage</a></li>\n`;
    addedLinks.add('https://hollywool.eu/');
  }
  
  // Завершаем HTML-код
  linksHtml += '</ul>';
  
  return linksHtml;
}

/**
 * Генерирует HTML с часто задаваемыми вопросами, оптимизированными для SEO
 * @param {Array} faqs - Массив FAQ из семантического ядра
 * @param {string} productName - Название товара
 * @param {Object} productSpecs - Характеристики товара из Perplexity
 * @param {string} category - Категория товара
 * @returns {string} - HTML с FAQ
 */
function generateSeoFAQs(faqs, productName, productSpecs, category) {
  // Начинаем формировать HTML-код для FAQ
  let faqsHtml = '<div class="product-faq" itemscope itemtype="https://schema.org/FAQPage">\n';
  
  // Если есть FAQ в семантическом ядре, используем их (до 3)
  const validFaqs = faqs.filter(faq => faq.question && faq.answer).slice(0, 3);
  
  // Флаг, указывающий, добавили ли мы хотя бы один FAQ
  let faqAdded = false;
  
  if (validFaqs.length > 0) {
    for (const faq of validFaqs) {
      faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
      faqsHtml += `    <h4 class="faq-question" itemprop="name">${sanitizeText(faq.question)}</h4>\n`;
      faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
      faqsHtml += `      <p class="faq-answer" itemprop="text">${sanitizeText(faq.answer)}</p>\n`;
      faqsHtml += `    </div>\n`;
      faqsHtml += `  </div>\n`;
      faqAdded = true;
    }
  }
  
  // Если у нас меньше 3 FAQ или нет FAQ, добавляем стандартные вопросы в зависимости от категории
  if (validFaqs.length < 3 || !faqAdded) {
    switch(category) {
      case 'yarn':
        // Для пряжи добавляем вопросы о составе, уходе и применении
        
        // FAQ о проектах для этой пряжи
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">What projects is ${productName} best suited for?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        
        if (productSpecs.fiberContent && productSpecs.fiberContent.toLowerCase().includes('alpaca')) {
          faqsHtml += `      <p class="faq-answer" itemprop="text">With its soft alpaca blend, ${productName} is perfect for cozy sweaters, scarves, shawls, and accessories that will be in contact with skin. The natural properties of alpaca make it incredibly warm yet lightweight, ideal for winter garments.</p>\n`;
        } else if (productSpecs.fiberContent && productSpecs.fiberContent.toLowerCase().includes('cotton')) {
          faqsHtml += `      <p class="faq-answer" itemprop="text">${productName} is ideal for summer garments, baby items, home decor, and accessories due to its cotton content. It offers excellent stitch definition and creates breathable, comfortable items suitable for warmer weather.</p>\n`;
        } else if (productSpecs.fiberContent && productSpecs.fiberContent.toLowerCase().includes('wool')) {
          faqsHtml += `      <p class="faq-answer" itemprop="text">${productName} works beautifully for sweaters, cardigans, hats, mittens, and cold-weather accessories. Its wool content provides excellent warmth, durability and a beautiful drape for a variety of knitting and crochet projects.</p>\n`;
        } else {
          faqsHtml += `      <p class="faq-answer" itemprop="text">${productName} is versatile and suitable for a wide range of projects including sweaters, accessories, home decor items, and garments. Its qualities make it perfect for both beginner and advanced crafters looking to create beautiful, long-lasting items.</p>\n`;
        }
        
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        // FAQ о уходе за изделиями
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">How do I care for items made with ${productName}?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        
        if (productSpecs.fiberContent && (productSpecs.fiberContent.toLowerCase().includes('wool') || productSpecs.fiberContent.toLowerCase().includes('alpaca'))) {
          faqsHtml += `      <p class="faq-answer" itemprop="text">For best results, hand wash items made with ${productName} in cold water using a mild wool wash. Gently squeeze out excess water without wringing, then lay flat to dry away from direct sunlight. Avoid using fabric softeners as they may damage the natural fibers.</p>\n`;
        } else if (productSpecs.fiberContent && productSpecs.fiberContent.toLowerCase().includes('cotton')) {
          faqsHtml += `      <p class="faq-answer" itemprop="text">Items made with ${productName} can be machine washed on a gentle cycle with cold water. Use a mild detergent and avoid bleach. Lay flat to dry or tumble dry on low heat. To maintain shape, we recommend blocking after washing.</p>\n`;
        } else {
          faqsHtml += `      <p class="faq-answer" itemprop="text">We recommend hand washing with cold water and mild soap, then laying flat to dry. Always check the yarn label for specific care instructions, as the fiber content will determine the best care method for your finished items.</p>\n`;
        }
        
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        // FAQ о наличии и доставке
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">Do you offer international shipping for ${productName}?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">Yes, we ship ${productName} internationally. Shipping rates and delivery times vary based on your location. Orders over €50 qualify for free shipping to many European countries. All packages are carefully packed to ensure your yarn arrives in perfect condition.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        break;
        
      case 'hooks':
        // Для крючков добавляем специфичные FAQ
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">What yarn weight works best with this crochet hook?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">The ${productName} works well with yarn weights appropriate for its size. For detailed recommendations, please check the product specifications. Generally, larger hooks (5mm+) work well with worsted, aran, and bulky yarns, while smaller hooks are perfect for fingering, sport, and DK weights.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">Is this hook suitable for beginners?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">Yes, the ${productName} is excellent for beginners. Its ergonomic design reduces hand fatigue, and the smooth surface allows yarn to glide easily, making learning to crochet more enjoyable. The comfortable grip helps beginners maintain consistent tension as they develop their skills.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">How do I care for my ${productName}?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">To maintain your ${productName} in excellent condition, wipe it clean after use to remove any oils from your hands. Store it in a case to prevent scratches or damage. Avoid exposing it to extreme temperatures or harsh chemicals that could damage the material.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        break;
        
      // Добавляем блоки для других категорий по аналогии
      
      default:
        // По умолчанию добавляем общие вопросы
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">How do I care for this product?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">Please refer to the care instructions on the product label. We recommend proper storage and handling to ensure the longevity of your ${productName}.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">Do you offer international shipping?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">Yes, we ship to most countries worldwide. Shipping rates and delivery times vary based on location. Please check our shipping policy for details.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
        
        faqsHtml += `  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
        faqsHtml += `    <h4 class="faq-question" itemprop="name">Can I return this product if I'm not satisfied?</h4>\n`;
        faqsHtml += `    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
        faqsHtml += `      <p class="faq-answer" itemprop="text">Yes, we have a 30-day return policy. If you're not completely satisfied with your purchase, please contact our customer service team for assistance with returns or exchanges.</p>\n`;
        faqsHtml += `    </div>\n`;
        faqsHtml += `  </div>\n`;
    }
  }
  
  // Завершаем HTML-код
  faqsHtml += '</div>';
  
  return faqsHtml;
}

/**
 * Provides intelligent project suggestions based on yarn properties
 * @param {string} productName - Name of the product
 * @param {Object} productSpecs - Product specifications extracted from Perplexity data
 * @returns {Array<string>} - Array of suggested projects
 */
function getProjectSuggestionsForYarn(productName, productSpecs) {
  const lowercaseName = productName.toLowerCase();
  const suggestions = [];
  
  // Base features to consider
  const isFine = productSpecs.needleSize && 
                (productSpecs.needleSize.includes('2 mm') || 
                 productSpecs.needleSize.includes('2.5 mm') || 
                 productSpecs.needleSize.includes('3 mm'));
  
  const isMedium = productSpecs.needleSize && 
                  (productSpecs.needleSize.includes('3.5 mm') || 
                   productSpecs.needleSize.includes('4 mm') || 
                   productSpecs.needleSize.includes('4.5 mm'));
  
  const isChunky = productSpecs.needleSize && 
                  (productSpecs.needleSize.includes('5 mm') || 
                   productSpecs.needleSize.includes('6 mm') || 
                   productSpecs.needleSize.includes('7 mm') ||
                   productSpecs.needleSize.includes('8 mm'));
  
  const isBulky = productSpecs.needleSize && 
                 (productSpecs.needleSize.includes('9 mm') || 
                  productSpecs.needleSize.includes('10 mm') ||
                  parseInt(productSpecs.needleSize) > 8);
  
  // Fiber composition checks
  const hasAlpaca = productSpecs.fiberContent && 
                   productSpecs.fiberContent.toLowerCase().includes('alpaca');
  
  const hasMohair = productSpecs.fiberContent && 
                   (productSpecs.fiberContent.toLowerCase().includes('mohair') ||
                    lowercaseName.includes('mohair'));
  
  const hasCashmere = productSpecs.fiberContent && 
                     productSpecs.fiberContent.toLowerCase().includes('cashmere');
  
  const hasSilk = productSpecs.fiberContent && 
                 productSpecs.fiberContent.toLowerCase().includes('silk');
  
  const hasMerino = (productSpecs.fiberContent && 
                    productSpecs.fiberContent.toLowerCase().includes('merino')) ||
                    lowercaseName.includes('merino');
  
  const hasWool = (productSpecs.fiberContent && 
                  productSpecs.fiberContent.toLowerCase().includes('wool')) ||
                  lowercaseName.includes('wool');
  
  const hasCotton = (productSpecs.fiberContent && 
                    productSpecs.fiberContent.toLowerCase().includes('cotton')) ||
                    lowercaseName.includes('cotton');
  
  const hasLinen = (productSpecs.fiberContent && 
                   productSpecs.fiberContent.toLowerCase().includes('linen')) ||
                   lowercaseName.includes('linen');
  
  const isBlowYarn = lowercaseName.includes('air') || 
                     (productSpecs.features && 
                      productSpecs.features.some(f => 
                        f.toLowerCase().includes('blow yarn') || 
                        f.toLowerCase().includes('blown')));
  
  // Specific yarn brand detections
  const isDropsAir = lowercaseName.includes('drops air');
  const isDropsKidSilk = lowercaseName.includes('kid silk') || lowercaseName.includes('kid-silk');
  const isDropsBrushedAlpaca = lowercaseName.includes('brushed alpaca');
  
  // Project suggestions based on yarn properties
  
  // Drops Air specific suggestions
  if (isDropsAir || isBlowYarn) {
    suggestions.push('Lightweight but warm sweaters');
    suggestions.push('Cozy oversized garments');
    suggestions.push('Textured scarves and cowls');
    suggestions.push('Airy shawls with excellent drape');
    suggestions.push('Projects for sensitive skin');
    return suggestions;
  }
  
  // Kid Silk and Mohair blends
  if (isDropsKidSilk || hasMohair) {
    suggestions.push('Delicate lace shawls');
    suggestions.push('Held together with other yarns for halo effect');
    suggestions.push('Lightweight sweaters with elegant drape');
    suggestions.push('Airy scarves and wraps');
    suggestions.push('Fine texture accessories');
    return suggestions;
  }
  
  // Brushed Alpaca
  if (isDropsBrushedAlpaca || (hasAlpaca && lowercaseName.includes('brushed'))) {
    suggestions.push('Ultra-soft scarves and cowls');
    suggestions.push('Luxurious sweaters with halo effect');
    suggestions.push('Cozy hats and mittens');
    suggestions.push('Elegant shawls and wraps');
    suggestions.push('Projects requiring exceptional warmth');
    return suggestions;
  }
  
  // General suggestions based on weight
  if (isFine) {
    suggestions.push('Intricate lace projects');
    suggestions.push('Lightweight socks');
    suggestions.push('Delicate shawls');
    suggestions.push('Fine gauge garments');
  } else if (isMedium) {
    suggestions.push('Versatile everyday sweaters');
    suggestions.push('Textured accessories');
    suggestions.push('Colorwork projects');
    suggestions.push('Mid-weight garments');
  } else if (isChunky) {
    suggestions.push('Quick-knit sweaters and cardigans');
    suggestions.push('Cozy winter accessories');
    suggestions.push('Textured hats and cowls');
    suggestions.push('Warm home decor items');
  } else if (isBulky) {
    suggestions.push('Super chunky blankets');
    suggestions.push('Statement scarves');
    suggestions.push('Oversized sweaters');
    suggestions.push('Quick weekend projects');
  }
  
  // Add fiber-specific suggestions
  if (hasAlpaca) {
    suggestions.push('Projects for those with wool sensitivity');
  }
  
  if (hasCashmere || hasMerino) {
    suggestions.push('Luxurious next-to-skin garments');
  }
  
  if (hasSilk) {
    suggestions.push('Projects with elegant drape and sheen');
  }
  
  if (hasCotton || hasLinen) {
    suggestions.push('Lightweight summer garments');
  }
  
  // Make sure we have at least 5 suggestions
  if (suggestions.length < 5) {
    const defaultSuggestions = [
      'Cozy sweaters and cardigans',
      'Soft scarves and shawls',
      'Comfortable hats and accessories',
      'Luxurious home decor items',
      'Garments for those with sensitive skin'
    ];
    
    // Add default suggestions until we have at least 5
    for (let i = 0; i < defaultSuggestions.length && suggestions.length < 5; i++) {
      if (!suggestions.includes(defaultSuggestions[i])) {
        suggestions.push(defaultSuggestions[i]);
      }
    }
  }
  
  // Limit to 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Генерирует описание товара на основе шаблона
 * @param {string} productName - Название товара
 * @param {Object} categoryData - Данные категории из семантического ядра
 * @param {string} template - Шаблон для генерации описания
 * @returns {Promise<string>} HTML-описание товара
 */
async function generateDescription(productName, categoryData, template) {
  try {
    console.log(chalk.cyan(`Генерирую описание для продукта: "${productName}"`));
    
    if (!template) {
      console.error(chalk.red('Ошибка: Шаблон не предоставлен!'));
      return null;
    }
    
    let description = template;
    
    // Replace product name in template
    description = description.replace(/{{PRODUCT_NAME}}/g, productName);
    
    // Normalize category data structure to ensure consistency
    const normalizedCategoryData = {
      category: categoryData.category || '',
      keywords: categoryData.keywords || [],
      internalLinks: categoryData.internalLinks || categoryData.internal_links || [],
      faqs: categoryData.faqs || categoryData.faq || []
    };
    
    // Load yarn profile if available
    const yarnProfile = await loadYarnProfile(productName);
    
    // Get data from Perplexity
    let productSpecs = {};
    let perplexityData = null;
    
    try {
      perplexityData = await getPerplexityData(productName);
      if (perplexityData) {
        productSpecs = extractSpecificationsFromPerplexity(perplexityData);
        console.log(chalk.green('Product specs extracted from Perplexity data'));
      }
    } catch (error) {
      console.log(chalk.yellow('Error getting data from Perplexity:', error.message));
    }
    
    // Use yarn profile data if available, otherwise use Perplexity data
    if (yarnProfile) {
      // Merge with existing specs, prioritizing profile data
      productSpecs = {
        ...productSpecs,
        fiberContent: yarnProfile.specifications.composition || productSpecs.fiberContent,
        weight: yarnProfile.specifications.weight || productSpecs.weight,
        length: yarnProfile.specifications.length || productSpecs.length,
        needleSize: yarnProfile.specifications.needleSize || productSpecs.needleSize,
        crochetHook: yarnProfile.specifications.crochetHook || productSpecs.crochetHook,
        gaugeStitches: yarnProfile.specifications.gaugeStitches || productSpecs.gaugeStitches,
        gaugeRows: yarnProfile.specifications.gaugeRows || productSpecs.gaugeRows,
        careInstructions: yarnProfile.specifications.care || productSpecs.careInstructions,
        origin: yarnProfile.specifications.origin || productSpecs.origin,
        features: yarnProfile.features || productSpecs.features
      };
      
      console.log(chalk.green('Enhanced product specs with yarn profile data'));
    }
    
    // Generate meta description
    const metaDescription = generateSeoMetaDescription(productName, productSpecs, normalizedCategoryData.category);
    description = description.replace(/{{META_DESCRIPTION}}/g, metaDescription);
    
    // Generate keywords
    if (description.includes('{{KEYWORDS}}')) {
      const keywords = yarnProfile ? 
        yarnProfile.seo.keywords.join(', ') : 
        generateSeoKeywords(productName, productSpecs, normalizedCategoryData.keywords, normalizedCategoryData.category);
      
      description = description.replace(/{{KEYWORDS}}/g, keywords);
    } else {
      console.log(chalk.yellow('Плейсхолдер {{KEYWORDS}} отсутствует в шаблоне'));
    }
    
    // Generate additional keywords if the placeholder exists
    if (description.includes('{{ADDITIONAL_KEYWORDS}}')) {
      let additionalKeywords = [];
      
      // Add specifications based keywords
      if (productSpecs.fiberContent) {
        additionalKeywords.push(productSpecs.fiberContent);
      }
      
      if (productSpecs.needleSize) {
        additionalKeywords.push(`${productSpecs.needleSize} needles`);
      }
      
      if (productSpecs.weight) {
        additionalKeywords.push(`${productSpecs.weight} yarn`);
      }
      
      if (productSpecs.length) {
        additionalKeywords.push(`${productSpecs.length} yarn`);
      }
      
      if (productSpecs.origin) {
        additionalKeywords.push(`${productSpecs.origin} yarn`);
      }
      
      // Add some yarn store terms for SEO
      additionalKeywords.push(...[
        "Bendigo Woollen Mills | Australian Wool, Yarn, Patterns and",
        "Black Mountain Yarn Shop",
        "Buy Knitting & Crochet Yarn - Premium Luxury Wool",
        "Buy Wool, Yarn Australia - Online Yarn Store",
        "Buy Yarn at KnitByHeart.dk | Cheap yarn and accessories",
        "Buy Yarn, Knitting Needles, Crochet Hooks",
        "Buy Yarn, Wool, Needles & Other Knitting Supplies Online"
      ]);
      
      description = description.replace(/{{ADDITIONAL_KEYWORDS}}/g, additionalKeywords.join(', '));
    }
    
    // Generate internal links
    if (description.includes('{{INTERNAL_LINKS}}')) {
      const internalLinks = generateSeoInternalLinks(normalizedCategoryData.internalLinks, productName, normalizedCategoryData.category);
      description = description.replace(/{{INTERNAL_LINKS}}/g, internalLinks);
    } else {
      console.log(chalk.yellow('Плейсхолдер {{INTERNAL_LINKS}} отсутствует в шаблоне'));
    }
    
    // Add specifications if the placeholder exists
    if (description.includes('<h3>📋 The Nitty-Gritty Details (Specifications)</h3>')) {
      let specificationsHtml = '<ul>\n';
      
      // Use properties from productSpecs to generate the list
      if (productSpecs.fiberContent) {
        specificationsHtml += `  <li><strong>Fiber Content:</strong> ${productSpecs.fiberContent}</li>\n`;
      }
      
      if (productSpecs.weight) {
        specificationsHtml += `  <li><strong>Ball Weight:</strong> ${productSpecs.weight}</li>\n`;
      }
      
      if (productSpecs.length) {
        specificationsHtml += `  <li><strong>Length per Ball:</strong> ${productSpecs.length}</li>\n`;
      }
      
      if (productSpecs.needleSize) {
        specificationsHtml += `  <li><strong>Recommended Needle Size:</strong> ${productSpecs.needleSize}</li>\n`;
      }
      
      if (productSpecs.gaugeStitches && productSpecs.gaugeRows) {
        specificationsHtml += `  <li><strong>Gauge:</strong> ${productSpecs.gaugeStitches} sts x ${productSpecs.gaugeRows} rows = 10 cm (4")</li>\n`;
      }
      
      if (productSpecs.crochetHook) {
        specificationsHtml += `  <li><strong>Recommended Crochet Hook:</strong> ${productSpecs.crochetHook}</li>\n`;
      }
      
      if (productSpecs.careInstructions) {
        specificationsHtml += `  <li><strong>Care Instructions:</strong> ${productSpecs.careInstructions}</li>\n`;
      }
      
      if (productSpecs.origin) {
        specificationsHtml += `  <li><strong>Origin:</strong> ${productSpecs.origin}</li>\n`;
      }
      
      specificationsHtml += '</ul>';
      
      // Replace the placeholder or existing list
      description = description.replace(
        /(<h3>📋 The Nitty-Gritty Details \(Specifications\)<\/h3>\s*)<ul>.*?<\/ul>/s,
        `$1${specificationsHtml}`
      );
    }
    
    // Add "Perfect For" section with yarn-specific projects if available
    if (description.includes('<h3>🧶 Perfect For</h3>')) {
      let perfectForHtml = '<p>' + productName + ' is ideal for various projects including:</p>\n<ul>\n';
      
      // Use bestFor from yarn profile if available, otherwise generate yarn-specific suggestions
      let projects = [];
      
      if (yarnProfile && yarnProfile.bestFor && yarnProfile.bestFor.length > 0) {
        // Use best for from yarn profile
        yarnProfile.bestFor.forEach(project => {
          perfectForHtml += `  <li>${project}</li>\n`;
        });
      } else if (perplexityData) {
        // Extract projects from Perplexity data
        const perfectForSection = perplexityData.match(/perfect for(.*?)(?:\.|\n|$)/i);
        if (perfectForSection) {
          const projectList = perfectForSection[1].split(/[,;]|\band\b/);
          projects = projectList.map(item => item.trim()).filter(item => item.length > 0);
        }
        
        if (projects.length > 0) {
          // Use extracted projects
          projects.slice(0, 5).forEach(project => {
            const cleanProject = sanitizeText(project);
            perfectForHtml += `  <li>${cleanProject.charAt(0).toUpperCase() + cleanProject.slice(1)}</li>\n`;
          });
        } else {
          // Get intelligent suggestions based on yarn properties
          const suggestions = getProjectSuggestionsForYarn(productName, productSpecs);
          suggestions.forEach(suggestion => {
            perfectForHtml += `  <li>${suggestion}</li>\n`;
          });
        }
      } else {
        // Get intelligent suggestions based on yarn properties
        const suggestions = getProjectSuggestionsForYarn(productName, productSpecs);
        suggestions.forEach(suggestion => {
          perfectForHtml += `  <li>${suggestion}</li>\n`;
        });
      }
      
      perfectForHtml += `</ul>`;
      
      description = description.replace(
        /(<h3>🧶 Perfect For<\/h3>\s*)<p>.*?<\/p>\s*<ul>.*?<\/ul>/s,
        `$1${perfectForHtml}`
      );
    }
    
    // Add FAQs with SEO optimization and structured data
    const faqsHtml = generateSeoFAQs(normalizedCategoryData.faqs, productName, productSpecs, normalizedCategoryData.category);
    description = description.replace(/{{FAQS}}/g, faqsHtml);
    
    // Enhanced call to action
    if (description.includes('<h3>Order Your')) {
      const ctaHtml = `<p>Don't miss out on this exceptional ${normalizedCategoryData.category || 'yarn'}! Add ${productName} to your cart now and experience the joy of crafting with premium materials. Your hands will thank you, and your projects will shine with the distinctive quality that only ${productName} can provide.</p>`;
      
      description = description.replace(
        /(<h3>Order Your.*?<\/h3>\s*)<p>.*?<\/p>/s,
        `$1${ctaHtml}`
      );
    }
    
    // Enhanced SEO keywords
    if (description.includes('seo-keywords')) {
      // Create a mix of product-specific keywords and general category keywords
      let seoKeywords = `<p>Keywords: ${productName.toLowerCase()}`;
      
      if (productSpecs.fiberContent) {
        const fiberTypes = productSpecs.fiberContent.toLowerCase().match(/(\w+)%/g);
        if (fiberTypes && fiberTypes.length > 0) {
          fiberTypes.forEach(type => {
            const fiber = type.replace('%', '');
            if (fiber.length > 2) { // Avoid short fiber names
              seoKeywords += `, ${fiber} yarn`;
            }
          });
        }
      }
      
      // Add product-specific attributes as keywords
      if (productSpecs.features && productSpecs.features.length > 0) {
        const keywordExtract = productSpecs.features
          .join(' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 5)
          .filter(word => !['which', 'where', 'when', 'their', 'there', 'these', 'those', 'with', 'from'].includes(word))
          .slice(0, 5);
        
        keywordExtract.forEach(word => {
          seoKeywords += `, ${word}`;
        });
      }
      
      // Add some general category keywords
      seoKeywords += `, ${normalizedCategoryData.keywords.slice(0, 5).join(', ')}</p>`;
      
      // Add additional keywords
      let additionalKeywords = `<p>Additional keywords: ${productSpecs.fiberContent || ''}`;
      if (productSpecs.needleSize) {
        additionalKeywords += `, ${productSpecs.needleSize} needles`;
      }
      if (productSpecs.weight) {
        additionalKeywords += `, ${productSpecs.weight} yarn`;
      }
      if (productSpecs.length) {
        additionalKeywords += `, ${productSpecs.length.split('(')[0].trim()} yarn`;
      }
      if (productSpecs.origin) {
        additionalKeywords += `, ${productSpecs.origin} yarn`;
      }
      
      // Add more category keywords
      additionalKeywords += `, ${normalizedCategoryData.keywords.slice(5, 15).join(', ')}</p>`;
      
      // Replace the SEO keywords section
      description = description.replace(
        /(<div class="seo-keywords"[^>]*>)\s*<p>Keywords:.*?<\/p>\s*<p>Additional keywords:.*?<\/p>/s,
        `$1\n    ${seoKeywords}\n    ${additionalKeywords}`
      );
    }
    
    // Replace breadcrumb placeholders
    const categoryName = normalizedCategoryData.category.charAt(0).toUpperCase() + normalizedCategoryData.category.slice(1);
    description = description.replace(/{{category}}/g, normalizedCategoryData.category);
    description = description.replace(/{{category_name}}/g, categoryName);
    
    console.log(chalk.green('Описание успешно сгенерировано!'));
    return description;
  } catch (error) {
    console.error(chalk.red('Ошибка при генерации описания:'));
    console.error(error);
    return null;
  }
}

/**
 * Searches for a product in WooCommerce by name or slug
 * @param {string} productName - Product name to search for
 * @returns {Promise<Object|null>} - Product object or null if not found
 */
async function findProductByName(productName) {
  console.log(chalk.blue(`Поиск товара "${productName}" в WooCommerce API...`));
  
  if (!WC_API_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.error(chalk.red('WooCommerce API не настроен. Проверьте файл .env'));
    console.error(chalk.yellow('Требуемые параметры: WOOCOMMERCE_URL, WOOCOMMERCE_KEY, WOOCOMMERCE_SECRET'));
    console.error(chalk.gray('Текущие значения:'));
    console.error(chalk.gray(`WOOCOMMERCE_URL: ${WC_API_URL ? 'Настроен' : 'Отсутствует'}`));
    console.error(chalk.gray(`WOOCOMMERCE_KEY: ${WC_CONSUMER_KEY ? 'Настроен' : 'Отсутствует'}`));
    console.error(chalk.gray(`WOOCOMMERCE_SECRET: ${WC_CONSUMER_SECRET ? 'Настроен' : 'Отсутствует'}`));
    return null;
  }

  try {
    // First try to find by exact name
    console.log(chalk.gray(`Отправка запроса к ${WC_API_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(productName)}`));
    
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
      // Look for exact match
      const exactMatch = response.data.find(p => 
        p.name.toLowerCase() === productName.toLowerCase() ||
        p.slug.includes(productName.toLowerCase().replace(/\s+/g, '-'))
      );
      
      if (exactMatch) {
        console.log(chalk.green(`✓ Найден товар: ID=${exactMatch.id}, Название="${exactMatch.name}"`));
        console.log(chalk.gray(`Ссылка: ${exactMatch.permalink}`));
        return exactMatch;
      }
      
      // If no exact match, show options and use the first result
      console.log(chalk.yellow(`Точное совпадение не найдено. Возможные варианты (${response.data.length}):`));
      response.data.forEach((p, i) => {
        console.log(chalk.cyan(`${i + 1}. ID=${p.id}, Название="${p.name}"`));
      });
      
      console.log(chalk.yellow(`Использую первый результат: ID=${response.data[0].id}, Название="${response.data[0].name}"`));
      return response.data[0];
    }
    
    console.log(chalk.yellow(`Товар "${productName}" не найден в WooCommerce.`));
    return null;
  } catch (error) {
    console.error(chalk.red('Ошибка при поиске товара в WooCommerce:'));
    
    if (error.response) {
      console.error(chalk.red(`Статус ошибки: ${error.response.status}`));
      console.error(chalk.red(`Детали: ${JSON.stringify(error.response.data)}`));
    } else if (error.request) {
      console.error(chalk.red('Нет ответа от сервера. Проверьте подключение или доступность API.'));
    } else {
      console.error(chalk.red(`Ошибка: ${error.message}`));
    }
    
    return null;
  }
}

/**
 * Updates a product description in WooCommerce
 * @param {number|string} productId - Product ID
 * @param {string} description - HTML description to upload
 * @returns {Promise<boolean>} - Success status
 */
async function updateWooCommerceProduct(productId, description) {
  console.log(chalk.blue(`Обновляю описание товара в WooCommerce (ID: ${productId})...`));
  
  if (!WC_API_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.error(chalk.red('WooCommerce API не настроен. Проверьте файл .env'));
    console.error(chalk.yellow('Требуемые параметры: WOOCOMMERCE_URL, WOOCOMMERCE_KEY, WOOCOMMERCE_SECRET'));
    console.error(chalk.gray('Текущие значения:'));
    console.error(chalk.gray(`WOOCOMMERCE_URL: ${WC_API_URL ? 'Настроен' : 'Отсутствует'}`));
    console.error(chalk.gray(`WOOCOMMERCE_KEY: ${WC_CONSUMER_KEY ? 'Настроен' : 'Отсутствует'}`));
    console.error(chalk.gray(`WOOCOMMERCE_SECRET: ${WC_CONSUMER_SECRET ? 'Настроен' : 'Отсутствует'}`));
    return false;
  }

  try {
    // Проверяем существование товара перед обновлением
    const checkUrl = `${WC_API_URL}/wp-json/wc/v3/products/${productId}`;
    console.log(chalk.gray(`Проверка существования товара: ${checkUrl}`));
    
    await axios.get(checkUrl, {
      auth: {
        username: WC_CONSUMER_KEY,
        password: WC_CONSUMER_SECRET
      }
    });
    
    // Обновляем описание товара
    const updateUrl = `${WC_API_URL}/wp-json/wc/v3/products/${productId}`;
    console.log(chalk.gray(`Отправка обновления: ${updateUrl}`));
    
    const response = await axios.put(updateUrl, {
      description: description
    }, {
      auth: {
        username: WC_CONSUMER_KEY,
        password: WC_CONSUMER_SECRET
      }
    });
    
    if (response.data && response.data.id) {
      console.log(chalk.green(`✓ Описание успешно обновлено для товара с ID: ${response.data.id}`));
      console.log(chalk.gray(`Ссылка на товар: ${response.data.permalink}`));
      return true;
    } else {
      console.log(chalk.yellow('Товар обновлен, но нет подтверждения в ответе API'));
      return true;
    }
  } catch (error) {
    console.error(chalk.red('Ошибка при обновлении описания товара:'));
    
    if (error.response) {
      console.error(chalk.red(`Статус ошибки: ${error.response.status}`));
      console.error(chalk.red(`Детали: ${JSON.stringify(error.response.data)}`));
    } else if (error.request) {
      console.error(chalk.red('Нет ответа от сервера. Проверьте подключение или доступность API.'));
    } else {
      console.error(chalk.red(`Ошибка: ${error.message}`));
    }
    
    return false;
  }
}

/**
 * Gets the current product name being processed
 * @returns {string} - The current product name
 */
function getCurrentProductName() {
  return currentProductName;
}

/**
 * Asks the user for input via the command line
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - The user's input
 */
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Saves a generated description to a file
 * @param {string} productName - The name of the product
 * @param {string} description - The generated description
 * @returns {string} - The path to the saved file
 */
function saveDescriptionToFile(productName, description) {
  try {
    const outputDir = path.join(__dirname, 'data', 'output');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Format filename by replacing spaces with underscores
    const filename = `${productName.replace(/\s+/g, '_')}.html`;
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, description, 'utf8');
    console.log(`Description saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error saving description: ${error.message}`);
    return null;
  }
}

/**
 * Проверяет, существует ли уже описание для данного товара
 * @param {string} productName - Название товара
 * @returns {boolean} - true, если файл с описанием уже существует
 */
function checkIfHtmlExists(productName) {
  try {
    const outputDir = path.join(__dirname, 'data', 'output');
    const outputFilename = `${productName.replace(/\s+/g, '_')}_description.html`;
    const outputPath = path.join(outputDir, outputFilename);
    
    return fs.existsSync(outputPath);
  } catch (error) {
    console.error(chalk.red('Ошибка при проверке существующего файла:'), error);
    return false;
  }
}

/**
 * Сохраняет HTML-описание в файл
 * @param {string} productName - Название товара
 * @param {string} html - HTML-описание для сохранения
 * @returns {string|null} - Путь к сохраненному файлу или null в случае ошибки
 */
async function saveHtmlToFile(productName, html) {
  try {
    // Убедимся, что каталог output существует
    const outputDir = path.join(__dirname, 'data', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Формируем имя файла на основе названия товара
    const outputFilename = `${productName.replace(/\s+/g, '_')}_description.html`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Сохраняем описание в файл
    fs.writeFileSync(outputPath, html);
    
    return outputPath;
  } catch (error) {
    console.error(chalk.red('Ошибка при сохранении файла:'), error);
    return null;
  }
}

/**
 * Упрощенная версия main для использования в качестве модуля
 * @param {string} productName - Название товара
 * @param {Object} options - Дополнительные опции
 * @param {string} options.language - Язык для вывода сообщений (ru или en)
 * @param {string} options.templatePath - Путь к файлу шаблона
 * @param {string} options.wooProductId - ID товара в WooCommerce
 * @param {boolean} options.force - Флаг принудительной перезаписи существующего описания
 * @param {boolean} options.uploadToWoo - Флаг загрузки описания в WooCommerce
 * @returns {Promise<Object>} - Объект с результатами генерации
 */
async function simplifiedMain(productName, options = {}) {
  // Устанавливаем значения по умолчанию для опций
  const language = options.language || 'ru';
  const templatePath = options.templatePath || '';
  const wooProductId = options.wooProductId || '';
  const force = options.force || false;
  const uploadToWoo = options.uploadToWoo || false;
  
  console.log(`Starting description generation for: ${productName}`);
  
  // Проверяем, что productName задан
  if (!productName) {
    const errorMessage = language === 'ru' ? 'Ошибка: Имя товара не указано. Завершение программы.' 
      : 'Error: Product name not specified. Exiting.';
    console.error(chalk.red(errorMessage));
    process.exit(1);
  }
  
  try {
    // Загружаем семантическое ядро
    const semanticCore = await loadSemanticCore();
    if (!semanticCore) {
      const errorMessage = language === 'ru' ? 'Не удалось загрузить семантическое ядро. Завершение программы.' 
        : 'Failed to load semantic core. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Определяем категорию товара
    const category = detectCategory(productName, semanticCore);
    console.log(`Determined product category: ${category}`);
    
    // Загружаем шаблон с учетом категории товара
    const template = loadTemplate(templatePath, category);
    if (!template) {
      const errorMessage = language === 'ru' ? 'Не удалось загрузить шаблон. Завершение программы.' 
        : 'Failed to load template. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Проверяем, существует ли уже HTML-описание
    if (!force) {
      const existingHtml = checkForExistingHTML(productName);
      if (existingHtml) {
        const message = language === 'ru' ? 
          `HTML-файл для "${productName}" уже существует: ${existingHtml}. Используйте опцию --force для перезаписи.` : 
          `HTML file for "${productName}" already exists: ${existingHtml}. Use --force option to overwrite.`;
        console.log(chalk.yellow(message));
        return {
          success: false,
          message: message,
          productName,
          category,
          filePath: existingHtml
        };
      }
    }
    
    // Получаем данные категории из семантического ядра
    const categoryData = semanticCore[category] || {};
    categoryData.category = category;
    
    // Генерируем описание товара
    const description = await generateDescription(productName, categoryData, template);
    if (!description) {
      const errorMessage = language === 'ru' ? 'Не удалось сгенерировать описание. Завершение программы.' 
        : 'Failed to generate description. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Сохраняем описание в файл
    const filePath = saveDescriptionToFile(productName, description);
    
    // Загружаем описание в WooCommerce, если указан флаг
    if (uploadToWoo) {
      let productId = wooProductId;
      if (!productId) {
        // Автоматический поиск ID по названию
        console.log(chalk.blue(`Ищу ID товара в WooCommerce по названию: "${productName}"...`));
        const foundProduct = await findProductByName(productName);
        if (foundProduct && foundProduct.id) {
          productId = foundProduct.id;
          console.log(chalk.green(`Найден ID товара: ${productId}`));
        } else {
          console.error(chalk.red(`Не удалось найти товар "${productName}" в WooCommerce. Описание не загружено.`));
          console.error(chalk.yellow('Возможные причины:'));
          console.error(chalk.yellow('1. Товар не существует в WooCommerce'));
          console.error(chalk.yellow('2. Название не совпадает точно (проверьте орфографию)'));
          console.error(chalk.yellow('3. API WooCommerce не настроен (проверьте .env)'));
          console.error(chalk.yellow('Решения:'));
          console.error(chalk.yellow('- Укажите ID товара вручную: --woo 1234'));
          console.error(chalk.yellow('- Проверьте настройки в .env файле'));
          return {
            success: false,
            message: `Не найден товар в WooCommerce: ${productName}`,
            productName,
            category,
            filePath
          };
        }
      }
      
      const uploadResult = await updateWooCommerceProduct(productId, description);
      if (uploadResult) {
        const successMessage = language === 'ru' ? 
          `Описание успешно загружено в WooCommerce для товара с ID: ${productId}` : 
          `Description successfully uploaded to WooCommerce for product with ID: ${productId}`;
        console.log(chalk.green(successMessage));
      } else {
        const errorMessage = language === 'ru' ? 
          `Ошибка при загрузке описания в WooCommerce для ID: ${productId}` : 
          `Error uploading description to WooCommerce for ID: ${productId}`;
        console.error(chalk.red(errorMessage));
      }
    }
    
    console.log('Done!');
    return {
      success: true,
      productName,
      category,
      filePath
    };
  } catch (error) {
    const errorMessage = language === 'ru' ? 
      `Произошла непредвиденная ошибка: ${error.message}` : 
      `An unexpected error occurred: ${error.message}`;
    console.error(chalk.red(errorMessage));
    console.error(error);
    process.exit(1);
  }
}

// Модифицируем main() для поддержки нового режима работы
async function main() {
  try {
    // Получаем аргументы командной строки
    const args = process.argv.slice(2);
    let productName = '';
    let templatePath = '';
    let outputToWoo = false;
    let language = process.env.DEFAULT_LANGUAGE || 'en'; // Язык по умолчанию
    let force = false;
    let wooProdId = '';
    let simplified = false;
    
    // Парсим аргументы
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--template' || args[i] === '-t') {
        templatePath = args[i + 1];
        i++;
      } else if (args[i] === '--woo' || args[i] === '-w') {
        outputToWoo = true;
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          wooProdId = args[i + 1];
          i++;
        }
      } else if (args[i] === '--force' || args[i] === '-f') {
        force = true;
      } else if (args[i] === '--lang' || args[i] === '-l') {
        language = args[i + 1];
        i++;
      } else if (args[i] === '--simplified' || args[i] === '-s') {
        simplified = true;
      } else if (!productName && !args[i].startsWith('-')) {
        productName = args[i];
      }
    }
    
    // Проверяем, есть ли справка в командной строке
    if (args.includes('--help') || args.includes('-h')) {
      console.log(chalk.blue('Использование: node generate_single_description.js [название товара] [опции]'));
      console.log(chalk.blue('Опции:'));
      console.log(chalk.blue('  --template, -t [путь]    Путь к шаблону (по умолчанию используется встроенный)'));
      console.log(chalk.blue('  --woo, -w [ID]           Загрузить описание в WooCommerce (опционально с ID)'));
      console.log(chalk.blue('  --force, -f              Перезаписать существующее описание без запроса'));
      console.log(chalk.blue('  --lang, -l [язык]        Указать язык (en, ru, и т.д.) (по умолчанию: ' + language + ')'));
      console.log(chalk.blue('  --simplified, -s         Использовать упрощенный режим без интерактивных запросов'));
      console.log(chalk.blue('  --help, -h               Показать эту справку'));
      process.exit(0);
    }
    
    // Если включен упрощенный режим, используем его
    if (simplified) {
      return await simplifiedMain(productName, {
        language,
        templatePath,
        force,
        outputToWoo,
        wooProdId
      });
    }
    
    // Иначе продолжаем со стандартным интерактивным режимом
    // Если название товара не указано в аргументах, запрашиваем его
    if (!productName) {
      const languagePrefix = language === 'ru' ? 'Введите' : 'Enter';
      productName = await promptForInput(`${languagePrefix} product name: `);
      if (!productName) {
        const errorPrefix = language === 'ru' ? 'Название товара не указано. Завершение программы.' 
                                            : 'Product name not specified. Exiting.';
        console.error(chalk.red(errorPrefix));
        process.exit(1);
      }
    }
    
    // Выводим информацию на языке, указанном пользователем
    const startMessage = language === 'ru' ? `Начинаем генерацию описания для: ${productName}` 
                                          : `Starting description generation for: ${productName}`;
    console.log(chalk.blue(startMessage));
    
    // Загружаем семантическое ядро
    const semanticCore = await loadSemanticCore();
    if (!semanticCore) {
      const errorMessage = language === 'ru' ? 'Не удалось загрузить семантическое ядро. Завершение программы.' 
                                            : 'Failed to load semantic core. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Определяем категорию товара
    const category = detectCategory(productName, semanticCore);
    if (!category) {
      const errorMessage = language === 'ru' ? 'Не удалось определить категорию товара. Завершение программы.' 
                                            : 'Failed to determine product category. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    const categoryMessage = language === 'ru' ? `Определена категория товара: ${category}` 
                                             : `Determined product category: ${category}`;
    console.log(chalk.green(categoryMessage));
    
    // Получаем данные категории из семантического ядра
    const categoryData = semanticCore[category];
    if (!categoryData) {
      const errorMessage = language === 'ru' 
        ? `Данные для категории '${category}' не найдены в семантическом ядре.` 
        : `Data for category '${category}' not found in semantic core.`;
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Загружаем шаблон
    const template = loadTemplate(templatePath, category);
    if (!template) {
      const errorMessage = language === 'ru' ? 'Не удалось загрузить шаблон. Завершение программы.' 
                                            : 'Failed to load template. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Проверяем, существует ли уже описание
    if (checkIfHtmlExists(productName) && !force) {
      const overwritePrompt = language === 'ru' 
        ? 'Для этого товара уже существует описание. Хотите перезаписать его? (y/n): ' 
        : 'Description for this product already exists. Do you want to overwrite it? (y/n): ';
      const overwrite = await promptForConfirmation(overwritePrompt);
      if (!overwrite) {
        const cancelMessage = language === 'ru' ? 'Операция отменена.' : 'Operation cancelled.';
        console.log(chalk.yellow(cancelMessage));
        process.exit(0);
      }
    }
    
    // Генерируем описание
    const description = await generateDescription(productName, categoryData, template);
    if (!description) {
      const errorMessage = language === 'ru' ? 'Не удалось сгенерировать описание. Завершение программы.' 
                                            : 'Failed to generate description. Exiting.';
      console.error(chalk.red(errorMessage));
      process.exit(1);
    }
    
    // Сохраняем результат в файл
    const savedPath = await saveHtmlToFile(productName, description);
    if (savedPath) {
      const savedMessage = language === 'ru' ? `Описание сохранено в файл: ${savedPath}` 
                                            : `Description saved to file: ${savedPath}`;
      console.log(chalk.green(savedMessage));
    }
    
    // Если указан флаг для WooCommerce, используем ID из параметров или запрашиваем его
    if (outputToWoo) {
      let productId = wooProdId;
      
      // Если ID не был передан через аргументы, запрашиваем его
      if (!productId) {
        const idPrompt = language === 'ru' ? 'Введите ID товара в WooCommerce: ' 
                                        : 'Enter WooCommerce product ID: ';
        productId = await promptForInput(idPrompt);
      }
      
      if (productId && !isNaN(Number(productId))) {
        const updateMessage = language === 'ru' ? `Обновляем описание товара с ID ${productId}...` 
                                               : `Updating product description with ID ${productId}...`;
        console.log(chalk.blue(updateMessage));
        
        const updated = await updateWooCommerceProduct(productId, description);
        if (updated) {
          const successMessage = language === 'ru' 
            ? `Описание успешно загружено в WooCommerce для товара с ID: ${productId}` 
            : `Description successfully uploaded to WooCommerce for product with ID: ${productId}`;
          console.log(chalk.green(successMessage));
        }
      } else {
        const errorMessage = language === 'ru' 
          ? 'ID товара не указан или неверный формат. Пропускаем загрузку в WooCommerce.' 
          : 'Product ID not specified or invalid format. Skipping WooCommerce upload.';
        console.log(chalk.yellow(errorMessage));
      }
    }
    
    const doneMessage = language === 'ru' ? 'Готово!' : 'Done!';
    console.log(chalk.green(doneMessage));
    
    return {
      category,
      description,
      savedPath
    };
    
  } catch (error) {
    const errorMessage = process.env.DEFAULT_LANGUAGE === 'ru' 
      ? 'Произошла ошибка в процессе выполнения программы:' 
      : 'An error occurred during program execution:';
    console.error(chalk.red(errorMessage));
    console.error(error);
    process.exit(1);
  }
}

// Вспомогательная функция для запроса ввода пользователя
async function promptForInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Вспомогательная функция для запроса подтверждения
async function promptForConfirmation(prompt) {
  const answer = await promptForInput(prompt);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

// Запускаем скрипт, если он вызван напрямую
if (require.main === module) {
  main();
}

// Экспортируем функции для использования в других скриптах
module.exports = {
  loadSemanticCore,
  detectCategory,
  loadTemplate,
  checkForExistingHTML,
  generateDescription,
  findProductByName,
  saveHtmlToFile,
  updateWooCommerceProduct,
  simplifiedMain
}; 