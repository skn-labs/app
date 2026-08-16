# -*- coding: utf-8 -*-
"""SKN 피치덱 — HTML/CSS + Chrome 렌더. Pretendard, 브랜드 자산·차트 base64 임베드."""
import base64, os

BASE="/private/tmp/claude-501/-Users-xhae000-orca-projects-central-hack/bb8256fd-8a12-465c-b443-4aa9d54c15c8/scratchpad"
CH=f"{BASE}/charts"; AS=f"{BASE}/assets"

def b64(path):
    with open(path,"rb") as f: return base64.b64encode(f.read()).decode()
def img(path):
    ext="png"; return f"data:image/{ext};base64,{b64(path)}"

ORB=img(f"{AS}/orb.png"); LOGO=img(f"{AS}/logo_ink.png"); LOGOP=img(f"{AS}/logo_paper.png")
C={n:img(f"{CH}/{n}.png") for n in ["problem","target","recall","intent","feature","market"]}

CSS=f"""
@font-face{{font-family:'P';src:local('Pretendard Thin');font-weight:100}}
@font-face{{font-family:'P';src:local('Pretendard ExtraLight');font-weight:200}}
@font-face{{font-family:'P';src:local('Pretendard Light');font-weight:300}}
@font-face{{font-family:'P';src:local('Pretendard Regular');font-weight:400}}
@font-face{{font-family:'P';src:local('Pretendard Medium');font-weight:500}}
@font-face{{font-family:'P';src:local('Pretendard SemiBold');font-weight:600}}
@font-face{{font-family:'P';src:local('Pretendard Bold');font-weight:700}}
@font-face{{font-family:'P';src:local('Pretendard ExtraBold');font-weight:800}}
@font-face{{font-family:'P';src:local('Pretendard Black');font-weight:900}}
@page{{size:1280px 720px;margin:0}}
*{{margin:0;padding:0;box-sizing:border-box}}
:root{{--paper:#F7F5F0;--panel:#EFEBE3;--ink:#1A1712;--sub:#6B6459;--faint:#A79E90;
--hair:#E4DED2;--accent:#4E5B43;--clay:#9A6A4B;--dark:#17140E;
--paperon:#EEE9DE;--subon:#9A9384;--hairon:#34302A;--sageon:#9CAB8C}}
html,body{{width:1280px}}
.slide{{width:1280px;height:720px;background:var(--paper);color:var(--ink);
font-family:'P';position:relative;overflow:hidden;page-break-after:always}}
.slide.dark{{background:var(--dark);color:var(--paperon)}}
.pad{{position:absolute;inset:0;padding:66px 76px}}
.eyebrow{{font-size:14px;font-weight:600;letter-spacing:.2em;color:var(--faint)}}
.eyebrow .n{{color:var(--accent);margin-right:14px}}
.dark .eyebrow{{color:var(--subon)}} .dark .eyebrow .n{{color:var(--sageon)}}
h1{{font-weight:300;letter-spacing:-.025em;line-height:1.16}}
.a{{color:var(--accent);font-weight:600}} .dark .a{{color:var(--sageon)}}
.hr{{height:1px;background:var(--hair);border:0}} .dark .hr{{background:var(--hairon)}}
.sub{{color:var(--sub)}} .faint{{color:var(--faint)}}
.foot{{position:absolute;left:76px;right:76px;bottom:30px;display:flex;justify-content:space-between;align-items:center}}
.foot img{{height:26px;opacity:.9}} .foot .pg{{font-size:14px;color:var(--faint);font-weight:500}}
.src{{position:absolute;left:150px;bottom:31px;font-size:12px;color:var(--faint)}}
.src b{{font-weight:600;margin-right:6px}}
.orb{{position:absolute;pointer-events:none}}
.tag{{font-size:13px;font-weight:600;letter-spacing:.16em;color:var(--faint)}}
"""

def foot(pg,dark=False):
    logo=LOGOP if dark else LOGO
    return f'<div class="foot"><img src="{logo}"><span class="pg">{pg:02d}</span></div>'
def eyebrow(n,label,dark=False):
    return f'<div class="eyebrow"><span class="n">{n}</span>{label}</div>'
def src(txt):
    return f'<div class="src"><b>출처</b>{txt}</div>'

SLIDES=[]
def S(html): SLIDES.append(f'<section class="slide">{html}</section>')
def SD(html): SLIDES.append(f'<section class="slide dark">{html}</section>')

# ---------- 01 TITLE ----------
S(f"""
<img class="orb" src="{ORB}" style="right:40px;top:150px;width:470px">
<div class="pad">
  <img src="{LOGO}" style="height:42px">
  <span class="tag" style="position:absolute;right:76px;top:74px">AI · WELLNESS</span>
  <h1 style="font-size:62px;margin-top:150px">써본 만큼,<br>나를 더 잘 알게 되는<br><span class="a" style="font-weight:500">스킨케어 경험 아카이브</span></h1>
  <p class="sub" style="font-size:19px;margin-top:44px;line-height:1.5">화장품을 지나가는 경험으로 두지 않습니다.<br><b style="color:var(--ink);font-weight:600">AI가 내 기록에서 반복된 기준을 찾아 다음 탐색에 돌려줍니다.</b></p>
  <hr class="hr" style="position:absolute;left:76px;right:76px;bottom:78px">
  <div style="position:absolute;left:76px;bottom:44px" class="tag">PERSONAL SKINCARE EXPERIENCE ARCHIVE</div>
  <div style="position:absolute;right:76px;bottom:44px;font-size:15px;color:var(--accent);font-weight:600">skn-labs.vercel.app</div>
</div>""")

# ---------- 02 PROBLEM ----------
S(f"""
<div class="pad">
  {eyebrow('01','PROBLEM ① 소비자')}
  <h1 style="font-size:42px;margin-top:34px">스킨케어 헤비유저는 계속 탐색하지만,<br>경험은 매번 <span class="a">흩어진다</span></h1>
  <div style="position:absolute;left:76px;top:330px;width:300px">
    <div style="font-size:82px;font-weight:200;line-height:1">9<span style="font-size:26px;font-weight:400" class="sub">개</span></div>
    <div class="sub" style="font-size:15px;margin-top:2px">평균 보유 스킨케어 제품</div>
    <div style="font-size:82px;font-weight:200;line-height:1;margin-top:34px;color:var(--clay)">4<span style="font-size:26px;font-weight:400" class="sub">개</span></div>
    <div class="sub" style="font-size:15px;margin-top:2px">다 쓰지 못하고 멈춘 제품</div>
  </div>
  <div style="position:absolute;left:420px;top:326px;bottom:120px;width:1px;background:var(--hair)"></div>
  <img src="{C['problem']}" style="position:absolute;left:470px;top:330px;width:660px">
  {src('SKN 예비 설문 n=214 · 20대 여성 · 2026.8 (수집 진행 중) · 값은 잠정')}
</div>
{foot(2)}""")

# ---------- 03 PROBLEM ② 브랜드 (문제의식에 함께) ----------
lim=[("제품 후기","편향·광고성이 섞여 신뢰할 수 없다"),
     ("설문 · FGI","사후 회상에 의존 · 느리고 비싸다"),
     ("서드파티 쿠키","프라이버시로 소멸하는 중")]
lim_html=""
for t,d in lim:
    lim_html+=f"""<div style="display:grid;grid-template-columns:150px 1fr;align-items:center;height:60px;border-bottom:1px solid var(--hair)">
      <div style="font-size:17px;font-weight:600">{t}</div>
      <div class="sub" style="font-size:15px"><span style="color:var(--clay);font-weight:600">✕</span> &nbsp;{d}</div></div>"""
S(f"""
<div class="pad">
  {eyebrow('02','PROBLEM ② 브랜드')}
  <h1 style="font-size:41px;margin-top:30px">같은 것이 반대편에서도 사라진다 —<br>브랜드도 <span class="a">진짜 사용 데이터가 없다</span></h1>
  <div style="position:absolute;left:76px;top:318px;width:350px">
    <div style="font-size:74px;font-weight:200;line-height:1">70–85<span style="font-size:24px;font-weight:400" class="sub">%</span></div>
    <div class="sub" style="font-size:15px;margin-top:2px">화장품 신제품이 24개월 내 실패</div>
    <div style="font-size:74px;font-weight:200;line-height:1;margin-top:26px;color:var(--clay)">67<span style="font-size:24px;font-weight:400" class="sub">%</span></div>
    <div class="sub" style="font-size:15px;margin-top:2px">뷰티 스타트업이 1년차에 실패</div>
  </div>
  <div style="position:absolute;left:470px;top:314px;height:262px;width:1px;background:var(--hair)"></div>
  <div style="position:absolute;left:520px;top:310px;right:76px">
    <div class="tag" style="font-size:12px">지금 브랜드가 의존하는 데이터의 한계</div>
    <div style="margin-top:12px;border-top:2px solid var(--ink)">{lim_html}</div>
    <div style="margin-top:22px;font-size:18px;line-height:1.55"><b style="font-weight:600">소비자가 잊는 바로 그것 — ‘실제로 어떻게 썼고, 뭘 느꼈는가’ —</b> <span class="sub">를 브랜드도 갖지 못한다.</span></div>
  </div>
  {src('신제품 실패율 Highlight · MIT Professional Education · 뷰티 스타트업 67% Genie · 업계 추정 범위')}
</div>
{foot(3)}""")

# ---------- 04 WHO ----------
beh=[("반복 탐색","새 제품을 반복해서 찾고 산다"),("비교 사용","같은 카테고리를 여러 개 비교해 쓴다"),
     ("조건에 민감","제형·마무리·계절·시간대의 차이를 본다"),("경험 재사용","과거 경험을 다음 선택에 쓰고 싶지만 흩어져 있다")]
beh_html=""
for i,(t,d) in enumerate(beh):
    beh_html+=f"""<div style="display:grid;grid-template-columns:58px 190px 1fr;align-items:center;height:70px;border-bottom:1px solid var(--hair)">
      <div style="font-size:20px;font-weight:300;color:var(--accent)">0{i+1}</div>
      <div style="font-size:18px;font-weight:600">{t}</div>
      <div class="sub" style="font-size:15px">{d}</div></div>"""
S(f"""
<div class="pad">
  {eyebrow('03','WHO')}
  <h1 style="font-size:37px;margin-top:32px">‘스킨케어 헤비유저’는 사용량이 아니라<br><span class="a">탐색</span>으로 정의됩니다</h1>
  <div style="position:absolute;left:76px;top:300px;width:700px;border-top:2px solid var(--ink)">{beh_html}</div>
  <img src="{C['target']}" style="position:absolute;right:150px;top:300px;width:270px">
  <div style="position:absolute;right:76px;top:600px;width:420px;text-align:center;font-size:16px" class="sub">20대 여성 중 <b style="color:var(--ink);font-weight:600">지속 탐색·구매형</b></div>
  {src('SKN 예비 설문 n=214 (수집 진행 중) · 값은 잠정')}
</div>
{foot(4)}""")

# ---------- 05 VALIDATION ----------
S(f"""
<div class="pad">
  {eyebrow('04','VALIDATION')}
  <h1 style="font-size:38px;margin-top:30px">예비 설문이 확인해준 것 — <span class="a">문제도, 수요도 실재합니다</span></h1>
  <div style="position:absolute;left:76px;top:250px;width:330px">
    <div class="tag" style="font-size:13px">문제는 실재한다</div>
    <img src="{C['recall']}" style="width:250px;margin:14px 0 0 14px">
    <div class="sub" style="font-size:15px;margin-top:8px">과거 경험을 기억·흩어진 메모로만 관리</div>
  </div>
  <div style="position:absolute;left:445px;top:250px;bottom:120px;width:1px;background:var(--hair)"></div>
  <div style="position:absolute;left:490px;top:250px;right:76px">
    <div class="tag" style="font-size:13px">수요도 실재한다</div>
    <div style="display:flex;align-items:flex-start;gap:24px;margin-top:10px">
      <img src="{C['intent']}" style="width:360px">
      <div style="flex:1">
        <div class="tag" style="font-size:12px;margin-bottom:8px">가장 원하는 기능</div>
        <img src="{C['feature']}" style="width:290px">
      </div>
    </div>
  </div>
  {src('SKN 예비 설문 n=214 · 20대 여성 · 2026.8 (수집 진행 중) · 값은 잠정')}
</div>
{foot(5)}""")

# ---------- 06 APPROACH ----------
steps=[("01","DISCOVER","탐색","내 경험 기준으로<br>후보를 본다"),
       ("02","EXPERIENCE","사용","실제 조합·순서로<br>제품을 쓴다"),
       ("03","RECORD","기록","느낌을 내 말로<br>남긴다"),
       ("04","CONNECT","연결","AI가 과거 기록과<br>근거로 잇는다"),
       ("05","PATTERN","기준 발견","반복된 경험이<br>내 기준이 된다")]
step_html=""
for i,(num,en,ko,d) in enumerate(steps):
    ac=(i==4); col="var(--accent)" if ac else "var(--faint)"
    dotc="var(--accent)" if ac else "var(--ink)"
    step_html+=f"""<div style="flex:1;text-align:center;position:relative">
      <div style="font-size:18px;font-weight:300;color:{col}">{num}</div>
      <div style="font-size:20px;font-weight:600;margin:6px 0 0">{ko}</div>
      <div style="width:11px;height:11px;border-radius:50%;background:{dotc};margin:20px auto 0"></div>
      <div style="font-size:11px;letter-spacing:.12em;color:{col};font-weight:500;margin-top:16px">{en}</div>
      <div class="sub" style="font-size:13px;margin-top:8px;line-height:1.4">{d}</div></div>"""
S(f"""
<div class="pad">
  {eyebrow('05','APPROACH')}
  <h1 style="font-size:38px;margin-top:32px">쓴 경험을 제품·루틴에 연결하고,<br>AI가 반복된 기준을 찾아 <span class="a">다음 탐색에 되돌려줍니다</span></h1>
  <div style="position:absolute;left:76px;right:76px;top:400px;height:1px;background:var(--hair)"></div>
  <div style="position:absolute;left:76px;right:76px;top:305px;display:flex">{step_html}</div>
  <div style="position:absolute;left:76px;right:76px;top:560px;text-align:center;font-size:15px;color:var(--accent);font-weight:500">↺ &nbsp;발견한 기준은 다시 DISCOVER로 — 탐색할수록 정교해집니다</div>
</div>
{foot(6)}""")

# ---------- 07-09 FEATURES ----------
def feature(pg,n,sec,title,pts,label,sub2):
    p_html=""
    for h,d in pts:
        p_html+=f"""<div style="padding:18px 0;border-bottom:1px solid var(--hair)">
          <div style="font-size:19px;font-weight:600">{h}</div>
          <div class="sub" style="font-size:15px;margin-top:6px;line-height:1.45">{d}</div></div>"""
    S(f"""
    <div class="pad">
      {eyebrow(n,sec)}
      <h1 style="font-size:38px;margin-top:30px;width:640px">{title}</h1>
      <div style="position:absolute;left:76px;top:270px;width:620px;border-top:2px solid var(--ink)">{p_html}</div>
      <div style="position:absolute;right:150px;top:70px;width:250px;height:520px;background:var(--panel);border:1px solid var(--hair);border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px">
        <div style="width:66px;height:5px;border-radius:3px;background:var(--hair);position:absolute;top:26px"></div>
        <div class="tag" style="font-size:11px">화면</div>
        <div style="font-size:17px;font-weight:600;margin-top:10px">{label}</div>
        <div class="faint" style="font-size:13px;margin-top:6px">{sub2}</div>
      </div>
    </div>
    {foot(pg)}""")

feature(7,'06','RECORD','매일 쓰라고 하지 않습니다.<br>7일에 한 번, <span class="a">내 말로.</span>',
    [("실제 사용 조합을 그대로 보존","제품·아침/저녁·순서·빈도를 남겨 경험이 생긴 조건을 잃지 않습니다."),
     ("고르고, 내 말로 남기고","‘마음에 들어요·아쉬워요·아직 모르겠어요’ + 자유 원문."),
     ("‘아직 모르겠어요’도 유효한 기록","결론을 강요하지 않아 부담 없이 일상에서 이어집니다.")],
    "홈 · 7일 연구 카드","느낌 남기기 · DAY n/7")
feature(8,'07','EVIDENCE','AI 문장의 새로움이 아니라,<br>내 기록이 <span class="a">근거</span>가 됩니다',
    [("지지 근거와 반대 기록을 함께","‘같은 방향 3건 · 다른 기록 1건’처럼 원문을 인용해 보여줍니다."),
     ("환각이 아닌, 검증된 데이터만","서버가 소유권·제품 사실·출력 스키마를 검증한 내 기록만."),
     ("원문은 동의 없이 밖으로 안 나감","자유 메모는 요청하지 않으면 AI 공급자에게 보내지 않습니다.")],
    "AI 채팅 · 근거 인용","‘이 답변에 쓴 근거’ 패널")
feature(9,'08','YOUR MAP','쓸수록 <span class="a">나만의 경험 지도</span>가<br>자라납니다',
    [("반복된 경험만 패턴으로","‘최근 기록을 비교해, 반복된 경험만 연결’ — 흐름만 보여줍니다."),
     ("여섯 축은 내 기록으로 동적 생성","길이는 좋고 나쁨이 아니라 연결된 ‘근거량’을 나타냅니다."),
     ("쌓일수록 대체 어려운 개인 자산","발견한 기준은 다음 제품 탐색과 AI 답변에 다시 쓰입니다.")],
    "홈 · 육각 경험 지도","PROFILE · INSIGHT")

# ---------- 10 DAILY LIFE ----------
flow=[("오늘 쓴 느낌","부담 없이 한 줄, 내 말로"),("반복 패턴","AI가 비슷한 경험을 연결"),("다음 탐색에 재등장","제품을 고를 때 내 기준이 먼저")]
flow_html=""
for i,(t,d) in enumerate(flow):
    arrow='<div style="position:absolute;right:-14px;top:20px;font-size:22px;color:var(--faint)">→</div>' if i<2 else ''
    bl="border-left:1px solid var(--hair);padding-left:34px" if i else ""
    flow_html+=f"""<div style="flex:1;position:relative;{bl}">
      <div style="font-size:26px;font-weight:300;color:var(--accent)">0{i+1}</div>
      <div style="font-size:21px;font-weight:600;margin-top:16px">{t}</div>
      <div class="sub" style="font-size:15px;margin-top:8px">{d}</div>{arrow}</div>"""
S(f"""
<div class="pad">
  {eyebrow('09','DAILY LIFE')}
  <h1 style="font-size:42px;margin-top:32px">탐색을 고치지 않고, <span class="a">탐색을 자산으로</span></h1>
  <div style="position:absolute;left:76px;right:76px;top:290px;border-top:2px solid var(--ink);padding-top:36px;display:flex;gap:34px">{flow_html}</div>
  <div style="position:absolute;left:76px;right:76px;top:520px;background:var(--panel);border-radius:20px;padding:30px 34px;font-size:18px;line-height:1.55">
    <b style="font-weight:600">‘써보고 싶다’는 습관을 고치려 하지 않습니다.</b> <span class="sub">그 습관에서 나온 경험이 사라지지 않게 붙잡아, 다음 선택을 더 쉽게 만드는 것 — 그것이 SKN이 일상에 들어가는 방식입니다.</span></div>
</div>
{foot(10)}""")

# ---------- 11 THE MOAT (양면 해자 · dark) ----------
mp=[("제로파티 데이터","사용자가 자기 이익을 위해 자발적으로 남긴 기록. 추적·쿠키가 아니다."),
    ("신뢰가 곧 공급","개인 식별 원본은 팔지 않는다. 동의·집계·익명 데이터만."),
    ("양면 플라이휠","사용자가 늘수록 데이터가 깊어지고, 데이터가 제품을 낫게 해 사용자가 는다.")]
mp_html=""
for i,(t,d) in enumerate(mp):
    bl="border-left:1px solid var(--hairon);padding-left:26px" if i else ""
    mp_html+=f"""<div style="flex:1;{bl}">
      <div><span style="color:var(--sageon);font-weight:300;font-size:15px">0{i+1}</span> &nbsp;<span style="font-size:18px;font-weight:600">{t}</span></div>
      <div style="color:var(--subon);font-size:13.5px;margin-top:10px;line-height:1.5">{d}</div></div>"""
def node(title,sub,accent=False):
    bg="var(--accent)" if accent else "#211E17"
    bd="none" if accent else "1px solid var(--hairon)"
    tc="var(--paperon)" if accent else "var(--paperon)"
    sc="#DCE1D3" if accent else "var(--subon)"
    return f"""<div style="flex:1;background:{bg};border:{bd};border-radius:18px;padding:22px 20px;min-height:128px">
      <div style="font-size:18px;font-weight:700;color:{tc}">{title}</div>
      <div style="font-size:13px;color:{sc};margin-top:10px;line-height:1.5">{sub}</div></div>"""
arrow='<div style="width:54px;text-align:center;color:var(--sageon);font-size:26px;flex:none">→</div>'
SD(f"""
<div class="pad">
  {eyebrow('10','THE MOAT',True)}
  <h1 style="font-size:38px;margin-top:24px;font-weight:300">하나의 경험 아카이브가, <span class="a">두 문제를 동시에 푼다</span></h1>
  <div style="position:absolute;left:76px;right:76px;top:220px;display:flex;align-items:center">
    {node("소비자","흩어진 경험을 회수해<br>다음 선택에 다시 쓴다")}
    {arrow}
    {node("SKN","자발적 기록 · 동의<br>집계 · 익명화",True)}
    {arrow}
    {node("브랜드","어디서도 못 구하는<br>제로파티 실사용 데이터")}
  </div>
  <div style="position:absolute;left:76px;right:76px;top:420px;height:1px;background:var(--hairon)"></div>
  <div style="position:absolute;left:76px;right:76px;top:452px;display:flex;gap:26px">{mp_html}</div>
</div>
{foot(11,True)}""")

# ---------- 13 TRACTION ----------
pts=[("풀스택으로 배포 완료","React 프론트 · 서버 · SQLite. 브라우저에서 바로 체험."),
     ("개인 기록 무결성·소유권 보장","사용자·제품·루틴·경험·패턴의 불변식을 서버가 검증."),
     ("AI 근거 참조를 서버가 검증","AI 출력이 실제 개인 기록·제품 근거만 참조하도록 스키마 검증."),
     ("P0 경험 순환이 한 번 닫힘","탐색→기록→패턴→재사용→Rescue까지 실제 흐름으로 연결.")]
pts_html=""
for i,(h,d) in enumerate(pts):
    pts_html+=f"""<div style="display:grid;grid-template-columns:52px 1fr;padding:15px 0;border-bottom:1px solid var(--hair)">
      <div style="font-size:16px;font-weight:300;color:var(--accent)">0{i+1}</div>
      <div><div style="font-size:18px;font-weight:600">{h}</div><div class="sub" style="font-size:14px;margin-top:4px">{d}</div></div></div>"""
S(f"""
<div class="pad">
  {eyebrow('11','TRACTION')}
  <h1 style="font-size:42px;margin-top:32px">지금, <span class="a">실제로 작동합니다</span></h1>
  <div style="position:absolute;left:76px;top:250px;width:620px;border-top:2px solid var(--ink)">{pts_html}</div>
  <div style="position:absolute;left:740px;top:250px;bottom:110px;width:1px;background:var(--hair)"></div>
  <div style="position:absolute;left:790px;top:250px;right:76px;text-align:center">
    <div class="tag" style="font-size:13px;color:var(--accent);text-align:left">LIVE</div>
    <div style="width:170px;height:250px;margin:22px auto 0;background:var(--panel);border:1px solid var(--hair);border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div class="tag" style="font-size:10px">화면</div>
      <div style="font-size:15px;font-weight:600;margin-top:8px">데모 QR</div></div>
    <div style="font-size:18px;font-weight:600;margin-top:22px">skn-labs.vercel.app</div>
    <div class="sub" style="font-size:13px;margin-top:6px">테스트 계정 20개로 즉시 체험</div>
  </div>
</div>
{foot(12)}""")

# ---------- 14 MARKET (양면 시장) ----------
S(f"""
<div class="pad">
  {eyebrow('12','MARKET')}
  <h1 style="font-size:42px;margin-top:30px">SKN은 <span class="a">양면 시장의 교차점</span>에 선다</h1>
  <div style="position:absolute;left:76px;top:270px;width:490px">
    <div class="tag" style="font-size:12px">① 소비자 · 스킨케어</div>
    <div style="font-size:72px;font-weight:200;line-height:1.05;margin-top:14px">11.2<span style="font-size:28px;font-weight:400" class="sub">조 원</span></div>
    <div class="sub" style="font-size:15px;margin-top:8px;line-height:1.5">국내 스킨케어 시장 (화장품 24조의 46.8%)<br>연 5.4% 성장 · 2030 여성이 초기 진입점</div>
  </div>
  <div style="position:absolute;left:640px;top:262px;height:300px;width:1px;background:var(--hair)"></div>
  <div style="position:absolute;left:700px;top:270px;right:76px">
    <div class="tag" style="font-size:12px;color:var(--accent)">② 브랜드 · 제로파티 데이터</div>
    <div style="font-size:72px;font-weight:200;line-height:1.05;margin-top:14px;color:var(--accent)">$48.6<span style="font-size:28px;font-weight:400;color:var(--sub)">B</span></div>
    <div class="sub" style="font-size:15px;margin-top:8px;line-height:1.5">개인화 뷰티 시장(2025) → <b style="color:var(--ink);font-weight:600">$97.1B(2030)</b><br>연 14.8% 성장 · SKN이 공급하는 인사이트의 시장</div>
  </div>
  <div style="position:absolute;left:76px;right:76px;top:600px;text-align:center;font-size:17px;color:var(--ink)">
    소비자에게서 <b style="font-weight:600">데이터를 만들어</b> 브랜드에 판다 — <span class="a" style="font-weight:600">양쪽이 서로를 키운다.</span></div>
  {src('Expert Market Research 한국 화장품 시장 2025 · Personalized Beauty(Next-gen) 시장 2025–2030 · SKN 추정')}
</div>
{foot(13)}""")

# ---------- 13 BUSINESS MODEL · 수익 엔진 (flywheel) ----------
import math
Cx,Cy,Rr=240,240,140
def _pol(r,deg):
    a=math.radians(deg); return Cx+r*math.cos(a), Cy+r*math.sin(a)
heads=""
for th in (-45,45,135,225):
    a=math.radians(th); px,py=Cx+Rr*math.cos(a),Cy+Rr*math.sin(a)
    tx,ty=-math.sin(a),math.cos(a); bx,by=math.cos(a),math.sin(a)
    ax,ay=px+tx*11,py+ty*11; p1=(px-tx*5+bx*7,py-ty*5+by*7); p2=(px-tx*5-bx*7,py-ty*5-by*7)
    heads+=f'<polygon points="{ax:.1f},{ay:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="#4E5B43"/>'
fnodes=[(-90,"1","사용자 증가",240,58,"middle"),
        (0,"2","제로파티|데이터 심화",408,234,"start"),
        (90,"3","제품·AI·|인사이트 강화",240,414,"middle"),
        (180,"4","B2C 리텐션|B2B 매출 ↑",72,234,"end")]
node_svg=""
for deg,num,lab,lx,ly,anch in fnodes:
    nx,ny=_pol(Rr,deg)
    node_svg+=f'<circle cx="{nx:.0f}" cy="{ny:.0f}" r="19" fill="#4E5B43"/><text x="{nx:.0f}" y="{ny+6:.0f}" text-anchor="middle" font-family="P" font-weight="700" font-size="17" fill="#F7F5F0">{num}</text>'
    for i,ln in enumerate(lab.split("|")):
        node_svg+=f'<text x="{lx}" y="{ly+i*20}" text-anchor="{anch}" font-family="P" font-weight="600" font-size="15" fill="#1A1712">{ln}</text>'
fly_svg=('<svg viewBox="0 0 480 480" width="470" height="470">'
    '<circle cx="240" cy="240" r="140" fill="none" stroke="#C9C1B2" stroke-width="2"/>'
    +heads+node_svg+
    '<circle cx="240" cy="240" r="64" fill="#F1EDE5" stroke="#E4DED2" stroke-width="1"/>'
    '<text x="240" y="233" text-anchor="middle" font-family="P" font-weight="800" font-size="23" fill="#1A1712">SKN</text>'
    '<text x="240" y="257" text-anchor="middle" font-family="P" font-weight="500" font-size="13" fill="#6B6459">수익 엔진</text></svg>')
srows=[("1","B2C 구독","₩3,900/월 · 무료→유료 전환 8%",False),
       ("2","제로파티 데이터 · B2B","브랜드 계약 ₩50M+/년 · 고마진",True),
       ("3","큐레이션 커머스","투명 제휴 · 결과 순위 비영향",False)]
st=""
for n,t,v,hl in srows:
    if hl:
        st+=f'''<div style="display:flex;align-items:center;gap:16px;padding:15px 16px 15px 13px;border-left:3px solid var(--accent);background:#EDF0E8;border-radius:0 12px 12px 0;margin:3px 0">
          <div style="font-size:24px;font-weight:200;color:var(--accent);width:22px">{n}</div>
          <div style="flex:1"><div style="font-size:18px;font-weight:700">★ {t}</div><div class="sub" style="font-size:14px;margin-top:2px">{v}</div></div></div>'''
    else:
        st+=f'''<div style="display:flex;align-items:center;gap:16px;padding:15px 13px;border-bottom:1px solid var(--hair)">
          <div style="font-size:24px;font-weight:200;color:var(--faint);width:22px">{n}</div>
          <div style="flex:1"><div style="font-size:18px;font-weight:600">{t}</div><div class="sub" style="font-size:14px;margin-top:2px">{v}</div></div></div>'''
S(f"""
<div class="pad">
  {eyebrow('13','BUSINESS MODEL')}
  <h1 style="font-size:37px;margin-top:24px">데이터가 데이터를 부르는 <span class="a">수익 엔진</span></h1>
  <div style="position:absolute;left:34px;top:158px">{fly_svg}</div>
  <div style="position:absolute;left:600px;top:180px;right:76px">
    <div class="tag" style="font-size:12px">수익원 — 하나의 데이터가 세 갈래로</div>
    <div style="margin-top:12px;border-top:2px solid var(--ink)">{st}</div>
    <div style="margin-top:26px">
      <div class="tag" style="font-size:12px;color:var(--accent)">왜 방어되는가</div>
      <div style="font-size:15.5px;margin-top:10px;line-height:1.6"><b style="font-weight:600">데이터 해자</b> — 경험이 쌓일수록 이탈 비용↑·대체 불가. <b style="font-weight:600">양면 강화</b> — 같은 데이터가 B2C 리텐션과 B2B 가치를 <span class="a" style="font-weight:600">동시에</span> 키운다.</div>
    </div>
  </div>
  <div style="position:absolute;left:600px;right:76px;bottom:44px;font-size:12px;color:var(--faint)">신뢰 원칙 · 개인 식별 원본은 동의 없이 제공하지 않으며, 집계·익명 데이터만 활용합니다.</div>
</div>
{foot(14)}""")

# ---------- 14 UNIT ECONOMICS · 하키스틱 궤적 ----------
traj=[("Y1",3,0),("Y2",8,6),("Y3",14,24),("Y4",22,50),("Y5",30,100)]
maxv=130.0; Hb=300.0; sc=Hb/maxv
bars=""
for yr,b2c,b2b in traj:
    tot=b2c+b2b
    bars+=f'''<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">
      <div style="font-size:15px;font-weight:700;margin-bottom:7px">₩{tot}억</div>
      <div style="width:48px;height:{b2b*sc:.0f}px;background:#4E5B43;border-radius:5px 5px 0 0"></div>
      <div style="width:48px;height:{b2c*sc:.0f}px;background:#8B9B7B"></div></div>'''
yrlabels="".join(f'<div style="flex:1;text-align:center" class="sub"><span style="font-size:14px">{yr}</span></div>' for yr,_,_ in traj)
metrics=[("LTV : CAC","5 : 1","반복 방문·데이터 리텐션 기반"),
         ("CAC 회수","< 6개월","콘텐츠·커뮤니티·바이럴 획득"),
         ("Y3 ARR","₩38억","B2C + B2B 합산"),
         ("B2B 매출 비중","60%+","Y3 · 고마진 데이터 매출")]
mg=""
for t,v,d in metrics:
    mg+=f'''<div>
      <div class="tag" style="font-size:11px">{t}</div>
      <div style="font-size:44px;font-weight:200;letter-spacing:-.01em;margin-top:4px;line-height:1.1">{v}</div>
      <div class="sub" style="font-size:12.5px;margin-top:2px">{d}</div></div>'''
S(f"""
<div class="pad">
  {eyebrow('14','UNIT ECONOMICS')}
  <h1 style="font-size:37px;margin-top:24px">쓸수록 유리해지는 <span class="a">유닛 이코노믹스</span></h1>
  <div style="position:absolute;left:76px;top:200px;width:520px">
    <div class="tag" style="font-size:12px">연 매출(ARR) 궤적 — <span style="color:var(--accent)">B2B가 성장을 끈다</span></div>
    <div style="display:flex;align-items:flex-end;gap:18px;height:330px;margin-top:18px;border-bottom:1.5px solid var(--ink);padding-bottom:0">{bars}</div>
    <div style="display:flex;gap:18px;margin-top:9px">{yrlabels}</div>
    <div style="margin-top:16px;display:flex;gap:22px;font-size:12.5px" class="sub">
      <span><span style="display:inline-block;width:12px;height:12px;background:#8B9B7B;border-radius:2px;margin-right:6px;vertical-align:middle"></span>B2C 구독</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#4E5B43;border-radius:2px;margin-right:6px;vertical-align:middle"></span>제로파티 데이터 B2B</span>
    </div>
  </div>
  <div style="position:absolute;left:665px;top:206px;right:76px;display:grid;grid-template-columns:1fr 1fr;gap:26px 30px">{mg}</div>
  <div style="position:absolute;left:665px;bottom:44px;right:76px;font-size:12px;color:var(--faint)">수치는 목표 가정(잠정) · 구독 ₩3,900/월 · 전환 8% · 브랜드 계약 ₩50M+/년 기준</div>
</div>
{foot(15)}""")

# ---------- 15 CLOSING (dark) ----------
SD(f"""
<img class="orb" src="{ORB}" style="right:60px;top:150px;width:430px;opacity:.9">
<div class="pad">
  <img src="{LOGOP}" style="height:38px">
  <h1 style="font-size:58px;margin-top:170px;font-weight:300">결국 남아야 할 것은,<br><span class="a" style="font-weight:500">사용자의 피부와 경험.</span></h1>
  <p style="color:var(--subon);font-size:18px;margin-top:40px">써본 만큼 나를 더 잘 알게 되는 스킨케어 경험 아카이브.</p>
  <hr class="hr" style="position:absolute;left:76px;right:76px;bottom:78px">
  <div style="position:absolute;left:76px;bottom:44px;font-size:15px;color:var(--sageon);font-weight:600">skn-labs.vercel.app</div>
  <div style="position:absolute;right:76px;bottom:44px" class="tag">AI · WELLNESS</div>
</div>""")

HTML=f"<!doctype html><html lang='ko'><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(SLIDES)}</body></html>"
open(f"{BASE}/deck.html","w").write(HTML)
print("wrote deck.html · slides:",len(SLIDES))
