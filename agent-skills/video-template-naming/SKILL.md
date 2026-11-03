---
name: video-template-naming
description: 为视频模板生成简洁有创意的英文名称。通过提取视频首尾帧分析内容,参考竞品命名风格,生成 2-3 个单词、不超过 20 字符的模板名。适用于 toC 视频生成应用的模板命名、视频文件批量重命名场景。
---

# 视频模板起名

为视频生成 App 的模板视频设计简洁、有吸引力的英文名称。

## 使用场景

- 为视频模板库批量起名
- 重命名视频文件以便用户理解
- 需要参考竞品命名风格时
- toC 视频生成产品的模板管理

## 命名原则

1. **简洁性**: 不超过 20 个字符,2-3 个英文单词为佳
2. **描述性**: 准确传达视频内容和氛围
3. **吸引力**: 使用有画面感的词汇,激发用户兴趣
4. **一致性**: 同一批次保持命名风格统一

## 工作流程

### 1. 视频内容分析

使用 ffmpeg 提取视频的首帧和尾帧:

```bash
# 提取首帧
ffmpeg -i "video.mp4" -vframes 1 -update 1 -y "first.jpg"

# 提取尾帧
duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "video.mp4")
end_time=$(echo "$duration - 0.5" | bc)
ffmpeg -ss "$end_time" -i "video.mp4" -vframes 1 -update 1 -y "last.jpg"
```

### 2. 内容识别要点

分析首尾帧时关注:
- **场景环境**: 室内/户外、派对/海滩/城市等
- **人物关系**: 单人/双人/多人、朋友/情侣/家庭
- **氛围色调**: 温馨/浪漫/热闹/清新
- **视觉特征**: 灯光、色彩、标志性元素
- **转换效果**: 从单人到多人的变化过程

### 3. 命名策略

#### 常用命名结构

**场景 + 氛围**
- Beach Vibes (海滩氛围)
- City Nights (城市夜晚)

**地点 + 关系/活动**
- Party Kiss (派对之吻)
- Yacht Squad (游艇小队)

**特征 + 情感**
- Island Love (岛屿之恋)
- Friend Zone (友谊地带)

**环境 + 动作**
- Car Romance (车内浪漫)

#### 高频词汇参考

**场景类**:
- Beach, Island, Ocean, Paradise
- City, Urban, Downtown, Rooftop
- Party, Club, Night, Glow
- Yacht, Cruise, Deck

**氛围类**:
- Vibes, Mood, Dream, Magic
- Love, Romance, Kiss, Sweet
- Squad, Crew, Gang, Tribe
- Chill, Cool, Fresh, Wild

**动作类**:
- Dance, Jump, Spin, Move
- Hug, Kiss, Smile, Laugh
- Walk, Run, Fly, Ride

### 4. 竞品风格参考

参考主流视频 App 的命名风格:
- **TEACUP MEMORIES** - 怀旧+具体物品
- **PALM DOLL** - 趣味+可爱
- **IN THE BEAT** - 音乐+节奏感
- **EYES ON YOU** - 关系+互动
- **LIVE PHOTOS** - 形式+真实感
- **DREAM RIDE** - 梦想+体验

**风格特点**:
- 全大写或首字母大写
- 2-3 个单词组合
- 避免复杂词汇
- 有画面感和故事性

### 5. 批量命名流程

```bash
# 1. 批量提取所有视频的首尾帧
for video in *.mp4; do
    name=$(echo "$video" | sed 's/[^a-zA-Z0-9]/_/g')
    ffmpeg -i "$video" -vframes 1 -update 1 -y "/tmp/${name}_first.jpg"
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$video")
    end_time=$(echo "$duration - 0.5" | bc)
    ffmpeg -ss "$end_time" -i "$video" -vframes 1 -update 1 -y "/tmp/${name}_last.jpg"
done

# 2. 分析图片内容后设计名称

# 3. 批量重命名
mv "old_name.mp4" "New Name.mp4"
```

## 命名示例

### 派对场景
- **Party Kiss** - 室内派对,从单人到亲吻
- **Glow Night** - 霓虹灯光派对氛围
- **Club Vibes** - 夜店热舞场景

### 海滩度假
- **Beach Vibes** - 海滩轻松氛围
- **Island Love** - 热带岛屿浪漫
- **Ocean Squad** - 海边朋友聚会
- **Yacht Squad** - 游艇派对

### 城市生活
- **City Nights** - 城市夜景
- **Rooftop Glow** - 屋顶聚会
- **Urban Dreams** - 都市梦想

### 亲密关系
- **Car Romance** - 车内亲密时刻
- **Sweet Kiss** - 甜蜜之吻
- **Love Glow** - 爱的光芒

### 朋友聚会
- **Friend Zone** - 友情时光
- **Squad Goals** - 小队目标
- **Crew Love** - 团队友爱

## 质量检查

命名完成后验证:
- [ ] 长度不超过 20 字符
- [ ] 2-3 个英文单词
- [ ] 准确描述视频内容
- [ ] 符合目标用户的语言习惯
- [ ] 整批命名风格统一
- [ ] 没有拼写错误
- [ ] 避免敏感或歧义词汇

## 常见问题

**Q: 如何处理相似内容的视频?**
A: 通过不同维度区分,如 "Beach Vibes" vs "Island Love" vs "Ocean Dreams"

**Q: 是否需要加数字编号?**
A: 除非是副本(如 "Island Love Copy"),否则避免数字编号,用描述性词汇区分

**Q: 如何平衡创意和描述性?**
A: 优先保证描述准确,在此基础上追求创意。用户需要快速理解模板内容

**Q: 中英文混合可以吗?**
A: 建议纯英文,符合国际化趋势且更简洁美观

## 注意事项

- ⚠️ 避免使用过于复杂或生僻的词汇
- ⚠️ 注意文化敏感性,避免可能引起争议的词汇
- ⚠️ 检查是否与已有模板名称重复
- ⚠️ 保持命名风格与产品整体调性一致
