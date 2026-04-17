# koreainvestment-cli

> 한국투자증권 **open-trading-api** 를 위한 에이전트 친화 TypeScript CLI.
> 당신의 손가락이 아니라, 당신의 LLM 에이전트(Claude Code, OpenCode, Cursor 등)가 대신 쓰게 설계되었습니다.

```bash
npm install -g koreainvestment-cli
kis auth login --paper
kis quote price 005930
```

이게 전부입니다. 그 다음부터는 에이전트가 알아서 합니다.

> **참고:** npm 레지스트리에 아직 게시되지 않은 시점이면 GitHub 에서 직접 설치하세요.
> `npm install -g github:HyeokjaeLee/koreainvestment-cli` (clone 시 자동 빌드됩니다)

---

## 왜 또 다른 KIS 클라이언트인가?

한국투자증권 공식 [open-trading-api](https://github.com/koreainvestment/open-trading-api) 저장소는 Python 샘플 코드만 제공합니다. LLM 에이전트에게 매 요청마다 Python 런타임, YAML 설정, TR_ID 테이블을 새로 이해시키는 건 낭비입니다.

`koreainvestment-cli` 의 설계 철학은 다음과 같습니다.

- **에이전트 친화 (agent-native)** — 모든 명령이 한 줄로 실행되고, `--json` 플래그로 구조화된 출력을 반환합니다. 에이전트가 그대로 다음 단계 입력으로 파이프할 수 있습니다.
- **인증 정보 우선 UX** — `kis auth login` 한 번이면 APP_KEY / APP_SECRET / 계좌번호가 파일 권한 `0600` 으로 `~/.kis-cli/config.yaml` 에 저장됩니다.
- **모의투자 · 실전투자 동시 지원** — `paper`(모의) · `prod`(실전) 프로파일을 함께 보관하고, TR_ID 가 환경에 따라 자동으로 `T → V` 로 변환됩니다.
- **안전한 주문** — 주문 명령은 항상 확인 프롬프트를 띄웁니다. `-y / --yes` 를 명시해야만 건너뜁니다.

---

## 설치

### 사람이 직접 쓰는 경우

```bash
npm install -g koreainvestment-cli
kis init
```

그다음 [docs/installation.md](./docs/installation.md) 의 **"3단계 — 인증 정보 등록"** 부분을 따라가세요.

npm 레지스트리 미게시 상황이면 GitHub 주소로 설치하세요.

```bash
npm install -g github:HyeokjaeLee/koreainvestment-cli
```

`prepare` 스크립트가 clone 시점에 자동으로 `dist/` 를 빌드합니다.

### LLM 에이전트에게 맡기는 경우 (권장)

에이전트(예: Claude Code, OpenCode, Cursor)에게 아래 프롬프트를 그대로 복사해서 넘겨주세요.

```
아래 URL 의 설치 가이드를 한 글자도 빠짐없이 읽고, 그 지시에 따라 koreainvestment-cli 를
내 환경에 설치해줘. APP_KEY / APP_SECRET / 계좌번호 같은 증권 인증 정보를 처음 등록하는
`kis auth login` 단계는 네가 대신 입력하지 말고, 내가 직접 로컬 터미널에서 입력할 수
있게 명령어만 안내해줘. 등록이 끝난 뒤의 시세·잔고·주문 명령은 네가 직접 실행해도
괜찮아(주문은 실행 전에 나한테 확인 받아줘). 중간에 스킬 설치 여부를 물어보면, 내 답을
받아서 그대로 처리해줘.

https://raw.githubusercontent.com/HyeokjaeLee/koreainvestment-cli/main/docs/installation.md

중요: WebFetch 말고 `curl` 로 받아서 전체 내용을 읽어야 해. WebFetch 는 내용을 요약해서
중요한 CLI 플래그를 빠뜨려.
```

에이전트는 이 파일을 읽은 뒤:

1. CLI(`npm install -g koreainvestment-cli`) 를 설치해주고,
2. **사용자에게 `kis auth login --paper --make-default` 명령어를 안내**합니다. APP_KEY / APP_SECRET / 계좌번호는 에이전트가 절대 받지 않고, 사용자가 **로컬 터미널의 CLI 프롬프트에 직접 입력**합니다(APP_KEY / APP_SECRET 은 숨김 입력, 계좌번호·계좌상품코드·HTS ID 는 일반 텍스트 입력). 사용자가 입력을 마친 뒤 "완료" 라고 보고하도록 유도합니다.
3. 이어서 [`docs/skill-usage.md`](./docs/skill-usage.md) 를 사용자에게 보여주며 **"이 CLI 를 능숙하게 다루는 스킬도 같이 설치할까요?"** 라고 물어봅니다. 동의하면 에이전트가 해당 스킬 파일을 자신의 스킬 저장 경로(OpenCode 는 `~/.config/opencode/skills/...`, Claude Code 는 `~/.claude/skills/...`)로 복사해줍니다.
4. 등록이 끝난 뒤의 시세 조회(`kis quote`), 잔고 조회(`kis balance`), 해외 시세(`kis overseas`) 는 에이전트가 직접 실행해 결과를 해석해줍니다. 주문(`kis order buy/sell/modify/cancel`) 은 사용자 확인을 먼저 받은 뒤에만 실행합니다.

---

## 빠른 사용 예

```bash
# 1. 먼저 모의투자 프로파일로 안전하게 연결
kis auth login --paper

# 2. 발급된 토큰 검증
kis auth test --profile paper

# 3. 삼성전자 현재가
kis quote price 005930

# 4. 보유 잔고 확인
kis balance stock --profile paper

# 5. 모의 매수 1주 @ 지정가
kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper
```

모든 명령은 `--json` 을 붙이면 파싱 가능한 JSON 으로 응답합니다.

---

## 지원 기능 요약

| 기능 | 명령 | TR_ID (prod) |
|---|---|---|
| 현재가 시세 | `kis quote price <종목코드>` | `FHKST01010100` |
| 호가 / 예상체결 | `kis quote orderbook <종목코드>` | `FHKST01010200` |
| 일 / 주 / 월 / 년봉 | `kis quote daily <종목코드> --from … --to …` | `FHKST03010100` |
| 당일 분봉 | `kis quote minute <종목코드>` | `FHKST03010200` |
| 주식 잔고 | `kis balance stock` | `TTTC8434R` → `VTTC8434R` |
| 계좌 자산 요약 | `kis balance account` | `CTRP6548R` |
| 매수가능 금액 | `kis balance orderable --symbol …` | `TTTC8908R` |
| 현금 매수 / 매도 | `kis order buy / sell` | `TTTC0012U / TTTC0011U` |
| 정정 / 취소 | `kis order modify / cancel` | `TTTC0013U` |
| 해외주식 현재가 | `kis overseas price --exch NAS --symbol AAPL` | `HHDFS00000300` |
| 해외 잔고 | `kis overseas balance --exch NASD` | `TTTS3012R` |
| 해외 매수 / 매도 (미국) | `kis overseas buy / sell` | `TTTT1002U / TTTT1006U` |
| 환경 진단 | `kis doctor` | — |

---

## 에이전트 스킬

LLM 에이전트가 이 CLI 를 능숙하고 안전하게 다루도록 만드는 **사용 스킬** 이 함께 제공됩니다.

- 파일: [docs/skill-usage.md](./docs/skill-usage.md)
- 내용: 명령어 치트시트, 상호작용 패턴(시세 → 요약 / 잔고 → 테이블 / 매수 확인 → 주문), 에러 핸들링, 주문 전 안전 체크리스트
- 형식: 상단에 YAML frontmatter(`name`, `description`) 가 있어 OpenCode / Claude Code 의 스킬 시스템에 그대로 등록할 수 있습니다.

설치는 `installation.md` 의 **"6단계 — 스킬 설치 제안"** 단계에서 에이전트가 사용자에게 물어본 뒤 자동으로 진행합니다.

---

## 설정 파일

| 경로 | 용도 | 권한 |
|---|---|---|
| `~/.kis-cli/config.yaml` | 프로파일(APP_KEY / SECRET / 계좌) | `0600` |
| `~/.kis-cli/tokens.json` | 캐시된 access_token (만료 전 자동 재사용) | `0600` |

위치를 바꾸려면 `KIS_CLI_HOME=~/custom kis …` 로 환경변수를 오버라이드하세요.

실전 · 모의를 함께 쓰려면 프로파일 두 개를 만드세요.

```bash
kis auth login --paper --name paper --make-default
kis auth login --prod  --name prod
kis auth list
```

명령마다 `--profile prod` / `--profile paper` 로 전환합니다.

---

## 안전 유의사항

1. **신규 인증 정보 등록은 에이전트가 아닌 사용자가 직접 수행합니다.** `kis auth login` 은 APP_KEY / APP_SECRET / 계좌번호를 새로 받아 저장하는 명령이라 사용자가 로컬 터미널에서 직접 실행해야 합니다. APP_KEY · APP_SECRET 은 숨김(hidden) 입력으로 보호되고, 계좌번호 · 계좌상품코드 · HTS ID 는 일반 텍스트 입력입니다. 반면 등록 이후의 시세·잔고·주문·`kis auth test/show/list/logout` 명령은 저장된 토큰만 사용하므로 에이전트가 직접 실행해도 됩니다. (자세한 동작 원칙은 [docs/skill-usage.md](./docs/skill-usage.md) 의 "황금 원칙" 참고)
2. **주문 명령은 기본적으로 확인 프롬프트가 뜹니다.** `kis order buy ... -y` 로만 스킵됩니다. 스크립트에서 `-y` 를 쓰기 전에 반드시 `--profile paper` 로 한 번 돌려 보세요.
3. **실전 투자를 위한 안전장치는 CLI 가 아닌 당신의 책임입니다.** 주문 수량, 가격, 종목코드의 검증은 호출자가 책임져야 합니다.
4. **credentials 는 평문 YAML 로 저장됩니다.** 팀 머신이나 CI 에 올리지 마세요. 필요하다면 OS keychain 기반 저장소로 확장하세요.

---

## 라이브러리로도 사용 가능

TypeScript 코드에서도 바로 호출할 수 있습니다.

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

`KisClient.call()` 은 `tr_id` 의 prod ⇄ paper 변환, rate-limit 대기, 에러 envelope 파싱을 자동으로 처리합니다.

---

## 로드맵

- WebSocket 실시간 시세 (`kis stream price`)
- 조건검색 / 체결통보 구독
- CSV 내보내기 (`kis balance stock --csv`)
- hashkey 서명 자동 부착

이슈 / PR 언제든 환영합니다.

---

## 라이선스

MIT © HyeokjaeLee. [LICENSE](./LICENSE) 참고.
