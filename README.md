# как пользоваться
- npm i
- в папку clear-config кладём файл configuration_src.json с конфигом который хотим почистить и проверить
- создаём файл .env прописываем в нём следующие переменные переменные
  - BENCHLING_API_URL - адрес бенчлинг апи
  - BENCHLING_API_KEY - ключ
- запускаем npm start
- в случае успеха в папке clear-config будет сгенерирован файл configuration.json