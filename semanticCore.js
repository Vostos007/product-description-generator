// semanticCore.js
// Модуль для работы с семантическим ядром Hollywool
// Позволяет безопасно загружать, валидировать и получать данные по категории товара

const fs = require('fs');
const path = require('path');

/**
 * Загружает семантическое ядро из JSON-файла
 * @param {string} filePath - Путь к JSON-файлу с семантическим ядром
 * @returns {Object} - Объект семантического ядра
 */
function loadSemanticCore(filePath) {
  try {
    // Массив возможных путей для поиска файла с семантическим ядром
    const possiblePaths = [
      filePath, // Использовать переданный путь, если он есть
      path.join(__dirname, 'semantic_core_draft.json'), // Локальный файл
      path.join(__dirname, '../semantic_core_draft.json'), // Файл в родительской директории
      path.join(__dirname, 'data/semantic_core_draft.json'), // Файл в поддиректории data
      path.join(__dirname, 'data/input/semantic_core_draft.json') // Файл в поддиректории data/input
    ];
    
    // Отфильтрованный список путей (убираем undefined и null)
    const validPaths = possiblePaths.filter(p => p);
    
    // Поиск первого существующего файла
    let foundPath = null;
    for (const p of validPaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    
    if (!foundPath) {
      throw new Error(`Semantic core file not found in any of these locations: ${validPaths.join(', ')}`);
    }
    
    console.log(`Loading semantic core from: ${foundPath}`);
    const rawData = fs.readFileSync(foundPath, 'utf8');
    const semanticCore = JSON.parse(rawData);
    
    // Валидация структуры семантического ядра
    validateSemanticCoreStructure(semanticCore);
    
    // Создаем тестовое ядро, если настоящего нет
    if (Object.keys(semanticCore).length === 0) {
      console.warn('Warning: Semantic core is empty, using test data');
      return createTestSemanticCore();
    }
    
    console.log(`Semantic core loaded successfully with ${Object.keys(semanticCore).length} categories`);
    return semanticCore;
  } catch (error) {
    console.error(`Error loading semantic core: ${error.message}`);
    
    // Если произошла ошибка чтения/парсинга файла, создаем тестовое ядро
    console.warn('Using test semantic core as fallback');
    return createTestSemanticCore();
  }
}

/**
 * Создает тестовое семантическое ядро для отладки
 * @returns {Object} - Тестовое семантическое ядро
 */
function createTestSemanticCore() {
  return {
    "yarn": {
      "products": [
        {"slug": "merino-wool", "url": "/product/merino-wool/"},
        {"slug": "cotton-yarn", "url": "/product/cotton-yarn/"},
        {"slug": "alpaca-yarn", "url": "/product/alpaca-yarn/"}
      ],
      "keywords": [
        "yarn", "wool", "knitting yarn", "crochet yarn", "merino wool", 
        "cotton yarn", "alpaca yarn", "hand dyed yarn", "yarn for knitting",
        "yarn for crochet", "premium yarn", "soft yarn", "bulky yarn", "dk weight yarn"
      ],
      "internal_links": [
        {"title": "Knitting Needles", "url": "/product-category/accessories/knitting-needles/"},
        {"title": "Crochet Hooks", "url": "/product-category/accessories/crochet-hooks/"},
        {"title": "Knitting Patterns", "url": "/product-category/patterns/knitting-patterns/"},
        {"title": "Crochet Patterns", "url": "/product-category/patterns/crochet-patterns/"}
      ],
      "faq": [
        {
          "question": "What is the difference between wool and acrylic yarn?",
          "answer": "Wool is a natural fiber from sheep that provides warmth, breathability, and natural elasticity. Acrylic yarn is synthetic, more affordable, machine washable, and comes in vibrant colors. Wool is typically warmer and more durable but may require special care."
        },
        {
          "question": "How much yarn do I need for a sweater?",
          "answer": "For an adult sweater, you typically need 1000-1500 yards (900-1400 meters) of worsted weight yarn. The exact amount depends on the size, pattern complexity, and yarn weight. Always buy an extra skein to ensure you have enough for your project."
        },
        {
          "question": "How do I prevent yarn from tangling?",
          "answer": "To prevent yarn from tangling, use a yarn bowl or bag, work from the center pull of the skein, store yarn properly in bags or containers, and avoid pulling too much yarn at once. Wind hanks into balls before using them."
        }
      ]
    },
    "knitting": {
      "products": [
        {"slug": "knitting-needles-set", "url": "/product/knitting-needles-set/"},
        {"slug": "circular-needles", "url": "/product/circular-needles/"}
      ],
      "keywords": [
        "knitting", "knitting needles", "knitting patterns", "circular needles",
        "knitting for beginners", "knit stitches", "learn to knit", "knitting tutorials",
        "knitting techniques", "knitting accessories", "knitting supplies"
      ],
      "internal_links": [
        {"title": "Premium Yarn Selection", "url": "/product-category/yarn/"},
        {"title": "Knitting Pattern Books", "url": "/product-category/books/knitting-books/"},
        {"title": "Knitting Accessories", "url": "/product-category/accessories/"}
      ],
      "faq": [
        {
          "question": "What knitting needles are best for beginners?",
          "answer": "Beginners should start with medium-sized straight needles (US size 7-9 or 4.5-5.5mm) made of wood or bamboo. These materials provide enough grip to prevent stitches from slipping while learning. Avoid very small or large needles until you've mastered the basics."
        },
        {
          "question": "How do I read a knitting pattern?",
          "answer": "Knitting patterns contain abbreviations, terminology, and instructions for creating a project. Start by understanding the skill level, materials, gauge, and abbreviations used. Follow the pattern row by row, paying attention to stitch counts and any special instructions. Most patterns include a key explaining all abbreviations."
        }
      ]
    },
    "crochet": {
      "products": [
        {"slug": "crochet-hooks-set", "url": "/product/crochet-hooks-set/"},
        {"slug": "ergonomic-crochet-hooks", "url": "/product/ergonomic-crochet-hooks/"}
      ],
      "keywords": [
        "crochet", "crochet hooks", "crochet patterns", "amigurumi patterns",
        "crochet for beginners", "learn to crochet", "crochet stitches",
        "crochet techniques", "crochet accessories", "crochet supplies"
      ],
      "internal_links": [
        {"title": "Quality Yarn for Crochet", "url": "/product-category/yarn/"},
        {"title": "Crochet Pattern Collections", "url": "/product-category/patterns/crochet-patterns/"},
        {"title": "Crochet Accessories", "url": "/product-category/accessories/crochet-accessories/"}
      ],
      "faq": [
        {
          "question": "What is the difference between knitting and crochet?",
          "answer": "Knitting uses two needles to create rows of stitches, while crochet uses one hook to create stitches. Crochet generally creates a thicker fabric and is often easier for beginners to learn. Knitting typically produces a more elastic, drapey fabric that's ideal for garments."
        },
        {
          "question": "What size crochet hook should a beginner use?",
          "answer": "Beginners should start with a medium-sized hook (US size G/6 or H/8, or 4.0-5.0mm) and worsted weight yarn. These sizes are comfortable to hold and make stitches that are easy to see and count while learning the basic techniques."
        }
      ]
    },
    "tools": {
      "products": [
        {"slug": "yarn-winder", "url": "/product/yarn-winder/"},
        {"slug": "stitch-markers", "url": "/product/stitch-markers/"},
        {"slug": "yarn-bowl", "url": "/product/yarn-bowl/"}
      ],
      "keywords": [
        "knitting tools", "crochet tools", "yarn winder", "yarn swift",
        "stitch markers", "row counters", "blocking mats", "yarn bowl",
        "measuring tape", "scissors for yarn", "knitting accessories"
      ],
      "internal_links": [
        {"title": "Premium Yarn", "url": "/product-category/yarn/"},
        {"title": "Knitting Needles", "url": "/product-category/accessories/knitting-needles/"},
        {"title": "Crochet Hooks", "url": "/product-category/accessories/crochet-hooks/"}
      ],
      "faq": [
        {
          "question": "What are essential tools for knitting?",
          "answer": "Essential knitting tools include: knitting needles, yarn, scissors, tape measure, stitch markers, yarn needle, and a row counter. Additional helpful tools are cable needles, stitch holders, blocking mats, and a project bag to keep everything organized."
        },
        {
          "question": "How do I use a yarn bowl?",
          "answer": "Place your ball of yarn in the yarn bowl with the working end fed through the spiral cutout or J-shaped slot. This allows the yarn to flow smoothly while knitting or crocheting, preventing the ball from rolling away or getting tangled, while keeping your project clean and organized."
        }
      ]
    }
  };
}

/**
 * Валидирует структуру объекта семантического ядра
 * @param {Object} semanticCore - Объект семантического ядра
 * @throws {Error} Если структура невалидна
 */
function validateSemanticCoreStructure(semanticCore) {
  if (!semanticCore || typeof semanticCore !== 'object') {
    throw new Error('Semantic core must be an object');
  }
  
  // Проверка наличия хотя бы одной категории
  if (Object.keys(semanticCore).length === 0) {
    throw new Error('Semantic core must contain at least one category');
  }
  
  // Валидация каждой категории
  for (const [category, categoryData] of Object.entries(semanticCore)) {
    if (!categoryData || typeof categoryData !== 'object') {
      throw new Error(`Category '${category}' must be an object`);
    }
    
    // Проверка обязательных полей
    const requiredFields = ['keywords', 'products'];
    for (const field of requiredFields) {
      if (!categoryData[field]) {
        console.warn(`Warning: Category '${category}' is missing the '${field}' field`);
      }
    }
    
    // Валидация ключевых слов, если они есть
    if (categoryData.keywords && !Array.isArray(categoryData.keywords)) {
      throw new Error(`Keywords for category '${category}' must be an array`);
    }
    
    // Валидация товаров, если они есть
    if (categoryData.products && !Array.isArray(categoryData.products)) {
      throw new Error(`Products for category '${category}' must be an array`);
    }
    
    // Валидация внутренних ссылок, если они есть
    if (categoryData.internal_links && !Array.isArray(categoryData.internal_links)) {
      throw new Error(`Internal links for category '${category}' must be an array`);
    }
    
    // Валидация FAQ, если они есть
    if (categoryData.faq && !Array.isArray(categoryData.faq)) {
      throw new Error(`FAQ for category '${category}' must be an array`);
    }
  }
}

/**
 * Получает данные для конкретной категории из семантического ядра
 * @param {Object} semanticCore - Объект семантического ядра
 * @param {string} category - Название категории
 * @returns {Object|null} - Данные категории или null, если категория не найдена
 */
function getCategoryData(semanticCore, category) {
  if (!semanticCore || !semanticCore[category]) {
    console.warn(`Category '${category}' not found in semantic core`);
    return null;
  }
  return semanticCore[category];
}

/**
 * Получает случайные ключевые слова из семантического ядра для категории
 * @param {Object} semanticCore - Объект семантического ядра
 * @param {string} category - Название категории
 * @param {number} count - Количество ключевых слов
 * @param {string} language - Язык ключевых слов (en или ru)
 * @returns {Array<string>} - Массив ключевых слов
 */
function getRandomKeywords(semanticCore, category, count = 5, language = 'en') {
  try {
    const categoryData = getCategoryData(semanticCore, category);
    
    // Ключевые слова по умолчанию для разных языков
    const defaultKeywords = {
      en: [
        'knitting', 'crochet', 'yarn', 'wool', 'craft supplies', 
        'hollywool', 'knitting patterns', 'needles', 'handmade', 'DIY'
      ],
      ru: [
        'вязание', 'крючком', 'пряжа', 'шерсть', 'товары для рукоделия',
        'hollywool', 'схемы вязания', 'спицы', 'хендмейд', 'своими руками'
      ]
    };
    
    // Используем ключевые слова для указанного языка или английские, если языка нет
    const localeKeywords = defaultKeywords[language] || defaultKeywords.en;
    
    // Проверяем наличие категории и ключевых слов
    if (!categoryData || !categoryData.keywords || !Array.isArray(categoryData.keywords) || categoryData.keywords.length === 0) {
      console.warn(`No valid keywords found for category '${category}', using defaults`);
      return localeKeywords.slice(0, count);
    }
    
    // Если у нас меньше ключевых слов, чем запрошено, возвращаем все
    if (categoryData.keywords.length <= count) {
      return categoryData.keywords;
    }
    
    // Выбираем случайные ключевые слова
    const selectedKeywords = [];
    const availableKeywords = [...categoryData.keywords];
    
    for (let i = 0; i < count && availableKeywords.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableKeywords.length);
      selectedKeywords.push(availableKeywords[randomIndex]);
      availableKeywords.splice(randomIndex, 1);
    }
    
    return selectedKeywords;
  } catch (error) {
    console.error(`Error getting random keywords: ${error.message}`);
    const fallbackKeywords = language === 'ru' 
      ? ['вязание', 'крючком', 'пряжа', 'шерсть', 'рукоделие']
      : ['knitting', 'crochet', 'yarn', 'wool', 'craft'];
    return fallbackKeywords.slice(0, count);
  }
}

/**
 * Получает случайные внутренние ссылки из семантического ядра для категории
 * @param {Object} semanticCore - Объект семантического ядра
 * @param {string} category - Название категории
 * @param {number} count - Количество ссылок
 * @param {string} language - Язык для ссылок (en или ru)
 * @returns {Array<Object>} - Массив ссылок с заголовками и URL
 */
function getRandomInternalLinks(semanticCore, category, count = 3, language = 'en') {
  try {
    // Ссылки по умолчанию для разных языков
    const defaultLinks = {
      en: [
        { title: 'All Yarn', url: '/product-category/yarn/' },
        { title: 'Homepage', url: '/' },
        { title: 'Knitting Needles', url: '/product-category/accessories/knitting-needles/' },
        { title: 'Crochet Hooks', url: '/product-category/accessories/crochet-hooks/' },
        { title: 'Knitting Patterns', url: '/product-category/patterns/knitting-patterns/' }
      ],
      ru: [
        { title: 'Вся пряжа', url: '/product-category/yarn/' },
        { title: 'Главная страница', url: '/' },
        { title: 'Спицы для вязания', url: '/product-category/accessories/knitting-needles/' },
        { title: 'Крючки для вязания', url: '/product-category/accessories/crochet-hooks/' },
        { title: 'Схемы для вязания', url: '/product-category/patterns/knitting-patterns/' }
      ]
    };
    
    // Используем ссылки для указанного языка или английские, если языка нет
    const localeLinks = defaultLinks[language] || defaultLinks.en;
    
    // Получаем текущее имя продукта из импортированной функции, если доступно
    let currentProductName = '';
    try {
      const generateScript = require('./generate_single_description');
      if (typeof generateScript.getCurrentProductName === 'function') {
        currentProductName = generateScript.getCurrentProductName();
      }
    } catch (err) {
      // Игнорируем ошибку, если функция недоступна
    }
    
    const categoryData = getCategoryData(semanticCore, category);
    let selectedLinks = [];
    
    // Проверяем наличие категории и внутренних ссылок
    if (categoryData && categoryData.internal_links && Array.isArray(categoryData.internal_links) && categoryData.internal_links.length > 0) {
      // Фильтруем текущий продукт из ссылок, если он существует
      const availableLinks = categoryData.internal_links.filter(link => 
        !currentProductName || (link.title && !link.title.includes(currentProductName))
      );
      
      if (availableLinks.length > 0) {
        // Если у нас меньше ссылок, чем запрошено, используем все доступные
        if (availableLinks.length <= count) {
          selectedLinks = [...availableLinks];
        } else {
          // В противном случае выбираем случайные ссылки
          for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * availableLinks.length);
            selectedLinks.push(availableLinks[randomIndex]);
            availableLinks.splice(randomIndex, 1);
          }
        }
      }
    }
    
    // Если нет внутренних ссылок, пытаемся использовать ссылки на продукты как запасной вариант
    if (selectedLinks.length === 0 && categoryData && categoryData.products && Array.isArray(categoryData.products)) {
      const availableProducts = categoryData.products.filter(product => 
        !currentProductName || (product.name && !product.name.includes(currentProductName))
      );
      
      if (availableProducts.length > 0) {
        for (let i = 0; i < Math.min(count, availableProducts.length); i++) {
          const randomIndex = Math.floor(Math.random() * availableProducts.length);
          const product = availableProducts[randomIndex];
          
          if (product && product.name && product.slug) {
            selectedLinks.push({
              title: product.name,
              url: `/product/${product.slug}/`
            });
          }
          
          availableProducts.splice(randomIndex, 1);
        }
      }
    }
    
    // Если у нас все еще меньше ссылок, чем запрошено, добавляем дефолтные ссылки
    if (selectedLinks.length < count) {
      const neededDefaults = count - selectedLinks.length;
      for (let i = 0; i < neededDefaults && i < localeLinks.length; i++) {
        selectedLinks.push(localeLinks[i]);
      }
    }
    
    // Переводим заголовки ссылок, если используется русский язык
    if (language === 'ru' && selectedLinks.some(link => !isRussian(link.title))) {
      selectedLinks = selectedLinks.map(link => {
        return {
          title: translateLinkTitle(link.title, 'ru'),
          url: link.url
        };
      });
    }
    
    return selectedLinks;
  } catch (error) {
    console.error(`Error getting random internal links: ${error.message}`);
    
    // Запасные ссылки в случае ошибки
    if (language === 'ru') {
      return [
        { title: 'Главная страница', url: '/' },
        { title: 'Вся пряжа', url: '/product-category/yarn/' },
        { title: 'Аксессуары', url: '/product-category/accessories/' }
      ].slice(0, count);
    } else {
      return [
        { title: 'Homepage', url: '/' },
        { title: 'All Yarn', url: '/product-category/yarn/' },
        { title: 'Accessories', url: '/product-category/accessories/' }
      ].slice(0, count);
    }
  }
}

/**
 * Получает случайные FAQ из семантического ядра для категории
 * @param {Object} semanticCore - Объект семантического ядра
 * @param {string} category - Название категории
 * @param {number} count - Количество FAQ
 * @param {string} language - Язык для FAQ (en или ru)
 * @returns {Array<Object>} - Массив FAQ с вопросами и ответами
 */
function getRandomFAQs(semanticCore, category, count = 2, language = 'en') {
  try {
    // FAQ по умолчанию для разных языков
    const defaultFAQs = {
      en: [
        { 
          question: 'What types of yarn do you offer?', 
          answer: 'At Hollywool, we offer a wide range of high-quality yarns, including wool, cotton, acrylic, alpaca, and many blended options. Our selection caters to all project types from delicate lace to chunky knits.'
        },
        { 
          question: 'How do I choose the right yarn for my project?', 
          answer: 'Consider the weight of yarn needed for your pattern, the fiber content (natural or synthetic), and the care requirements. We recommend checking your pattern for specific yarn recommendations and always purchasing enough yarn from the same dye lot to complete your project.'
        },
        { 
          question: 'Do you ship internationally?', 
          answer: 'Yes! We ship to most countries worldwide. Shipping costs and delivery times vary by location. Please check our shipping policy for detailed information about delivery to your country.'
        },
        {
          question: 'What knitting accessories do you recommend for beginners?',
          answer: 'For beginners, we recommend starting with a pair of medium-sized knitting needles (US size 8-10), some wooden or bamboo needles which are easier to handle, a yarn needle for weaving in ends, and some stitch markers. Visit our accessories section for quality beginner-friendly tools.'
        }
      ],
      ru: [
        { 
          question: 'Какие виды пряжи вы предлагаете?', 
          answer: 'В Hollywool мы предлагаем широкий ассортимент высококачественной пряжи, включая шерсть, хлопок, акрил, альпаку и множество смесовых вариантов. Наш выбор подходит для всех типов проектов от нежного кружева до объёмной вязки.'
        },
        { 
          question: 'Как выбрать правильную пряжу для моего проекта?', 
          answer: 'Учитывайте толщину пряжи, необходимую для вашей схемы, состав волокна (натуральное или синтетическое) и требования по уходу. Мы рекомендуем проверять схему на наличие конкретных рекомендаций по пряже и всегда покупать достаточное количество пряжи из одной партии для завершения проекта.'
        },
        { 
          question: 'Осуществляете ли вы международную доставку?', 
          answer: 'Да! Мы доставляем в большинство стран мира. Стоимость доставки и сроки варьируются в зависимости от местоположения. Пожалуйста, ознакомьтесь с нашей политикой доставки для получения подробной информации о доставке в вашу страну.'
        },
        {
          question: 'Какие аксессуары для вязания вы рекомендуете начинающим?',
          answer: 'Для начинающих мы рекомендуем начать с пары спиц среднего размера (US размер 8-10), деревянных или бамбуковых спиц, которыми легче пользоваться, иглы для пряжи для заправки концов и маркеров петель. Посетите наш раздел аксессуаров для качественных инструментов, подходящих для начинающих.'
        }
      ]
    };
    
    // Используем FAQ для указанного языка или английские, если языка нет
    const localeFAQs = defaultFAQs[language] || defaultFAQs.en;
    
    const categoryData = getCategoryData(semanticCore, category);
    let selectedFAQs = [];
    
    // Проверяем наличие категории и FAQ
    if (categoryData && categoryData.faq && Array.isArray(categoryData.faq) && categoryData.faq.length > 0) {
      // Фильтруем FAQ, в которых нет вопроса или ответа
      const validFAQs = categoryData.faq.filter(faq => 
        faq && typeof faq === 'object' && faq.question && faq.answer
      );
      
      if (validFAQs.length > 0) {
        // Если у нас меньше FAQ, чем запрошено, используем все доступные
        if (validFAQs.length <= count) {
          selectedFAQs = [...validFAQs];
        } else {
          // В противном случае выбираем случайные FAQ
          for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * validFAQs.length);
            selectedFAQs.push(validFAQs[randomIndex]);
            validFAQs.splice(randomIndex, 1);
          }
        }
      }
    }
    
    // Если у нас меньше FAQ, чем запрошено, добавляем дефолтные FAQ
    if (selectedFAQs.length < count) {
      const neededDefaults = count - selectedFAQs.length;
      for (let i = 0; i < neededDefaults && i < localeFAQs.length; i++) {
        selectedFAQs.push(localeFAQs[i]);
      }
    }
    
    // Переводим вопросы и ответы, если используется русский язык и FAQ на английском
    if (language === 'ru') {
      selectedFAQs = selectedFAQs.map(faq => {
        if (!isRussian(faq.question) || !isRussian(faq.answer)) {
          return {
            question: translateFAQText(faq.question, 'ru'),
            answer: translateFAQText(faq.answer, 'ru')
          };
        }
        return faq;
      });
    }
    
    return selectedFAQs;
  } catch (error) {
    console.error(`Error getting random FAQs: ${error.message}`);
    
    // Запасные FAQ в случае ошибки
    if (language === 'ru') {
      return [
        { 
          question: 'Какие виды пряжи вы предлагаете?', 
          answer: 'Мы предлагаем разнообразные виды пряжи, включая шерсть, хлопок, акрил и смесовые варианты для всех ваших проектов по вязанию крючком и спицами.'
        },
        { 
          question: 'Как выбрать правильную пряжу для моего проекта?', 
          answer: 'Учитывайте требования схемы, желаемую драпировку и предпочтения по волокнам. Наши подробные описания товаров помогут вам сделать идеальный выбор.'
        }
      ].slice(0, count);
    } else {
      return [
        { 
          question: 'What types of yarn do you offer?', 
          answer: 'We offer a wide variety of yarns including wool, cotton, acrylic, and blends to suit all your knitting and crochet needs.' 
        },
        { 
          question: 'How do I choose the right yarn for my project?', 
          answer: 'Consider your pattern requirements, desired drape, and fiber preferences. Our detailed product descriptions will help you make the perfect choice.' 
        }
      ].slice(0, count);
    }
  }
}

/**
 * Проверяет, содержит ли текст русские символы
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true, если текст содержит русские символы
 */
function isRussian(text) {
  if (!text || typeof text !== 'string') return false;
  return /[а-яА-ЯёЁ]/.test(text);
}

/**
 * Простой перевод заголовков ссылок на русский язык
 * @param {string} title - Заголовок ссылки на английском
 * @param {string} targetLang - Целевой язык (ru или en)
 * @returns {string} - Переведенный заголовок
 */
function translateLinkTitle(title, targetLang = 'ru') {
  if (!title || typeof title !== 'string') return title;
  
  // Карта переводов для распространенных заголовков ссылок
  const translations = {
    'All Yarn': 'Вся пряжа',
    'Homepage': 'Главная страница',
    'Knitting Needles': 'Спицы для вязания',
    'Crochet Hooks': 'Крючки для вязания',
    'Knitting Patterns': 'Схемы для вязания',
    'Accessories': 'Аксессуары',
    'Yarn': 'Пряжа',
    'Patterns': 'Схемы',
    'Tools': 'Инструменты',
    'DIY Kits': 'Наборы DIY',
    'Sale': 'Распродажа',
    'New Arrivals': 'Новинки'
  };
  
  if (targetLang === 'ru' && translations[title]) {
    return translations[title];
  }
  
  // Обратный перевод с русского на английский
  if (targetLang === 'en') {
    const reverseTranslations = {};
    for (const [en, ru] of Object.entries(translations)) {
      reverseTranslations[ru] = en;
    }
    
    if (reverseTranslations[title]) {
      return reverseTranslations[title];
    }
  }
  
  // Если перевод не найден, возвращаем оригинал
  return title;
}

/**
 * Простой перевод текста FAQ на русский или английский язык
 * @param {string} text - Текст FAQ на английском или русском
 * @param {string} targetLang - Целевой язык (ru или en)
 * @returns {string} - Переведенный текст
 */
function translateFAQText(text, targetLang = 'ru') {
  if (!text || typeof text !== 'string') return text;
  
  // Карта переводов для распространенных вопросов и фраз
  const translations = {
    'What types of yarn do you offer?': 'Какие виды пряжи вы предлагаете?',
    'How do I choose the right yarn for my project?': 'Как выбрать правильную пряжу для моего проекта?',
    'Do you ship internationally?': 'Осуществляете ли вы международную доставку?',
    'What knitting accessories do you recommend for beginners?': 'Какие аксессуары для вязания вы рекомендуете начинающим?',
    
    'We offer a wide variety': 'Мы предлагаем широкий ассортимент',
    'high-quality yarns': 'высококачественной пряжи',
    'including wool': 'включая шерсть',
    'cotton': 'хлопок',
    'acrylic': 'акрил',
    'alpaca': 'альпаку',
    'blended options': 'смесовые варианты',
    'our selection': 'наш выбор',
    'all project types': 'всех типов проектов',
    'delicate lace': 'нежного кружева',
    'chunky knits': 'объёмной вязки',
    
    // Дополнительные фразы могут быть добавлены по мере необходимости
  };
  
  let translatedText = text;
  
  if (targetLang === 'ru') {
    // Применяем простую замену для известных фраз
    for (const [en, ru] of Object.entries(translations)) {
      translatedText = translatedText.replace(new RegExp(en, 'gi'), ru);
    }
  } else if (targetLang === 'en') {
    // Обратный перевод с русского на английский
    const reverseTranslations = {};
    for (const [en, ru] of Object.entries(translations)) {
      reverseTranslations[ru] = en;
    }
    
    for (const [ru, en] of Object.entries(reverseTranslations)) {
      translatedText = translatedText.replace(new RegExp(ru, 'gi'), en);
    }
  }
  
  // Если текст не изменился, вероятно, для него нет известных фраз для перевода
  if (translatedText === text) {
    return text; // Возвращаем оригинал
  }
  
  return translatedText;
}

/**
 * Переводит название категории для отображения
 * @param {string} category - Ключ категории (slug)
 * @param {string} language - Язык (en или ru)
 * @returns {string} - Переведенное название категории
 */
function translateCategoryName(category, language = 'en') {
  const categoryNames = {
    en: {
      'yarn': 'Yarn',
      'knitting_needles': 'Knitting Needles',
      'crochet_hooks': 'Crochet Hooks',
      'patterns': 'Patterns',
      'accessories': 'Accessories'
    },
    ru: {
      'yarn': 'Пряжа',
      'knitting_needles': 'Спицы для вязания',
      'crochet_hooks': 'Крючки для вязания',
      'patterns': 'Схемы',
      'accessories': 'Аксессуары'
    }
  };
  
  // Используем названия для указанного языка или английские, если языка нет
  const localeNames = categoryNames[language] || categoryNames.en;
  
  return localeNames[category] || category;
}

module.exports = {
  loadSemanticCore,
  validateSemanticCoreStructure,
  getCategoryData,
  getRandomKeywords,
  getRandomInternalLinks,
  getRandomFAQs,
  isRussian,
  translateLinkTitle,
  translateFAQText,
  translateCategoryName
}; 