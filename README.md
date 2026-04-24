# FA-NODE

## Docs

- [author.md](docs/author.md)

Если смотреть прагматично, у тебя сейчас смешаны 3 разные категории:

- реальные stateful/service-like классы:
  configuration.class.ts, crypt.class.ts, decorator.class.ts, middleware.class.ts,
  transformer.class.ts, validator.class.ts, logger.class.ts, logger.node.ts, logger-
  nest.class.ts
- value/error abstraction:
  error.class.ts
- вообще не class-layer:
  logger.map.ts
  logger-application.service.ts

Ключевая проблема не в том, что там есть class, а в том, что папка и суффиксы перестали отражать роль
модуля.

Что бы я сделал:

- если проект на TypeScript и это обычный application/library code, убрал бы суффикс Class почти
  везде
- оставил бы имена по роли, а не по синтаксису языка
- разнес бы файлы по папкам, а не пытался все держать в classes

Нормальнее выглядело бы так:

- src/logger/logger.ts
- src/logger/logger-node.ts
- src/logger/logger-main.ts
- src/logger/logger.map.ts
- src/logger/logger-application.service.ts
- src/config/configuration.ts
- src/crypto/crypt.ts
- src/decorators/decorator.ts
- src/validation/validator.ts
- src/transform/transformer.ts
- src/errors/error.ts
- src/middleware/middleware.ts

По смыслу конкретно:

- logger-application.service.ts уже сейчас выбивается: это service, не class-файл
- logger.map.ts точно не должен жить в classes
- error.class.ts можно оставить как error.ts или даже app-error.ts, если хочешь семантику
- DecoratorClass, TransformerClass, ValidatorClass как имена экспортов тоже избыточны. Обычно
  достаточно Decorator, Transformer, Validator

Когда суффикс Class бывает оправдан:

- если в публичном API у тебя есть конфликт имен, например Logger type, Logger interface и Logger
  implementation
- если это сознательный стиль всей библиотеки, и он реально дает читаемость
- если рядом есть LoggerFactory, LoggerInterface, LoggerAbstract, и ты хочешь явно различать
  реализации

Но у тебя сейчас это уже не дает ясности, а создает шум. Особенно потому, что:

- есть *.service.ts
- есть *.map.ts
- есть helpers, abstractions и classes вперемешку
- часть файлов экспортирует не только класс, но и типы/константы

Итог:

- Class как suffix здесь не нужен как default
- проблема больше архитектурная, чем чисто naming
- лучше перейти от “папка по конструкции языка” к “папки по ответственности”

```shell
docker container prune -f
docker image prune -a -f
docker network prune -f
docker builder prune -a -f
#docker volume prune -f
```

```shell
git clone -c core.sshCommand="ssh -i ~/.ssh/ID_RSA_PUB" git@github.com:USER/REPO.git
git remote set-url origin git@github.com:USER/REPO.git
git config core.sshCommand "ssh -i ~/.ssh/ID_RSA_PUB"
```
