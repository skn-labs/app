CREATE TABLE IF NOT EXISTS brand_asset (
    brand TEXT PRIMARY KEY,
    logo_url TEXT NOT NULL CHECK (
        length(trim(logo_url)) > 0 AND logo_url GLOB '/manufacturer-logos/*'
    ),
    source_url TEXT,
    CHECK (source_url IS NULL OR source_url LIKE 'https://%')
);

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
ON CONFLICT(brand) DO UPDATE SET logo_url = excluded.logo_url, source_url = excluded.source_url;

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
ON CONFLICT(brand) DO UPDATE SET logo_url = excluded.logo_url, source_url = excluded.source_url;

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
ON CONFLICT(brand) DO UPDATE SET logo_url = excluded.logo_url, source_url = excluded.source_url;

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
ON CONFLICT(brand) DO UPDATE SET logo_url = excluded.logo_url, source_url = excluded.source_url;

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
