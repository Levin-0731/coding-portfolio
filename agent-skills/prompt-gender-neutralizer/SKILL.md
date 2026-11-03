---
name: prompt-gender-neutralizer
description: Audit and fix gender-locking issues in image-generation prompts (text-to-image / face-swap templates). Use when the user asks to check, fix, neutralize, de-gender, or remove gender bias from image prompts; mentions "prompt 性别问题 / 性别强制 / she/he 代词 / 礼服 / 强制服装 / 换图被改性别"; or provides a CSV / markdown / single prompt and wants it to work for any gender of input photo.
---

# Prompt Gender Neutralizer

针对"图生图 / 换脸 / 模板类生图 prompt"，排查并修复性别强制问题——避免上传非指定性别的参考图时，产物被模型强行改性别。

## 何时使用

用户给出一个或多个生图 prompt（单条、CSV、表格、md 文档均可），并要求：
- "排查性别问题 / 检查 prompt 是否锁性别"
- "让这个 prompt 兼容男女 / gender neutral / 不挑性别"
- "改 prompt，换男图也能用 / 换女图也能用"
- "为什么换图后性别变了"

## 核心定义：什么算"性别问题"

一个 prompt 含以下任意一项即算"有性别问题"：

1. **代词强制**：`she / he / her / his / him / herself / himself`，或显式名词 `the woman / the man / the girl / the boy / the lady / the gentleman`。
2. **服装/配饰强制**：单品名词只属于某一性别或强暗示某一性别，例如：
   - 女性向：`gown, dress, mermaid gown, slip dress, halter dress, mini dress, bodysuit, strapless / off-shoulder / backless top, tights, sheer stockings, stiletto heels, pageant crown / tiara, choker, handbag/clutch`
   - 男性向：`tuxedo, three-piece suit with tie clip, bow tie（语境强男性时）, men's oxford shoes`（注意：`suit / blazer / trousers` 本身中性，别误伤）
3. **妆容强制**：`smoky eye, lashes, glossy / luminous lips, lipstick, blush`（强女性指向）。
4. **姿态/身体描写强制**：`hands in her lap, against her chest, bare back exposing curves, shirtless revealing chest（强男性时）`等带性别暗示的体态。
5. **背景画中画/二级出现的性别锁**：广告牌、海报、镜中倒影里再出现一次"the subject in a gown"，也算（容易漏）。

✅ 反例（中性，不要误判）：`their / the subject / the person / the character`、`suit and trousers`、`blazer`、`formal attire`、`elegant outfit`。

## 修复策略：两种模式 + 判断准则

### 判断准则（关键）

逐条 prompt 先判断"**服装是不是这个模板的核心视觉**"：

- **服装是核心视觉**（红毯礼服、选美皇冠、抹胸晚礼、燕尾服等强造型模板）→ **模式 A：if/else 双方案**
- **服装非核心**（场景才是主角：演讲台、篮球赛、脱口秀等，服装只是衬托）→ **模式 B：中性化**

如果不确定，倾向 **模式 A**（保留风格，更安全）。

### 模式 A：if/else 双方案（保风格）

为同一个视觉主题，给男/女各设计一套**同调性**的服装、配饰、妆容、姿态，写成显式条件分支。代词同时改中性。

写法模板：

```
If the subject appears female: wearing [女性方案 - 单品/配饰/妆容]; [女性向姿态描述].
If the subject appears male: wearing [同风格男性方案 - 对应替换]; [男性向姿态描述].
```

**风格对照参考**（红毯/晚宴/选美/休闲/运动 各场景常用替换）：

| 女性方案 | 同风格男性方案 |
|---|---|
| backless / off-shoulder / strapless gown | tailored tuxedo / sleek black suit with satin lapel, open-collar dress shirt |
| mermaid gown + ruby earrings + clutch | three-piece tuxedo + pocket square + signet ring |
| sequined halter dress | sequined / metallic-finish dinner jacket + black trousers |
| leopard print bodysuit + sheer tights | leopard print silk shirt + black tailored trousers |
| plaid mini dress + tights | plaid blazer + slim black jeans |
| white satin slip dress + oversized blazer coat | white silk shirt unbuttoned + oversized black blazer coat |
| pageant crown + smoky eye + glossy lips + lashes | ornate prince-style crown / laurel; clean dramatic grooming（去妆容细节） |
| diamond choker + drop earrings | diamond brooch on lapel + cufflinks |
| stiletto heels | polished black derby / oxford shoes |
| hands resting in her lap | hands resting on his knees |
| hugging bouquet against her chest | holding the bouquet at his side / cradled in one arm |

### 模式 B：中性化（去具体单品）

服装非核心时，直接把强性别单品替换为**抽象 + 中性**词：

| 原文 | 中性替换 |
|---|---|
| black gown / dress | elegant black formalwear |
| mini dress + tights | chic casual outfit |
| strapless top | fitted top |
| smoky eye / lashes / luminous lips | dramatic glamour makeup（或直接删除） |
| pageant crown | ornate jeweled crown |

代词全部改为：`the subject / the person / they / their / themself`。
显式名词：`the woman / the man → the subject`。

### 不变的部分

**永远不动**：场景、灯光、构图、色调、镜头、风格关键词、画幅、相机参数。只改"人"的描写。

## 工作流

```
Task Progress:
- [ ] 1. 读取来源（CSV / md / 单条文本）
- [ ] 2. 逐条诊断，给出诊断表
- [ ] 3. 判断每条用模式 A 还是 B（不确定 → A）
- [ ] 4. 与用户对齐方向（如有 ≥3 条歧义点，用 AskQuestion 一次性问清）
- [ ] 5. 改写 prompt
- [ ] 6. 自检（见下方"自检清单"）
- [ ] 7. 写回原始来源（CSV/文档），保留原文、加诊断列、加改写列
```

### 步骤 2：诊断表格式

无论来源如何，诊断阶段一律输出统一表格：

| # | title | 是否有性别问题 | 触发点 | 建议模式 |
|---|---|---|---|---|
| 1 | xxx | 是 | 代词 her×3；服装 backless gown / stiletto | A |
| 2 | xxx | 否 | — | — |

### 步骤 7：CSV 写回约定

如果来源是 CSV 且包含以下列（或类似列），按列填回，不破坏其它列与转义：
- `是否有性别问题`：`是` / `否`
- `性别问题说明`：简短列出代词 + 强制服装单品
- `修改后的 prompt`：英文改写
- `修改后的 prompt中文翻译`：对应中文

CSV 操作注意：
- 字段含逗号/换行/引号必须用双引号包裹，内部双引号用 `""` 转义。
- 不要改动原 prompt 列。
- 行数与列数与原文件保持一致。
- 优先用脚本/程序化方式写回（如 python `csv` 模块），避免手工拼接出错。

## 自检清单（改写后必跑）

对每条改写后的 prompt 检查：

- [ ] 全文搜索 `\b(she|he|her|his|him|herself|himself|woman|man|girl|boy|lady|gentleman)\b`（区分大小写不敏感），命中数 = 0，或仅出现在 if/else 分支条件描述中（如 "If the subject appears female"）。
- [ ] 全文搜索性别强制单品白名单（gown, dress, tuxedo, bodysuit, tights, stiletto, halter, mermaid, slip dress, pageant crown, smoky eye, lashes, lipstick），命中项必须出现在 if/else 双方案中，不能单独存在。
- [ ] 场景/灯光/构图/色调段落字数与原文接近（说明没误删风格）。
- [ ] 模式 A 的 if/else 两边**字数和细节量大致相当**（避免一边详细一边敷衍）。
- [ ] 中文翻译版本与英文版语义一致，if/else 结构保留。

## 示例

### 示例 1：模式 A（服装是核心）

**原文**：
> Wearing a sleek, form-fitting black backless gown with spaghetti straps. The subject is standing with her back toward the camera, while her head is gracefully turned back over her shoulder. Both arms are hugging a large bouquet of red roses tightly against her chest.

**改写**：
> If the subject appears female: wearing a sleek form-fitting black backless gown with spaghetti straps; standing with the back toward the camera, head gracefully turned back over the shoulder, both arms hugging a large bouquet of deep red roses tightly against the chest.
> If the subject appears male: wearing a sharply tailored black tuxedo with satin lapels and an open-collar dress shirt; standing with the back toward the camera, head turned back over the shoulder, one arm cradling a large bouquet of deep red roses against the side of the body.

### 示例 2：模式 B（服装非核心）

**原文**：
> She is wearing a grey blazer and matching trousers, standing alone at the center of a large stage. Her hands are slightly raised at waist level.

**改写**：
> The subject is wearing a grey blazer and matching trousers, standing alone at the center of a large stage. Both hands are slightly raised at waist level.

## 反模式（不要这么做）

- ❌ 简单粗暴把所有服装词删掉 → 模板视觉崩塌。
- ❌ 把 `she` 改成 `he` → 只是换了一个性别锁。
- ❌ 写成 `she/he` 或 `(s)he` → 多数图像模型不能正确解析这种语法。
- ❌ 只改主体描写，忘了背景里的"画中画/广告牌/海报/镜中倒影"也有性别锁。
- ❌ 模式 A 的男方案敷衍一句"a suit"，女方案写满细节 → 男图出来质感差。
- ❌ 不与用户对齐就直接改写 CSV。
- ❌ 在英文 prompt 里混入中文。

## 与用户的协作约定

- 收到任务后**先做诊断、不直接改文件**，把诊断表给用户，明确每条建议的模式（A/B）。
- 对于明显有歧义或风格 trade-off 的条目（>3 条），用 AskQuestion 一次性确认方向。
- 用户拍板后再批量改写并写回。
- 改完跑一遍"自检清单"，把通过情况简报给用户。
