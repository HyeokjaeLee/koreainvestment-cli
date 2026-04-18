# koreainvestment-cli 설치 가이드

> **사람이 읽는 경우**: 아래 [사람 사용자를 위한 안내](#사람-사용자를-위한-안내) 섹션으로 이동하세요.
> **LLM 에이전트** (Claude Code, OpenCode, Cursor, Cline, GPT-5, Gemini CLI 등)**인 경우**: 이 문서를 결정론적 체크리스트로 간주하고 **모든 단계를 순서대로 그대로 수행**하세요. 생략 금지.

---

## 사람 사용자를 위한 안내

AI 에이전트(ChatGPT, Claude, Cursor, OpenCode 등)에게 아래 블록을 그대로 복사해서 넘겨주세요.

```
아래 URL 의 설치 가이드를 한 글자도 빠짐없이 읽고, 그 지시에 따라 koreainvestment-cli 를
내 환경에 설치해줘. 중간에 스킬 설치 여부를 물어보면, 내 답을 받아서 그대로 처리해줘.

https://raw.githubusercontent.com/HyeokjaeLee/koreainvestment-cli/main/docs/installation.md

중요: WebFetch 말고 `curl` 로 받아서 전체 내용을 읽어야 해. WebFetch 는 내용을 요약해서
중요한 CLI 플래그를 빠뜨려.
```

그리고 아무것도 하지 마세요. 나머지는 에이전트가 진행합니다.

---

## LLM 에이전트를 위한 지시

안녕하세요, 에이전트님. 당신은 사용자가 `koreainvestment-cli` — 한국투자증권 open-trading REST API 를 감싸는 TypeScript CLI — 를 설치하도록 도와야 합니다.

### 🚨 절대 원칙 (전체 단계에 공통)

- **인증 정보 등록(`kis auth login`)은 에이전트가 대신 실행하지 않습니다.** APP_KEY / APP_SECRET / 계좌번호는 금융 자산에 직결되는 민감 정보이므로 **사용자 본인이 로컬 터미널에서** `kis auth login` 을 실행해 CLI 프롬프트에 직접 입력해야 합니다. 에이전트는 명령어만 안내하고 사용자의 "완료" 보고를 기다리세요. `kis auth logout`, `kis auth test`, `kis auth show`, `kis auth list` 처럼 이미 등록된 자격 증명만 건드리는 보조 명령은 에이전트가 실행해도 되지만, 가능하면 사용자에게 먼저 제안하세요.
- **사용자가 APP_KEY / APP_SECRET / 계좌번호 등을 채팅창에 보내려고 하면**, 정중히 중단시키고 "그 값은 저한테 보내지 마시고 로컬 터미널의 `kis auth login` 프롬프트에 직접 입력해주세요" 라고 안내하세요.
- **인증 정보 등록이 끝난 뒤의 `kis` 명령(`kis quote`, `kis balance`, `kis order`, `kis overseas`, `kis doctor`)은 에이전트가 직접 실행해도 됩니다.** 토큰은 이미 `~/.kis-cli/` 에 저장되어 있으므로 추가 민감 정보 입력이 필요하지 않습니다. 단 `kis order buy/sell/modify/cancel` 은 실제 자산을 움직이므로 **항상 사용자에게 plan 을 먼저 요약해 확인을 받은 뒤** 실행하세요(자세한 규칙은 [skill-usage.md](./skill-usage.md) 의 "주문 전 안전 체크리스트" 참고).
- **에이전트가 곧바로 쓸 수 있는 인증 불필요 유틸**: `node -v`, `npm install -g koreainvestment-cli`, `kis --version`, `kis --help`, `kis init`, `curl` / 파일 복사 같은 스킬 설치 관련 명령.

먼저 사용자에게 짧게 인사하세요.

> "알겠습니다. `koreainvestment-cli` 를 설치해드리겠습니다. 총 8단계입니다. 증권 인증 정보 입력은 보안상 **사용자께서 직접** 로컬 터미널에서 해주셔야 하고, 제가 명령어를 안내해드립니다. 다 끝나면 이 CLI 를 능숙하게 다루는 에이전트 스킬도 설치할지 여쭤보겠습니다."

그리고 아래 단계를 **순서대로** 모두 수행하세요. 건너뛰지 마세요.

---

### 0단계 — 사전 준비 확인

아래 **두 가지**만 사용자에게 확인하세요. 이 단계에서는 민감 정보(계좌번호, 상품코드, HTS ID, APP_KEY / APP_SECRET 등)를 **어떤 것도 채팅으로 묻지 않습니다**. 그것들은 3단계의 `kis auth login` 프롬프트에서만 입력되어야 합니다.

1. **한국투자증권 APP_KEY / APP_SECRET 이 이미 있나요?**
   - 없다고 하면 [https://apiportal.koreainvestment.com/](https://apiportal.koreainvestment.com/) 에서 발급받아오라고 안내하세요. `paper`(모의투자)용과 `prod`(실전투자)용은 서로 다른 키이므로 필요한 쪽을 발급받으면 됩니다.
   - "있다" 또는 "발급 완료" 답을 받기 전까지는 다음 단계로 넘어가지 마세요.
2. **먼저 어느 프로파일을 설정할까요?** 보통 `paper`(모의투자)를 먼저 권장합니다.

> 🚨 **에이전트 금지 사항**: 계좌번호(CANO) 8자리, 계좌상품코드(예: `01`), HTS ID 는 이 단계에서 **절대 묻지 마세요.** 3단계의 `kis auth login` 프롬프트가 사용자의 로컬 터미널에서 직접 받아 저장합니다. APP_KEY / APP_SECRET 도 마찬가지로 채팅창에서 받지 마세요.

---

### 1단계 — Node.js 버전 확인

다음을 실행:

```bash
node -v
```

**Node 18 이상**이어야 합니다. 낮으면 [`nvm`](https://github.com/nvm-sh/nvm) 또는 패키지 매니저로 업그레이드하라고 안내하세요. 구버전에서는 진행하지 마세요.

---

### 2단계 — CLI 설치

다음 중 **하나**를 실행하세요. npm 레지스트리에 게시된 경우 첫 번째, 아직이면 두 번째(GitHub 직접 설치) 를 사용합니다. 두 경로 모두 동일한 바이너리를 설치합니다.

```bash
# 1순위: npm 레지스트리
npm install -g koreainvestment-cli

# 실패 시(404 Not Found) 폴백: GitHub 직접 설치 (clone 시 자동 빌드)
npm install -g github:HyeokjaeLee/koreainvestment-cli
```

검증:

```bash
kis --version
# 예: 0.1.0 (또는 그 이상)
```

만약 `kis: command not found` 가 뜨면 사용자의 전역 `bin` 이 `PATH` 에 없을 확률이 높습니다. 사용자 쉘에 맞춰 다음 중 하나를 실행하도록 안내하세요.

```bash
# zsh 를 쓰는 경우
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# bash 를 쓰는 경우
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# fish 를 쓰는 경우
fish_add_path (npm prefix -g)/bin
```

또는 설치 자체가 막혔다면 GitHub 직접 설치를 시도하세요 (clone 시점에 자동 빌드됩니다).

```bash
npm install -g github:HyeokjaeLee/koreainvestment-cli
```

온보딩 요약을 보려면:

```bash
kis init
```

---

### 3단계 — 인증 정보 등록 (사용자가 직접 실행)

> 🚨 **중요 원칙 — 증권 인증은 사용자가 직접 수행합니다.**
>
> 에이전트는 절대 `kis auth login` 을 대신 실행하거나, APP_KEY / APP_SECRET / 계좌번호를 대화창으로 받아 입력하면 안 됩니다. 한국투자증권 인증 정보는 금융 자산에 직결되는 민감 정보이므로 **사용자의 로컬 터미널에서만** 입력되어야 합니다.
>
> 에이전트가 할 일은 **명령어와 순서를 안내**하고, 사용자가 **"완료했어요"** 라고 보고하면 4단계 로 넘어가는 것뿐입니다.

사용자에게 다음 메시지를 그대로 전달하세요(수정·요약 금지).

```
아래 명령을 여러분의 로컬 터미널에서 직접 실행해주세요. 저(에이전트)는 이 명령을
대신 실행할 수 없고, APP_KEY / APP_SECRET 같은 민감 정보는 제가 절대 보지 않도록
CLI 가 숨김(hidden) 프롬프트로 직접 받습니다.

한국투자증권은 보통 '계좌 1개당 APP_KEY/APP_SECRET 1쌍' 을 발급합니다.
계좌가 여러 개면 각각 별도 프로파일로 등록해주세요. 아래 예시를 참고하세요.

────────────────────────────────────────
A. 먼저 등록할 계좌 1개 (권장: 모의투자부터)

   kis auth login --paper --make-default

   명령을 실행하면 CLI 가 순서대로 다음을 물어봅니다:
   - APP_KEY                      (숨김 입력: 화면에 안 보입니다)
   - APP_SECRET                   (숨김 입력: 화면에 안 보입니다)
   - 계좌번호 앞 8자리 (CANO)      예: 50123456  (일반 텍스트 입력)
   - 계좌상품코드                  기본 01 (종합계좌)  (일반 텍스트 입력)
   - HTS ID                       선택, 비워도 됨  (일반 텍스트 입력)

   성공하면 "✓ Profile \"paper\" saved (env=paper). Config: ~/.kis-cli/config.yaml"
   메시지가 뜹니다.

B. 계좌가 여러 개면 --name 으로 서로 다른 프로파일 이름을 붙여주세요.
   이름은 본인이 알아보기 쉬운 것이면 됩니다. 권장 규칙: "{용도}-{환경}".

   # 실전 주계좌
   kis auth login --prod --name main-prod

   # 실전 ISA 계좌 (별도 APP_KEY 쌍)
   kis auth login --prod --name isa-prod

   # 실전 퇴직연금 계좌 (상품코드 29)
   kis auth login --prod --name pension-prod

   프로파일마다 CLI 가 APP_KEY / APP_SECRET / 계좌번호를 처음부터 다시 묻습니다.
   각 계좌에서 발급받은 쌍을 그 계좌의 번호와 함께 입력하세요. 이미 등록된
   이름을 --name 에 다시 주면 기존 프로파일을 덮어씁니다.

C. 등록 결과 확인

   kis auth list

   출력 예:
     * paper         env=paper  account=50123456-01
       main-prod     env=prod   account=50000001-01
       isa-prod      env=prod   account=50000002-01
       pension-prod  env=prod   account=50000003-29
   (맨 앞 * 가 default 프로파일입니다. default 를 바꾸려면 원하는 프로파일로
    kis auth login --prod --name <name> --make-default 를 한 번 더 실행하면 됩니다.)

D. 등록이 끝나면 저한테 "완료" 또는 "done" 이라고 알려주세요.
────────────────────────────────────────
```

메시지 전달 후 **사용자 응답을 기다리고**, 그 전에는 4단계 로 진행하지 마세요.

사용자가 **인증 정보 값(APP_KEY, APP_SECRET, 계좌번호 등)을 채팅으로 보내려고 하면**, 정중히 중단시키고 다음과 같이 안내하세요.

> "그 값들은 제게 보내시면 안 됩니다. 제 채팅 기록에는 저장되지 않지만, 보안상 로컬 터미널의 `kis auth login` 프롬프트에만 직접 입력해주세요. 다시 명령을 보여드릴게요: `kis auth login --paper --make-default`"

사용자가 "완료" 를 보고하면 4단계 로 넘어갑니다. 만약 오류가 났다고 하면, 에러 메시지 원문을 받아 4단계 의 트러블슈팅 표를 참고해 안내하세요 — 이때도 `kis auth login` 을 에이전트가 대신 돌리면 **안 됩니다**.

**에이전트 금지 사항 요약:**
- ❌ `kis auth login` 을 에이전트가 직접 실행
- ❌ APP_KEY / APP_SECRET / 계좌번호를 채팅창에서 받아 전달
- ❌ `~/.kis-cli/config.yaml` 의 내용을 읽어 화면에 표시
- ✅ 위 명령과 안내 메시지만 그대로 사용자에게 전달하고, 완료 보고 기다리기

---

### 4단계 — 인증 정보 검증

`kis auth test` 는 이미 저장된 APP_KEY/APP_SECRET 으로 **토큰 발급만** 시도하는 명령이라 새 민감 정보를 받지 않습니다. 따라서 **에이전트가 직접 실행**하세요.

```bash
kis auth test --profile paper
```

기대 출력:

```
✓ Access token issued. Expires at 2026-04-19T...Z.
✓ approval_key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

성공이면 5단계로 넘어갑니다.

**실패 처리:**
- `EGW00101` / `approval_key missing` → 저장된 키가 잘못되었을 수 있습니다. 사용자에게 원인(예: 모의·실전 키 섞임, KIS 포털 점검)을 설명하고, **`kis auth login --paper` 재실행은 사용자 본인이 직접** 하도록 안내하세요(에이전트가 `kis auth login` 을 대신 실행하면 안 됩니다). KIS 포털 점검 공지: https://apiportal.koreainvestment.com/
- 그 외 일시 네트워크 오류 → 에이전트가 `kis auth test --profile paper` 한 번만 재시도.

---

### 5단계 — 읽기 전용 스모크 테스트

이 시점부터는 `~/.kis-cli/` 에 자격 증명이 이미 들어가 있으므로, **에이전트가 직접 실행해도 됩니다.** 아래 두 명령을 순서대로 실행해보세요.

```bash
kis quote price 005930 --profile paper
kis balance stock --profile paper
```

기대 동작:
- 첫 번째 명령은 삼성전자의 현재가·시가/고가/저가·거래량이 표로 출력됩니다.
- 두 번째 명령은 모의계좌가 비어 있으면 "(no rows)" 와 0 으로 채워진 요약 표가 출력됩니다 — 역시 정상입니다.

정상 출력이면 다음 단계로 진행하세요. 에러가 나면 아래 트러블슈팅 표와 대조하세요.
- `Profile "paper" not found` → 아직 `kis auth login --paper` 가 실행되지 않은 상태입니다. **사용자에게** 해당 명령을 실행하라고 안내하세요(에이전트가 대신 실행하면 안 됩니다).
- `EGW00113` 토큰 만료 → 에이전트가 직접 `kis auth test --profile paper` 로 토큰을 재발급한 뒤 원래 명령을 재시도하세요.

---

### 6단계 — 스킬 설치 제안 (중요)

CLI 설치가 끝났으면, **반드시** 사용자에게 스킬 설치 여부를 물어보세요. 이 단계는 생략 금지.

먼저 스킬 파일을 받아서 내용을 확인하세요.

```bash
curl -fsSL https://raw.githubusercontent.com/HyeokjaeLee/koreainvestment-cli/main/docs/skill-usage.md \
  -o /tmp/koreainvestment-cli-skill.md
head -20 /tmp/koreainvestment-cli-skill.md
```

그 다음 사용자에게 이렇게 제안하세요.

> "`koreainvestment-cli` 를 제가 더 안정적으로 다룰 수 있도록 돕는 사용 스킬(`docs/skill-usage.md`) 이 함께 제공됩니다. 이 스킬을 설치하면, 앞으로 '내 잔고 조회해줘', '삼성전자 1주 모의매수해줘' 같은 요청을 훨씬 안전하게 처리할 수 있습니다. 지금 설치할까요? (yes / no)"

**"yes" 라고 답하면**, 사용자의 에이전트 환경에 맞게 스킬을 복사하세요. 어떤 환경인지 모르면 사용자에게 하나만 물어보세요.

> "어느 에이전트를 쓰시나요? `opencode` / `claude-code` / `cursor` / 기타"

- **OpenCode**: `~/.config/opencode/skills/koreainvestment-cli/SKILL.md`
- **Claude Code**: `~/.claude/skills/koreainvestment-cli/SKILL.md`
- **Cursor**: `~/.cursor/rules/koreainvestment-cli.md` (Cursor 는 별도 Rule 파일 체계)
- **기타**: 사용자에게 설치 경로를 묻고 거기 복사

설치 명령 예 (OpenCode 기준):

```bash
mkdir -p ~/.config/opencode/skills/koreainvestment-cli
cp /tmp/koreainvestment-cli-skill.md ~/.config/opencode/skills/koreainvestment-cli/SKILL.md
```

복사 후, 파일 상단이 YAML frontmatter (`---` 로 시작) 로 되어 있는지 확인하세요. 그래야 스킬 시스템이 자동 등록합니다.

완료되면 사용자에게 이렇게 알려주세요.

> "스킬을 `~/.config/opencode/skills/koreainvestment-cli/SKILL.md` 에 설치했습니다. 이제 '잔고', '삼성전자 시세', 'AAPL 현재가' 같은 요청을 하시면 제가 이 스킬을 자동으로 불러와 처리합니다."

**"no" 라고 답하면**, 설치를 건너뛰고 다음 문장만 출력하세요.

> "알겠습니다. 나중에 필요하면 https://github.com/HyeokjaeLee/koreainvestment-cli/blob/main/docs/skill-usage.md 를 참고하시면 됩니다."

---

### 7단계 — (선택) doctor 실행

`kis doctor` 는 저장된 APP_KEY 로 토큰을 재발급해 전체 환경이 정상인지 확인합니다. 새 민감 정보를 받지 않으므로 **에이전트가 직접 실행**하세요.

```bash
kis doctor --profile paper
```

모든 체크가 ✓ 로 찍히면 완료입니다. ✗ 가 있으면 아래 기준으로 처리하세요.
- 인증 관련 ✗ (`Profile not found`, `approval_key missing` 등) → 사용자에게 `kis auth login --paper` 재실행을 안내(에이전트 대행 금지).
- 그 외 ✗ (네트워크, TPS 초과 등) → 에이전트가 `kis doctor` 를 1회 재시도한 뒤, 그래도 실패하면 증상을 사용자에게 보고.

인증 관련 실패의 경우에만 사용자에게 `kis auth login --paper` 재실행을 안내하세요. 그 외 증상은 에이전트가 4단계 / 트러블슈팅 표와 대조해 직접 재시도하거나 사용자에게 결과를 요약해 보고하세요.

---

### 8단계 — 마무리 보고

1~7 단계가 모두 성공하면 사용자에게 다음 메시지를 전달하세요.

> "설치 완료입니다. 이제 `kis` 명령을 바로 쓰실 수 있습니다.
>
> **제가 바로 실행해드릴 수 있는 것 (등록된 토큰만 사용)**:
> - `kis quote price 005930 --profile paper` — 삼성전자 현재가
> - `kis overseas price --exch NAS --symbol AAPL --profile paper` — 애플 현재가
> - `kis balance stock --profile paper` — 모의투자 잔고
> - `kis doctor --profile paper` — 환경 점검
>
> **사용자님께서 직접 실행하셔야 하는 것 (신규 인증 정보 입력이 필요한 경우)**:
> - `kis auth login --paper` / `kis auth login --prod` — APP_KEY / APP_SECRET / 계좌번호 입력
>
> **주문(매수/매도/정정/취소)은 에이전트가 실행할 수 있지만, 실제 자산을 움직이므로 항상 사용자 확인 후에만 실행합니다.** 자세한 안전 규칙은 [skill-usage.md](https://github.com/HyeokjaeLee/koreainvestment-cli/blob/main/docs/skill-usage.md) 의 '주문 전 안전 체크리스트' 를 따라주세요."

---

## 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| `kis: command not found` | npm 전역 bin 이 PATH 에 없음 | 위 2단계 의 쉘별 PATH 설정 (zsh 는 `~/.zshrc`, bash 는 `~/.bashrc`) 적용 후 터미널 재시작 |
| `Profile "paper" not found` | `kis auth login --paper` 미실행 | 로그인 재실행 |
| `EGW00101 인증 실패` | 잘못된 APP_KEY / APP_SECRET | 모의/실전 키를 다시 확인 후 재등록 |
| `EGW00201 TPS 초과` | rate limit | 잠시 대기 후 재시도. 모의계정은 500ms 최소 간격 |
| `approval_key missing` | Approval API 일시 장애 또는 잘못된 secret | 수 분 대기 후 재시도 |
| 주문이 확인 프롬프트에서 멈춤 | `kis order buy` 는 interactive Y/n 필요 | `-y` 를 붙이거나 대화형 터미널에서 실행 |

---

## 제거

```bash
npm uninstall -g koreainvestment-cli
rm -rf ~/.kis-cli
```

완료.

---

## 부록 — 설정 파일 구조

`~/.kis-cli/config.yaml` (권한 `0600`):

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

`~/.kis-cli/tokens.json` (권한 `0600`) 은 프로파일별 access_token 을 캐시하며, 만료 전 자동으로 재발급합니다.
