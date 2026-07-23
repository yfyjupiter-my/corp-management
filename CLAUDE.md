# CLAUDE.md

## Description
When start new conversation, read first `CLAUDE.md`, `TASKS.md`, `STATUS.md`, `DESIGN.md` before start any task.

---

### Documents Responsibilities
| Document | Purpose |
|---|---|
| **CLAUDE.md** | Master entry point and doc map |
| **TASKS.md** | In-flight tasks with acceptance criteria, assignee, and status |
| **STATUS.md** | Current snapshot: shorter and concise what's done, what's blocked, what's next |
| **DESIGN.md** | Website Visual Design Guidelines - Color System, Fonts, Spacing, Component Styles, Animations, Prohibitions |

---

### Rules

**When user trigger create prd**, run the following prompt

```text
generate prd.md. Ask user to answer following core questions:
1. project name
2. description pain point to resolve
3. target audience
4. tech stack
5. deployment method
6. theme styling
```

---

**When user ask to create wireframe/artifact**, run the following prompt

```text
Create 3 different set without repeat modern wireframe blueprint with medium fidelity grayscale boxes/placeholders, no real styling, annotation, just layout structure web-based playground based on `@prd`, save it as **wireframe.html**
```

---

**When user ask to create themes and styling playground**, run the following prompt

```text
Invoke ui-ux-pro-max skill create 3 themes and styling CSS playground based on `@wireframe.html`, theme and styling css must fit to project, save it as **themes.html** in current directory
```

---

**When user trigger reverse-extracted**, make confirmation with user which theme prefer to, then run following prompt

```text
Reverse-extracted full of [USER-ANSWER] theme + tokens + styling css + UI components based on `@themes.html` save it as **DESIGN.md**
```

---

**When user trigger mockup**, run the following prompt

```text
Run a real production-ready visual mockup based on `@wireframe.html` , using theme `@DESIGN.md`, save as **mockup.html**
```

---

**When user trigger resolve the PRD's open questions**, run following prompt

```text
resolve `@prd.md` open questions to prepare writing implementation code, save it as **finalize.md**
```

File format following:

```markdown
P1: Next.js 16 App Router setup
Status: ✅ Correct / ⚠️ Pending / 🚫 Blocking
Action Needed:
```

---

**When user ask for scaffold**, run the following prompt

```text
Initialize production scaffold, refer to `@DESIGN.md` + `@prd.md` as the primary sources, and read `@mockup.html` as a read-only visual/behavioral reference 
(don't modify or copy it into the output).

the reference files will be:
1. `@DESIGN.md` — design system / [theme-name] theme tokens and component styles (primary styling source)
2. `@prd.md` — tech stack, file structure and architecture
3. `@mockup.html` — read-only reference for proven layout and Canvas logic; will not be modified or copied
```

---

**When user trigger issue breakdown**, run following prompt

```text
Breakdown the tasks into smaller subtasks according phase based on `@finalize.md`, save it as **TASKS.md**
```

---

**When user trigger implement issue / start issue / start task**, run following prompt

```text
Implement issue-by-issue based on `@TASKS.md`, **must update** when finish the tasks
```

---

**When user trigger QA check**, run following prompt

```text
Analyze and Suggest the following audit check list, which one bext fit to run:
1. Security Vulnerabilities
2. Code Quality & Architecture Flaws
3. Runtime & Performance Leaks
4. Business Logic & State Vulnerabilities
5. Compliance & Accessibility
6. Robustness & Error Handling
```

---

After finish audit check run, breakdown required actions into smaller subtasks, save them to following file , based on what audit checklist

- Security Vulnerabilities append to `SEC-AUDIT.md`
- Code Quality & Architecture Flaws append to `CODE-AUDIT.md`
- Runtime & Performance Leaks append to `RUN-AUDIT.md`
- Business Logic & State Vulnerabilities append to `BUS-AUDIT.md`
- Compliance & Accessibility append to `COM-AUDIT.md`
- Robustness & Error Handling append to `ROB-AUDIT.md`

File format following:

```markdown
Item: Next.js 16 App Router setup
Verdict: ✅ Correct / ⚠️ Pending / 🚫 Blocking
Notes:
```

---

### Hard Constraints

- Ignore themes.html, mockup.html, wireframe.html during process scaffold，breakdown task, implementing issue, audit check / QA check. 
- Do not modify themes.html, mockup.html, wireframe.html during process scaffold，breakdown task, implementing issue, audit check / QA check. 
- Project security are strickly critical top priority, no vulnerubalities, no backdoor, no SQL injection 
- Conversation summary is compulsary need to update to `@STATUS`, by short and concise

---

