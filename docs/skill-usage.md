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

아직 `kis` 가 설치되지 않았다면 먼저 [`docs/installation.md`](./installation.md) 로 이동해 설치부터 진행하세요.

---

## 황금 원칙

1. **증권 인증은 사용자가 직접 수행합니다.** `kis auth login`, `kis auth test`, `kis auth logout` 등 인증 계열 명령은 **에이전트가 대신 실행하면 안 됩니다**. APP_KEY / APP_SECRET / 계좌번호 같은 민감 정보는 사용자의 로컬 터미널에서 CLI 프롬프트로만 입력되어야 합니다(APP_KEY · APP_SECRET 은 숨김 입력, 계좌번호 · 계좌상품코드 · HTS ID 는 일반 텍스트 입력). 에이전트는 명령어를 **안내만** 하고 사용자의 완료 보고를 기다리세요. 사용자가 그 값을 채팅으로 보내려고 하면 정중히 중단시키세요.
2. **토큰이 필요한 모든 `kis` 명령은 사용자가 직접 실행합니다.** 한국투자증권 API 는 시세 조회조차 접근 토큰을 요구하기 때문에, `kis quote`, `kis balance`, `kis overseas`, `kis order`, `kis doctor` 같은 서브커맨드는 **모두 사용자 프로파일** 을 사용합니다. 에이전트는 실행할 명령을 한국어로 제안하고 사용자가 터미널에서 실행한 뒤 결과(또는 `--json` 출력)를 알려주면, 그 출력을 해석해 답변합니다. **에이전트가 인증 정보를 사용하는 `kis` 명령을 직접 실행하지 않습니다.** 에이전트가 대신 돌려도 되는 것은 `kis --version`, `kis --help`, `kis init` 등 인증 정보가 필요 없는 유틸 뿐입니다.
3. **모의계정 우선.** 모든 주문 명령에는 기본적으로 `--profile paper` 를 붙이세요. 사용자가 명시적으로 "실전" 또는 "production" 이라고 말한 경우에만 `--profile prod` 를 씁니다. 모호한 "매수해줘" 는 **paper** 로 해석합니다.
4. **주문 전 금액 확인.** `kis order buy/sell` 실행 전에 반드시 plan(종목, 수량, 가격, 매수/매도, 프로파일) 을 사용자에게 요약해서 돌려주고 "yes" 를 받은 뒤에만 최종 명령을 보여주세요. `-y` 플래그 사용 여부는 사용자가 직접 판단하게 두세요(에이전트는 항상 확인 프롬프트를 남겨두는 쪽을 권장).
5. **인증 정보 노출 금지.** `~/.kis-cli/config.yaml` 이나 `~/.kis-cli/tokens.json` 의 내용을 절대 읽거나 채팅창에 출력하지 마세요.
6. **연쇄 추론은 `--json` 으로.** 결과를 이어서 다음 명령의 입력으로 쓸 계획이라면, 제안하는 명령에 무조건 `--json` 을 붙여 사용자가 구조화된 출력을 돌려줄 수 있게 하세요.
7. **rate limit.** 모의투자 환경은 호출 사이에 500ms 강제 대기가 있습니다(CLI 가 자동 처리). 그래도 사용자에게 수초 내 연속 실행을 10회 이상 제안하지 마세요.

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

모든 패턴의 공통 규칙: **에이전트는 명령을 제안하고 해석하며, 실행은 사용자가 직접 터미널에서** 합니다. 사용자는 `--json` 출력을 복사해 돌려주고, 에이전트는 그 JSON 을 한국어로 요약·해석합니다.

### 패턴 1 — 시세 조회 → 사용자 실행 → 요약

사용자: "삼성전자 지금 얼마야?"

1. 에이전트가 다음 명령을 제안합니다.
   ```
   아래 명령을 터미널에서 실행해 주세요. JSON 출력을 그대로 붙여주시면 요약해 드리겠습니다.

      kis quote price 005930 --profile paper --json
   ```
2. 사용자가 JSON 출력을 돌려주면, 에이전트는 `output.stck_prpr` (현재가), `output.prdy_vrss` (전일대비), `output.prdy_ctrt` (전일 대비율) 를 한국어로 요약합니다.

### 패턴 2 — 잔고 조회 → 사용자 실행 → 테이블 요약

사용자: "내 모의계정 잔고 보여줘"

1. 에이전트가 명령을 제안합니다.
   ```
   아래 명령을 터미널에서 실행하고 JSON 출력을 붙여주세요.

      kis balance stock --profile paper --json
   ```
2. 사용자가 돌려준 JSON 의 `output1[]` (종목 리스트) 와 `output2[0]` (요약) 에서 **종목명, 수량, 평가금액, 평가손익률** 을 뽑아 한국어 표로 정리해 보여줍니다.

### 패턴 3 — 매수가능 확인 → 계획 확인 → 사용자 직접 매수 실행

사용자: "모의계정에서 삼성전자 1주 사줘 (70000원)"

1. **매수가능 확인 명령 제안** (사용자가 직접 실행):
   ```
   먼저 매수 여력이 되는지 확인해 주세요.

      kis balance orderable --symbol 005930 --price 70000 --profile paper --json
   ```
   사용자가 JSON 출력을 돌려주면 에이전트는 `output.ORD_PSBL_CASH`, `output.MAX_BUY_AMT` 를 해석해 매수 가능 여부를 알려줍니다.
2. **계획 요약 & 확인**:
   > "다음 내용으로 주문을 준비해드리겠습니다.
   > - 종목: 삼성전자 (005930)
   > - 수량: 1주
   > - 가격: 70,000원 (지정가)
   > - 프로파일: paper (모의투자)
   >
   > 이대로 진행하시겠습니까? (yes/no)"
3. "yes" 를 받으면 **실행 명령을 보여주고 사용자가 직접 실행**하도록 안내:
   ```
   아래 명령을 터미널에서 직접 실행해 주세요. CLI 가 '이대로 주문을 전송할까요?'
   라고 다시 한 번 물어보면 y 를 입력하세요.

      kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper

   실행 결과(특히 output.KRX_FWDG_ORD_ORGNO 와 output.ODNO)를 알려주시면
   이후 정정/취소에 사용할 수 있도록 기억해 두겠습니다.
   ```
4. 사용자가 응답의 `output.KRX_FWDG_ORD_ORGNO` 와 `output.ODNO` 를 알려주시면, 이후 정정/취소 시 사용할 수 있도록 기억해 두세요.

### 패턴 4 — 정정 / 취소

정정 / 취소에는 두 식별자가 반드시 필요합니다.

- `KRX_FWDG_ORD_ORGNO` — 주문 지점번호
- `ODNO` — 원주문번호

**이 값들은 직전 `kis order buy` / `kis order sell` 응답 (`--json` 시 `output.KRX_FWDG_ORD_ORGNO`, `output.ODNO`) 에서 얻습니다.** 현재 버전의 `kis balance stock` 은 보유 종목과 요약만 반환하므로 미체결 리스트 조회용이 아닙니다. 직전 주문 응답을 잃어버렸다면 HTS 또는 KIS 포털에서 주문번호를 사용자가 직접 확인해 알려주셔야 합니다.

정정 / 취소 역시 패턴 3 과 동일하게 plan 을 사용자에게 먼저 요약·확인한 뒤, 실행 명령만 보여주고 **사용자가 직접** 터미널에서 실행하게 하세요.

---

## 에러 처리

사용자가 돌려준 에러 메시지를 아래 표에 따라 해석하고, **다음에 실행할 명령을 제안**하세요. 에이전트가 직접 재실행하지는 않습니다.

| 에러 | 의미 | 사용자에게 제안할 다음 조치 |
|---|---|---|
| `Profile "paper" not found` | 로그인 안 됨 | `kis auth login --paper` 를 사용자에게 안내 (에이전트 금지) |
| `KIS API error: EGW00113` | 토큰 만료 | `kis auth test --profile paper` 실행 후 동일 명령 재시도 |
| `KIS API error: EGW00201` | TPS 초과 | 1~2초 대기 후 동일 명령 재시도 제안 |
| `KIS API error: APBK0955` | 주문 수량/금액 오류 | `--qty` / `--price` 를 재확인하도록 사용자에게 안내, 장 시간 여부 확인 |
| `KIS API error: 40500000` (해외) | 장외 시간 | 해외주식은 장외 시간에는 지정가만 가능함을 안내 |
| Network error / ECONNRESET | 일시 네트워크 | 동일 명령을 한 번만 더 실행해 보라고 안내, 반복되면 보고 |

상세 디버깅이 필요하면 사용자에게 `KIS_DEBUG=1` 접두사 사용을 안내하세요.

```
KIS_DEBUG=1 kis balance stock --profile paper --json
```

---

## 주문 전 안전 체크리스트

**반드시** 주문 명령을 사용자에게 제안하기 전에 아래 항목을 모두 확인하세요.

- [ ] 사용자가 매수/매도, 종목, 수량, 가격을 명시적으로 요청했는가?
- [ ] 사용자가 "실전" 을 명시하지 않았다면 `--profile paper` 를 쓰고 있는가?
- [ ] plan 을 사용자에게 요약해서 돌려주고 confirm 을 받았는가?
- [ ] 장 시간인가? (KRX 09:00–15:30 KST, 미국은 한국시간 밤) 장외라면 사용자에게 경고했는가?
- [ ] 지난 1시간 이내에 `kis auth test --profile <p>` 가 사용자 쪽에서 성공 보고된 적이 있는가?

5개 모두 체크가 되어야 사용자에게 실행 명령을 보여줍니다. 실행 자체는 사용자가 직접 터미널에서 수행합니다.

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
