# как пользоваться
- npm i
- в папку clear-config кладём файл configuration_src{env_name}.json с конфигом который хотим почистить и проверить
- создаём файл .env{env_name} прописываем в нём следующие переменные переменные
  - BENCHLING_API_URL - адрес бенчлинг апи
  - BENCHLING_API_KEY - ключ
- запускаем npm start {env_name}
- в случае успеха в папке clear-config будет сгенерирован файл configuration_{env_name}.json