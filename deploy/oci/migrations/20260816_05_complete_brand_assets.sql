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

-- 데모 카탈로그의 임시 제조사명은 실제 패키지 워드마크와 제품명으로 교정한다.
UPDATE product SET brand = '루메네' WHERE id = 1 AND brand = '뉴트리랩';
UPDATE product SET brand = '비욘드' WHERE id = 2 AND brand = '바이옴';
UPDATE product SET brand = 'CNP' WHERE id = 3 AND brand = '더마리브';
UPDATE product SET brand = '앰플엔' WHERE id = 4 AND brand = '솔라핏';
UPDATE product SET brand = '더샘' WHERE id = 5 AND brand = '어퀴즈';
UPDATE product SET brand = '랩클' WHERE id = 6 AND brand = '뉴트리랩';
UPDATE product SET brand = '아이소브' WHERE id = 7 AND brand = '데이지코';
UPDATE product SET brand = '닥터블레딕' WHERE id = 8 AND brand = '더마리브';
UPDATE product SET brand = '어나더페이스' WHERE id = 9 AND brand = '오브리에';
UPDATE product SET brand = '에스쁘아' WHERE id = 10 AND brand = '솔라핏';
UPDATE product SET brand = '닥터더마퍼트' WHERE id = 11 AND brand = '더마리브';
UPDATE product SET brand = '아이오페' WHERE id = 749 AND brand = '라베이지';
UPDATE product SET brand = '닥터지' WHERE id = 756 AND brand = '케어존';
UPDATE product SET brand = '닥터멜락신' WHERE id = 765 AND brand = '닥터메디아';
UPDATE product SET brand = '리얼베리어' WHERE id = 776 AND brand = '크레이버';
UPDATE product SET brand = '닥터아토' WHERE id = 778 AND brand = '닥터스킨';
UPDATE product SET brand = '일리윤' WHERE id IN (946, 947) AND brand = '일리';
UPDATE product SET brand = '마데카21' WHERE id = 1878 AND brand = '클렌즈업';
UPDATE product SET brand = '닥터지' WHERE id = 1879 AND brand = '티엔지';
UPDATE product SET brand = '닥터자르트' WHERE id = 1880 AND brand = '닥터오트';
UPDATE product SET brand = '닥터아토' WHERE id = 1881 AND brand = '닥터오트';
UPDATE product SET brand = '메이크프렘' WHERE id = 1894 AND brand = '라이크바이';
UPDATE product SET brand = '메디플라워' WHERE id = 1902 AND brand = '클린잇제로';
UPDATE product SET brand = '바닐라코' WHERE id = 1903 AND brand = '클린잇제로';
UPDATE product SET brand = '아임미미' WHERE id = 1907 AND brand = '미미박스';
UPDATE product SET brand = '셀라피' WHERE id = 1909 AND brand = '애니레이';
