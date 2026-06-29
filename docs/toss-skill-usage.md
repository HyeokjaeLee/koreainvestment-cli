---
name: toss-cli
description: 토스증권(Toss Securities) Open API 를 다루는 `toss` CLI 도구를 사용해 국내/해외 주식 시세·종목정보·환율·장운영 조회, 계좌 잔고 확인, 주문(매수/매도/금액기반/정정/취소) 을 안전하게 수행합니다. "토스증권 시세", "토스 계좌 잔고", "AAPL 금액기반 매수", "토스 환율", "토스 CLI", "toss 명령" 등의 요청에 자동 트리거되어야 합니다. 한국투자증권(KIS) 요청은 별개의 `kis` 바이너리/스킬을 사용하므로 이 스킬은 토스 전용입니다.
---

# 스킬: toss-cli 사용법

이 스킬은 `toss` 바이너리(토스증권 Open API)를 **안전하게** 다루는 방법을 학습시킵니다. `kis`(한국투자증권)와는 **별개의 바이너리**이며 프로파일 키도 분리되어 있습니다(`tossProfiles`). 같은 `~/.kis-cli/config.yaml` 을 공유하지만 토스 자격 증명은 `tossProfiles` 아래에 저장됩니다.

## 언제 이 스킬을 쓰는가

사용자가 다음과 같은 요청을 할 때 이 스킬을 자동으로 불러오세요.

- 국내(KRX 6자리) / 미국(영문 티커) 주식 시세·호가·체결·캔들·종목정보 조회
- 매수 유의사항, 환율, 장운영 캘린더 조회 (Toss 고유 기능)
- 토스 계좌의 보유 종목, 매수가능금액, 매도가능수량, 수수료율 조회
- 주문 — 수량기반(`buy`/`sell`), 금액기반(`amount`, US 전용), 정정, 취소
- `toss …` 또는 `토스 CLI` 로 시작하는 요청

아직 `toss` 가 설치되지 않았다면 [installation.md](./installation.md) 의 토스 섹션으로 이동해 설치부터 진행하세요.

---

## 황금 원칙

1. **신규 인증 정보 등록은 사용자가 직접 수행합니다.** `toss auth login` 은 clientId / clientSecret 을 새로 입력받아 저장하는 명령이므로 **에이전트가 대신 실행하면 안 됩니다.** clientId · clientSecret 은 숨김 입력 프롬프트로만 입력되어야 합니다. 에이전트는 **명령어를 안내**하고 사용자의 완료 보고를 기다리세요. 사용자가 그 값을 채팅으로 보내려고 하면 정중히 중단시키세요.
2. **등록된 토큰만 쓰는 명령은 에이전트가 실행해도 됩니다.** 한 번 `toss auth login` 으로 자격 증명이 저장된 뒤에는 `toss market`, `toss info`, `toss account`, 그리고 `toss auth test`/`show`/`list`/`logout` 같은 명령은 저장된 토큰만 사용하므로 에이전트가 직접 실행해 결과를 해석해도 안전합니다(새 값을 입력받지 않습니다).
3. **[Toss 핵심] 토스는 모의투자(paper) 환경이 없습니다.** 모든 `toss order` 명령은 **실자금으로 즉시 체결**됩니다. 예약도 불가합니다. 주문 전 반드시 plan 을 한국어로 요약해 사용자에게 **"이대로 진행할까요?"** 확인을 받은 뒤에만 실행하고, `-y` 바이패스는 확인 후에만 붙이세요.
4. **accountSeq 필수.** 계좌 연동 명령(잔고·주문)에는 `--account-seq <숫자>` 가 필요합니다. 모르면 먼저 `toss account list` 로 accountSeq 를 확인하세요. 프로파일에 기본 계좌로 등록해두면 생략할 수 있습니다.
5. **시세·종목정보·환율·캘린더는 계좌 무관** (토큰만 필요). 계좌 연동(잔고·주문) 명령만 accountSeq 가 필요합니다.
6. **여러 토스 계좌/프로파일이 있을 수 있습니다.** 어느 계좌(accountSeq)인지 모호하면 먼저 `toss auth list` 와 `toss account list` 로 확인한 뒤 사용자에게 어느 계좌로 처리할지 물어보세요.
7. **인증 정보 노출 금지.** `~/.kis-cli/config.yaml` 이나 `~/.kis-cli/tokens.json` 의 내용을 절대 읽거나 채팅창에 출력하지 마세요.
8. **연쇄 추론은 `--json` 으로.** 결과를 이어서 다음 명령의 입력으로 쓸 계획이라면 `--json` 을 붙여 구조화된 출력을 받으세요. 디버깅은 `TOSS_DEBUG=1` 환경변수를 사용하세요.

---

## 명령어 치트시트

### 시세 (계좌 무관)

| 의도 | 명령 |
|---|---|
| 현재가 (국내+해외) | `toss market prices --symbols 005930,AAPL --json` |
| 호가창 | `toss market orderbook 005930 --json` |
| 체결 내역 | `toss market trades 005930 --count 20 --json` |
| 상/하한가 | `toss market price-limits 005930 --json` |
| 캔들 (분봉) | `toss market candles 005930 --interval 1m --count 30 --json` |
| 캔들 (일봉) | `toss market candles 005930 --interval 1d --count 10 --json` |
| 종목 정보 | `toss market stocks --symbols 005930,AAPL --json` |
| 매수 유의사항 | `toss market warnings 005930 --json` |

### 시장 정보 (계좌 무관, Toss 고유)

| 의도 | 명령 |
|---|---|
| 환율 | `toss info exchange-rate --base-currency USD --quote-currency KRW --json` |
| 영업일 캘린더 (국내) | `toss info calendar --country KR --json` |
| 영업일 캘린더 (미국) | `toss info calendar --country US --json` |

### 계좌 / 자산 (accountSeq 필요)

| 의도 | 명령 |
|---|---|
| 계좌 목록 | `toss account list --json` (accountSeq 확인용) |
| 보유 종목 | `toss account holdings --account-seq 1 --json` |
| 매수 가능 금액 | `toss account buying-power --currency KRW --account-seq 1 --json` |
| 매도 가능 수량 | `toss account sellable-quantity 005930 --account-seq 1 --json` |
| 수수료율 | `toss account commissions --account-seq 1 --json` |

### 주문 (accountSeq 필요, LIVE 체결)

| 의도 | 명령 |
|---|---|
| 지정가 매수 | `toss order buy 005930 --qty 1 --price 325000 --account-seq 1` |
| 시장가 매수 | `toss order buy 005930 --qty 1 --order-type MARKET --account-seq 1` |
| 지정가 매도 | `toss order sell 005930 --qty 1 --price 330000 --account-seq 1` |
| 금액기반 매수 (US) | `toss order amount AAPL --amount-usd 100 --account-seq 1` |
| LOC(장마감) 매수 | `toss order buy AAPL --qty 1 --price 280 --time-in-force CLS --account-seq 1` |
| 멱등 주문 | `--client-order-id my-order-001` 추가 |
| 주문 목록 | `toss order list --status OPEN --account-seq 1 --json` |
| 주문 상세 | `toss order show <orderId> --account-seq 1 --json` |
| 정정 | `toss order modify <orderId> --order-type LIMIT --price 326000 --account-seq 1` |
| 취소 | `toss order cancel <orderId> --account-seq 1` |

주문 플래그 참고:

- `--order-type`: `LIMIT`(지정가, 기본) | `MARKET`(시장가). `LIMIT` 일 때 `--price` 필수.
- `--time-in-force`: `DAY`(기본) | `CLS`. `CLS` 는 US + `LIMIT` 조합에서 LOC(장마감) 주문.
- 금액기반 주문(`amount`)은 **US MARKET 전용**. orderType 은 `MARKET` 고정, `--side`(기본 `BUY`) 로 매수/매도 선택.
- 응답의 숫자 필드는 모두 **문자열**입니다 (예: `price='325000'`).

### 환경 / 진단

| 의도 | 명령 |
|---|---|
| 프로파일 목록 | `toss auth list` |
| 토큰 상태 | `toss auth show` |
| 토큰 강제 재발급 | `toss auth test` |

---

## 상호작용 패턴

공통 규칙: 자격 증명이 이미 등록된 상태(`toss auth login` 완료 후)에서는 **에이전트가 `toss market`/`toss info`/`toss account` 를 직접 실행하고 결과를 요약**합니다. `toss order` 계열만 plan 확인 후 실행합니다.

### 패턴 0 — 프로파일 / 계좌 해석 (모든 명령 실행 전)

사용자는 보통 "내 잔고 보여줘" 처럼 어느 계좌인지 말하지 않습니다. 토스 계좌가 여러 개면 accountSeq 도 여러 개이므로, 에이전트는 실제 명령을 실행하기 전에 **어느 프로파일·어느 계좌를 쓸지 결정**해야 합니다.

1. 먼저 등록된 프로파일을 확인합니다. (이 명령은 민감 값을 출력하지 않습니다.)

   ```bash
   toss auth list
   ```

2. 계좌 연동 명령(잔고·주문) 전에는 accountSeq 를 확인합니다.

   ```bash
   toss account list --json
   ```

3. 계좌가 2개 이상이고 어느 계좌인지 모호하면 사용자에게 먼저 물어보세요.
   > "토스 계좌가 여러 개 연동되어 있습니다. 어느 계좌로 진행할까요?
   > - accountSeq 1 (계좌번호 …)
   > - accountSeq 2 (계좌번호 …)"
4. 시세·종목정보·환율·캘린더는 계좌 무관이므로 accountSeq 없이 실행해도 됩니다.

### 패턴 1 — 시세 조회 → 요약

사용자: "삼성전자 현재가"

에이전트가 직접 실행:

```bash
toss market prices --symbols 005930 --json
```

응답의 `lastPrice`, `currency`, `timestamp` 를 한국어로 요약해 답하세요. (숫자 필드는 문자열로 옵니다.)

### 패턴 2 — 잔고 조회 → 테이블

사용자: "내 토스 잔고 보여줘"

에이전트가 직접 실행:

```bash
toss account holdings --account-seq 1 --json
```

응답에서 **symbol, name, quantity, lastPrice, profitLoss.rate** 를 뽑아 한국어 표로 정리해 보여주세요.

### 패턴 3 — 주문 (LIVE, 확인 필수)

사용자: "삼성전자 1주 사줘"

1. 매수가능 금액을 에이전트가 직접 확인:

   ```bash
   toss account buying-power --currency KRW --account-seq 1 --json
   ```

2. 계획을 한국어로 요약해 **반드시** 사용자에게 확인받으세요.
   > "다음 내용으로 주문을 진행하겠습니다.
   > - 종목: 삼성전자 (005930)
   > - 수량: 1주
   > - 가격: 325,000원 (지정가)
   > - accountSeq: 1
   > - **실자금 LIVE 체결** (토스는 모의투자가 없습니다)
   >
   > 이대로 진행할까요? (yes/no)"
3. "yes" 답을 받은 뒤에만 에이전트가 실행:

   ```bash
   toss order buy 005930 --qty 1 --price 325000 --account-seq 1 -y
   ```

   `-y` 는 사용자 confirm 을 이미 받았으므로 CLI 내부 프롬프트를 건너뛰기 위한 것입니다.
4. 응답의 `orderId` 를 기억해두세요(정정/취소에 사용).

### 패턴 4 — 정정 / 취소

정정 / 취소는 **`orderId` 하나로 처리**합니다. KIS 와 달리 지점번호(branch number)는 필요 없습니다 — orderId 는 단일 불투명 토큰입니다.

- 직전 `toss order buy` / `sell` / `amount` 응답에서 `orderId` 를 얻습니다.
- 잃어버렸다면 `toss order list --status OPEN --account-seq <seq> --json` 으로 미체결 주문을 조회해 찾으세요.

정정 / 취소도 주문과 동일하게 plan 을 사용자에게 요약해 확인받은 뒤에 `-y` 로 실행하세요.

---

## 에러 처리

| 에러 | 의미 | 에이전트가 할 일 |
|---|---|---|
| `Toss 프로파일 "..."을(를) 찾을 수 없습니다` | 로그인 안 됨 | **사용자에게 `toss auth login` 실행을 안내** (에이전트 대행 금지) |
| 토큰 발급 HTTP 401 | 잘못된 clientId/clientSecret | 재등록 안내 (`toss auth login` 재실행) |
| `accountSeq가 필요합니다` | accountSeq 미지정 | `toss account list` 로 accountSeq 확인 후 `--account-seq` 추가 |
| `{ error: { code, message } }` (TossApiError) | API 오류 | `message`/`code` 해석. 401 또는 토큰 만료면 `toss auth test` 재발급 후 재시도 |
| Network error | 일시 장애 | 1회 재시도 후 실패 시 사용자에게 보고 |

상세 디버깅이 필요하면 `TOSS_DEBUG=1` 접두사를 붙여 실행하세요.

```bash
TOSS_DEBUG=1 toss market prices --symbols 005930 --json
```

---

## 주문 전 안전 체크리스트

**반드시** `toss order … -y` 실행 전에 아래 항목을 모두 확인하세요.

- [ ] 사용자가 매수/매도, 종목, 수량, (가격 또는 금액)을 명시적으로 요청했는가?
- [ ] accountSeq 를 확인했는가? (`toss account list`)
- [ ] **토스는 모의투자가 없음을 사용자가 인지하고 있는가?** (실자금 LIVE 체결)
- [ ] plan 을 한국어로 요약하고 **"yes" 확인**을 받았는가?
- [ ] 장 시간인가? (KRX 09:00–15:30 KST, US 는 한국시간 밤·새벽)
- [ ] 최근 `toss auth test` 가 정상이었는가?

모두 체크되어야만 `-y` 를 붙여 주문을 실행하세요.

---

## 사람에게 제어를 돌려줘야 하는 경우

다음 상황에서는 자동화를 멈추고 사용자에게 명시적으로 물어보세요.

- 어느 계좌(accountSeq)인지 모호한 경우
- 고액 주문 — 합리적 상한선(예: ~1,000만 원 또는 ~$10,000)을 초과하는 경우
- 위 에러 표에 없는 낯선 에러 코드가 돌아오는 경우
- `toss auth` 단계가 연속 3회 실패하는 경우 — 인증 문제 또는 서비스 장애 가능성

---

## 버전 호환성

이 스킬은 `toss` 바이너리가 포함된 `koreainvestment-cli` 버전을 전제로 합니다. 버전을 확인하세요.

```bash
toss --version
```

---

한국투자증권(KIS) 요청은 별개의 `kis` 바이너리와 [skill-usage.md](./skill-usage.md) 스킬을 사용하세요. 두 브로커는 같은 패키지·같은 설정 파일을 공유하지만 프로파일 키가 분리되어 있습니다.
