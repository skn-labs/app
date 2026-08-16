# -*- coding: utf-8 -*-
"""브랜드 톤 차트. 설문 수치는 임시(유리) — SURVEY에서 일괄 교체.
   Pretendard를 FontProperties(파일 직접 지정)로 써서 한글 깨짐 방지."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Wedge, Circle
import numpy as np, os

OUT = "/private/tmp/claude-501/-Users-xhae000-orca-projects-central-hack/bb8256fd-8a12-465c-b443-4aa9d54c15c8/scratchpad/charts"
os.makedirs(OUT, exist_ok=True)
FD = os.path.expanduser("~/Library/Fonts")
def P(w): return fm.FontProperties(fname=os.path.join(FD, f"Pretendard-{w}.otf"))
REG,MED,SB,BD,LT,XB = P("Regular"),P("Medium"),P("SemiBold"),P("Bold"),P("Light"),P("ExtraBold")
plt.rcParams["axes.unicode_minus"]=False

INK="#1A1712"; SUB="#6B6459"; FAINT="#B4AC9E"; SAGE="#4E5B43"; SAGE2="#8B9B7B"; SAGE3="#C4CEB6"
WARM="#D8D1C2"; WARM2="#E7E1D5"; PAPER="#FAF8F3"; CLAY="#9A6A4B"

SURVEY = dict(
    target_share=72, own_avg=9, stopped_avg=4, switch_often=64,
    hard_recall=78, affects_choice=71, skn_helpful=83, use_intent=76, n=214,
    past_method=[("기억에만 의존",46),("흩어진 메모·사진",34),("별도 관리 앱",12),("찾지 못함",8)],
    top_feature=[("경험 기록·연결",38),("반복 패턴 발견",29),("AI 제품 비교",22),("불편 케어",11)],
)

def save(fig, name):
    fig.savefig(f"{OUT}/{name}.png", dpi=200, transparent=True, bbox_inches="tight", pad_inches=0.06)
    plt.close(fig); print("chart", name)

def donut(ax, pct, color=SAGE, track=WARM, label="", lw=0.26):
    ax.set_aspect("equal"); ax.axis("off"); ax.set_xlim(-1.32,1.32); ax.set_ylim(-1.62,1.28)
    ax.add_patch(Wedge((0,0), 1.0, 90-360*pct/100, 90, width=lw, facecolor=color, edgecolor="none"))
    ax.add_patch(Wedge((0,0), 1.0, 90, 90-360*pct/100, width=lw, facecolor=track, edgecolor="none"))
    ax.text(0, 0.0, f"{pct}%", ha="center", va="center", fontsize=46, color=INK, fontproperties=XB)
    if label: ax.text(0, -1.34, label, ha="center", va="center", fontsize=14, color=SUB, fontproperties=MED)

# 1) 타깃 도넛 (라벨은 덱에서)
fig,ax=plt.subplots(figsize=(3.4,3.4)); donut(ax, SURVEY["target_share"], SAGE, WARM, "")
save(fig,"target")

# 2) 문제 근거 — 수평 바
fig,ax=plt.subplots(figsize=(6.6,3.0))
items=[("과거 경험을 다시 찾기 어려웠다", SURVEY["hard_recall"], SAGE),
       ("그 불편이 제품 선택에 영향을 준다", SURVEY["affects_choice"], SAGE),
       ("제품·조합을 자주 바꾼다", SURVEY["switch_often"], SAGE2)]
y=np.arange(len(items))[::-1]
for yi,(l,v,c) in zip(y,items):
    ax.barh(yi, 100, color=WARM2, height=0.42, zorder=1)
    ax.barh(yi, v, color=c, height=0.42, zorder=2)
    ax.text(0, yi+0.42, l, ha="left", va="bottom", fontsize=14, color=INK, fontproperties=MED)
    ax.text(v-1.5, yi, f"{v}%", ha="right", va="center", fontsize=15, color="white", fontproperties=SB)
ax.set_xlim(0,101); ax.set_ylim(-0.5,len(items)-0.05); ax.axis("off")
save(fig,"problem")

# 3) 과거 경험 관리 방식 — 도넛
fig,ax=plt.subplots(figsize=(3.5,3.4)); ax.set_aspect("equal"); ax.axis("off")
ax.set_xlim(-1.35,1.35); ax.set_ylim(-1.4,1.35)
pm=SURVEY["past_method"]; cols=[SAGE,SAGE2,SAGE3,WARM]; start=90
for (lab,val),c in zip(pm,cols):
    ang=360*val/100
    ax.add_patch(Wedge((0,0),1.0,start-ang,start,width=0.30,facecolor=c,edgecolor=PAPER,lw=2)); start-=ang
ax.text(0,0.12,"88%",ha="center",va="center",fontsize=42,color=INK,fontproperties=XB)
ax.text(0,-0.34,"정형 관리 없음",ha="center",va="center",fontsize=13,color=SUB,fontproperties=MED)
save(fig,"recall")

# 3b) recall 범례
fig,ax=plt.subplots(figsize=(3.0,2.3)); ax.axis("off"); ax.set_xlim(0,1); ax.set_ylim(0,1)
for i,((lab,val),c) in enumerate(zip(pm,cols)):
    yy=0.86-i*0.25
    ax.add_patch(plt.Rectangle((0.02,yy-0.035),0.055,0.1,color=c))
    ax.text(0.14,yy,lab,ha="left",va="center",fontsize=12.5,color=INK,fontproperties=MED)
    ax.text(0.99,yy,f"{val}%",ha="right",va="center",fontsize=12.5,color=SUB,fontproperties=SB)
save(fig,"recall_legend")

# 4) 검증 — 두 도넛
fig,axs=plt.subplots(1,2,figsize=(6.6,3.3))
donut(axs[0], SURVEY["skn_helpful"], SAGE, WARM, "SKN이 도움될 것")
donut(axs[1], SURVEY["use_intent"], CLAY, WARM, "사용 의향 있다")
save(fig,"intent")

# 5) 가장 원하는 기능
fig,ax=plt.subplots(figsize=(6.2,2.8))
tf=SURVEY["top_feature"]; y=np.arange(len(tf))[::-1]; cc=[SAGE,SAGE2,SAGE3,WARM]
for yi,(l,v),c in zip(y,tf,cc):
    ax.barh(yi, v, color=c, height=0.58)
    ax.text(0.6, yi, l, ha="left", va="center", fontsize=12.5, color=INK if c!=SAGE else "white", fontproperties=MED)
    ax.text(v+0.7, yi, f"{v}%", ha="left", va="center", fontsize=12.5, color=SUB, fontproperties=SB)
ax.set_xlim(0,46); ax.axis("off")
save(fig,"feature")

# 6) TAM/SAM/SOM
fig,ax=plt.subplots(figsize=(4.3,4.3)); ax.set_aspect("equal"); ax.axis("off")
ax.set_xlim(-1.12,1.12); ax.set_ylim(-1.12,1.12)
for r,c in [(1.05,WARM2),(0.72,SAGE3),(0.40,SAGE)]:
    ax.add_patch(Circle((0,0),r,facecolor=c,edgecolor="white",lw=2))
ax.text(0,0.82,"TAM",ha="center",fontsize=11,color=SUB,fontproperties=SB)
ax.text(0,0.66,"11.2조",ha="center",fontsize=13,color=INK,fontproperties=XB)
ax.text(0,0.40,"SAM",ha="center",fontsize=11,color="#3C4633",fontproperties=SB)
ax.text(0,0.25,"1.8조",ha="center",fontsize=13,color="#3C4633",fontproperties=XB)
ax.text(0,-0.02,"SOM",ha="center",fontsize=11.5,color="white",fontproperties=SB)
ax.text(0,-0.24,"540억",ha="center",fontsize=17,color="white",fontproperties=XB)
save(fig,"market")

# 7) BM — 3단계 성장
fig,ax=plt.subplots(figsize=(6.6,3.0))
phases=["Y1 · 무료","Y2 · 구독 전환","Y3 · 구독+제휴"]
subs=["무료 확보로 순환 검증","유료 전환 8% · ₩3,900/월","ARPU·투명 제휴 확대"]
heights=[3,14,38]; labels=["₩0","₩14억","₩38억"]; cols=[WARM,SAGE2,SAGE]
x=np.arange(3)
ax.bar(x, heights, color=cols, width=0.58, zorder=2)
for xi in range(3):
    ax.text(xi, heights[xi]+1.3, labels[xi], ha="center", fontsize=15, color=INK, fontproperties=SB)
    ax.text(xi, -4.0, phases[xi], ha="center", fontsize=12.5, color=INK, fontproperties=SB)
    ax.text(xi, -7.2, subs[xi], ha="center", fontsize=10.5, color=SUB, fontproperties=REG)
ax.set_ylim(-9,44); ax.set_xlim(-0.6,2.6); ax.axis("off")
save(fig,"bm")

print("ALL DONE")
