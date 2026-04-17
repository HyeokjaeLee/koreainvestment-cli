---
name: koreainvestment-cli
description: Use the `kis` command-line tool to query Korea Investment & Securities (KIS) market data, inspect accounts, and place stock orders. Trigger on requests like "내 잔고 확인해줘", "삼성전자 현재가", "005930 1주 모의매수", "AAPL 현재가", "해외주식 잔고", or anything involving Korean brokerage account, KIS, 한투, 한국투자증권.
---

# Skill: Using `koreainvestment-cli`

This skill teaches you to drive `koreainvestment-cli` (binary: `kis`) safely.

## When to use this skill

Trigger this skill whenever the user asks you to:

- 한국 주식(KRX / NXT) 현재가 / 호가 / 일봉 / 분봉 조회
- 미국 / 홍콩 / 일본 / 중국 주식 현재가
- 한국투자증권 계좌의 잔고, 예수금, 매수가능금액 조회
- 주문 (매수, 매도, 정정, 취소) — 원칙적으로 **모의계정(paper) 에서만**
- `kis ...` 또는 `한투 CLI` 로 시작하는 요청

If `kis` is not installed yet, switch to [`docs/installation.md`](./installation.md) first.

---

## Golden rules

1. **Paper first.** Every order command must add `--profile paper` unless the user explicitly says "실전" or "production". Implicit "매수해줘" defaults to **paper**.
2. **Confirm amounts before trading.** Before running `kis order buy/sell`, repeat the plan back to the user (symbol, qty, price, side, profile) and wait for "yes". Only then run with `-y` to skip the CLI's internal prompt.
3. **Never print credentials.** Don't echo the contents of `~/.kis-cli/config.yaml` or `~/.kis-cli/tokens.json`.
4. **Use `--json` for chained reasoning.** When piping results into further logic, always add `--json` so you get structured output.
5. **Rate limits.** Paper environment enforces 500ms between calls (the CLI handles this for you). Do not run more than ~10 sequential commands without pacing.

---

## Command cheatsheet

### Market data (domestic)

| Intent | Command |
|---|---|
| 현재가 | `kis quote price 005930 --json` |
| 호가 / 예상체결 | `kis quote orderbook 005930 --json` |
| 일봉 (2026-01-01 ~ 2026-04-18) | `kis quote daily 005930 --from 20260101 --to 20260418 --period D --json` |
| 주봉 | 위와 같은 명령에서 `--period W` |
| 분봉 (당일) | `kis quote minute 005930 --json` |

### Account / balance

| Intent | Command |
|---|---|
| 보유 주식 잔고 | `kis balance stock --profile paper --json` |
| 계좌 자산 요약 | `kis balance account --profile paper --json` |
| 삼성전자 매수가능 | `kis balance orderable --symbol 005930 --price 70000 --profile paper --json` |

### Orders (국내)

| Intent | Command |
|---|---|
| 지정가 매수 | `kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper` |
| 시장가 매수 | `kis order buy --symbol 005930 --qty 1 --price 0 --division 01 --profile paper` |
| 지정가 매도 | `kis order sell --symbol 005930 --qty 1 --price 72000 --profile paper` |
| 정정 주문 | `kis order modify --org-order-no 0001 --order-branch 01234 --qty 1 --price 71000 --profile paper --all` |
| 전량 취소 | `kis order cancel --org-order-no 0001 --order-branch 01234 --all --profile paper` |

`ORD_DVSN` 값(`--division`):
- `00` = 지정가 (기본)
- `01` = 시장가
- `02` = 조건부지정가
- `03` = 최유리지정가
- `04` = 최우선지정가

### Overseas stocks

| Intent | Command |
|---|---|
| 애플 현재가 (Nasdaq) | `kis overseas price --exch NAS --symbol AAPL --json` |
| 해외 잔고 (미국) | `kis overseas balance --exch NASD --currency USD --profile paper --json` |
| 미국 매수 | `kis overseas buy --exch NASD --symbol AAPL --qty 1 --price 190.00 --profile paper` |

Exchange codes (trading APIs): `NASD`, `NYSE`, `AMEX`, `SEHK` (Hong Kong), `TKSE` (Tokyo), `SHAA` (Shanghai), `SZAA` (Shenzhen).
Exchange codes (quote API `--exch`): `NAS`, `NYS`, `AMS`, `HKS`, `TSE`, `SHS`, `SZS`.
The overseas `price` command accepts either form and normalizes it.

### Health / diagnostics

| Intent | Command |
|---|---|
| 환경 점검 | `kis doctor --profile paper` |
| 프로파일 목록 | `kis auth list` |
| 토큰 상태 | `kis auth show --profile paper` |
| 신규 토큰 강제 발급 | `kis auth test --profile paper` |

---

## Recommended interaction patterns

### Pattern 1 — Quote → summarize

User: "삼성전자 지금 얼마야?"

```bash
kis quote price 005930 --json
```

Parse the JSON `output.stck_prpr` (현재가), `prdy_vrss` (전일대비), `prdy_ctrt` (전일 대비율), then summarize in Korean.

### Pattern 2 — Balance → table

User: "내 모의계정 잔고 보여줘"

```bash
kis balance stock --profile paper --json
```

From the JSON payload, pull `output1[]` (종목 리스트) and `output2[0]` (요약), then present as a Korean table: 종목명, 수량, 평가금액, 평가손익률.

### Pattern 3 — Orderable → confirm → buy

User: "모의계정에서 삼성전자 1주 사줘 (70000원)"

1. 먼저 매수 가능 여부 확인:
   ```bash
   kis balance orderable --symbol 005930 --price 70000 --profile paper --json
   ```
2. 사용자에게 plan 요약 (symbol=005930, qty=1, price=70,000, profile=paper) 하고 "진행할까요?" 묻기.
3. "yes" 면 실제 주문:
   ```bash
   kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper -y --json
   ```
4. 결과의 `output.ODNO` (주문번호) 를 사용자에게 알려주기.

### Pattern 4 — Modify / cancel

이전 주문의 `KRX_FWDG_ORD_ORGNO` (order branch) 와 `ODNO` (original order number) 를 반드시 사용자에게 확인받고 진행합니다. 두 값은 직전 주문 응답 또는 `kis balance stock --json` 의 미체결 리스트에서 얻습니다.

---

## Error handling

| Error | Meaning | What you should do |
|---|---|---|
| `Profile "paper" not found` | 로그인 안 됨 | Run `kis auth login --paper`, then retry |
| `KIS API error: EGW00113` | 토큰 만료 | Run `kis auth test --profile paper`, retry command |
| `KIS API error: EGW00201` | TPS 초과 | Wait 1-2s, retry. If persistent, reduce parallelism |
| `KIS API error: APBK0955` | 주문 수량/금액 오류 | Re-check `--qty` / `--price`, verify market hours |
| `KIS API error: 40500000` (해외) | 장외 시간 | Only limit orders outside market hours for 해외주식 |
| Network error / ECONNRESET | Transient | Retry once, then abort and report |

For verbose debugging, prefix any command with `KIS_DEBUG=1`:

```bash
KIS_DEBUG=1 kis balance stock --profile paper
```

---

## Safety checklist (before any ORDER)

- [ ] Did the user explicitly request the trade, including side (매수/매도), symbol, quantity, and price?
- [ ] Am I using `--profile paper` unless the user said "실전"?
- [ ] Did I repeat the plan back and get a confirm?
- [ ] Is the market open (KRX 09:00–15:30 KST, 미국은 한국 시간 밤)? If not, warn the user.
- [ ] Is `kis auth test --profile <p>` green within the last hour?

Only tick all five boxes → run the order with `-y`.

---

## When to hand control back to the human

Stop automation and ask the user explicitly if:

- The user's intent is ambiguous about paper vs. production.
- An order's total notional exceeds ~1,000만원 (reasonable sanity limit for a paper playground; adjust per user).
- The CLI returns an unfamiliar error code not in the table above.
- Any `auth` or `doctor` step fails three times in a row — likely a credential or service outage.

---

## Version compatibility

This skill targets `koreainvestment-cli >= 0.1.0`. If `kis --version` reports older, run:

```bash
npm install -g koreainvestment-cli@latest
```
