# SKN 애셋 카탈로그

`assets/` 아래 모든 브랜드 애셋을 파일별로 설명한다. 실물을 보지 못한 사람도 이 문서만으로 올바른 파일을 고를 수 있게 쓴다. **파일명·폴더명은 저장된 그대로이며 바꾸지 않는다.**

## 비주얼 언어 (공통 톤)

SKN의 모든 애셋은 하나의 시각 언어를 공유한다: **맑은 물방울·세럼·젤·유리 버블**을 매크로로 찍은 듯한 형태에, 무지갯빛(이리데센트) 파스텔 그라데이션이 감돈다. "피부를 연구한다"는 컨셉을 실험실의 페트리 접시·물성 이미지로 표현한 것. 깨끗하고 투명하고 고급스러운 분위기이며, 대부분 흰/투명 배경 위에 놓인다. 새 애셋도 이 톤을 따른다고 보면 된다.

---

## 로고 — `assets/로고/`

브랜드 워드마크는 소문자 세리프 **`skn`**이다. 마지막 글자 N은 **좌우로 뒤집힌 전용 글리프**(뒤집힌 N 모양)로, 앱 화면 상단에서 단독 심벌로도 쓰인다. 항상 로고 애셋을 쓰고 일반 텍스트 "SKN"으로 대체하지 않는다.

| 파일 | 형태 | 크기·포맷 | 배경 | 용도 |
| --- | --- | --- | --- | --- |
| `SKN.png` | 워드마크 전체 `skn`. 우아한 세리프, 검정. N은 뒤집힌 형태. | 582×320, PNG | 투명 | 기본 로고. 헤더·스플래시·문서 등 로고가 필요한 대부분의 자리. |
| `SKN 로고.png` | 워드마크에서 뒤집힌 N 글리프만 떼어낸 **모노그램 심벌**. 검정. | 215×226, PNG | 투명 | 파비콘·앱 아이콘·좁은 공간의 단독 마크. 앱 온보딩 화면 상단의 심벌이 이것. |
| `SKN 로고 최종(배경o 화이트).mp4` | `skn` 워드마크가 그려지는 애니메이션. | MP4(음성 없음) | **흰색 배경** | 흰 배경 위 인트로·스플래시 모션. |
| `SKN 로고 최종(투명).mov` | 위와 같은 워드마크 애니메이션이되 **알파 채널 포함**. | MOV(ProRes, ~19MB) | 투명 | 색·영상 위에 로고 모션을 얹어야 할 때. 파일이 커서 웹 임베드보다 영상 편집·발표용에 적합. |
| `logo-intro-poster.png` | 웹용 로고 인트로의 첫 프레임. 영상과 같은 여백·비율의 검정 워드마크. | 750×500, PNG | 흰색 | 인트로 영상이 준비되기 전과 재생 불가 환경의 대체 이미지. 배포본은 `frontend/public/skn-assets/skn-wordmark-motion-poster.png`. |

정지 로고가 필요하면 `SKN.png`, 심벌만 필요하면 `SKN 로고.png`. 배경 위에 얹는 모션이면 투명 `.mov`, 흰 배경이면 `.mp4`.

---

## 화장품 브랜드 로고 — `assets/제조사 로고/`

제품 데이터의 `brand`를 식별하는 제3자 브랜드 워드마크 원본이다. 현재 데이터 모델에는 법적 제조사 필드가 없으므로 폴더의 기존 이름과 달리 **제조사 로고로 해석하지 않는다.** 원본과 byte가 같은 웹 배포본은 `frontend/public/manufacturer-logos/`에 둔다.

| 파일 | DB `brand` 정확 일치값 | 형태 | 크기·포맷 | 배경 | 웹 경로 |
| --- | --- | --- | --- | --- | --- |
| `anua.png` | `아누아` | 검정 `Anua` 혼합 대소문자 워드마크 | 247×60, PNG | 투명 | `/manufacturer-logos/anua.png` |
| `beauty-of-joseon.png` | `조선미녀` | 검정 `BEAUTY OF JOSEON` 고대비 세리프 워드마크 | 2501×236, PNG | 투명 | `/manufacturer-logos/beauty-of-joseon.png` |
| `belif.svg` | `belif`, `벨리프` | belif 워드마크, `believe in truth` 태그라인과 원형 인장 | viewBox 140.93×44.7, SVG | 투명 | `/manufacturer-logos/belif.svg` |
| `cnp.png` | `CNP`, `CNP차앤박`, `차앤박` | 회색 `CNP Laboratory` 가로 워드마크 | 192×25, PNG | 투명 | `/manufacturer-logos/cnp.png` |
| `cosrx.png` | `코스알엑스` | 검정 `COSRX` 압축형 대문자 워드마크 | 129×27, PNG | 투명 | `/manufacturer-logos/cosrx.png` |
| `dr-g.png` | `닥터지` | 진녹색 `Dr.G` 워드마크와 밑줄 | 240×92, PNG | 흰색, 불투명 | `/manufacturer-logos/dr-g.png` |
| `etude.png` | `에뛰드`, `에뛰드하우스` | 검정 `ETUDE` 산세리프 워드마크 | 480×96, PNG | 투명 | `/manufacturer-logos/etude.png` |
| `goodal.png` | `구달` | 짙은 회색 `goodal` 세리프 워드마크 | 402×148, PNG | 투명 | `/manufacturer-logos/goodal.png` |
| `innisfree.svg` | `이니스프리` | 녹색 `innisfree` 소문자 워드마크 | viewBox 247×32, SVG | 투명 | `/manufacturer-logos/innisfree.svg` |
| `isntree.png` | `이즈앤트리`, `이즌트리` | 검정 ISNTREE 영문·한글 조합 워드마크 | 154×47, PNG | 투명 | `/manufacturer-logos/isntree.png` |
| `iunik.png` | `iUNIK`, `아이유닉` | 짙은 회색 `IUNIK` 워드마크와 올리브색 잎 | 500×150, PNG | 투명 | `/manufacturer-logos/iunik.png` |
| `jmsolution.png` | `JMsolution`, `JM솔루션`, `제이엠솔루션` | 검정 `JMsolution` 워드마크 | 501×100, PNG | 투명 | `/manufacturer-logos/jmsolution.png` |
| `klairs.svg` | `Klairs`, `디어클레어스`, `클레어스` | 검정 `dear Klairs` 세리프 워드마크 | viewBox 849.83×356.27, SVG | 투명 | `/manufacturer-logos/klairs.svg` |
| `laneige.svg` | `라네즈` | 페리윙클 블루 `LANEIGE` 기하학 대문자 워드마크 | viewBox 984×173.7, SVG | 투명 | `/manufacturer-logos/laneige.svg` |
| `mediheal.png` | `메디힐` | 짙은 파란색 `MEDIHEAL` 대문자 워드마크 | 1595×237, PNG | 투명 | `/manufacturer-logos/mediheal.png` |
| `missha.png` | `미샤` | 가는 회색 `MISSHA` 대문자 워드마크 | 140×26, PNG | 흰색에 가까운 반투명 | `/manufacturer-logos/missha.png` |
| `nature-republic.png` | `네이처리퍼블릭` | 짙은 회색 `NATURE REPUBLIC` 가로 워드마크 | 370×30, PNG | 투명 | `/manufacturer-logos/nature-republic.png` |
| `round-lab.png` | `라운드랩` | 검정 `ROUND LAB` 자간형 워드마크 | 150×40, PNG | 투명 | `/manufacturer-logos/round-lab.png` |
| `skin1004.png` | `스킨1004` | 검정 `SKIN1004` 자간형 워드마크 | 300×46, PNG | 투명 | `/manufacturer-logos/skin1004.png` |
| `skinfood.svg` | `스킨푸드` | 짙은 갈색 `SKINFOOD` 세리프 워드마크 | viewBox 150×22, SVG | 투명 | `/manufacturer-logos/skinfood.svg` |
| `the-face-shop.png` | `더페이스샵` | `THE FACE SHOP`과 작은 `CLEAN BEAUTY` 락업 | 187×37, PNG | 투명 | `/manufacturer-logos/the-face-shop.png` |
| `tonymoly.png` | `토니모리` | 짙은 갈색 심벌과 `TONYMOLY` 워드마크 | 384×72, PNG | 투명 | `/manufacturer-logos/tonymoly.png` |
| `torriden.png` | `토리든` | 짙은 회색 `Torriden` 워드마크 | 155×29, PNG | 투명 | `/manufacturer-logos/torriden.png` |
| `vt.png` | `VT`, `VT코스메틱` | 검정 VT COSMETICS 가로 워드마크 | 444×70, PNG | 투명 | `/manufacturer-logos/vt.png` |
| `wellage.png` | `웰라쥬` | 검정 `WELLAGE` 기하학 워드마크 | 575×104, PNG | 투명 | `/manufacturer-logos/wellage.png` |

### 공식 출처와 사용 근거

각 파일은 브랜드 또는 브랜드 운영사의 공개 공식 사이트가 헤더·브랜드 소개에 직접 제공한 원본이다. 별도 재배포 라이선스 문구는 확인되지 않았으며 로고와 상표의 권리는 각 권리자에게 있다. SKN의 제품 브랜드 식별 목적으로만 사용하고 임의 재디자인·트레이싱·packshot 크롭은 하지 않았다.

| 파일 | 공식 페이지 | 공식 원본 URL |
| --- | --- | --- |
| `anua.png` | `https://anua.com/` | `https://anua.com/cdn/shop/files/PNG_RGB_Primary_logo_ver2_2_255e833c-0e91-42df-96ca-0b7377ba7a8a.png?v=1779429699` |
| `beauty-of-joseon.png` | `https://beautyofjoseon.com/` | `https://beautyofjoseon.com/cdn/shop/files/boj-logo-text-default.png?v=1765267757` |
| `belif.svg` | `https://www.belif.jp/` | `https://www.belif.jp/wp-content/themes/belif/img/common/logo.svg` |
| `cnp.png` | `https://cnpmall.com/` | `https://cnpmall.com/img/cnp_logo.png` |
| `cosrx.png` | `https://www.cosrx.com/` | `https://www.cosrx.com/cdn/shop/files/COSRX_150x.png?v=1658313147` |
| `dr-g.png` | `https://www.dr-g.com/` | `https://www.dr-g.com/cdn/shop/files/3801b937541112e838c2a1bf2ef1af71_240x.png?v=1771999118` |
| `etude.png` | `https://brand.amoremall.com/kr/ko/etude?menuNo=679` | `https://images-kr.amoremall.com/sis/images/2025/11/28/dc9beac6-26a4-40b9-880e-e22c45cb2b5b.png` |
| `goodal.png` | `https://cliocosmetic.com/goodal_en.html` | `https://cliocosmetic.com/public/images/logo/goodal.png` |
| `innisfree.svg` | `https://us.innisfree.com/` | `https://us.innisfree.com/cdn/shop/files/IFLogo-Green-247x32.svg?v=1778609524` |
| `isntree.png` | `https://isntree.com/` | `https://isntree.com/web/upload/fixed_logo.png` |
| `iunik.png` | `https://www.iunik.com/` | `https://www.iunik.com/cdn/shop/files/iunik_logo.png?v=1743988775&width=500` |
| `jmsolution.png` | `https://jmsolutioncm.cafe24.com/brand/index.html` | `https://jmsolutioncm.cafe24.com/skin/main/logo.png` |
| `klairs.svg` | `https://klairs.co.kr/` | `https://klairs.co.kr/assets/images/common/DK_logo_b.svg` |
| `laneige.svg` | `https://us.laneige.com/` | `https://us.laneige.com/cdn/shop/files/B.I_LANEIGE_wordmark_Blue.svg?v=1723506883` |
| `mediheal.png` | `https://medihealshop.com/` | `https://medihealshop.com/morenvyimg/logo_sub.png` |
| `missha.png` | `https://missha.com/en/index` | `https://missha.com/static/img/logo.png` |
| `nature-republic.png` | `https://www.naturerepublic.com/brand/brand` | `https://www.naturerepublic.com/img/brand/story/logo_en_b.png` |
| `round-lab.png` | `https://roundlab.co.kr/` | `https://roundlab.co.kr/_dj/img/logo_.png` |
| `skin1004.png` | `https://www.skin1004.com/` | `https://www.skin1004.com/cdn/shop/files/SKIN1004_LOGO_300PX_30c77c72-0035-4b50-ba2c-f2c7a36a0d9d.png?v=1738771518` |
| `skinfood.svg` | `https://www.theskinfood.com/` | `https://www.theskinfood.com/design/skinfood/skinfood/images/wib/PC/common/skinfood_pc_logo.svg` |
| `the-face-shop.png` | `https://www.thefaceshop.com/mall/brand.jsp?cate_seq=662` | `https://image.ethefaceshop.com/tfsshopWebSrc/images/common/logo_brand662.png` |
| `tonymoly.png` | `https://tonymoly.com/` | `https://d214w0arlvd25g.cloudfront.net/new_asset/img_logo_gnb_m.png` |
| `torriden.png` | `https://www.torriden.com/` | `https://torriden2.cdn-nhncommerce.com/data/skin/front/mo_designart/img/banner/03b0b50ebf12bb71f624b6ee36ab73a9_44226.png` |
| `vt.png` | `https://vt-cosmetics.com/` | `https://vt-cosmetics.com/images/cm_logo_1_black.png` |
| `wellage.png` | `https://www.mywellage.com/` | `https://www.mywellage.com/web/upload/logo.png` |

### 매핑·폴백 규칙

- 위 표의 `brand` 문자열에만 정확히 매핑한다. 대소문자나 한글/영문이 비슷하다는 이유로 fuzzy matching하지 않는다.
- 브랜드명은 항상 텍스트로 유지하고 로고는 인접 장식으로 배치한다. 로고 이미지의 대체 텍스트는 빈 문자열(`alt=""`)로 두어 브랜드명이 중복 낭독되지 않게 한다.
- 로고가 없거나 로드에 실패하면 중립 모노그램/텍스트 폴백을 보여준다.
- 데모 seed의 `뉴트리랩`, `바이옴`, `더마리브`, `솔라핏`, `어퀴즈`, `데이지코`, `오브리에`는 공식 실재 브랜드임을 검증할 수 없고 제품 packshot URL도 다른 실제 브랜드와 일치한다. 따라서 다른 브랜드 로고를 붙이거나 공식 로고처럼 보이는 가공물을 만들지 않고 공통 폴백을 사용한다.
- `Dr.Belmeur`/`닥터벨머`, `Dr.Ceuracle`/`닥터세라클`, `더히스토리오브후`/`후`처럼 검증한 한글·영문 표기만 같은 공식 로고에 명시적으로 연결한다.

### 2026-08-16 전수 보강

실제 카탈로그 2,654개·원문 브랜드 157종을 전수 감사해 공식 1차 출처 로고 **135파일**을 확보했다. 제품 패키지와 이름으로 임시 제조사명 27행을 교정하고 **150개 exact-match 값**에 연결해, 제품 행 기준 **2,654개(100%)**가 검증한 로고를 사용한다. 전체 런타임 매핑과 각 `source_url`의 권위 원본은 `backend/src/main/resources/schema.sql`의 `brand_asset` seed가 단일 기준이며, 추가 매핑과 교정은 운영 마이그레이션 `deploy/oci/migrations/20260816_05_complete_brand_assets.sql`에 복제한다.

위 상세 표 이후 추가한 파일은 다음과 같다.

`abib.svg`, `about-me.png`, `acwell.png`, `aestura.png`, `ahc.svg`, `amuse.png`, `apieu.png`, `aromatica.svg`, `avajar.png`, `axis-y.png`, `banila-co.png`, `benton.png`, `beplain.svg`, `berrisom.png`, `biodance.png`, `bioheal-boh.png`, `bringgreen.png`, `celimax.png`, `cell-fusion-c.svg`, `celltrion-skincure.png`, `charmzone.png`, `clio.png`, `dalba.svg`, `donginbi.png`, `dr-banggiwon.png`, `dr-belmeur.png`, `dr-ceuracle.png`, `dr-jart.svg`, `dr-oracle.png`, `espoir.png`, `fation.png`, `fillimilli.png`, `grafen.png`, `hanskin.png`, `hanyul.png`, `haruharu-wonder.png`, `heimish.png`, `hera.svg`, `huxley.png`, `hwaaerak-main.png`, `illiyoon.svg`, `iope.png`, `isoi.png`, `its-skin.png`, `jayjun.png`, `jumiso.png`, `krave-beauty.svg`, `labo-h.png`, `laka.svg`, `leaders.png`, `make-prem.png`, `mamonde.svg`, `manyo.png`, `medianswer.png`, `medicube.svg`, `medipeel.png`, `melixir.png`, `mizon.png`, `neogen.png`, `ohui.svg`, `papa-recipe.png`, `peripera.png`, `physiogel.png`, `primera.svg`, `purito.svg`, `pyunkang-yul.png`, `real-barrier.svg`, `rejuran.png`, `romand.png`, `round-around.png`, `s-nature.png`, `shingmulnara.png`, `skin-and-lab.svg`, `skin79.png`, `snp.png`, `some-by-mi.png`, `sooryehan.gif`, `sulwhasoo.png`, `sum37.svg`, `the-saem.png`, `then-i-met-you.svg`, `tirtir.svg`, `tocobo.svg`, `unove.png`, `vidivici.svg`, `whoo.svg`.

- `dr-jart.svg`, `purito.svg`, `mamonde.svg`, `then-i-met-you.svg`는 공식 사이트가 파일 대신 제공한 헤더 inline SVG를 형태 변경 없이 추출한 원본이다.
- `melixir.png`, `dr-ceuracle.png`, `snp.png`는 공식 사이트가 직접 지정한 브랜드 아이콘·공유 이미지를 사용한다.
- `acwell.png`, `hanyul.png`는 밝은 워드마크이므로 공통 `BrandIdentity`가 어두운 전용 프레임을 적용한다.
- DB 원문 `닥터방기순`은 공식 브랜드 `닥터방기원`의 오기임을 확인하고 공식 로고를 명시적으로 연결한다. 표시 원문은 호환성을 위해 이 작업에서 바꾸지 않는다.
- 추가 원본은 `numbuzin.png`, `holika-holika.png`, `isaknox.png`, `grace-day.jpg`, `beyond.png`, `centellian24.png`, `sioris.png`, `frudia.svg`, `labiotte.png`, `atopalm.svg`, `code-glokolor.png`, `lumene.svg`, `labcle.jpg`, `dr-bledik.png`, `dr-dermapert.png`, `isov.png`, `ample-n.png`, `another-face.svg`, `dr-melaxin.png`, `dr-ato.jpg`, `cellapy.png`, `madeca21.png`, `mediflower.png`, `im-meme.png`이다.
- 프루디아와 루메네는 공식 사이트 헤더의 inline SVG를 형태 변경 없이 보존했다. 그레이스데이는 공식 브랜드 계정의 제조사(Sindo P&G) 프로필 원본, 랩클과 닥터아토는 공식 제조사 브랜드 배너 원본을 가공 없이 사용한다.
- `ample-n.png`, `atopalm.svg`, `im-meme.png`는 밝은 워드마크이므로 공통 `BrandIdentity`가 어두운 전용 프레임을 적용한다.
- 이전 미확인 31개 중 20개는 실제 패키지의 브랜드 워드마크가 DB 임시명과 달랐다. 마이그레이션 `_05`가 ID와 기존 값을 함께 조건으로 사용해 해당 27행만 안전하게 교정하며, 나머지 실재 브랜드 11개에는 공식 로고를 직접 연결한다.

---

## 아이콘 — `assets/아이콘/`

기능 아이콘은 각각 **맑은 유리·물로 빚은 오브젝트**로 표현된다. 투명 PNG(정지본)와 MP4(애니메이션본)가 짝을 이룬다. 상태 표현에 쓴다.

| 파일 | 형태 | 크기·포맷 | 배경 | 용도 |
| --- | --- | --- | --- | --- |
| `패트리 접시(투명).png` | 유리 페트리 접시 안에 맑은 세럼 방울·기포가 담긴 모습. 이리데센트. 좌상단에 코랄/빨강 원형 액센트가 살짝 겹침. | 1448×2172, PNG | 투명 | SKN의 시그니처 "피부 연구" 모티프. 빈 상태·연구/분석 섹션·브랜드 장식. |
| `체크 아이콘(투명).png` | 물방울/버블 안에 유리로 빚은 체크(✓). 이리데센트. | 1024×1024, PNG | 투명 | 완료·성공·저장됨 표시. |
| `시간 아이콘(투명).png` | 물결진 원형 물 표면에 시곗바늘이 새겨진 시계. 이리데센트. | 1024×1024, PNG | 투명 | 시간·기간·일정(예: 7일 시점, 아침/저녁 루틴). |
| `패트리 접시 애니메이션.mp4` | `패트리 접시(투명).png`의 움직이는 버전. | MP4(~11MB) | 흰/투명 | 페트리 모티프를 모션으로 강조할 때. 온보딩용 웹 파생본은 `frontend/public/skn-assets/petri-motion.{webm,mp4,png}`. |
| `로딩창 애니메이션.mp4` | 맑은 유리 버블/방울이 생성·유동하는 모습. 웹에서는 `AI 물방울(피그마).png`를 정지 대체 이미지로 함께 쓴다. | MP4(~9MB) | 흰색 | **AI 모션·로딩 인디케이터.** AI 첫 화면과 답변 준비 상태. 배포 복사본은 `frontend/public/skn-assets/ai-drop-motion.mp4`. |
| `체크표시 애니메이션.mp4` | 버블 안에서 체크(✓)가 그려지는 모습. | MP4(~2.5MB) | 흰/투명 | 완료·성공 순간의 성공 애니메이션. |
| `AI 물방울(피그마).png` | AI 제품 탐색 디자인에 쓰인 둥근 투명 젤·물방울. 가장자리에 옅은 블루·라벤더 광택이 있고 중심은 거의 흰색이다. | 402×402, PNG | 투명 | AI 대화 시작 화면의 심벌과 내 화장품 빈 상태. Figma image ref `2d129e…`의 보존 원본. |
| `loading.mp4` / `loading.webm` | `로딩창 애니메이션.mp4`를 402×402로 유지하면서 회청색 배경을 순백으로 보정하고 오디오를 제거한 웹용 유리 버블 모션. | MP4(H.264, ~127KB) / WebM(VP9, ~288KB) | 흰색 | AI 모션·로그인 로딩의 실제 배포 원본. 배포본은 `frontend/public/skn-assets/ai-drop-motion.*`. |
| `orb.png` | 웹용 로딩 영상과 프레임·흰 배경이 정확히 맞는 맑은 유리 버블 정지본. | 402×402, PNG | 흰색, 불투명 | 웹용 로딩 영상의 poster. 배포본은 `frontend/public/skn-assets/ai-drop-motion-poster.png`. |
| `제품 유형.svg` | 전체·클렌징·토너·세럼·앰플·크림·선케어를 페트리 접시와 화장품 용기 실루엣으로 구분한 7종 라인 아이콘 SVG 스프라이트. 회청색 선과 유형별 옅은 세럼 컬러를 사용한다. | SVG, 각 symbol viewBox 48×48 | 투명 | 제품 탐색의 유형 선택 시트. 배포본은 `frontend/public/skn-assets/product-category-icons.svg`. |
| `현재 루틴.svg` | 순환하는 두 화살표 안에 세럼 방울을 넣은 올리브색 원형 라인 아이콘. 제품이 현재 사용 조합에 포함된 활성 상태를 나타낸다. | SVG, viewBox 24×24 | 투명 | 내 화장품 카드의 `현재 루틴` 활성 배지. 배포본은 `frontend/public/skn-assets/routine-active.svg`. |
| `경험 행동.svg` | 반짝임과 미소가 있는 물방울 `느낌`, 피부 파동이 흐르는 물방울 `불편함`의 2종 모노톤 SVG 스프라이트. 경고가 아니라 서로 다른 관찰 기록을 표현하며 UI의 글자색을 따라간다. | SVG, 각 symbol viewBox 24×24 | 투명 | 경험 상세·허브의 `느낌 남기기`, `불편함 기록` 액션. 배포본은 `frontend/public/skn-assets/experience-actions.svg`. |
| `맥락 행동.svg` | 눈 속 물방울로 표현한 진행 확인, 펌프형 화장품 용기와 더하기, 순서 목록과 더하기를 각각 분리한 3종 모노톤 SVG 스프라이트. 서로 다른 기능을 같은 물방울 모양으로 반복하지 않는다. | SVG, 각 symbol viewBox 24×24 | 투명 | 홈의 진행 확인과 내 화장품·루틴의 플로팅 추가 액션에만 제한적으로 사용. 배포본은 `frontend/public/skn-assets/context-action-icons.svg`. |

정지 아이콘이면 PNG, 상태 전환·피드백 모션이면 대응 MP4. 로딩은 `로딩창 애니메이션.mp4`가 전용.

원본 `로딩창 애니메이션.mp4`는 보존용이다. 제품 UI에서는 오디오가 제거되고 배경색이 보정된
`loading.webm` / `loading.mp4`와 짝이 맞는 `orb.png`를 함께 사용한다.

---

## 온보딩 — `assets/온보딩/`

| 파일 | 형태 | 크기·포맷 | 배경 | 용도 |
| --- | --- | --- | --- | --- |
| `orb.png` | 맑은 구형 세럼 버블. 라벤더·블루 계열의 은은한 이리데센트 광택. | 402×402, PNG | 흰색 | 로그인 전 시작 화면의 중심 오브젝트. 배포본은 `frontend/public/skn-assets/onboarding-orb.png`. |
| `orb-male.png` / `orb-female.png` | 남성은 푸른빛, 여성은 분홍빛이 도는 유리 버블 정지 시안. | 각 402×402, PNG | 흰색 | 초기 정지 시안과 기존 경로 호환용. 배포본은 `onboarding-gender-{male|female}.png`, 실제 성별 선택 UI에는 아래 영상 세트를 쓴다. |
| `gender-male.mp4` / `.webm` | 푸른빛 유리 버블이 유동하는 남성 선택 모션. 회색 사각형이 보이지 않도록 배경을 순백으로 보정하고 오디오를 제거했다. | 402×402, MP4(H.264, ~127KB) / WebM(VP9, ~235KB) | 흰색 | 온보딩 성별 선택의 남성 카드. 선택한 동안만 반복 재생한다. |
| `gender-female.mp4` / `.webm` | 분홍빛 유리 버블이 유동하는 여성 선택 모션. 남성 세트와 같은 프레임·인코딩 규칙. | 402×402, MP4(H.264, ~125KB) / WebM(VP9, ~234KB) | 흰색 | 온보딩 성별 선택의 여성 카드. 선택한 동안만 반복 재생한다. |
| `gender-male-poster.png` / `gender-female-poster.png` | 각 성별 영상의 첫 프레임과 정확히 맞는 푸른빛·분홍빛 유리 버블. | 각 402×402, PNG | 흰색, 불투명 | 선택 전 정지 상태, 영상 로딩 중, 재생 불가 환경의 대체 이미지. |

성별 카드는 두 영상을 계속 마운트한 채 선택한 쪽만 처음부터 반복 재생하고, 선택하지 않은 쪽은
첫 프레임에서 정지한다. 배포본 이름은 `frontend/public/skn-assets/onboarding-gender-{male|female}.{webm|mp4}`와
`onboarding-gender-{male|female}-poster.png`이다.

### 웹 모션 배포 규칙

- 모든 모션은 무음 MP4(H.264)와 WebM(VP9), 영상 프레임과 정확히 맞는 poster PNG를 한 세트로 둔다.
- 유리 오브젝트처럼 흰 여백까지 디자인에 포함된 영상은 `object-fit: contain`을 쓰고 원형 마스크나 강제 크롭을 적용하지 않는다.
- poster를 먼저 표시하고 영상 데이터가 준비된 뒤 교체해 첫 프레임 번쩍임과 회색 테두리를 막는다.
- 자동재생 영상은 `muted`, `playsinline`을 유지하고 `prefers-reduced-motion`에서는 poster만 보여준다.
- 조작 UI가 없는 브랜드 모션은 영상 요소의 포인터 이벤트와 탭 포커스를 끄고, hover/focus의 네이티브 border·outline·shadow를 제거한다.
- 현재 웹 모션은 흰 매트로 제작됐으므로 기본 화면과 모션 컨테이너 배경을 모두 `#fff`로 맞춘다.
- 원본 고용량 파일은 `assets/`에 보존하되 제품 UI는 `frontend/public/skn-assets/`의 웹 최적화본만 참조한다.

---

## 제품 이미지 — `assets/제품 이미지/`

| 파일 | 형태 | 크기·포맷 | 배경 | 용도 |
| --- | --- | --- | --- | --- |
| `더마리브 젤 시카 카밍 수딩젤.png` | 연두색 투명 젤과 초록 알갱이가 보이는 튜브형 수딩젤 제품 컷. 전면에 `Calming Pair cica soothing gel` 표기. | 1182×1330, PNG | 투명 | 카탈로그 제품 ID 8 `더마리브 · 시카 카밍 수딩젤`의 목록 카드와 상세 히어로. Figma image ref `23c4c4…`의 보존 원본. |

---

## 루틴 배경 이미지 — `assets/루틴 원본 이미지/`

계절·시간대용 원본은 세로 대형 PNG로, 각각 매크로 물방울/젤 형태에 해당 팔레트를 입혔다. 루틴 카드·상세 화면의 히어로/배경으로 쓴다. 홈의 연구 중인 루틴 카드에는 별도의 가로 SVG를 사용한다.

| 파일 | 크기 | 색·분위기 | 매핑 |
| --- | --- | --- | --- |
| `SPRING 1.png` | 928×1232 | 붙은 두 버블. 분홍·라벤더·연두·복숭아의 부드러운 무지개 파스텔. | 봄 (변형 1) |
| `SPRING 2.png` | 928×1232 | 큰 단일 버블. 분홍-라벤더-복숭아의 은은한 파스텔. | 봄 (변형 2) |
| `SUMMER.png` | 928×1232 | 붙은 버블. 청량한 연두 + 크림/복숭아. | 여름 |
| `AUTUMN.png` | 896×1344 | 따뜻한 앰버·오렌지·코랄 방울, 황금빛 광채. | 가을 |
| `WINTER.png` | 896×1344 | 서늘한 블루 + 연분홍의 성에 낀 듯한 버블. 차가운 톤. | 겨울 |
| `NIGHT.png` | 928×1232 | 짙은 인디고·네이비 → 라벤더 그라데이션 배경 위 맑은 버블. | 밤/야간 모드 |
| `Rectangle 1954129930.svg` | 378×216 | 흰 바탕 아래로 투명한 블루 세럼 곡면과 잔기포가 흐르는 가로 카드. 옅은 블루 색조·상단 백색 그라데이션·20px 라운드·부드러운 그림자가 SVG에 포함돼 있다. | 홈의 `지금 연구 중인 루틴` 경험 카드 배경. 정지 SVG이며 배포본은 `frontend/public/skn-assets/routine-research-card.svg`. |

**매핑 표** — 상황에 맞는 파일 선택:

| 상황 | 파일 |
| --- | --- |
| 봄 루틴 | `SPRING 1.png` 또는 `SPRING 2.png` |
| 여름 루틴 | `SUMMER.png` |
| 가을 루틴 | `AUTUMN.png` |
| 겨울 루틴 | `WINTER.png` |
| 저녁/야간 맥락 | `NIGHT.png` |
| 홈에서 연구 중인 루틴 | `Rectangle 1954129930.svg` |

계절·시간대 PNG는 세로 대형이라 배경으로 쓸 땐 `object-fit: cover`로 채운다. 모든 루틴 배경은 위에 텍스트를 얹을 때 가독성을 위해 오버레이/대비를 확인한다.

---

## 발표·README 원본과 데스크톱 쇼케이스 파생본

| 파일 | 내용 | 용도 |
| --- | --- | --- |
| `assets/썸네일.png` | 모델이 SKN 앱(온보딩: "당신의 피부를 연구할 준비가 되었어요", 상단에 뒤집힌 N 심벌)을 든 3217×1856 가로 마케팅 이미지. | 보존 원본. 발표·README 히어로가 기본 용도이며 직접 웹에 싣지 않는다. 사용자의 명시적 요청으로 만든 아래 최적화 파생본만 데스크톱 쇼케이스 배경에 사용한다. |
| `frontend/public/skn-assets/desktop-editorial.webp` | `assets/썸네일.png`를 내용 변경 없이 2560px 너비 WebP로 최적화한 파생본. | 너비 900px 이상 데스크톱의 앱 쇼케이스 배경. 모바일에서는 로드 대상 마크업이 있더라도 CSS로 완전히 숨긴다. |
| `frontend/public/skn-assets/skn-today-qr.svg` | `https://skn.today/`을 오류 정정 H로 인코딩한 실제 QR. | 데스크톱 쇼케이스의 휴대폰 이어보기 카드. 링크와 QR 목적지가 모두 `https://skn.today/`로 일치해야 한다. |
