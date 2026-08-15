# 디자인 에셋

실제 사용하는 파일은 전부 **`public/media/`** 에 있습니다.
(Vite `public/` 은 빌드 시 그대로 복사되고, 코드에서는 `/media/...` 로 참조합니다.)

## 지금 들어가 있는 것

| 파일 | 원본 | 쓰이는 곳 |
| --- | --- | --- |
| `logo-intro.webm` / `.mp4` | 로고 / **SKN 로고 최종(배경o 화이트).mp4** | 앱 첫 진입 스플래시 |
| `logo-intro-poster.png` | 위 영상 마지막 프레임 | 스플래시 대체 이미지 |
| `loading.webm` / `.mp4` | 아이콘 / **로딩창 애니메이션.mp4** | 로그인 버튼 → 로딩창 |
| `check.webm` / `.mp4` | 아이콘 / **체크표시 애니메이션.mp4** | 피부 프로필 완성 화면 |
| `check-poster.png` | 위 영상 마지막 프레임 | 체크 대체 이미지 |
| `orb.png` | 로딩창 애니메이션의 한 프레임 | 로딩창 대체 이미지 |
| `petri.webm` / `.mp4` | 아이콘 / **패트리 접시 애니메이션.mp4** | 로그인 전 시작 화면 |
| `petri-poster.png` | 위 영상 프레임 | 시작 화면 대체 이미지 |
| `gender-male.webm` / `.mp4` | **테스트 남성.mp4** | 성별 선택 (남성) |
| `gender-female.webm` / `.mp4` | **테스트 여성.mp4** | 성별 선택 (여성) |
| `gender-*-poster.png` | 위 영상 프레임 | 성별 선택 대체 이미지 |
| `logo-symbol.png` | 로고 / **SKN 로고.png** | 모든 화면 상단 심볼 |
| `logo-mark.png` | 로고 / **SKN.png** | 로그인 화면 워드마크 |

## 원본에서 어떻게 만들었는지

원본 mp4 3개는 합쳐서 12MB 였습니다. 웹에서 쓰기엔 무거워서 이렇게 줄였습니다 (총 약 700KB).

```bash
# 1) 스플래시 — 흰 여백 잘라내고 750px 폭으로
ffmpeg -i "SKN 로고 최종(배경o 화이트).mp4" -an \
  -vf "crop=1500:1000:250:800,scale=750:-2" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 26 -movflags +faststart logo-intro.mp4

# 2) 로딩창 — 배경이 살짝 푸른 회색(250,251,254)이라 순백으로 보정
ffmpeg -i "로딩창 애니메이션.mp4" -an \
  -vf "colorlevels=rimax=0.972:gimax=0.976:bimax=0.992" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -movflags +faststart loading.mp4

# 3) 체크표시 — 여백 잘라 정사각으로
ffmpeg -i "체크표시 애니메이션.mp4" -an \
  -vf "crop=520:520:140:240" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 28 -movflags +faststart check.mp4

# 4) 성별 선택 — 402x402 그대로, 배경만 순백으로 (원본 배경이 254 정도라 회색 네모로 보임)
ffmpeg -i "테스트 남성.mp4" -an -vf "colorlevels=rimax=0.976:gimax=0.976:bimax=0.980" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -movflags +faststart gender-male.mp4

# 5) 패트리 접시 — 내용에 맞춰 정사각으로 자르고 560px 로 축소
ffmpeg -i "패트리 접시 애니메이션.mp4" -an \
  -vf "crop=752:752:24:146,scale=560:560,colorlevels=rimax=0.984:gimax=0.984:bimax=0.984" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -movflags +faststart petri.mp4

# 6) 모든 영상에 WebM(VP9) 한 벌 더 — Chrome 계열 호환용
ffmpeg -i X.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 X.webm
```

> **오디오는 전부 제거했습니다.** 자동재생하려면 `muted` 가 필수라 소리는 어차피 안 나오고,
> 오디오 트랙이 없으면 용량도 줄고 iOS 자동재생 제약도 피할 수 있습니다.

## 영상 교체할 때

`AssetVideo` 컴포넌트가 `webm → mp4 → poster 이미지` 순으로 알아서 대체합니다.
새 영상을 넣을 땐 **같은 이름으로 `.webm` 과 `.mp4` 두 벌**을 넣고, poster PNG 도 같이 갱신하세요.

```tsx
<AssetVideo name="loading" poster="/media/orb.png" loop />
```

## 성별 화면

`GenderPicker.tsx` 가 두 영상을 각각 반복 재생하고, 고르지 않은 쪽을 흐리게(opacity .35 + scale .95) 처리합니다.
영상만 교체하면 되고 컴포넌트는 손댈 필요 없습니다.

## 색·간격·radius

**개별 컴포넌트를 고치지 마세요.** `src/index.css` 의 `@theme` 블록 한 곳만 바꾸면
버튼·칩·입력창 전체에 반영됩니다.

| 피그마 스타일 예시 | 변수 | 쓰이는 곳 |
| --- | --- | --- |
| Text/Primary | `--color-ink` | 본문, 주요 버튼 배경 |
| Text/Secondary | `--color-ink-muted` | 설명 문구 |
| Border/Default | `--color-line` | 카드·칩 테두리 |
| Fill/Secondary | `--color-field` | 입력창, 보조 버튼 |

## 폰트

`index.html` 에서 **Pretendard** 를 CDN 으로 불러옵니다.
다른 폰트를 쓰려면 woff2 를 이 폴더에 넣고 `src/index.css` 상단에 `@font-face` 를 추가한 뒤
`@theme` 의 `--font-sans` 값을 바꾸세요.
