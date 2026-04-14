# Repository Guidelines

## Structure

- `src/` — основной код
  - `classes/`, `helpers/`, `logger/`, `cli/`, `nest/`
- `test/` — e2e тесты (`*.e2e-spec.ts`)
- `*.spec.ts` — unit-тесты рядом с кодом
- `dist/`, `coverage/`, `temp/` — игнорируются

## Commands

- `npm start` — dev (nodemon + ts-node)
- `npm run start:nest` — запуск Nest
- `npm run build` — сборка в `dist/`
- `npm test` — unit тесты + coverage
- `npm run test:nest` — e2e тесты
- `npm run lint` — ESLint

## Style

- TypeScript
- табы, одинарные кавычки, trailing commas
- без `any`, явные типы
- `Partial<T>` использовать редко; для входных конфигов и DTO предпочитать один явный интерфейс с optional-полями, а обязательную нормализованную форму держать внутренним type alias
- имена файлов: `*.class.ts`, `*.helper.ts`, `*.service.ts`

## Tests

- Jest (`ts-jest`)
- unit: `*.spec.ts`
- e2e: `test/*.e2e-spec.ts`
- тесты обязательны для новой логики

## Commits & PR

- формат: `type(scope): message` (например `ref(logger): fix output`)
- маленькие коммиты
- PR: описание + что проверял (`test`, `lint`, build`)

## Notes

- не коммитить `dist/`, `coverage/`, `temp/`
- перед publish проверять `src/cli/`
