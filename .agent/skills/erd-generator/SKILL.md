---
name: erd-generator
description: Designs database schemas as Mermaid Entity-Relationship Diagrams and validates them by compiling to SVG. Use when the user asks to design an ERD, a data model, a database schema, entity relationships, tables for a system, or an architecture diagram of data.
---

# ERD Generator

Turn a plain-language domain description into a validated Mermaid `erDiagram`,
saved to `docs/architecture/schema.mmd` and rendered to `docs/architecture/erd.svg`.

## Mermaid Syntax Rules

Follow these rules when writing the diagram:

- The file must start with `erDiagram` on the first line.
- Entity names are UPPERCASE with underscores and no spaces (e.g. `BOOK_AUTHORS`).
- Each entity lists its attributes inside braces, one per line, as `type name` with an
  optional key marker. Example:

      BOOKS {
          int id PK
          string title
          int genre_id FK
      }

- Use simple types only: `int`, `string`, `text`, `boolean`, `date`, `timestamp`, `decimal`.
- Every relationship needs a label after the colon, e.g. `USERS ||--o{ LOANS : places`
- Cardinality symbols:
  - `||--o{` means one-to-many
  - `||--o|` means one-to-one
- Never use many-to-many (`}o--o{`). Instead, create a join table (e.g. `BOOK_AUTHORS`)
  with a foreign key to each side, and connect it with two one-to-many relationships.
- Every foreign key column must be named `<table>_id` and must have a matching relationship line.

- If a column is optional (allowed to be empty), add the comment "nullable" after it, e.g. `date return_date "nullable"`.

## Workflow

Follow these steps in order. Do not skip any step.

1. **Analyze the requirements.** Identify every entity, its primary key (`PK`), its
   foreign keys (`FK`), and the cardinality of each relationship. If the user says a
   table already exists, still include it in the diagram so relationships to it are shown.

2. **Write the diagram.** Save the Mermaid code to `docs/architecture/schema.mmd`,
   creating the `docs/architecture/` folder if needed.

3. **Validate it.** From the repository root, run:

       node .agent/skills/erd-generator/scripts/render_erd.js docs/architecture/schema.mmd

4. **Self-correct if needed.**
   - If the output is `SUCCESS`, go to step 5.
   - If the output starts with `SYNTAX_ERROR`, read the error message. Find the line number
     it reports and what the parser expected versus what it got. Fix only the broken part of
     `docs/architecture/schema.mmd`, then run the command from step 3 again.
   - Retry at most 3 times. If it still fails after 3 retries, stop and show the user the
     last error message and the current diagram instead of continuing.

5. **Report the result.** Show the user the final Mermaid code in a mermaid code block,
   and tell them the rendered diagram is at `docs/architecture/erd.svg`.

## Rules

- Never say the diagram succeeded unless the script printed `SUCCESS`.
- Always run the validation script, even if you are confident the syntax is correct.
- Always write to `docs/architecture/schema.mmd`. Do not use another filename.
