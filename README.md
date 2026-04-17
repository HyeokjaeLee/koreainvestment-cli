# koreainvestment-cli

> Agent-friendly command-line interface for the **Korea Investment & Securities (KIS) open-trading API**.
> Built in TypeScript. Made to be driven by your LLM agent (Claude Code, OpenCode, Cursor, etc.), not by your fingers.

```
npm i -g koreainvestment-cli
kis auth login --paper
kis quote price 005930
```

That's it. Your agent takes it from here.

---

## Why another KIS client?

한국투자증권의 공식 [open-trading-api](https://github.com/koreainvestment/open-trading-api) 리포지토리는 Python 샘플 코드만 제공합니다. LLM 에이전트가 매 요청마다 Python 런타임, YAML 설정, TR_ID 테이블을 새로 이해하도록 시키는 건 낭비입니다.

`koreainvestment-cli`는 다음과 같은 철학으로 만들어졌습니다.

- **Agent-native** — 모든 명령이 한 줄 실행 가능하고, `--json` 플래그로 구조화된 출력을 돌려줍니다.
- **Credential-first UX** — `kis auth login` 한 번이면 APP_KEY / APP_SECRET / 계좌번호가 암호화 권한(0600)으로 `~/.kis-cli/config.yaml`에 저장됩니다.
- **Prod 와 Paper 를 동시에** — `paper`(모의) · `prod`(실전) 프로파일을 함께 둘 수 있고, TR_ID 가 자동으로 `T → V` 로 변환됩니다.
- **Ship-safe orders** — 주문 명령에는 항상 확인 프롬프트가 뜹니다. `-y/--yes` 로 명시해야만 스킵됩니다.

---

## Installation

### For Humans

```bash
npm install -g koreainvestment-cli
kis init
```

그다음 [docs/installation.md](./docs/installation.md) 의 "Step 2 — Register Credentials" 부분을 따라가세요.

### For LLM Agents

에이전트에게 아래 프롬프트를 그대로 전달하면, 설치 가이드를 원본 그대로 읽고 한국투자 인증까지 마무리합니다.

```
Install and configure koreainvestment-cli by strictly following the guide at:
https://raw.githubusercontent.com/HyeokjaeLee/koreainvestment-cli/main/docs/installation.md

IMPORTANT: Fetch it with `curl`, not WebFetch — summaries drop critical CLI flags.
Ask me interactively for APP_KEY / APP_SECRET / 계좌번호 when `kis auth login` prompts.
```

> **Why `curl` and not `WebFetch`?**
> WebFetch tools often summarize. The installation guide is written as a deterministic checklist for the agent and must be read verbatim.

---

## Quickstart

```bash
# 1. 모의투자 계정부터 안전하게 연결
kis auth login --paper

# 2. 발급 토큰 검증
kis auth test --profile paper

# 3. 삼성전자 현재가
kis quote price 005930

# 4. 보유 잔고
kis balance stock --profile paper

# 5. 모의 매수 1주 @ 지정가
kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper
```

모든 명령은 `--json` 을 붙이면 파싱 가능한 JSON 으로 응답합니다. 에이전트는 이걸 그대로 다음 단계 입력으로 파이프하면 됩니다.

---

## Highlights

| Capability | Command | TR_ID (prod) |
|---|---|---|
| 현재가 시세 | `kis quote price <symbol>` | `FHKST01010100` |
| 호가/예상체결 | `kis quote orderbook <symbol>` | `FHKST01010200` |
| 일/주/월/년봉 | `kis quote daily <symbol> --from … --to …` | `FHKST03010100` |
| 당일 분봉 | `kis quote minute <symbol>` | `FHKST03010200` |
| 주식 잔고 | `kis balance stock` | `TTTC8434R` → `VTTC8434R` |
| 계좌자산 | `kis balance account` | `CTRP6548R` |
| 매수가능 | `kis balance orderable --symbol …` | `TTTC8908R` |
| 현금 매수/매도 | `kis order buy / sell` | `TTTC0012U / TTTC0011U` |
| 정정/취소 | `kis order modify / cancel` | `TTTC0801U` |
| 해외주식 현재가 | `kis overseas price --exch NAS --symbol AAPL` | `HHDFS76240000` |
| 해외 잔고 | `kis overseas balance --exch NASD` | `TTTS3012R` |
| 해외 매수/매도 | `kis overseas buy / sell` | `TTTT1002U / TTTT1006U` (US) |
| 환경 진단 | `kis doctor` | — |

---

## Agent Skill

LLM 에이전트가 이 CLI 를 능숙하게 쓰도록 만드는 **usage skill** 이 함께 제공됩니다.

- [docs/skill-usage.md](./docs/skill-usage.md) — "이 파일을 skill 로 등록하면, 에이전트가 잔고 조회부터 모의 매수까지 안전하게 수행합니다."

OpenCode 기준 설치 예시는 스킬 문서 맨 위에 있습니다.

---

## Configuration

| Path | Purpose | Mode |
|---|---|---|
| `~/.kis-cli/config.yaml` | 프로파일(APP_KEY/SECRET/계좌) | `0600` |
| `~/.kis-cli/tokens.json` | 캐시된 access_token (1일) | `0600` |

위치를 바꾸려면 `KIS_CLI_HOME=~/custom kis …` 처럼 환경변수를 덮어쓰세요.

Prod 와 Paper 모두 쓰려면 프로파일 두 개를 만들면 됩니다.

```bash
kis auth login --paper --name paper --make-default
kis auth login --prod  --name prod
kis auth list
```

명령마다 `--profile prod` 또는 `--profile paper` 로 스위칭합니다.

---

## Safety notes

1. **주문 명령은 기본적으로 확인 프롬프트가 뜹니다.** `kis order buy ... -y` 로만 스킵 가능합니다. 스크립트에서 `-y` 를 쓰기 전에, 반드시 `--profile paper` 로 한 번 돌려 보세요.
2. **실전 투자를 위한 안전장치는 CLI 가 아닌 당신의 책임입니다.** 주문 수량, 가격, 종목코드의 검증은 호출자가 책임집니다.
3. **Credentials are stored in plaintext YAML.** 팀 머신이나 CI 에 올리지 마세요. 필요하다면 OS keychain 기반으로 확장하세요.

---

## Library usage

TypeScript 코드에서도 직접 호출할 수 있습니다.

```ts
import { KisClient, loadConfig, getProfile } from "koreainvestment-cli";

const config = await loadConfig();
const profile = getProfile(config, "paper");
const client = new KisClient({ profileName: "paper", profile });

const res = await client.call({
  method: "GET",
  path: "/uapi/domestic-stock/v1/quotations/inquire-price",
  trId: "FHKST01010100",
  query: { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: "005930" },
});
console.log(res.output);
```

`KisClient.call()` 은 `tr_id` 에 대한 prod ⇄ paper 변환과 rate-limit 대기, 에러 envelope 파싱을 자동으로 처리합니다.

---

## Roadmap

- WebSocket 실시간 시세 (`kis stream price`)
- 조건검색 / 체결통보 구독
- CSV 내보내기 (`kis balance stock --csv`)
- hashkey 서명 자동 부착

이슈 / PR 언제든 환영합니다.

---

## License

MIT © HyeokjaeLee. See [LICENSE](./LICENSE).
