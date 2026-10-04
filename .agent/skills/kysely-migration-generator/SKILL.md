---
name: kysely-migration-generator
description: Translates a Mermaid ERD (docs/architecture/schema.mmd or erd.svg) into a type-safe Kysely database migration in src/db/migrations/. Use when the user asks to generate a migration, create database tables, or convert an ERD, schema diagram, or data model into Kysely or SQL code.
---

# Kysely Migration Generator

Read a Mermaid `erDiagram` and write a TypeScript Kysely migration that creates its tables
in PostgreSQL. Use `src/db/migrations/001_initial_schema.ts` as the reference for style.

## Step 1: Read the inputs

1. Read `docs/architecture/schema.mmd`. If only `docs/architecture/erd.svg` exists, read the
   entity and attribute names from the SVG text instead.
2. Read every file in `src/db/migrations/`. Make a list of tables those files already create.
   **Never create a table that already exists.** For example, `users` is created by
   `001_initial_schema.ts`, so skip `USERS` even though it appears in the diagram. Other tables
   may still reference it.

## Step 2: Translation rules

### Entities to tables
- Convert each entity name to lowercase snake_case: `USERS` becomes `users`,
  `BOOK_AUTHORS` becomes `book_authors`.

### Primary keys
- A `PK` attribute named `id` becomes an auto-incrementing integer key:

      .addColumn('id', 'serial', (col) => col.primaryKey())

- Always use `serial`, never UUIDs. The existing `users.id` is `serial`, so every foreign key
  must be an integer for the types to match.

### Foreign keys
- An `FK` attribute named `<table>_id` references the `id` column of that table, uses type
  `integer`, cascades on delete, and is required:

      .addColumn('genre_id', 'integer', (col) =>
        col.references('genres.id').onDelete('cascade').notNull()
      )

- The referenced table name is the plural snake_case table, e.g. `user_id` references
  `users.id`, `book_id` references `books.id`, `borrower_id` references `borrowers.id`.

### Data types
Map Mermaid types to PostgreSQL types:

| Mermaid     | Kysely / PostgreSQL |
|-------------|---------------------|
| `int`       | `integer`           |
| `string`    | `varchar(255)`      |
| `text`      | `text`              |
| `boolean`   | `boolean`           |
| `date`      | `date`              |
| `timestamp` | `timestamp`         |
| `decimal`   | `numeric`           |

### Required vs. optional columns
- Every column is `.notNull()` by default.
- If an attribute has the comment `"nullable"` in the diagram (for example
  `date return_date "nullable"`), leave off `.notNull()`.
- A `timestamp` column named `created_at` gets a default of the current time, like the
  reference migration:

      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`).notNull())

### Cardinalities
- `||--o{` (one-to-many): put the foreign key on the "many" side. No extra constraint.
- `||--o|` (one-to-one): put the foreign key on the optional side and add `.unique()` to it,
  so each parent can have at most one child:

      .addColumn('user_id', 'integer', (col) =>
        col.references('users.id').onDelete('cascade').notNull().unique()
      )

- Join tables (an entity with two foreign keys that links two other tables, like
  `BOOK_AUTHORS`): also add a unique constraint on the pair so the same link can't be stored twice:

      .addUniqueConstraint('book_authors_book_id_author_id_unique', ['book_id', 'author_id'])

## Step 3: Order the tables

- In `up`, create tables in **dependency order**: a table must be created after every table its
  foreign keys reference. Parents first, children last.
- In `down`, drop the tables in the **exact reverse** order of `up`. Children first, parents last.
- Only drop tables this migration created. Never drop tables from earlier migrations, such as `users`.

## Step 4: Write the file

- File name: `src/db/migrations/<timestamp>_<migration_name>.ts`, where `<timestamp>` is the
  current date and time as `YYYYMMDDHHMMSS` and `<migration_name>` is short snake_case, e.g.
  `20261004190000_library_schema.ts`.
- The file must:
  - start with `import { Kysely, sql } from 'kysely';`
  - export `async function up(db: Kysely<any>): Promise<void>`
  - export `async function down(db: Kysely<any>): Promise<void>`
  - use one `await db.schema.createTable(...)...execute();` per table, or
    `await db.schema.dropTable(...).execute();` in `down`

## Step 5: Verify

1. Run `npm run build`. If there are TypeScript errors, fix the migration file and run it again.
2. Run `npm run migrate:up`. If it fails, read the error, fix the migration file, and run it again.
   (PostgreSQL rolls back a failed migration automatically, so a fixed file can simply be re-run.)
3. Retry at most 3 times. If it still fails, stop and show the user the last error.
4. Report to the user: the migration file path, the tables created in order, and the output of
   both commands.

## Rules

- Never edit `001_initial_schema.ts` or any other existing migration.
- Never recreate a table that an earlier migration already creates.
- Never use UUIDs for primary or foreign keys.
- Never report success unless both `npm run build` and `npm run migrate:up` succeeded.
