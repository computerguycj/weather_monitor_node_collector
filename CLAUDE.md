# Working in this repo

## Read on session start
- Read `DECISIONS.md` before making non-trivial changes. It's the decision log
  for this repo. If a proposed change contradicts or supersedes a prior
  decision, flag it explicitly instead of silently overriding.

## Prompt me to log decisions
When any of the following happen during our session, stop and ask if I want
to add an entry to `DECISIONS.md`:

- I pick one approach after considering alternatives ("let's use X instead of Y")
- I reject an approach that looked promising ("that won't work because...")
- We discover a non-obvious constraint or gotcha (library quirk, platform limit,
  config requirement)
- I change direction mid-task ("actually, scrap that, do it this way")
- A fix depends on something that isn't self-evident from the code

Do NOT prompt for:
- Routine implementation choices (variable names, file layout, obvious idioms)
- Bug fixes where the fix is self-explanatory
- Formatting, linting, or cosmetic changes

When prompting, propose a draft entry in the format used in DECISIONS.md and
ask me to approve, edit, or skip. Default to skip if I don't respond — don't
nag.

## Entry format
Append to the top of DECISIONS.md under a new `## YYYY-MM-DD — <short title>`
heading. Keep entries short: what was chosen, what was rejected, why. Link
commits or files when useful.