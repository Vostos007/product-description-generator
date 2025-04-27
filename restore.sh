#!/bin/bash

# Скрипт для быстрого восстановления генератора описаний товаров

set -e  # Остановка скрипта при ошибках

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}  Восстановление генератора описаний  ${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Функция для проверки наличия директории
check_directory() {
  if [ -d "product-description-generator" ]; then
    echo -e "${YELLOW}Найдена существующая директория 'product-description-generator'.${NC}"
    read -p "Хотите перезаписать ее? (y/n): " overwrite
    if [ "$overwrite" = "y" ] || [ "$overwrite" = "Y" ]; then
      echo -e "${YELLOW}Удаление существующей директории...${NC}"
      rm -rf product-description-generator
    else
      echo -e "${RED}Восстановление отменено.${NC}"
      exit 1
    fi
  fi
}

# Функция для клонирования репозитория
clone_repository() {
  echo -e "${GREEN}Клонирование репозитория из GitHub...${NC}"
  git clone https://github.com/Vostos007/product-description-generator.git
  cd product-description-generator
}

# Функция для установки зависимостей
install_dependencies() {
  echo -e "${GREEN}Установка зависимостей...${NC}"
  npm install
}

# Функция для настройки .env
setup_env() {
  echo -e "${GREEN}Настройка файла окружения...${NC}"
  if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Создан файл .env из шаблона. Пожалуйста, отредактируйте его вручную:${NC}"
    echo -e "${YELLOW}  nano .env${NC}"
  else
    echo -e "${GREEN}Файл .env уже существует. Оставляем его без изменений.${NC}"
  fi
}

# Основной функционал
main() {
  # Проверка текущей директории
  if [ "$(basename "$PWD")" = "product-description-generator" ]; then
    echo -e "${YELLOW}Вы уже находитесь в директории 'product-description-generator'.${NC}"
    read -p "Выполнить обновление из репозитория? (y/n): " update
    if [ "$update" = "y" ] || [ "$update" = "Y" ]; then
      echo -e "${GREEN}Обновление из репозитория...${NC}"
      git fetch origin
      git reset --hard origin/main
      echo -e "${GREEN}Обновление зависимостей...${NC}"
      npm install
      echo -e "${GREEN}Проект успешно обновлен!${NC}"
    else
      echo -e "${YELLOW}Операция отменена.${NC}"
    fi
  else
    # Проверка и клонирование репозитория
    check_directory
    clone_repository
    install_dependencies
    setup_env
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  Восстановление успешно завершено!  ${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${YELLOW}Перейдите в директорию:${NC} cd product-description-generator"
  fi
}

# Запуск основной функции
main 