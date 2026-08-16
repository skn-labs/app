PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS app_user (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id INTEGER PRIMARY KEY,
    entry_choice TEXT NOT NULL CHECK (entry_choice IN ('PRODUCT', 'ROUTINE', 'EXPLORE')),
    selected_product_count INTEGER NOT NULL DEFAULT 0 CHECK (selected_product_count >= 0),
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- ONB-01: 온보딩에서 선택적으로 받는 사용감 선호. 구조화된 실제 경험이 쌓이기 전의 약한 맥락으로만 쓴다.
-- 피부 타입·연령·성별 같은 고정 속성은 담지 않는다(ACC-03, product-rules 10).
CREATE TABLE IF NOT EXISTS user_preference (
    user_id INTEGER PRIMARY KEY,
    texture_likes_json TEXT NOT NULL DEFAULT '[]',
    texture_avoids_json TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- prototype_2 8단계에서 사용자가 직접 선택한 자기보고 피부 프로필.
-- AI 추론값이 아니며 이후 사용자가 조회·수정할 수 있다.
CREATE TABLE IF NOT EXISTS user_skin_profile (
    user_id INTEGER PRIMARY KEY,
    age_range TEXT NOT NULL CHECK (age_range IN ('10S', '20S', '30S', '40S', '50S', '60_PLUS')),
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    skin_type TEXT NOT NULL CHECK (skin_type IN ('DRY', 'OILY', 'COMBINATION', 'NORMAL', 'UNSURE')),
    skin_condition INTEGER NOT NULL CHECK (skin_condition BETWEEN 1 AND 5),
    concerns_json TEXT NOT NULL CHECK (json_valid(concerns_json) AND json_type(concerns_json) = 'array'),
    textures_json TEXT NOT NULL CHECK (json_valid(textures_json) AND json_type(textures_json) = 'array'),
    avoids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(avoids_json) AND json_type(avoids_json) = 'array'),
    avoid_note TEXT NOT NULL DEFAULT '',
    trial_frequency TEXT NOT NULL CHECK (trial_frequency IN (
        'RARELY', 'EVERY_FEW_MONTHS', 'ONE_OR_TWO_MONTHLY', 'THREE_PLUS_MONTHLY'
    )),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product (
    id INTEGER PRIMARY KEY,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    volume TEXT,
    version_label TEXT,
    description TEXT NOT NULL,
    texture TEXT,
    verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
    facts_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    UNIQUE (brand, name, version_label)
);

-- 카탈로그의 브랜드명과 저장소에 포함한 로고 애셋을 연결한다.
-- 실제 제조 법인과 브랜드는 다를 수 있으므로 법적 제조사 정보로 해석하지 않는다.
CREATE TABLE IF NOT EXISTS brand_asset (
    brand TEXT PRIMARY KEY,
    logo_url TEXT NOT NULL CHECK (
        length(trim(logo_url)) > 0 AND logo_url GLOB '/manufacturer-logos/*'
    ),
    source_url TEXT,
    CHECK (source_url IS NULL OR source_url LIKE 'https://%')
);

-- 공식 브랜드 채널이 제공한 원본만 exact-match로 연결한다.
-- 한글·영문 별칭은 원문 brand를 보존한 채 같은 로고를 명시적으로 가리킨다.
INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('아누아', '/manufacturer-logos/anua.png', 'https://anua.com/cdn/shop/files/PNG_RGB_Primary_logo_ver2_2_255e833c-0e91-42df-96ca-0b7377ba7a8a.png?v=1779429699'),
  ('조선미녀', '/manufacturer-logos/beauty-of-joseon.png', 'https://beautyofjoseon.com/cdn/shop/files/boj-logo-text-default.png?v=1765267757'),
  ('belif', '/manufacturer-logos/belif.svg', 'https://www.belif.jp/wp-content/themes/belif/img/common/logo.svg'),
  ('벨리프', '/manufacturer-logos/belif.svg', 'https://www.belif.jp/wp-content/themes/belif/img/common/logo.svg'),
  ('CNP', '/manufacturer-logos/cnp.png', 'https://cnpmall.com/img/cnp_logo.png'),
  ('CNP차앤박', '/manufacturer-logos/cnp.png', 'https://cnpmall.com/img/cnp_logo.png'),
  ('차앤박', '/manufacturer-logos/cnp.png', 'https://cnpmall.com/img/cnp_logo.png'),
  ('코스알엑스', '/manufacturer-logos/cosrx.png', 'https://www.cosrx.com/cdn/shop/files/COSRX_150x.png?v=1658313147'),
  ('닥터지', '/manufacturer-logos/dr-g.png', 'https://www.dr-g.com/cdn/shop/files/3801b937541112e838c2a1bf2ef1af71_240x.png?v=1771999118'),
  ('에뛰드', '/manufacturer-logos/etude.png', 'https://images-kr.amoremall.com/sis/images/2025/11/28/dc9beac6-26a4-40b9-880e-e22c45cb2b5b.png'),
  ('에뛰드하우스', '/manufacturer-logos/etude.png', 'https://images-kr.amoremall.com/sis/images/2025/11/28/dc9beac6-26a4-40b9-880e-e22c45cb2b5b.png'),
  ('구달', '/manufacturer-logos/goodal.png', 'https://cliocosmetic.com/public/images/logo/goodal.png'),
  ('이니스프리', '/manufacturer-logos/innisfree.svg', 'https://us.innisfree.com/cdn/shop/files/IFLogo-Green-247x32.svg?v=1778609524'),
  ('이즈앤트리', '/manufacturer-logos/isntree.png', 'https://isntree.com/web/upload/fixed_logo.png'),
  ('이즌트리', '/manufacturer-logos/isntree.png', 'https://isntree.com/web/upload/fixed_logo.png'),
  ('iUNIK', '/manufacturer-logos/iunik.png', 'https://www.iunik.com/cdn/shop/files/iunik_logo.png?v=1743988775&width=500'),
  ('아이유닉', '/manufacturer-logos/iunik.png', 'https://www.iunik.com/cdn/shop/files/iunik_logo.png?v=1743988775&width=500'),
  ('JMsolution', '/manufacturer-logos/jmsolution.png', 'https://jmsolutioncm.cafe24.com/skin/main/logo.png'),
  ('JM솔루션', '/manufacturer-logos/jmsolution.png', 'https://jmsolutioncm.cafe24.com/skin/main/logo.png'),
  ('제이엠솔루션', '/manufacturer-logos/jmsolution.png', 'https://jmsolutioncm.cafe24.com/skin/main/logo.png'),
  ('Klairs', '/manufacturer-logos/klairs.svg', 'https://klairs.co.kr/assets/images/common/DK_logo_b.svg'),
  ('디어클레어스', '/manufacturer-logos/klairs.svg', 'https://klairs.co.kr/assets/images/common/DK_logo_b.svg'),
  ('클레어스', '/manufacturer-logos/klairs.svg', 'https://klairs.co.kr/assets/images/common/DK_logo_b.svg'),
  ('라네즈', '/manufacturer-logos/laneige.svg', 'https://us.laneige.com/cdn/shop/files/B.I_LANEIGE_wordmark_Blue.svg?v=1723506883'),
  ('메디힐', '/manufacturer-logos/mediheal.png', 'https://medihealshop.com/morenvyimg/logo_sub.png'),
  ('미샤', '/manufacturer-logos/missha.png', 'https://missha.com/static/img/logo.png'),
  ('네이처리퍼블릭', '/manufacturer-logos/nature-republic.png', 'https://www.naturerepublic.com/img/brand/story/logo_en_b.png'),
  ('라운드랩', '/manufacturer-logos/round-lab.png', 'https://roundlab.co.kr/_dj/img/logo_.png'),
  ('스킨1004', '/manufacturer-logos/skin1004.png', 'https://www.skin1004.com/cdn/shop/files/SKIN1004_LOGO_300PX_30c77c72-0035-4b50-ba2c-f2c7a36a0d9d.png?v=1738771518'),
  ('스킨푸드', '/manufacturer-logos/skinfood.svg', 'https://www.theskinfood.com/design/skinfood/skinfood/images/wib/PC/common/skinfood_pc_logo.svg'),
  ('더페이스샵', '/manufacturer-logos/the-face-shop.png', 'https://image.ethefaceshop.com/tfsshopWebSrc/images/common/logo_brand662.png'),
  ('토니모리', '/manufacturer-logos/tonymoly.png', 'https://d214w0arlvd25g.cloudfront.net/new_asset/img_logo_gnb_m.png'),
  ('토리든', '/manufacturer-logos/torriden.png', 'https://torriden2.cdn-nhncommerce.com/data/skin/front/mo_designart/img/banner/03b0b50ebf12bb71f624b6ee36ab73a9_44226.png'),
  ('VT', '/manufacturer-logos/vt.png', 'https://vt-cosmetics.com/images/cm_logo_1_black.png'),
  ('VT코스메틱', '/manufacturer-logos/vt.png', 'https://vt-cosmetics.com/images/cm_logo_1_black.png'),
  ('웰라쥬', '/manufacturer-logos/wellage.png', 'https://www.mywellage.com/web/upload/logo.png')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('마녀공장', '/manufacturer-logos/manyo.png', 'https://manyo.us/'),
  ('닥터자르트', '/manufacturer-logos/dr-jart.svg', 'https://www.drjart.co.kr/'),
  ('프리메라', '/manufacturer-logos/primera.svg', 'https://prd-ko-kr.primera.co.kr/kr/ko/'),
  ('아비브', '/manufacturer-logos/abib.svg', 'https://www.abib.com/'),
  ('퓨리토', '/manufacturer-logos/purito.svg', 'https://purito.com/'),
  ('메디큐브', '/manufacturer-logos/medicube.svg', 'https://medicube.us/'),
  ('달바', '/manufacturer-logos/dalba.svg', 'https://dalba.co.kr/'),
  ('잇츠스킨', '/manufacturer-logos/its-skin.png', 'https://itsskin.com/'),
  ('셀리맥스', '/manufacturer-logos/celimax.png', 'https://celimax.us/'),
  ('오휘', '/manufacturer-logos/ohui.svg', 'https://ohui.com/'),
  ('에스트라', '/manufacturer-logos/aestura.png', 'https://www.aestura.com/'),
  ('설화수', '/manufacturer-logos/sulwhasoo.png', 'https://us.sulwhasoo.com/'),
  ('아이오페', '/manufacturer-logos/iope.png', 'https://int.iope.com/'),
  ('헤라', '/manufacturer-logos/hera.svg', 'https://int.hera.com/'),
  ('어퓨', '/manufacturer-logos/apieu.png', 'https://www.apieu.com/kr/brand'),
  ('마몽드', '/manufacturer-logos/mamonde.svg', 'https://int.mamonde.com/'),
  ('바닐라코', '/manufacturer-logos/banila-co.png', 'https://www.banila.com/'),
  ('한율', '/manufacturer-logos/hanyul.png', 'https://prd-en-int.apgroup.com/int/en/brands/hanyul.html'),
  ('토코보', '/manufacturer-logos/tocobo.svg', 'https://tocobo.co.kr/'),
  ('바이오던스', '/manufacturer-logos/biodance.png', 'https://biodance.co.kr/'),
  ('아이소이', '/manufacturer-logos/isoi.png', 'https://isoi.co.kr/'),
  ('리얼베리어', '/manufacturer-logos/real-barrier.svg', 'https://www.neopharmshop.co.kr/brandstory/realbarrier.html'),
  ('아로마티카', '/manufacturer-logos/aromatica.svg', 'https://aromatica.co.kr/'),
  ('비플레인', '/manufacturer-logos/beplain.svg', 'https://www.beplain.co.kr/'),
  ('일리윤', '/manufacturer-logos/illiyoon.svg', 'https://www.illiyoon.com/'),
  ('더샘', '/manufacturer-logos/the-saem.png', 'https://www.thesaemcosmetic.com/'),
  ('셀퓨전씨', '/manufacturer-logos/cell-fusion-c.svg', 'https://www.cellfusionc.co.kr/'),
  ('숨37', '/manufacturer-logos/sum37.svg', 'https://sum37.com/'),
  ('멜릭서', '/manufacturer-logos/melixir.png', 'https://melixirskincare.com/'),
  ('AHC', '/manufacturer-logos/ahc.svg', 'https://www.ahc.co.kr/'),
  ('리더스', '/manufacturer-logos/leaders.png', 'https://leaderscosmetics.com/'),
  ('후', '/manufacturer-logos/whoo.svg', 'https://thewhoo.com/'),
  ('더히스토리오브후', '/manufacturer-logos/whoo.svg', 'https://thewhoo.com/'),
  ('클리오', '/manufacturer-logos/clio.png', 'https://cliocosmetic.com/clio_en.html')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('티르티르', '/manufacturer-logos/tirtir.svg', 'https://tirtir.co.kr/custom/logo.svg'),
  ('동인비', '/manufacturer-logos/donginbi.png', 'https://www.donginbi.com/data/donginbimall_data/templet/cchannel/images/common/logo_donginbi.png'),
  ('썸바이미', '/manufacturer-logos/some-by-mi.png', 'https://somebymi.com/web/upload/category/editor/2025/08/19/35279b3e93f1e77a767fe2d5850a75e0.png'),
  ('참존', '/manufacturer-logos/charmzone.png', 'https://gi.esmplus.com/charmzonea/MAKESHOP/FM/header_logo.png'),
  ('헤이미쉬', '/manufacturer-logos/heimish.png', 'https://ecimg.cafe24img.com/pg2307b34327853033/eheimish/web/upload/category/editor/2025/11/18/2fd4c0e49d9afe346f7a7a599000cd97.png'),
  ('닥터오라클', '/manufacturer-logos/dr-oracle.png', 'https://www.droracle.co.kr/web/upload/wp/1994/header_Logo2.png'),
  ('페리페라', '/manufacturer-logos/peripera.png', 'https://cliocosmetic.com/public/images/logo/peripera.png'),
  ('리쥬란', '/manufacturer-logos/rejuran.png', 'https://rejuran.co.kr/HTML/rejuran/img/logo_header_v2.png'),
  ('메디필', '/manufacturer-logos/medipeel.png', 'https://ecimg.cafe24img.com/pg644b36841511008/medipeel2023/img/pc/common/logo_b.png'),
  ('스킨79', '/manufacturer-logos/skin79.png', 'https://skin792.godohosting.com/skin79mall/logo/logo.png'),
  ('어바웃미', '/manufacturer-logos/about-me.png', 'https://aboutmtr8914.cdn-nhncommerce.com/data/skin/front/aboutme_pc_2026/img/banner/a06865b49bc8d84234bca707e70adf83_10164.png'),
  ('AXIS-Y', '/manufacturer-logos/axis-y.png', 'https://www.axis-y.com/cdn/shop/files/AXIS-Y_LogoAv1_854c7e2a-6d70-42ea-ab76-112b44644fc6.png'),
  ('닥터벨머', '/manufacturer-logos/dr-belmeur.png', 'https://image.ethefaceshop.com/tfsshopWebSrc/images/common/logo_brand671.png'),
  ('Dr.Belmeur', '/manufacturer-logos/dr-belmeur.png', 'https://image.ethefaceshop.com/tfsshopWebSrc/images/common/logo_brand671.png'),
  ('바이오힐보', '/manufacturer-logos/bioheal-boh.png', 'https://www.biohealboh.jp/assets/images/common/logo_gray.png'),
  ('에스네이처', '/manufacturer-logos/s-nature.png', 'https://snature.co.kr/web/upload/appfiles/ZaReJam3QiELznoZeGGkMG/ea0f7dbbde629c66ae3664d2e1b6d407.png'),
  ('파티온', '/manufacturer-logos/fation.png', 'https://fation.co.kr/_dbook/img/logo.png'),
  ('롬앤', '/manufacturer-logos/romand.png', 'https://romand.co.kr/web/upload/appfiles/0zdpAngaKBFnlCcCqpCU4A/cb60ebc9bc25388f85503acce16d3d89.png'),
  ('메이크프렘', '/manufacturer-logos/make-prem.png', 'https://cdn-pro-web-211-225.cdn-nhncommerce.com/makeprem1_godomall_com/data/skin/front/moment_makeprem_C/img/banner/fb6cb1c2e585f1803161e42c06cb2338_23859.png'),
  ('스킨앤랩', '/manufacturer-logos/skin-and-lab.svg', 'https://www.skinnlab.com/web/upload/wp/1995/logo_skinlab_000.svg'),
  ('아크웰', '/manufacturer-logos/acwell.png', 'https://cdn-pro-web-250-115.cdn-nhncommerce.com/bnh20202_godomall_com/data/skin/front/kaimen_bnh_1028/img/brand/acwell_logo(2020).png'),
  ('어뮤즈', '/manufacturer-logos/amuse.png', 'https://amusemakeup.cafe24.com/web/upload/NNEditor/20200916/b70b53728e682ec408167232e2e3b017.png'),
  ('편강율', '/manufacturer-logos/pyunkang-yul.png', 'https://cafe24.poxo.com/ec01/pyunkangyul/gf5Q6CJIJey89+xjtfalxzUvAb7cEWmwIwefGxcx8REXb2Pr8IjKo1VOuodsT2/2kNt847yp2jhbS/urrSYM/g==/_/images/logo.png'),
  ('그래프', '/manufacturer-logos/grafen.png', 'https://grafen.co.kr/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/1e006fba4a585395145b5054e06d6801.png'),
  ('네오젠', '/manufacturer-logos/neogen.png', 'https://neogenlab.us/cdn/shop/files/neogen-logo-dark.png'),
  ('라보에이치', '/manufacturer-logos/labo-h.png', 'https://laboh.co.kr/img/logo--big.png'),
  ('리더스인솔루션', '/manufacturer-logos/leaders.png', 'https://leaderscosmetics.com/web/upload/img/logo.png'),
  ('메디앤서', '/manufacturer-logos/medianswer.png', 'https://aboutmtr8914.cdn-nhncommerce.com/data/skin/front/aboutme_pc_2026/img/banner/e4265fabf33ec986b9fe141276bd1360_36423.png'),
  ('미즈온', '/manufacturer-logos/mizon.png', 'https://www.mizon.co.kr/design/pfd1776/img/pfd_brand_logo_mizon.png')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('비디비치', '/manufacturer-logos/vidivici.svg', 'https://vidivici-global.com/'),
  ('식물나라', '/manufacturer-logos/shingmulnara.png', 'https://corp.oliveyoung.com/en/business/brand/plant'),
  ('에스쁘아', '/manufacturer-logos/espoir.png', 'https://www.espoir.com/en/customer/about_brand_story.do'),
  ('피지오겔', '/manufacturer-logos/physiogel.png', 'https://physiogel.co.kr/'),
  ('필리밀리', '/manufacturer-logos/fillimilli.png', 'https://corp.oliveyoung.com/en/business/brand/fillimilli'),
  ('한스킨', '/manufacturer-logos/hanskin.png', 'https://www.celltrionmall.com/brand'),
  ('화애락', '/manufacturer-logos/hwaaerak-main.png', 'https://www.jungkwanjang.co.kr/brands/hwaaerak/brand.do?code_id=Brand_7'),
  ('Then I Met You', '/manufacturer-logos/then-i-met-you.svg', 'https://thenimetyou.com/'),
  ('라운드어라운드', '/manufacturer-logos/round-around.png', 'https://corp.oliveyoung.com/en/business/brand/round'),
  ('라카', '/manufacturer-logos/laka.svg', 'https://www.lakacosmetics.com/'),
  ('벤튼', '/manufacturer-logos/benton.png', 'https://bentoncosmetics.com/'),
  ('셀트리온스킨큐어', '/manufacturer-logos/celltrion-skincure.png', 'https://www.celltrionmall.com/brand'),
  ('어노브', '/manufacturer-logos/unove.png', 'https://www.unoveglobal.com/'),
  ('에이바자르', '/manufacturer-logos/avajar.png', 'https://www.avajar.co.kr/'),
  ('제이준', '/manufacturer-logos/jayjun.png', 'https://en.jayjun.co.kr/'),
  ('주미소', '/manufacturer-logos/jumiso.png', 'https://jumiso.us/'),
  ('크레이브뷰티', '/manufacturer-logos/krave-beauty.svg', 'https://kravebeauty.com/')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('브링그린', '/manufacturer-logos/bringgreen.png', 'https://corp.oliveyoung.com/ko/business/brand/bringgreen'),
  ('파파레서피', '/manufacturer-logos/papa-recipe.png', 'https://www.paparecipe.com/'),
  ('헉슬리', '/manufacturer-logos/huxley.png', 'https://huxley.co.kr/'),
  ('SNP', '/manufacturer-logos/snp.png', 'https://snpbeauty.com/'),
  ('수려한', '/manufacturer-logos/sooryehan.gif', 'https://www.sooryehan.co.kr/images/common/logo.gif'),
  ('닥터세라클', '/manufacturer-logos/dr-ceuracle.png', 'https://www.lghmall.co.kr/data/mobile/defaultShopIcon.png'),
  ('Dr.Ceuracle', '/manufacturer-logos/dr-ceuracle.png', 'https://www.lghmall.co.kr/data/mobile/defaultShopIcon.png'),
  ('하루하루원더', '/manufacturer-logos/haruharu-wonder.png', 'https://haruharuusa.com/cdn/shop/files/qv2xp7_r547-gdl3nz_logo.png?v=1770849951'),
  ('베리썸', '/manufacturer-logos/berrisom.png', 'https://www.cosmelab.com/bizdemo143204/img/hblock/content/intro_01/img/logo.png'),
  ('닥터방기순', '/manufacturer-logos/dr-banggiwon.png', 'https://banggiwon.com/_images/nav_logo.png')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

INSERT INTO brand_asset (brand, logo_url, source_url) VALUES
  ('넘버즈인', '/manufacturer-logos/numbuzin.png', 'https://us.numbuzin.com/cdn/shop/files/250304_______US__04.png?v=1748827912&width=1200'),
  ('홀리카홀리카', '/manufacturer-logos/holika-holika.png', 'https://holikaholika.com/cdn/shop/files/Frame.png?v=1730447758&width=500'),
  ('이자녹스', '/manufacturer-logos/isaknox.png', 'https://contents.lgcare.com/lgcareWebSrc/upload/company/attach_file_20200824132862403.png'),
  ('그레이스데이', '/manufacturer-logos/grace-day.jpg', 'https://sindopng.com/?page_id=629'),
  ('비욘드', '/manufacturer-logos/beyond.png', 'https://contents.lgcare.com/lgcareWebSrc/upload/company/attach_file_20180627142811622.png'),
  ('센텔리안24', '/manufacturer-logos/centellian24.png', 'https://centellian24.com/cdn/shop/files/logo-transparent-crop.png?v=1729224346&width=1042'),
  ('시오리스', '/manufacturer-logos/sioris.png', 'https://en.sioris.co.kr/design/en/sioris_logo_en.png'),
  ('프루디아', '/manufacturer-logos/frudia.svg', 'https://www.frudia.com/en/'),
  ('라비오뜨', '/manufacturer-logos/labiotte.png', 'https://www.labiotte.com/web/upload/category/logo/v2_1375e98e4d54661d5795af5b75bdcacb_7dqB9gKPe_top.jpg'),
  ('아토팜', '/manufacturer-logos/atopalm.svg', 'https://www.neopharmshop.co.kr/upload/brandstory/atopalm-logo.svg'),
  ('코드글로컬러', '/manufacturer-logos/code-glokolor.png', 'https://contents.lgcare.com/lgcareWebSrc/upload/company/attach_file_20230628101669417.png'),
  ('루메네', '/manufacturer-logos/lumene.svg', 'https://www.lumene.com/'),
  ('랩클', '/manufacturer-logos/labcle.jpg', 'https://ecimg.cafe24img.com/pg504b72581267063/myhdpharm01/web/brand/br01.jpg'),
  ('닥터블레딕', '/manufacturer-logos/dr-bledik.png', 'https://drbledik.co.kr/web/upload/appfiles/ZaReJam3QiELznoZeGGkMG/788fbc18f4394abe4cce9ecfcaed994d.png'),
  ('닥터더마퍼트', '/manufacturer-logos/dr-dermapert.png', 'https://contents.sixshop.com/uploadedFiles/163535/default/image_1618536902528.png'),
  ('아이소브', '/manufacturer-logos/isov.png', 'https://ecimg.cafe24img.com/pg813b45734152063/isov/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/629216b00bfbdad72fa343a5f00561c2.png'),
  ('앰플엔', '/manufacturer-logos/ample-n.png', 'https://www.coreana.com/content/images/brand/b1/img_brand_b1_logo.png'),
  ('어나더페이스', '/manufacturer-logos/another-face.svg', 'https://ecimg.cafe24img.com/pg797b53790262094/anotherface/web/upload/_dj/img/AF_logo2.svg'),
  ('닥터멜락신', '/manufacturer-logos/dr-melaxin.png', 'https://m.melaxin.com/img/logo_melaxin_black.png'),
  ('닥터아토', '/manufacturer-logos/dr-ato.jpg', 'https://www.medience.co.kr/images/product/eng/brand_drato.jpg'),
  ('셀라피', '/manufacturer-logos/cellapy.png', 'https://static.ableshop.kr/web/fo/static/images/main/brand-cellapy.png'),
  ('마데카21', '/manufacturer-logos/madeca21.png', 'https://madeca21.com/cdn/shop/files/madeca21_logo.png?v=1750317927&width=360'),
  ('메디플라워', '/manufacturer-logos/mediflower.png', 'https://www.medi-flower.com/img/main/main_logo.png'),
  ('아임미미', '/manufacturer-logos/im-meme.png', 'https://www.memebox.com/renew/pc/im_meme_logo_white.png')
ON CONFLICT(brand) DO UPDATE SET
  logo_url = excluded.logo_url,
  source_url = excluded.source_url;

-- 제품별 사용 가이드다. description/facts_json은 출처 미확인 카탈로그 입력으로
-- 가이드 생성에만 사용하며, 확인 사실·추천·Rescue 근거로 승격하지 않는다.
CREATE TABLE IF NOT EXISTS product_catalog_content (
    product_id INTEGER PRIMARY KEY,
    summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
    routine_step TEXT NOT NULL CHECK (length(trim(routine_step)) > 0),
    usage_type TEXT NOT NULL CHECK (length(trim(usage_type)) > 0),
    usage_timing_json TEXT NOT NULL CHECK (json_valid(usage_timing_json) AND json_type(usage_timing_json) = 'array'),
    usage_tips_json TEXT NOT NULL CHECK (json_valid(usage_tips_json) AND json_type(usage_tips_json) = 'array'),
    observation_points_json TEXT NOT NULL CHECK (json_valid(observation_points_json) AND json_type(observation_points_json) = 'array'),
    origin TEXT NOT NULL CHECK (origin IN ('AI_GENERATED', 'EDITORIAL')),
    generated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- 출처를 실제로 추적할 수 있는 제품 사실만 저장한다. 기존 facts_json처럼
-- 근거 없는 문구를 이 테이블로 승격하지 않는다.
CREATE TABLE IF NOT EXISTS product_source_fact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    fact_type TEXT NOT NULL CHECK (fact_type IN (
        'DIRECTIONS', 'TEXTURE', 'LABEL_CLAIM', 'CAUTION',
        'SUN_PROTECTION', 'INGREDIENT_LABEL', 'CERTIFICATION'
    )),
    fact_text TEXT NOT NULL CHECK (length(trim(fact_text)) > 0),
    source_label TEXT NOT NULL CHECK (length(trim(source_label)) > 0),
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%' OR source_url LIKE 'http://%'),
    checked_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    UNIQUE (product_id, fact_type, fact_text, source_url)
);

CREATE INDEX IF NOT EXISTS ix_product_source_fact_product
    ON product_source_fact(product_id, id);

DROP VIEW IF EXISTS product_catalog_public;
CREATE VIEW product_catalog_public AS
SELECT
    p.*,
    ba.logo_url AS brand_logo_url,
    pcc.summary AS guide_summary,
    pcc.routine_step AS guide_routine_step,
    pcc.usage_type AS guide_usage_type,
    pcc.usage_timing_json AS guide_usage_timing_json,
    pcc.usage_tips_json AS guide_usage_tips_json,
    pcc.observation_points_json AS guide_observation_points_json,
    pcc.origin AS guide_origin,
    pcc.generated_at AS guide_generated_at,
    CASE
        WHEN p.verified = 1 AND EXISTS (
            SELECT 1 FROM product_source_fact identity_source
            WHERE identity_source.product_id = p.id
        ) THEN 1 ELSE 0
    END AS public_verified,
    COALESCE((
        SELECT json_group_array(json_object(
            'type', psf.fact_type,
            'text', psf.fact_text,
            'sourceLabel', psf.source_label,
            'sourceUrl', psf.source_url,
            'checkedAt', psf.checked_at
        ))
        FROM product_source_fact psf
        WHERE psf.product_id = p.id
          AND length(trim(psf.source_label)) > 0
          AND length(trim(psf.source_url)) > 0
          AND length(trim(psf.checked_at)) > 0
    ), '[]') AS source_facts_json
FROM product p
JOIN product_catalog_content pcc ON pcc.product_id = p.id
LEFT JOIN brand_asset ba ON ba.brand = p.brand;

CREATE TABLE IF NOT EXISTS user_product (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER,
    custom_brand TEXT,
    custom_name TEXT,
    custom_category TEXT,
    memo TEXT,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id),
    CHECK (product_id IS NOT NULL OR custom_name IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_catalog_product
    ON user_product(user_id, product_id)
    WHERE product_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS routine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    day_part TEXT NOT NULL CHECK (day_part IN ('MORNING', 'EVENING', 'ANYTIME')),
    status TEXT NOT NULL CHECK (status IN ('CURRENT', 'BASELINE', 'PAST')),
    based_on_routine_id INTEGER,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (based_on_routine_id) REFERENCES routine(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_current_routine_per_user
    ON routine(user_id)
    WHERE status = 'CURRENT';

CREATE TABLE IF NOT EXISTS routine_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER NOT NULL,
    user_product_id INTEGER NOT NULL,
    time_slot TEXT NOT NULL DEFAULT 'EVENING' CHECK (time_slot IN ('MORNING', 'EVENING', 'BOTH')),
    position INTEGER NOT NULL CHECK (position >= 0),
    frequency TEXT NOT NULL DEFAULT '매일',
    FOREIGN KEY (routine_id) REFERENCES routine(id) ON DELETE CASCADE,
    FOREIGN KEY (user_product_id) REFERENCES user_product(id),
    UNIQUE (routine_id, time_slot, position),
    UNIQUE (routine_id, user_product_id)
);

CREATE TABLE IF NOT EXISTS experience_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('ROUTINE', 'PRODUCT')),
    routine_id INTEGER,
    user_product_id INTEGER,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_due_at TEXT NOT NULL,
    ended_at TEXT,
    end_reason TEXT,
    client_request_id TEXT,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routine(id),
    FOREIGN KEY (user_product_id) REFERENCES user_product(id),
    CHECK (
        (subject_type = 'ROUTINE' AND routine_id IS NOT NULL)
        OR (subject_type = 'PRODUCT' AND user_product_id IS NOT NULL)
    ),
    UNIQUE (user_id, client_request_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_experience_per_user
    ON experience_session(user_id)
    WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS experience_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER,
    user_product_id INTEGER,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('LIKED', 'DISAPPOINTED', 'UNSURE')),
    note TEXT NOT NULL DEFAULT '',
    discomfort TEXT NOT NULL DEFAULT 'NOT_REPORTED' CHECK (discomfort IN ('NOT_REPORTED', 'REPORTED', 'UNKNOWN')),
    adherence TEXT NOT NULL DEFAULT 'MATCHED' CHECK (adherence IN ('MATCHED', 'PARTIAL', 'DIFFERENT', 'UNKNOWN')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_request_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES experience_session(id),
    FOREIGN KEY (user_product_id) REFERENCES user_product(id),
    CHECK (session_id IS NOT NULL OR user_product_id IS NOT NULL),
    UNIQUE (user_id, client_request_id)
);

CREATE TABLE IF NOT EXISTS experience_tag (
    record_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    PRIMARY KEY (record_id, label),
    FOREIGN KEY (record_id) REFERENCES experience_record(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comparison_baseline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    routine_id INTEGER NOT NULL,
    confirmed_record_id INTEGER,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routine(id),
    FOREIGN KEY (confirmed_record_id) REFERENCES experience_record(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_baseline_per_user
    ON comparison_baseline(user_id)
    WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS personal_pattern (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence_note TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HIDDEN')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pattern_evidence (
    pattern_id INTEGER NOT NULL,
    record_id INTEGER NOT NULL,
    polarity TEXT NOT NULL CHECK (polarity IN ('SUPPORTS', 'CONTRADICTS')),
    PRIMARY KEY (pattern_id, record_id),
    FOREIGN KEY (pattern_id) REFERENCES personal_pattern(id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES experience_record(id) ON DELETE CASCADE
);

-- REC-09: 회고 due와 전달 상태를 분리한다. 읽음·미룸·행동 완료는 서로 다른 시각으로 보존한다.
CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'EXPERIENCE_CHECK_IN', 'EXPERIENCE_REVIEW_DUE',
        'PROFILE_READY', 'PROFILE_UPDATED', 'PATTERN_READY', 'PRODUCT_DISCOVERY'
    )),
    experience_id INTEGER,
    pattern_id INTEGER,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    body TEXT NOT NULL DEFAULT '',
    available_at TEXT NOT NULL,
    read_at TEXT,
    snoozed_until TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    dedupe_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (experience_id) REFERENCES experience_session(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES personal_pattern(id) ON DELETE CASCADE,
    UNIQUE (user_id, dedupe_key),
    CHECK (
        (notification_type IN ('EXPERIENCE_CHECK_IN', 'EXPERIENCE_REVIEW_DUE')
            AND experience_id IS NOT NULL AND pattern_id IS NULL)
        OR (notification_type = 'PATTERN_READY' AND experience_id IS NULL AND pattern_id IS NOT NULL)
        OR (notification_type IN ('PROFILE_READY', 'PROFILE_UPDATED', 'PRODUCT_DISCOVERY')
            AND experience_id IS NULL AND pattern_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('GENERAL', 'PRODUCT', 'RECOMMEND', 'PATTERN', 'RESCUE')),
    product_id INTEGER,
    experience_id INTEGER,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id),
    FOREIGN KEY (experience_id) REFERENCES experience_session(id)
);

CREATE TABLE IF NOT EXISTS conversation_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
    content TEXT NOT NULL,
    suggested_replies_json TEXT NOT NULL DEFAULT '[]',
    evidence_refs_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'FALLBACK', 'FAILED')),
    client_request_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    UNIQUE (conversation_id, client_request_id)
);

CREATE TABLE IF NOT EXISTS conversation_message_source (
    message_id INTEGER NOT NULL,
    source_order INTEGER NOT NULL CHECK (source_order > 0),
    title TEXT NOT NULL,
    url TEXT NOT NULL CHECK (url LIKE 'https://%'),
    source_tier TEXT NOT NULL CHECK (source_tier IN ('P1', 'P2', 'P3', 'P4')),
    PRIMARY KEY (message_id, source_order),
    UNIQUE (message_id, url),
    FOREIGN KEY (message_id) REFERENCES conversation_message(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rescue_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL UNIQUE,
    base_routine_id INTEGER,
    remove_user_product_id INTEGER,
    title TEXT NOT NULL,
    rationale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPLIED', 'DECLINED', 'BLOCKED')),
    applied_experience_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    FOREIGN KEY (base_routine_id) REFERENCES routine(id),
    FOREIGN KEY (remove_user_product_id) REFERENCES user_product(id),
    FOREIGN KEY (applied_experience_id) REFERENCES experience_session(id)
);

CREATE INDEX IF NOT EXISTS ix_user_products ON user_product(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS ix_experience_records ON experience_record(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_conversation_messages ON conversation_message(conversation_id, id);
CREATE INDEX IF NOT EXISTS ix_conversation_message_sources ON conversation_message_source(message_id, source_order);
CREATE INDEX IF NOT EXISTS ix_notifications_inbox
    ON notification(user_id, available_at DESC, id DESC)
    WHERE cancelled_at IS NULL;

INSERT OR IGNORE INTO app_user(id, username, password_hash, display_name, is_demo)
VALUES (1, 'demo', NULL, '코덕님', 1);

INSERT OR IGNORE INTO user_onboarding(user_id, entry_choice, selected_product_count, completed_at)
VALUES (1, 'ROUTINE', 5, datetime('now', '-60 day'));

INSERT OR IGNORE INTO app_user(id, username, password_hash, display_name, is_demo) VALUES
  (101, 'test01', NULL, '테스트 01', 0), (102, 'test02', NULL, '테스트 02', 0),
  (103, 'test03', NULL, '테스트 03', 0), (104, 'test04', NULL, '테스트 04', 0),
  (105, 'test05', NULL, '테스트 05', 0), (106, 'test06', NULL, '테스트 06', 0),
  (107, 'test07', NULL, '테스트 07', 0), (108, 'test08', NULL, '테스트 08', 0),
  (109, 'test09', NULL, '테스트 09', 0), (110, 'test10', NULL, '테스트 10', 0),
  (111, 'test11', NULL, '테스트 11', 0), (112, 'test12', NULL, '테스트 12', 0),
  (113, 'test13', NULL, '테스트 13', 0), (114, 'test14', NULL, '테스트 14', 0),
  (115, 'test15', NULL, '테스트 15', 0), (116, 'test16', NULL, '테스트 16', 0),
  (117, 'test17', NULL, '테스트 17', 0), (118, 'test18', NULL, '테스트 18', 0),
  (119, 'test19', NULL, '테스트 19', 0), (120, 'test20', NULL, '테스트 20', 0);

INSERT OR IGNORE INTO product(id, brand, name, category, volume, version_label, description, texture, verified, facts_json) VALUES
  (1, '뉴트리랩', '아쿠아 하이드라 세럼', '세럼', '30ml', '2026.03', '수분감과 가벼운 마무리를 내세운 워터리 세럼', '워터리', 1, '["가벼운 워터리 제형으로 표시", "아침·저녁 사용 안내", "향 정보 확인 대기"]'),
  (2, '바이옴', '판테놀 리페어 세럼', '세럼', '30ml', '2026.01', '판테놀을 중심으로 편안한 사용감을 내세운 세럼', '젤 세럼', 1, '["판테놀 함유 표시", "저자극 시험 표기", "저녁 사용 기록 6회"]'),
  (3, '더마리브', '세라마이드 배리어 크림', '크림', '50ml', '2025.11', '리치한 보습 마무리의 세라마이드 크림', '리치 크림', 1, '["세라마이드 함유 표시", "보습 지속 사용 안내"]'),
  (4, '솔라핏', '에어리 데일리 선크림', '선케어', '50ml', '2026.02', '얇게 펴 발리는 데일리 선크림', '로션', 1, '["SPF50+ PA++++ 표시", "메이크업 전 사용 안내"]'),
  (5, '어퀴즈', 'H2 하이드라 토너', '토너', '200ml', '2025.09', '가볍게 닦거나 흡수시키는 수분 토너', '워터', 1, '["워터 타입", "화장솜 또는 손 사용 안내"]'),
  (6, '뉴트리랩', '마일드 젤클렌저', '클렌징', '150ml', '2026.01', '아침과 저녁에 사용하는 젤 클렌저', '젤', 1, '["젤 타입", "아침·저녁 세안 안내"]'),
  (7, '데이지코', '모이스처 부스트 앰플', '앰플', '30ml', '2026.04', '쫀쫀한 마무리를 내세운 보습 앰플', '점성 앰플', 1, '["쫀쫀한 제형 표시", "저녁 사용 권장"]'),
  (8, '더마리브', '시카 카밍 수딩젤', '젤', '80ml', '2025.12', '가볍게 바르는 수딩 젤', '수딩 젤', 1, '["젤 타입", "필요한 부위 사용 안내"]'),
  (9, '오브리에', '클리어 밸런스 토너', '토너', '180ml', '2026.05', '여러 번 덧바르기 쉬운 가벼운 워터 토너', '워터', 1, '["워터 타입으로 표시", "아침·저녁 사용 안내", "향 정보 확인 대기"]'),
  (10, '솔라핏', '벨벳 UV 플루이드', '선케어', '50ml', '2026.06', '보송한 마무리를 내세운 플루이드 선케어', '플루이드', 1, '["SPF50+ PA++++ 표시", "메이크업 전 사용 안내", "보송한 마무리 표현"]'),
  (11, '더마리브', '워터 베리어 젤크림', '크림', '50ml', '2026.04', '수분감과 가벼운 마무리를 내세운 젤크림', '젤크림', 1, '["젤크림 제형으로 표시", "아침·저녁 사용 안내", "향 정보 확인 대기"]');

UPDATE product
   SET image_url = '/skn-assets/dermalive-cica-gel.png'
 WHERE id = 8;

INSERT OR IGNORE INTO user_product(id, user_id, product_id, memo, added_at) VALUES
  (1, 1, 1, NULL, datetime('now', '-4 day')),
  (2, 1, 2, NULL, datetime('now', '-90 day')),
  (3, 1, 3, NULL, datetime('now', '-100 day')),
  (4, 1, 4, NULL, datetime('now', '-80 day')),
  (5, 1, 5, NULL, datetime('now', '-120 day')),
  (6, 1, 6, NULL, datetime('now', '-140 day')),
  (7, 1, 7, NULL, datetime('now', '-4 day')),
  (8, 1, 8, NULL, datetime('now', '-70 day'));

INSERT OR IGNORE INTO routine(id, user_id, name, day_part, status, started_at, ended_at) VALUES
  (1, 1, '문제없이 쓰던 저녁 루틴', 'EVENING', 'BASELINE', datetime('now', '-60 day'), datetime('now', '-4 day')),
  (2, 1, '세럼 2개를 더한 저녁 루틴', 'EVENING', 'CURRENT', datetime('now', '-4 day'), NULL);

INSERT OR IGNORE INTO routine_item(id, routine_id, user_product_id, time_slot, position, frequency) VALUES
  (1, 1, 6, 'BOTH', 1, '매일'), (2, 1, 5, 'BOTH', 2, '매일'), (3, 1, 2, 'BOTH', 3, '매일'), (4, 1, 3, 'BOTH', 4, '매일'),
  (11, 1, 4, 'MORNING', 5, '매일'),
  (5, 2, 6, 'BOTH', 1, '매일'), (6, 2, 5, 'BOTH', 2, '매일'), (7, 2, 1, 'EVENING', 3, '매일'), (8, 2, 7, 'EVENING', 4, '매일'),
  (9, 2, 2, 'BOTH', 5, '매일'), (10, 2, 3, 'BOTH', 6, '매일'), (12, 2, 4, 'MORNING', 7, '매일');

INSERT OR IGNORE INTO experience_session(id, user_id, subject_type, routine_id, user_product_id, title, status, started_at, review_due_at, ended_at, end_reason, client_request_id) VALUES
  (1, 1, 'PRODUCT', NULL, 2, '판테놀 리페어 세럼', 'COMPLETED', datetime('now', '-52 day'), datetime('now', '-45 day'), datetime('now', '-45 day'), 'REVIEW_SUBMITTED', 'seed-session-1'),
  (2, 1, 'PRODUCT', NULL, 8, '시카 카밍 수딩젤', 'COMPLETED', datetime('now', '-24 day'), datetime('now', '-17 day'), datetime('now', '-17 day'), 'REVIEW_SUBMITTED', 'seed-session-2'),
  (3, 1, 'ROUTINE', 2, NULL, '세럼 2개를 더한 저녁 루틴', 'ACTIVE', datetime('now', '-3 day'), datetime('now', '+3 day'), NULL, NULL, 'seed-session-3');

INSERT OR IGNORE INTO experience_record(id, user_id, session_id, user_product_id, sentiment, note, discomfort, adherence, created_at, client_request_id) VALUES
  (1, 1, 1, 2, 'LIKED', '아침에 가볍고 화장 전에 밀리지 않아서 손이 자주 갔다.', 'NOT_REPORTED', 'MATCHED', datetime('now', '-45 day'), 'seed-record-1'),
  (2, 1, 2, 8, 'LIKED', '더운 날 저녁에 산뜻했다. 크림 전에 써도 답답하지 않았다.', 'NOT_REPORTED', 'MATCHED', datetime('now', '-17 day'), 'seed-record-2'),
  (3, 1, NULL, 7, 'DISAPPOINTED', '쫀쫀하지만 아침에는 조금 무겁고 선크림과 함께 밀렸다.', 'NOT_REPORTED', 'MATCHED', datetime('now', '-10 day'), 'seed-record-3'),
  (4, 1, NULL, 3, 'UNSURE', '겨울에는 좋았는데 지금 계절에는 조금 답답한 것 같다.', 'UNKNOWN', 'MATCHED', datetime('now', '-6 day'), 'seed-record-4');

INSERT OR IGNORE INTO experience_tag(record_id, label) VALUES
  (1, '가벼움'), (1, '밀림 없음'), (2, '산뜻함'), (2, '답답하지 않음'), (3, '밀림'), (3, '무거움'), (4, '계절 차이');

INSERT OR IGNORE INTO comparison_baseline(id, user_id, routine_id, confirmed_record_id, started_at) VALUES
  (1, 1, 1, 1, datetime('now', '-45 day'));

INSERT OR IGNORE INTO personal_pattern(id, user_id, title, summary, confidence_note) VALUES
  (1, 1, '가벼운 제품을 아침에 썼을 때 만족도가 높았어요', '밀림이 없고 산뜻하다고 남긴 기록이 서로 다른 제품에서 반복됐어요.', '지지 2건 · 반대 1건 · 피부 타입 판정이 아님'),
  (2, 1, '리치한 제형은 계절에 따라 느낌이 달랐어요', '겨울에는 좋았던 크림이 더운 시기에는 답답하다고 기록됐어요.', '지지 2건 · 기록이 더 필요함');

INSERT OR IGNORE INTO pattern_evidence(pattern_id, record_id, polarity) VALUES
  (1, 1, 'SUPPORTS'), (1, 2, 'SUPPORTS'), (1, 3, 'CONTRADICTS'),
  (2, 3, 'SUPPORTS'), (2, 4, 'SUPPORTS');

-- 이미 존재하는 ACTIVE 경험에도 앱 안 알림 예약을 만든다. due 자체는 experience_session에 남는다.
INSERT OR IGNORE INTO notification(
    user_id, notification_type, experience_id, title, body,
    available_at, completed_at, dedupe_key
)
SELECT es.user_id, 'EXPERIENCE_CHECK_IN', es.id,
       'DAY 2, 오늘은 어땠나요?',
       '작은 변화라도 괜찮아요. 느낀 점을 남겨보세요.',
       datetime(es.started_at, '+1 day'),
       (SELECT MIN(er.created_at) FROM experience_record er WHERE er.session_id = es.id),
       'experience-check-in:' || es.id
  FROM experience_session es
 WHERE es.status = 'ACTIVE';

INSERT OR IGNORE INTO notification(
    user_id, notification_type, experience_id, title, body,
    available_at, dedupe_key
)
SELECT es.user_id, 'EXPERIENCE_REVIEW_DUE', es.id,
       '7일 경험을 돌아볼 시간이에요',
       es.title || '에서 느낀 점을 남겨보세요.',
       es.review_due_at,
       'experience-review:' || es.id
  FROM experience_session es
 WHERE es.status = 'ACTIVE';

-- 데모 계정은 Figma의 읽음·안 읽음 혼합 상태를 실제 도메인 대상으로 보여준다.
INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, read_at, dedupe_key
) VALUES (
    1, 'PROFILE_READY', '첫 피부 프로필이 생성되었어요',
    '나의 자기보고 스킨케어 맥락을 확인해보세요.',
    datetime('now', '-23 day'), datetime('now', '-22 day'), 'demo-profile-ready'
);

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, read_at, dedupe_key
) VALUES (
    1, 'PROFILE_UPDATED', '스킨케어 프로필이 업데이트되었어요',
    '직접 수정한 내용이 다음 탐색 맥락에 반영됐어요.',
    datetime('now', '-3 day'), datetime('now', '-3 day'), 'demo-profile-updated'
);

INSERT OR IGNORE INTO notification(
    user_id, notification_type, pattern_id, title, body, available_at, dedupe_key
) VALUES (
    1, 'PATTERN_READY', 1, '새로운 취향 패턴을 발견했어요',
    '최근 기록을 바탕으로 근거와 반대 기록을 함께 연결했어요.',
    datetime('now', '-11 minute'), 'demo-pattern-ready:1'
);

INSERT OR IGNORE INTO notification(
    user_id, notification_type, pattern_id, title, body, available_at, read_at, dedupe_key
) VALUES (
    1, 'PATTERN_READY', 2, '나만의 스킨케어 맥락이 더 선명해졌어요',
    '최근 기록이 개인 패턴의 근거에 반영되었어요.',
    datetime('now', '-2 hour'), datetime('now', '-90 minute'), 'demo-pattern-ready:2'
);

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, dedupe_key
) VALUES (
    1, 'PRODUCT_DISCOVERY', '어떤 제품을 써볼지 고민되나요?',
    '확인된 제품 정보와 내 경험을 구분해서 탐색해보세요.',
    datetime('now', '-14 hour'), 'demo-product-discovery'
);

-- 기존 SQLite 파일을 삭제하지 않아도 모든 카탈로그 제품에 제품 안내가 생긴다.
-- 출처 없는 효능·적합성·성분은 추정하지 않고 category·등록 제형으로 제품의
-- 종류, 일반적인 사용 위치·방법, 구분 가능한 특징을 설명한다. 과거의 기록 유도형
-- 가이드는 origin과 관계없이 새 계약의 EDITORIAL fallback으로 한 번 갱신한다.
INSERT INTO product_catalog_content(
    product_id, summary, routine_step, usage_type,
    usage_timing_json, usage_tips_json, observation_points_json,
    origin, generated_at
)
SELECT
    p.id,
    CASE
        WHEN length(trim(COALESCE(p.description, ''))) > 0 THEN
            p.description || ' 제품이에요.'
        ELSE p.texture || ' 제형의 ' || COALESCE(NULLIF(p.category, ''), '스킨케어') || ' 제품이에요.'
    END,
    CASE
        WHEN p.category LIKE '클렌징%' OR p.category = '리무버' THEN '세안 단계'
        WHEN p.category IN ('필링', '스크럽') THEN '각질 정돈 단계'
        WHEN p.category IN ('토너', '스킨', '토너패드', '미스트') THEN '세안 후 첫 단계'
        WHEN p.category IN ('세럼', '앰플', '에센스', '부스터', '페이스오일', '스팟케어', '아이세럼') THEN '토너 다음 단계'
        WHEN p.category IN ('크림', '수분크림', '영양크림', '재생크림', '젤크림', '로션', '에멀전', '수딩젤', '젤', '올인원', '아이크림') THEN '보습 단계'
        WHEN p.category LIKE '선%' OR p.category = '선케어' THEN '아침 루틴 마지막 단계'
        WHEN p.category IN ('시트마스크', '슬리핑팩', '클레이팩', '워시오프팩', '모델링팩', '아이패치') THEN '집중 관리 단계'
        WHEN p.category IN ('트러블패치', '멀티밤') THEN '부분 관리 단계'
        WHEN p.category IN ('립밤', '립마스크') THEN '입술 관리 단계'
        ELSE '제품 표기 확인'
    END,
    CASE
        WHEN p.category LIKE '클렌징%' OR p.category IN ('리무버', '필링', '스크럽', '워시오프팩', '클레이팩', '모델링팩') THEN '사용 후 씻어내는 제품'
        WHEN p.category IN ('시트마스크', '아이패치', '트러블패치') THEN '붙여 사용하는 제품'
        WHEN p.category IN ('립밤', '립마스크') THEN '입술에 남겨두는 제품'
        ELSE '피부에 남겨두는 제품'
    END,
    CASE
        WHEN p.category LIKE '선%' OR p.category = '선케어' THEN '["아침", "외출 전"]'
        WHEN p.category IN ('시트마스크', '슬리핑팩', '클레이팩', '워시오프팩', '모델링팩', '필링', '스크럽') THEN '["저녁 또는 필요할 때"]'
        WHEN p.category IN ('트러블패치', '스팟케어', '멀티밤', '립밤', '립마스크') THEN '["필요할 때"]'
        ELSE '["아침 또는 저녁"]'
    END,
    CASE
        WHEN p.category LIKE '클렌징%' OR p.category = '리무버'
            THEN json_array('제품 라벨에 표시된 세안 방법과 사용량을 먼저 확인해요.', '라벨 안내에 따라 충분히 헹구거나 닦아낸 뒤 다음 단계로 넘어가요.')
        WHEN p.category IN ('토너', '스킨', '토너패드', '미스트')
            THEN json_array('세안 후 제품 형태에 맞춰 피부에 고르게 사용해요.', '정확한 사용량과 사용 횟수는 제품 라벨의 안내를 따라요.')
        WHEN p.category LIKE '선%' OR p.category = '선케어'
            THEN json_array('아침 스킨케어의 마지막 단계에 고르게 펴 발라요.', '사용량과 덧바르는 간격은 제품 라벨의 안내를 따라요.')
        WHEN p.category IN ('시트마스크', '아이패치', '트러블패치')
            THEN json_array('제품 라벨에 적힌 부위에 밀착해 사용해요.', '권장 사용 시간과 제거 방법은 제품 라벨의 안내를 따라요.')
        WHEN p.category = '슬리핑팩'
            THEN json_array('저녁 스킨케어의 마지막 단계에 고르게 펴 발라요.', '사용량과 다음 날 세안 방법은 제품 라벨의 안내를 따라요.')
        WHEN p.category IN ('클레이팩', '워시오프팩', '모델링팩', '필링', '스크럽')
            THEN json_array('제품 라벨에 적힌 사용 부위와 시간을 먼저 확인해요.', '안내된 시간이 지나면 제품 방식에 맞춰 제거하거나 씻어내요.')
        WHEN p.category IN ('립밤', '립마스크')
            THEN json_array('입술에 적당량을 고르게 발라요.', '사용 횟수와 제거 여부는 제품 라벨의 안내를 따라요.')
        WHEN p.category IN ('스팟케어', '멀티밤')
            THEN json_array('필요한 부위에 제품 라벨이 안내한 양만 사용해요.', '사용 횟수와 다른 단계와의 순서는 제품 라벨을 확인해요.')
        ELSE json_array('안내된 루틴 단계에 맞춰 적당량을 고르게 펴 발라요.', '정확한 사용량과 사용 빈도는 제품 라벨의 안내를 따라요.')
    END,
    CASE
        WHEN p.category LIKE '클렌징%' OR p.category = '리무버'
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', '사용 후 헹구거나 닦아내는 클렌징 계열이에요.'), json_object('title', '루틴 위치', 'detail', '토너와 보습 제품보다 먼저 사용해요.'))
        WHEN p.category IN ('토너', '스킨', '토너패드', '미스트')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', '세안 직후 사용하는 토너 계열이에요.'), json_object('title', '루틴 위치', 'detail', '세안 다음, 세럼이나 크림 전에 사용해요.'))
        WHEN p.category LIKE '선%' OR p.category = '선케어'
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', '아침에 사용하는 선케어 계열이에요.'), json_object('title', '루틴 위치', 'detail', '기초 스킨케어의 마지막, 메이크업 전에 사용해요.'))
        WHEN p.category IN ('시트마스크', '아이패치', '트러블패치')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '사용 형태', 'detail', '정해진 부위에 붙여 사용하는 제품이에요.'), json_object('title', '사용 기준', 'detail', '부착 위치와 시간은 제품 라벨을 우선해요.'))
        WHEN p.category IN ('슬리핑팩', '클레이팩', '워시오프팩', '모델링팩')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', '일상 루틴과 구분해 사용하는 팩 제품이에요.'), json_object('title', '사용 기준', 'detail', '도포량, 사용 시간, 제거 방법은 제품 라벨을 우선해요.'))
        WHEN p.category IN ('아이크림', '아이세럼')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '사용 부위', 'detail', '눈가에 사용하는 아이 케어 제품이에요.'), json_object('title', '사용 기준', 'detail', '사용량과 바르는 범위는 제품 라벨을 우선해요.'))
        WHEN p.category IN ('립밤', '립마스크')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '사용 부위', 'detail', '입술에 바르는 립 케어 제품이에요.'), json_object('title', '사용 형태', 'detail', '바른 뒤 입술에 남겨두는 유형이에요.'))
        WHEN p.category IN ('트러블패치', '스팟케어', '멀티밤')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '사용 부위', 'detail', '원하는 부위에 부분적으로 사용하는 제품이에요.'), json_object('title', '사용 기준', 'detail', '사용 범위와 횟수는 제품 라벨을 우선해요.'))
        WHEN p.category IN ('필링', '스크럽')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', '일반 루틴과 구분해 사용하는 각질 정돈 제품이에요.'), json_object('title', '사용 기준', 'detail', '사용 횟수와 시간은 제품 라벨을 우선해요.'))
        WHEN p.category IN ('세럼', '앰플', '에센스', '부스터', '페이스오일')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', p.category || ' 카테고리의 집중 케어 제품이에요.'), json_object('title', '루틴 위치', 'detail', '토너 다음, 크림이나 로션 전에 사용해요.'))
        WHEN p.category IN ('크림', '수분크림', '영양크림', '재생크림', '젤크림', '로션', '에멀전', '수딩젤', '젤', '올인원')
            THEN json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 유형', 'detail', p.category || ' 카테고리의 보습 단계 제품이에요.'), json_object('title', '루틴 위치', 'detail', '세럼이나 에센스 다음 단계에 사용해요.'))
        ELSE json_array(json_object('title', '제형', 'detail', p.texture || ' 타입이에요.'), json_object('title', '제품 종류', 'detail', COALESCE(NULLIF(p.category, ''), '스킨케어') || ' 카테고리 제품이에요.'), json_object('title', '사용 기준', 'detail', '구체적인 사용 순서와 횟수는 제품 라벨을 우선해요.'))
    END,
    'EDITORIAL',
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
FROM product p
WHERE TRUE
ON CONFLICT(product_id) DO UPDATE SET
    summary = excluded.summary,
    routine_step = excluded.routine_step,
    usage_type = excluded.usage_type,
    usage_timing_json = excluded.usage_timing_json,
    usage_tips_json = excluded.usage_tips_json,
    observation_points_json = excluded.observation_points_json,
    origin = excluded.origin,
    generated_at = excluded.generated_at
WHERE (
      product_catalog_content.summary LIKE '%기록%'
      OR product_catalog_content.summary LIKE '%비교%'
      OR product_catalog_content.summary LIKE '%느낌%'
      OR product_catalog_content.usage_tips_json LIKE '%기록%'
      OR product_catalog_content.usage_tips_json LIKE '%비교%'
      OR product_catalog_content.usage_tips_json LIKE '%느낌%'
      OR product_catalog_content.observation_points_json LIKE '%기록%'
      OR product_catalog_content.observation_points_json LIKE '%비교%'
      OR product_catalog_content.observation_points_json LIKE '%느낌%'
      OR EXISTS (
          SELECT 1
            FROM product identity_product
           WHERE identity_product.id = product_catalog_content.product_id
             AND product_catalog_content.summary LIKE identity_product.name || ':%'
      )
      OR NOT EXISTS (
          SELECT 1
            FROM json_each(product_catalog_content.observation_points_json) AS highlight
           WHERE json_extract(highlight.value, '$.title') = '제형'
      )
  );
