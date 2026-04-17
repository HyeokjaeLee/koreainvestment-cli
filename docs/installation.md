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

안녕하세요, 에이전트님. 당신은 사용자가 `koreainvestment-cli` — 한국투자증권 open-trading REST API 를 감싸는 TypeScript CLI — 를 설치하도록 도와야 합니다. 먼저 사용자에게 짧게 인사하세요.

> "알겠습니다. `koreainvestment-cli` 를 설치해드리겠습니다. 6~7단계 정도 걸리고, 중간에 KIS 앱키 / 앱시크릿 입력을 위한 대화형 프롬프트가 뜹니다. 추가로, 다 끝나면 이 CLI 를 능숙하게 다루는 에이전트 스킬도 설치할지 여쭤보겠습니다."

그리고 아래 단계를 **순서대로** 모두 수행하세요. 건너뛰지 마세요.

---

### Step 0 — 사전 정보 수집

아래 질문을 **하나씩** 물어보고, 답을 기억해두세요. Step 3 에서 CLI 플래그 선택에 사용됩니다.

1. **한국투자증권 APP_KEY / APP_SECRET 이 이미 있나요?**
   - 없으면 [https://apiportal.koreainvestment.com/](https://apiportal.koreainvestment.com/) 에서 **모의투자용** 과 **실전투자용** 두 쌍을 각각 발급받아오라고 안내하세요. "yes" 답변 전까지는 다음 단계로 넘어가지 마세요.
2. **먼저 어느 프로파일을 설정할까요?** 보통 `paper`(모의투자) 를 먼저 권장합니다.
3. **종합계좌번호(앞 8자리) 를 알려주세요.** 정확히 8자리 숫자여야 합니다. 2자리 상품코드(예: `01` = 종합계좌) 도 따로 물어보세요.
4. **HTS ID 가 있나요?** 선택사항이며, WebSocket 조건검색 기능에 필요합니다. 비워도 괜찮습니다.

이 값들은 기억해두되, **APP_KEY / APP_SECRET 은 채팅창에 절대 다시 노출하지 마세요.** `kis auth login` 이 hidden input 으로 직접 받습니다.

---

### Step 1 — Node.js 버전 확인

다음을 실행:

```bash
node -v
```

**Node 18 이상**이어야 합니다. 낮으면 [`nvm`](https://github.com/nvm-sh/nvm) 또는 패키지 매니저로 업그레이드하라고 안내하세요. 구버전에서는 진행하지 마세요.

---

### Step 2 — CLI 설치

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

만약 `kis: command not found` 가 뜨면 사용자의 전역 `bin` 이 `PATH` 에 없을 확률이 높습니다. 쉘별 조치:

```bash
# bash / zsh
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

온보딩 요약을 보려면:

```bash
kis init
```

---

### Step 3 — 인증 정보 등록 (`kis auth login`)

**반드시 실제 터미널 TTY 에서 대화형으로 실행하세요.** `kis auth login` 은 hidden password 프롬프트를 사용하므로 스크립트로 감싸면 안 됩니다.

```bash
kis auth login --paper --make-default
```

CLI 가 순서대로 물어봅니다.

1. `APP_KEY` (숨겨진 입력)
2. `APP_SECRET` (숨겨진 입력)
3. `계좌번호 앞 8자리 (CANO)` — 정확히 8자리
4. `계좌상품코드` — 2자리, 기본값 `01` (종합계좌)
5. `HTS ID` — 선택, 비워도 됨

완료되면 다음 메시지가 출력됩니다.

```
✓ Profile "paper" saved (env=paper). Config: ~/.kis-cli/config.yaml
```

사용자가 **실전투자도 함께 등록**하고 싶다고 하면:

```bash
kis auth login --prod --name prod
```

**에이전트 원칙:** 사용자의 APP_KEY / APP_SECRET 을 채팅창에 절대로 읽어주지도, 저장하지도 마세요. 이 값들은 오직 `~/.kis-cli/config.yaml` (권한 `0600`) 안에만 존재해야 합니다.

---

### Step 4 — 인증 정보 검증

KIS 서버를 상대로 실제 access token 을 발급받아 검증합니다.

```bash
kis auth test --profile paper
```

예상 출력:

```
Issuing access token for profile "paper" (paper)...
✓ Access token issued. Expires at 2026-04-19T...Z.
Issuing WebSocket approval key...
✓ approval_key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**`EGW00101` 이나 `approval_key missing` 같은 오류가 나오면:**

- 사용자가 모의투자용 키를 넣었는지 다시 확인하세요 (실전 키를 섞어넣기 쉽습니다).
- KIS 포털의 점검 공지 확인: [https://apiportal.koreainvestment.com/](https://apiportal.koreainvestment.com/)
- `kis auth login --paper` 를 재실행해 다시 입력받으세요.

---

### Step 5 — 읽기 전용 스모크 테스트

시세 조회가 되는지 확인:

```bash
kis quote price 005930
```

삼성전자 현재가, 시가/고가/저가, 거래량 등이 표 형태로 찍히면 성공입니다.

계좌 잔고 조회도 확인:

```bash
kis balance stock --profile paper
```

모의계정이 비어 있다면 `(no rows)` + 0 으로 채워진 요약 표가 나옵니다 — 이것도 정상입니다.

---

### Step 6 — 스킬 설치 제안 (중요)

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

### Step 7 — (선택) doctor 실행

```bash
kis doctor --profile paper
```

5개 체크가 모두 녹색(✓) 이면 완료입니다. 어느 하나라도 빨간색(✗) 이면:

- 에러 메시지를 사용자에게 그대로 공유하고
- 해당 단계(`kis auth login` 또는 Node 버전 등) 를 다시 시도하라고 안내하세요.

---

### Step 8 — 마무리 보고

1~7 단계가 모두 성공하면 사용자에게 다음 메시지를 전달하세요.

> "설치 완료입니다. 이제 `kis` 명령을 바로 쓰실 수 있습니다. 예시:
> - `kis quote price 005930` — 삼성전자 현재가
> - `kis balance stock` — 모의투자 잔고
> - `kis order buy --symbol 005930 --qty 1 --price 70000 --profile paper` — 모의 매수
>
> 주문 요청을 주시면 제가 [docs/skill-usage.md](https://github.com/HyeokjaeLee/koreainvestment-cli/blob/main/docs/skill-usage.md) 의 안전 체크리스트를 따라서 안전하게 처리해드립니다."

---

## 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| `kis: command not found` | npm 전역 bin 이 PATH 에 없음 | 쉘 rc 에 export 추가하거나 `npx koreainvestment-cli` 사용 |
| `Profile "paper" not found` | `kis auth login --paper` 미실행 | 로그인 재실행 |
| `EGW00101 인증 실패` | 잘못된 APP_KEY / APP_SECRET | 모의/실전 키를 다시 확인 후 재등록 |
| `EGW00201 TPS 초과` | rate limit | 잠시 대기 후 재시도. 모의계정은 500ms 최소 간격 |
| `approval_key missing` | Approval API 일시 장애 또는 잘못된 secret | 수 분 대기 후 재시도 |
| 주문이 확인 프롬프트에서 멈춤 | `kis order buy` 는 interactive Y/n 필요 | `-y` 를 붙이거나 대화형 터미널에서 실행 |

---

## 제거 (Uninstall)

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
