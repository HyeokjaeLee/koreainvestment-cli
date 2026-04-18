---
name: koreainvestment-cli
description: 한국투자증권(KIS) open-trading API 를 다루는 `kis` CLI 도구를 사용해 국내/해외 주식 시세 조회, 계좌 잔고 확인, 주문(매수/매도/정정/취소) 을 안전하게 수행합니다. "내 잔고 확인해줘", "삼성전자 현재가", "005930 1주 모의매수", "AAPL 현재가", "해외주식 잔고", "한투 CLI", "한국투자증권" 등의 요청에 자동 트리거되어야 합니다.
---

# 스킬: `koreainvestment-cli` 사용법

이 스킬은 `koreainvestment-cli` (실행 바이너리: `kis`) 를 **안전하게** 다루는 방법을 학습시킵니다.

## 언제 이 스킬을 쓰는가

사용자가 다음과 같은 요청을 할 때 이 스킬을 자동으로 불러오세요.

- 한국 주식(KRX / NXT) 현재가 / 호가 / 일봉 / 분봉 조회
- 미국 / 홍콩 / 일본 / 중국 주식 현재가
- 한국투자증권 계좌의 잔고, 예수금, 매수가능금액 조회
- 주문 (매수, 매도, 정정, 취소) — **원칙적으로 모의계정(paper) 에서만**
- `kis …` 또는 `한투 CLI` 로 시작하는 요청

아직 `kis` 가 설치되지 않았다면 먼저 [installation.md](https://github.com/HyeokjaeLee/koreainvestment-cli/blob/main/docs/installation.md) 로 이동해 설치부터 진행하세요.

---

## 황금 원칙

1. **신규 인증 정보 등록은 사용자가 직접 수행합니다.** `kis auth login` 은 APP_KEY / APP_SECRET / 계좌번호를 새로 입력받아 `~/.kis-cli/config.yaml` 에 저장하는 명령이므로 **에이전트가 대신 실행하면 안 됩니다.** 민감 정보는 사용자의 로컬 터미널 CLI 프롬프트로만 입력되어야 합니다(APP_KEY · APP_SECRET 은 숨김 입력, 계좌번호 · 계좌상품코드 · HTS ID 는 일반 텍스트 입력). 에이전트는 **명령어를 안내**하고 사용자의 완료 보고를 기다리세요. 사용자가 그 값을 채팅으로 보내려고 하면 정중히 중단시키세요.
2. **등록된 토큰만 쓰는 명령은 에이전트가 실행해도 됩니다.** 한 번 `kis auth login` 으로 자격 증명이 저장된 뒤에는 `kis quote`, `kis balance`, `kis overseas`, `kis doctor` 같은 명령은 저장된 토큰만 사용하므로 에이전트가 직접 실행해 결과를 해석해도 안전합니다. `kis auth test`, `kis auth show`, `kis auth list`, `kis auth logout` 처럼 등록된 자격 증명을 확인/관리하는 명령도 마찬가지입니다(새 값을 입력받지 않습니다).
3. **주문 명령(`kis order buy/sell/modify/cancel`)은 실행해도 되지만 항상 plan 확인을 먼저.** 실제 자산을 움직이므로, 종목·수량·가격·매수/매도·프로파일을 한국어로 요약해 사용자에게 **"이대로 진행할까요?"** 확인을 받은 뒤에만 실행하세요. 사용자가 명시적으로 `-y` 바이패스를 허락하지 않았다면 CLI 내부 확인 프롬프트를 살려 두세요.
4. **모의계정 우선.** 모든 주문 명령에는 기본적으로 `--profile paper` 를 붙이세요. 사용자가 명시적으로 "실전" 또는 "production" 이라고 말한 경우에만 실전 프로파일을 씁니다. 모호한 "매수해줘" 는 **paper** 로 해석합니다.
5. **여러 실전 계좌가 있을 수 있습니다.** 한국투자증권은 보통 계좌 1개당 APP_KEY/APP_SECRET 을 1쌍씩 발급하므로, 사용자가 주계좌 · ISA · 퇴직연금처럼 여러 계좌를 등록해둔 경우 프로파일도 여러 개일 수 있습니다. **어느 계좌를 쓸지 확신이 서지 않으면 먼저 `kis auth list` 를 실행해** 등록된 프로파일 목록을 확인하고, 실전 프로파일이 2개 이상이면 사용자에게 어떤 계좌로 처리할지 물어보세요. 상세 플로우는 아래 "패턴 0 — 프로파일 해석" 참고.
6. **인증 정보 노출 금지.** `~/.kis-cli/config.yaml` 이나 `~/.kis-cli/tokens.json` 의 내용을 절대 읽거나 채팅창에 출력하지 마세요.
7. **연쇄 추론은 `--json` 으로.** 결과를 이어서 다음 명령의 입력으로 쓸 계획이라면 `--json` 을 붙여 구조화된 출력을 받으세요.
8. **rate limit.** 모의투자 환경은 호출 사이에 500ms 강제 대기가 있습니다(CLI 가 자동 처리). 그래도 연속 10회 이상을 쉬지 않고 쏘지는 마세요.

---

## 명령어 치트시트

### 시세 조회 (국내)

| 의도 | 명령 |
|---|---|
| 현재가 | `kis quote price 005930 --json` |
| 호가 / 예상체결 | `kis quote orderbook 005930 --json` |
| 일봉 (2026-01-01 ~ 2026-04-18) | `kis quote daily 005930 --from 20260101 --to 20260418 --period D --json` |
| 주봉 | 위 명령에서 `--period W` |
| 분봉 (당일) | `kis quote minute 005930 --json` |

### 계좌 / 잔고

| 의도 | 명령 |
|---|---|
| 보유 주식 잔고 | `kis balance stock --profile paper --json` |
| 계좌 자산 요약 | `kis balance account --profile paper --json` |
| 삼성전자 매수가능 금액 | `kis balance orderable --symbol 005930 --price 70000 --profile paper --json` |

### 주문 (국내)

| 의도 | 명령 |
|---|---|
| 지정가 매수 | `kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper` |
| 시장가 매수 | `kis order buy --symbol 005930 --qty 1 --price 0 --division 01 --profile paper` |
| 지정가 매도 | `kis order sell --symbol 005930 --qty 1 --price 72000 --profile paper` |
| 정정 주문 | `kis order modify --org-order-no 0001 --order-branch 01234 --qty 1 --price 71000 --profile paper --all` |
| 전량 취소 | `kis order cancel --org-order-no 0001 --order-branch 01234 --all --profile paper` |

`ORD_DVSN` (`--division`) 값 참고:
- `00` = 지정가 (기본)
- `01` = 시장가
- `02` = 조건부지정가
- `03` = 최유리지정가
- `04` = 최우선지정가

### 해외주식

| 의도 | 명령 |
|---|---|
| 애플 현재가 (Nasdaq) | `kis overseas price --exch NAS --symbol AAPL --json` |
| 해외 잔고 (미국) | `kis overseas balance --exch NASD --currency USD --profile paper --json` |
| 미국 매수 | `kis overseas buy --exch NASD --symbol AAPL --qty 1 --price 190.00 --profile paper` |

거래소 코드 (trading API `--exch`): `NASD`, `NYSE`, `AMEX`, `SEHK` (홍콩), `TKSE` (도쿄), `SHAA` (상하이), `SZAA` (선전).
거래소 코드 (quote API `--exch`): `NAS`, `NYS`, `AMS`, `HKS`, `TSE`, `SHS`, `SZS`.
`kis overseas price` 는 두 형식을 모두 받아 자동으로 정규화합니다.

### 환경 / 진단

| 의도 | 명령 |
|---|---|
| 환경 점검 | `kis doctor --profile paper` |
| 프로파일 목록 | `kis auth list` |
| 토큰 상태 | `kis auth show --profile paper` |
| 토큰 강제 재발급 | `kis auth test --profile paper` |

---

## 상호작용 패턴

공통 규칙: 자격 증명이 이미 등록된 상태(`kis auth login` 완료 후)에서는 **에이전트가 `kis quote`/`kis balance`/`kis overseas`/`kis doctor` 를 직접 실행하고 결과를 요약**합니다. `kis order` 계열만 plan 확인 후 실행합니다.

### 패턴 0 — 프로파일 해석 (모든 명령 실행 전)

사용자는 보통 "내 잔고 보여줘" 처럼 어느 계좌인지 말하지 않습니다. 한국투자증권 계좌가 여러 개면 프로파일도 여러 개이므로, 에이전트는 실제 명령을 실행하기 전에 **어느 프로파일을 쓸지 결정**해야 합니다.

1. 먼저 현재 등록된 프로파일을 확인합니다. (이 명령은 민감 값을 출력하지 않습니다 — 프로파일 이름·환경·마스킹 없는 계좌번호만 보여줍니다.)
   ```bash
   kis auth list
   ```
   출력 예:
   ```
   ┌──────┬───────────┬──────┬─────────────┬────────┬───────────┬───────────┐
   │ 기본 │ 이름      │ 환경 │ 계좌        │ HTS ID │ 토큰 캐시 │ 만료 시각 │
   ├──────┼───────────┼──────┼─────────────┼────────┼───────────┼───────────┤
   │ *    │ paper     │ 모의 │ 50123456-01 │        │ 있음      │ …         │
   │      │ main-prod │ 실전 │ 50000001-01 │        │ 없음      │           │
   │      │ isa-prod  │ 실전 │ 50000002-01 │        │ 없음      │           │
   └──────┴───────────┴──────┴─────────────┴────────┴───────────┴───────────┘
   ```
   "기본" 열의 `*` 가 default 프로파일입니다. 스크립트나 다른 도구로 파싱해야 할 때는 `kis auth list --json` 을 쓰면 구조화된 배열을 받습니다.

2. 프로파일 선택 규칙을 아래 순서로 적용하세요.
   1. **시세 조회(`kis quote`, `kis overseas price`)** — default 프로파일이면 충분합니다. `--profile` 을 생략하거나 `paper` 를 쓰세요. 시세는 계좌에 종속되지 않으므로 굳이 실전 프로파일을 고를 필요가 없습니다.
   2. **모호한 요청("매수해줘", "잔고 보여줘")** — `paper` 가 기본. 사용자가 "실전" 이라고 명시했을 때만 실전 프로파일 후보를 고려합니다.
   3. **"실전" 이 명시됐고 실전 프로파일이 1개** — 그 프로파일을 그대로 씁니다.
   4. **"실전" 이 명시됐고 실전 프로파일이 2개 이상** — 사용자에게 먼저 물어보세요.
      > "실전 계좌가 여러 개 등록되어 있습니다. 어느 쪽으로 진행할까요?
      > - `main-prod` (계좌 50000001-01)
      > - `isa-prod` (계좌 50000002-01)"
   5. **사용자가 직접 `--profile <name>` 이나 계좌 이름(예: "ISA 계좌로")을 말했다** — 그대로 존중합니다. `kis auth list` 에 없는 이름이면 사용자에게 오타/미등록 가능성을 알려주세요.

3. 결정된 프로파일을 명령의 `--profile` 플래그로 넘기고, 결과를 요약할 때 사용자가 어느 계좌의 값인지 알 수 있도록 프로파일 이름을 함께 보여주세요.

### 패턴 1 — 시세 조회 → 요약

사용자: "삼성전자 지금 얼마야?"

에이전트가 직접 실행:
```bash
kis quote price 005930 --profile paper --json
```

응답 JSON 의 `output.stck_prpr` (현재가), `output.prdy_vrss` (전일대비), `output.prdy_ctrt` (전일 대비율) 를 한국어로 요약해 답하세요.

### 패턴 2 — 잔고 조회 → 테이블

사용자: "내 모의계정 잔고 보여줘"

에이전트가 직접 실행:
```bash
kis balance stock --profile paper --json
```

응답의 `output1[]` (종목 리스트) 와 `output2[0]` (요약) 에서 **종목명, 수량, 평가금액, 평가손익률** 을 뽑아 한국어 표로 정리해 보여주세요.

### 패턴 3 — 매수가능 확인 → 계획 확인 → 매수 실행

사용자: "모의계정에서 삼성전자 1주 사줘 (70000원)"

1. 매수가능 여부를 에이전트가 직접 확인:
   ```bash
   kis balance orderable --symbol 005930 --price 70000 --profile paper --json
   ```
   `output.ORD_PSBL_CASH`, `output.MAX_BUY_AMT` 를 해석.
2. 계획을 한국어로 요약해 **반드시** 사용자에게 확인받으세요.
   > "다음 내용으로 주문을 진행하겠습니다.
   > - 종목: 삼성전자 (005930)
   > - 수량: 1주
   > - 가격: 70,000원 (지정가)
   > - 프로파일: paper (모의투자)
   >
   > 이대로 진행할까요? (yes/no)"
3. "yes" 답을 받은 뒤에만 에이전트가 실행:
   ```bash
   kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper -y
   ```
   `-y` 는 사용자 confirm 을 이미 받았으므로 CLI 내부 프롬프트를 건너뛰기 위한 것입니다. "실전" 프로파일일 때는 사용자에게 한 번 더 확인을 받으세요.
4. 응답의 `output.KRX_FWDG_ORD_ORGNO` 와 `output.ODNO` 를 기억해두세요(정정/취소에 사용).

### 패턴 4 — 정정 / 취소

정정 / 취소에는 두 식별자가 반드시 필요합니다.

- `KRX_FWDG_ORD_ORGNO` — 주문 지점번호
- `ODNO` — 원주문번호

**이 값들은 직전 `kis order buy` / `kis order sell` 응답 (`--json` 시 `output.KRX_FWDG_ORD_ORGNO`, `output.ODNO`) 에서 얻습니다.** 현재 버전의 `kis balance stock` 은 보유 종목과 요약만 반환하므로 미체결 리스트 조회용이 아닙니다. 직전 주문 응답을 잃어버렸다면 HTS 또는 KIS 포털에서 주문번호를 사용자가 직접 확인해 알려주셔야 합니다.

정정 / 취소도 주문과 동일하게 plan 을 사용자에게 요약해 확인받은 뒤에 `-y` 로 실행하세요.

---

## 에러 처리

| 에러 | 의미 | 에이전트가 할 일 |
|---|---|---|
| `Profile "paper" not found` | 로그인 안 됨 | **사용자에게 `kis auth login --paper` 실행을 안내** (에이전트 대행 금지) |
| `KIS API error: EGW00113` | 토큰 만료 | `kis auth test --profile paper` 를 에이전트가 실행해 토큰 재발급 후 원 명령 재시도 |
| `KIS API error: EGW00201` | TPS 초과 | 1~2초 대기 후 재시도. 지속되면 병렬도 낮추기 |
| `KIS API error: APBK0955` | 주문 수량/금액 오류 | `--qty` / `--price` 재확인, 장 시간 여부 확인 |
| `KIS API error: 40500000` (해외) | 장외 시간 | 해외주식은 장외 시간에는 지정가만 가능 |
| Network error / ECONNRESET | 일시 네트워크 | 1회 재시도 후 실패 시 사용자에게 보고 |

상세 디버깅이 필요하면 `KIS_DEBUG=1` 접두사를 붙여 실행하세요.

```bash
KIS_DEBUG=1 kis balance stock --profile paper
```

---

## 주문 전 안전 체크리스트

**반드시** 주문 실행 전에 아래 항목을 모두 확인하세요.

- [ ] 사용자가 매수/매도, 종목, 수량, 가격을 명시적으로 요청했는가?
- [ ] 사용자가 "실전" 을 명시하지 않았다면 `--profile paper` 를 쓰고 있는가?
- [ ] plan 을 사용자에게 요약해서 돌려주고 **"yes" 확인**을 받았는가?
- [ ] 장 시간인가? (KRX 09:00–15:30 KST, 미국은 한국시간 밤) 장외라면 사용자에게 경고했는가?
- [ ] 지난 1시간 이내에 `kis auth test --profile <p>` 가 녹색이었는가?

5개 모두 체크가 되어야만 `-y` 를 붙여 주문을 실행하세요.

---

## 사람에게 제어를 돌려줘야 하는 경우

다음 상황에서는 자동화를 멈추고 사용자에게 명시적으로 물어보세요.

- 모의 / 실전 여부가 모호한 경우
- 한 주문의 총 금액이 ~1,000만 원을 초과하는 경우 (모의 환경 기준 합리적 상한선; 사용자에 따라 조정)
- 위 에러 표에 없는 낯선 에러 코드가 돌아오는 경우
- `auth` / `doctor` 단계가 연속 3회 실패하는 경우 — 인증 문제 또는 서비스 장애 가능성

---

## 버전 호환성

이 스킬은 `koreainvestment-cli >= 0.1.0` 을 전제로 합니다. `kis --version` 이 더 낮은 버전을 출력하면 다음을 안내하세요.

```bash
npm install -g koreainvestment-cli@latest
```
