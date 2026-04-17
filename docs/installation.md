# Installation Guide for `koreainvestment-cli`

> **If you are a human**: scroll to [For Humans](#for-humans).
> **If you are an LLM agent** (Claude Code, OpenCode, Cursor, Cline, GPT-5, Gemini CLI, …): read every section below and follow it as a deterministic checklist.

---

## For Humans

Hand this block to your agent (ChatGPT, Claude, Cursor, OpenCode, …):

```
Install and configure koreainvestment-cli by strictly following the instructions here:
https://raw.githubusercontent.com/HyeokjaeLee/koreainvestment-cli/main/docs/installation.md

IMPORTANT: Fetch the file with `curl`, not WebFetch. Summaries lose critical CLI flags.
Ask me interactively for APP_KEY / APP_SECRET / 계좌번호 when `kis auth login` prompts.
```

Then do nothing. The agent will drive the rest.

---

## For LLM Agents

Hello, agent. You will help the user install `koreainvestment-cli` — a TypeScript CLI that wraps Korea Investment & Securities' open-trading REST API. Greet the user briefly with something like:

> "Alright, I'll set up `koreainvestment-cli` for you. This takes ~5 steps, and I'll ask for your KIS credentials when the CLI prompts."

Then follow every step below **in order**. Do not skip.

---

### Step 0 — Gather context from the user

Ask exactly these questions, one by one. Use them to pick the CLI flags for Step 2.

1. **Do you already have KIS APP_KEY / APP_SECRET?**
   - No → tell the user to create them at [https://apiportal.koreainvestment.com/](https://apiportal.koreainvestment.com/) and wait until they have both a **paper (모의투자)** and a **production (실전투자)** key pair. Do not continue until they say "yes".
2. **Which profile do you want to set up first?** `paper` (default, recommended) or `prod`.
3. **What is the 종합계좌번호 (account number)?** Must be exactly 8 digits. The 2-digit 상품코드 (e.g. `01` for 종합) is a separate field — ask it too.
4. **Do you have an HTS ID?** Optional, used later for WebSocket condition search. Accept empty.

Remember these values, but **do NOT echo APP_KEY / APP_SECRET** back to the user. They will be typed into `kis auth login` as hidden input.

---

### Step 1 — Verify Node.js

Run:

```bash
node -v
```

Require Node **>= 18**. If lower, tell the user to install via [`nvm`](https://github.com/nvm-sh/nvm) or their package manager. Do not continue with an older Node.

---

### Step 2 — Install the CLI

Run:

```bash
npm install -g koreainvestment-cli
```

Verify:

```bash
kis --version
# expected output: 0.1.0 (or newer)
```

If `kis: command not found`, the user's global `bin` is likely not on `PATH`. Quick fix per shell:

```bash
# bash / zsh
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Optionally print the onboarding summary:

```bash
kis init
```

---

### Step 3 — Register credentials (`kis auth login`)

Run **interactively** in a real terminal. Do NOT wrap this in a script — `kis auth login` uses hidden password prompts that require TTY.

```bash
kis auth login --paper --make-default
```

The CLI will ask, one at a time:

1. `APP_KEY` (hidden input)
2. `APP_SECRET` (hidden input)
3. `계좌번호 앞 8자리 (CANO)` — 8 digits
4. `계좌상품코드` — 2 digits, default `01` (종합계좌)
5. `HTS ID` — optional

When it finishes, it prints:

```
✓ Profile "paper" saved (env=paper). Config: ~/.kis-cli/config.yaml
```

**If the user also wants production**, repeat with:

```bash
kis auth login --prod --name prod
```

**Agent rule:** never read the user's APP_KEY or APP_SECRET aloud. Never store them in a chat message. They live only inside `~/.kis-cli/config.yaml` (mode `0600`).

---

### Step 4 — Verify the credentials

Issue a real access token against KIS:

```bash
kis auth test --profile paper
```

Expected output:

```
Issuing access token for profile "paper" (paper)...
✓ Access token issued. Expires at 2026-04-19T...Z.
Issuing WebSocket approval key...
✓ approval_key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**If you see an error like `EGW00101` or `approval_key missing`:**

- Double-check the user entered the paper APP_KEY/APP_SECRET, not the production ones.
- Verify KIS API is not undergoing maintenance: [https://apiportal.koreainvestment.com/](https://apiportal.koreainvestment.com/).
- Re-run `kis auth login --paper` and try again.

---

### Step 5 — Run a read-only smoke test

Confirm market data works:

```bash
kis quote price 005930
```

Should print a table with 삼성전자's current price, open/high/low, volume, etc.

Then confirm account access (paper):

```bash
kis balance stock --profile paper
```

If the paper account is empty, the output will read `(no rows)` + a summary table with 0 values — that's success.

---

### Step 6 — (Optional) Run the doctor

```bash
kis doctor --profile paper
```

All five checks should be green (✓). If any red (✗):

- Share the error message with the user.
- Suggest re-running the corresponding `kis auth login` step, checking Node version, or retrying if it's a transient HTTP error.

---

### Step 7 — Report back

Once Steps 1–6 are green, tell the user:

> "Setup complete. You now have `kis` on your PATH. Try one of:
> - `kis quote price 005930`
> - `kis balance stock`
> - `kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper`
>
> The full usage skill is at `docs/skill-usage.md` in the repo — I can follow that to place trades for you on request."

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `kis: command not found` | `npm prefix -g` bin not on PATH | export in shell rc, or use `npx koreainvestment-cli` |
| `Profile "paper" not found` | Never ran `kis auth login --paper` | Run it |
| `EGW00101 인증 실패` | Wrong APP_KEY / APP_SECRET | Re-run login with correct paper/prod pair |
| `EGW00201 TPS exceeded` | Rate limited | Wait and retry; paper env has 500ms min interval |
| `approval_key missing` | Approval API outage or wrong secret | Wait a few minutes, retry |
| Orders hang on confirmation | `kis order buy` requires interactive Y/n | Add `-y` or run interactively |

---

## Uninstall

```bash
npm uninstall -g koreainvestment-cli
rm -rf ~/.kis-cli
```

Done.

---

## Appendix — Config file layout

`~/.kis-cli/config.yaml` (mode 0600):

```yaml
defaultProfile: paper
profiles:
  paper:
    env: paper
    appKey: PSxxxx...
    appSecret: xxxxxxxx...
    accountNumber: "50123456"
    accountProductCode: "01"
    htsId: myhtsid
  prod:
    env: prod
    appKey: PSyyyy...
    appSecret: yyyyyyyy...
    accountNumber: "50123456"
    accountProductCode: "01"
```

`~/.kis-cli/tokens.json` (mode 0600) caches the access token per profile, reissues automatically before expiry.
