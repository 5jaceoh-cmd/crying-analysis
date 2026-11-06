# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

아기의 울음, 크게 운 시점, 분유 수유를 날짜와 시간으로 기록하고, 하루 24시간 중 언제 각 이벤트가 가장 많이 발생하는지 분석하는 웹 앱이다. 화면 문구는 한국어로 작성한다.

## 기술 제약

- 순수 HTML, CSS, JavaScript만 사용한다. 프레임워크, 외부 차트 라이브러리, 번들러, 트랜스파일러를 쓰지 않는다.
- `index.html`을 `file://`로 바로 열어도 동작해야 한다. `file://`에서 막히는 ES 모듈(`type="module"`) 대신 일반 `<script>`를 쓴다.
- GitHub Pages(`main` 브랜치 루트)로 배포한다. 저장소 하위 경로에서 서비스되므로 `index.html`을 루트에 두고, 리소스는 상대 경로로 참조한다. `/`로 시작하는 절대 경로를 쓰지 않는다.

## 명령어

```bash
open index.html
```

```bash
node --test tests/
```

린트와 빌드 도구는 없다. 테스트 하나만 실행하려면 이름을 지정한다.

```bash
node --test --test-name-pattern="peakHours" tests/
```

## 구조

`index.html`이 스크립트를 `analysis.js`, `storage.js`, `chart.js`, `app.js` 순서로 불러온다. 각 파일은 전역 객체 하나(`Analysis`, `Store`, `HourChart`)를 노출하고, `app.js`가 이들을 연결한다. 순서를 바꾸면 안 된다.

- `js/analysis.js`: 기간 계산과 시간대 집계. DOM과 저장소에 의존하지 않으며, 파일 끝의 `module.exports`로 Node 테스트에서 불러온다. 유형 키와 한국어 라벨(`TYPES`, `LABELS`)도 여기서 정의한다.
- `js/storage.js`: `localStorage` 읽기와 쓰기. 탭 간 충돌을 막으려고 캐시 없이 매번 읽는다. 손상된 데이터는 덮어쓰기 전에 `.corrupt` 키로 보존한다.
- `js/chart.js`: 유형별 행을 0~24시 축 하나에 정렬한 SVG 차트. 툴팁과 키보드 이동을 포함한다.
- `js/app.js`: 화면 상태와 이벤트 처리. 데이터가 바뀌면 `render()`로 화면 전체를 다시 그린다.
- `manifest.webmanifest`, `sw.js`, `icons/`: 홈 화면 설치와 오프라인 실행(PWA). `sw.js`는 네트워크 우선이라 배포만 하면 갱신되지만, 앱 실행에 필요한 파일을 추가하면 `ASSETS`에도 넣는다.

## 데이터와 집계 규칙

- 기록 형식은 `{ id, type, at }`이고 `type`은 `cry`, `bigCry`, `feed` 중 하나다. 저장소 키는 `crying-analysis.records.v1`이다. 형식을 바꾸면 기존 기록을 옮기는 처리가 필요하다.
- `at`은 현지 시각 문자열(`YYYY-MM-DDTHH:mm`)이다. 타임존 변환 없이 입력한 시각 그대로 집계하기 위해서이므로 UTC나 `Date.toISOString()`으로 바꾸지 않는다.
- 지속 시간 없이 발생 시점만 기록한다. 차트 값은 조회 기간의 건수를 시간대별로 합친 값이다.
- 유형별 "가장 많은 시간"은 공동 1위를 모두 포함한다.

## 차트 색상

유형 색은 `style.css`의 `--series-*` 토큰으로 정의하고, 요소의 `data-type` 속성으로 적용한다. 라이트와 다크 값이 따로 있으므로 함께 수정한다. 라이트 모드의 `feed` 색은 배경 대비가 3:1에 못 미치므로, 값을 확인할 수 있는 시간대별 표를 유지한다.
