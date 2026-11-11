# RULES - IMS Finance Project Rules

## 1. Project Stack Rules

The project uses:

```text
Next.js App Router
TypeScript
TSX
shadcn/ui
Tailwind CSS
Prisma ORM
Supabase PostgreSQL
```

These are the default technologies for the project.

Do not introduce another framework or architectural layer unless the requirement genuinely requires it.

## 2. Architecture Rules

### R-01

Next.js is both:

```text
frontend
+
application/backend layer
```

Do not create Express.js or another separate backend for this MVP.

### R-02

Use Server Components by default.

Use Client Components only when browser interaction requires them.

### R-03

Preferred mutation path:

```text
Form
  |
  v
Server Action
  |
  v
Service
  |
  v
Prisma
  |
  v
Supabase PostgreSQL
```

### R-04

Use Route Handlers only when an HTTP endpoint provides real value.

Do not create `/api` routes automatically for every server operation.

### R-05

Business logic must not live inside UI components.

## 3. Supabase Rules

### R-06

Supabase is used as:

```text
managed PostgreSQL database
```

for the MVP.

### R-07

Do not query financial application tables directly from Client Components using the Supabase JS client.

Preferred:

```text
Next.js Server
  |
  v
Prisma
  |
  v
Supabase PostgreSQL
```

### R-08

Do not add:

- Supabase Auth;
- Supabase Storage;
- Supabase Realtime;
- Edge Functions;

unless a product requirement explicitly requires them.

### R-09

Never expose database credentials in:

```text
NEXT_PUBLIC_*
```

## 4. Prisma Rules

### R-10

Prisma ORM is the default database access layer.

### R-11

Keep a shared `PrismaClient`.

Do not instantiate a new Prisma client repeatedly in pages/components.

### R-12

Database schema changes are managed through:

```text
prisma/schema.prisma
+
Prisma migrations
```

### R-13

Use relations and database constraints rather than reproducing referential integrity only in UI code.

### R-14

Use `prisma.$transaction()` when creating:

```text
Contract
+
Installment Schedules
```

The operation must be atomic.

## 5. Core Business Rules

### BR-01 - Contract Number

```text
contractNo must be unique
```

### BR-02 - OTR

```text
OTR > 0
```

### BR-03 - DP Percentage

```text
0 <= DP <= 100
```

### BR-04 - Tenor

```text
tenorMonths > 0
```

Tenor is stored in integer months.

### BR-05 - Interest Tier

```text
tenor <= 12
=> 12%

tenor > 12 AND tenor <= 24
=> 14%

tenor > 24
=> 16.5%
```

Interest rate is treated as annual for the assessment implementation.

### BR-06 - DP Amount

```text
dpAmount
= OTR x DP% / 100
```

### BR-07 - Principal

```text
principal
= OTR - dpAmount
```

### BR-08 - Total Interest

```text
totalInterest
= principal
  x annualInterestRate
  x tenorMonths / 12
```

### BR-09 - Total Financed

```text
totalFinanced
= principal + totalInterest
```

### BR-10 - Base Installment

```text
baseInstallment
= totalFinanced / tenorMonths
```

## 6. Financial Precision Rules

### R-15

Never use binary floating-point arithmetic as the authoritative financial representation.

Avoid domain code based only on:

```ts
number
```

when precision matters.

Preferred:

```text
Prisma.Decimal
```

or integer Rupiah.

### R-16

Do not format currency until the presentation layer.

Internal value:

```text
240000000
```

Display:

```text
Rp240.000.000
```

### R-17

Rounding rule must be centralized.

Do not round differently in:

```text
form
service
report
component
```

### R-18

If monthly values are rounded, reconcile the final installment so:

```text
SUM(all installment amounts)
= total financed
```

## 7. Installment Schedule Rules

### BR-11

Number of schedules:

```text
schedule rows = tenor months
```

Example:

```text
18 months = 18 schedules
```

### BR-12

Installment numbers start from:

```text
1
```

and are sequential.

### BR-13

Combination must be unique:

```text
contract + installment number
```

### BR-14

First schedule due date equals:

```text
firstDueDate
```

Each next installment progresses monthly.

### BR-15

Do not generate only 12 rows for an 18-month contract simply because the source screenshot only visibly lists 12 sample rows.

Follow the stated tenor.

## 8. Payment Rules

### BR-16

MVP supports:

```text
one full payment
per installment
```

### BR-17

Partial payment is outside MVP scope.

### BR-18

A paid installment is represented by an associated payment record.

Do not duplicate payment truth with an editable boolean unless required.

### BR-19

Do not allow two payments for the same installment under current MVP rules.

## 9. Status Rules

Status is derived, not permanently stored.

### Paid

```text
payment exists
```

### Upcoming

```text
payment does not exist
AND due_date > as_of_date
```

### Due

```text
payment does not exist
AND due_date = as_of_date
```

### Overdue

```text
payment does not exist
AND due_date < as_of_date
```

Do not save a permanent `OVERDUE` state that can become stale.

## 10. Due Report Rules

### BR-20

For assessment Query #2:

```text
due_date <= as_of_date
```

### BR-21

The Query #2 total represents scheduled installment already due.

It does not automatically mean:

```text
unpaid balance
```

unless the requirement explicitly changes to unpaid-only.

### Assessment Verification

For:

```text
as_of_date = 2024-08-14
```

due schedules are:

```text
installment 1-7
```

Using Rp12.907.000:

```text
total = Rp90.349.000
```

## 11. Overdue Rules

### BR-22

An installment is overdue only when:

```text
due_date < as_of_date
AND payment does not exist
```

### BR-23

An installment due exactly on `as_of_date` has:

```text
late days = 0
```

and is not yet overdue.

## 12. Late-Day Rules

### BR-24

```text
lateDays
= asOfDate - dueDate
```

Assessment verification:

```text
25 Jun 2024 -> 14 Aug 2024
= 50 days

25 Jul 2024 -> 14 Aug 2024
= 20 days
```

## 13. Penalty Rules

### BR-25

Daily penalty rate:

```text
0.1%
= 0.001
```

### BR-26

```text
penalty
= unpaid installment amount
  x 0.001
  x late days
```

For MVP, unpaid installment amount equals the full installment because partial payment is unsupported.

### Assessment Verification

```text
Installment #6
12.907.000 x 0.001 x 50
= Rp645.350
```

```text
Installment #7
12.907.000 x 0.001 x 20
= Rp258.140
```

```text
Total
= Rp903.490
```

## 14. Date Rules

### R-20

Treat:

- due date;
- paid date;
- report as-of date;

as date-oriented values.

### R-21

Avoid accidental timezone changes.

Do not let:

```text
2024-08-14
```

silently become another date due to browser/server timezone conversion.

### R-22

Historical reports must receive explicit:

```text
as_of_date
```

Do not implement historical report logic using only:

```text
new Date()
```

or:

```sql
CURRENT_DATE
```

## 15. Next.js Rules

### R-23

Use App Router.

### R-24

Default to Server Components for data-reading pages.

### R-25

Use `"use client"` only where required.

Examples:

- interactive date picker;
- dialog;
- controlled interactive form;
- client-only state.

### R-26

Do not fetch the application's own API route from a Server Component when the service can be called directly.

Prefer:

```text
Server Component
  |
  v
Service
  |
  v
Prisma
```

instead of:

```text
Server Component
  |
  v
/api/*
  |
  v
Service
```

### R-27

Use:

```text
redirect()
revalidatePath()
```

after mutations when appropriate.

## 16. shadcn/ui Rules

### R-28

Use shadcn/ui primitives instead of recreating standard UI components unnecessarily.

Examples:

```text
Button
Input
Card
Table
Badge
Dialog
AlertDialog
```

### R-29

Do not heavily modify files inside:

```text
components/ui
```

for application-specific behavior.

Application components belong in feature/domain component directories.

### R-30

Preserve accessibility behavior supplied by shadcn/ui/Radix primitives.

## 17. Tailwind CSS Rules

### R-31

Use Tailwind utilities for:

- layout;
- spacing;
- typography;
- responsive design.

### R-32

Avoid unnecessary custom CSS files when Tailwind utilities are sufficient.

### R-33

Use consistent spacing and content widths.

Do not create arbitrary one-off values without reason.

### R-34

Design desktop-first, but every screen must remain usable at mobile sizes.

Tables should use horizontal scrolling when necessary.

## 18. TypeScript Rules

### R-35

Do not use `any` unless there is a documented reason.

### R-36

Business input/output should have explicit types.

Example:

```ts
type CalculateContractInput = {
  otr: Decimal
  dpPercent: Decimal
  tenorMonths: number
}
```

### R-37

Keep domain types separate from UI-only types when it improves clarity.

### R-38

Never suppress TypeScript errors merely to make the build pass.

## 19. Component Rules

### R-39

React components are responsible for presentation and interaction.

Do not put authoritative formulas inside `.tsx` components.

Wrong:

```text
contract-form.tsx
  calculates interest
  calculates penalty
  writes DB
```

Preferred:

```text
contract-form.tsx
  |
  v
action
  |
  v
service
  |
  v
domain calculation
```

### R-40

Keep components focused.

Prefer:

```text
financial-summary.tsx
installment-table.tsx
payment-dialog.tsx
```

instead of one huge contract page component.

## 20. Service Rules

Recommended domain functions:

```text
getAnnualInterestRate()
calculateContract()
generateInstallmentSchedule()
calculateLateDays()
calculatePenalty()
```

Recommended application services:

```text
contractService.create()
contractService.getByContractNo()

paymentService.create()

reportService.getDueInstallments()
reportService.getOverdueInstallments()
```

## 21. SQL Rules

### R-41

The developer assessment explicitly requests SQL queries.

Keep SQL answers for:

- Query #2;
- Query #3;

even if the web application uses Prisma.

### R-42

Use parameterized SQL if raw SQL accepts user input.

Never concatenate uncontrolled input into SQL strings.

### R-43

Use SQL date comparisons consistently:

```text
due_date <= as_of_date
due_date < as_of_date
```

according to report semantics.

## 22. Validation Rules

All mutations must validate server-side.

Minimum checks:

- Contract No is not empty.
- Client Name is not empty.
- OTR > 0.
- DP is between 0 and 100.
- Tenor is positive integer.
- First Due Date is valid.
- Payment amount is valid.
- Payment date is valid.

Client-side validation may improve UX but cannot replace server validation.

A validation library such as Zod may be added if desired, but it is not required by the core stack.

## 23. Error Handling Rules

Do not expose:

- Prisma stack traces;
- SQL details;
- Supabase credentials;
- raw infrastructure errors;

to end users.

Return user-facing errors such as:

```text
Contract number already exists.
```

```text
Installment has already been paid.
```

```text
Unable to create contract.
```

## 24. Testing Rules

Minimum tests:

### Interest Tier

```text
12 -> 12%
13 -> 14%
24 -> 14%
25 -> 16.5%
```

### Contract Calculation

Given:

```text
OTR = 240000000
DP = 20%
Tenor = 18
```

expected:

```text
DP = 48000000
Principal = 192000000
Rate = 14%
Total Interest = 40320000
Total Financed = 232320000
Monthly ~= 12907000
```

### Schedule

```text
18 month tenor
=> 18 schedules
```

### Due Report

As of:

```text
2024-08-14
```

expected:

```text
installment 1-7
Rp90.349.000
```

using assessment schedule value.

### Penalty

```text
#6
50 late days
Rp645.350

#7
20 late days
Rp258.140
```

## 25. AI Coding Agent Rules

Before making code changes, an AI coding agent must read:

```text
PRD.md
DESIGN.md
ARCHITECTURE.md
SCHEME.md
RULES.md
```

Priority when documents conflict:

```text
1. Original assessment requirement
2. RULES.md
3. PRD.md
4. ARCHITECTURE.md
5. SCHEME.md
6. DESIGN.md
```

Agent must:

1. use the defined stack;
2. not add Express.js;
3. not add a separate backend;
4. not query Supabase financial tables directly from client components;
5. keep Prisma as database access layer;
6. keep calculations outside TSX;
7. use Server Components by default;
8. add `"use client"` only when required;
9. use shadcn/ui for reusable UI primitives;
10. use Tailwind CSS for styling;
11. keep financial calculations precise;
12. update tests when business logic changes;
13. avoid adding out-of-scope features;
14. prefer readable implementation over unnecessary abstractions;
15. document any assumption that affects money, dates, or assessment output.

## 26. Definition of Done

A feature is complete only when:

- implementation follows the defined stack;
- server-side validation exists;
- business logic is not duplicated in UI;
- database changes use Prisma schema/migrations;
- loading/error/empty UI states are handled where applicable;
- responsive layout remains usable;
- calculations pass tests;
- assessment expected values remain reproducible.
