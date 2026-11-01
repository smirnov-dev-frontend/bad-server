# Демонстрационные данные

Локальные аккаунты:

| Роль | Email | Пароль |
| --- | --- | --- |
| Администратор | `admin@mail.ru` | `password` |
| Покупатель | `user1@mail.ru` | `password1` |

Дамп пользователей обновлён: пароли хешируются bcrypt с cost 12, сохранённые refresh-токены очищены. Данные предназначены для учебной локальной базы.

## Импорт через MongoDB Compass

1. Подключитесь к `mongodb://root:example@127.0.0.1:27018/weblarek?authSource=admin`.
2. Откройте базу `weblarek` и коллекцию `users`.
3. Через `ADD DATA` → `Import JSON or CSV file` импортируйте `.dump/weblarek.users.json`.
4. Аналогично импортируйте `.dump/weblarek.products.json` в коллекцию `products`.

Изображения товаров находятся в `backend/src/public/images/` и копируются в публичный том при первом запуске контейнера.

## Импорт из терминала

Для чистой учебной базы из корня репозитория:

```bash
docker compose exec -T mongo mongoimport --authenticationDatabase admin -u root -p example --db weblarek --collection users --jsonArray < .dump/weblarek.users.json
docker compose exec -T mongo mongoimport --authenticationDatabase admin -u root -p example --db weblarek --collection products --jsonArray < .dump/weblarek.products.json
```

Если пользователи со старыми MD5-хешами уже существуют, пересоздайте учебные аккаунты через регистрацию. Для администратора задайте массив `roles: ["admin"]` напрямую через Compass. Изменить роль через API профиля нельзя. Обновлённый дамп также можно импортировать вместо старых учебных записей; повторный импорт поверх существующих `_id` вызовет конфликт.
