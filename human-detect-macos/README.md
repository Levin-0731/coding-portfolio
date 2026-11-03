# HumanDetect

一个 **macOS 原生本地应用**,基于 Apple Vision 框架,对图片进行 **人体 + 手部 + 面部** 关键点检测并可视化。全流程本地推理,不联网、不上传。

> 需求文档:[`需求说明.md`](./需求说明.md) · 架构文档:[`架构设计.md`](./架构设计.md)

## 特性

- **敏感内容(裸露)检测**(`SensitiveContentAnalysis`,macOS 14+,本地离线)
- 身体 19 个关键点(`VNDetectHumanBodyPoseRequest`)
- 每只手 21 个关键点(`VNDetectHumanHandPoseRequest`)
- 面部 landmarks,按区域折线(`VNDetectFaceLandmarksRequest`)
- 单人匹配:身体取最高置信度,脸与身体头部匹配,手与身体手腕匹配
- EXIF 方向自动校正
- 置信度阈值、点大小、线宽可实时调整
- 导出带标注 PNG/JPEG(原分辨率)
- 导出 JSON(完整关键点数据)
- 支持打开 / 拖拽 / 粘贴板
- **批量处理**:多选文件 / 拖入整个文件夹(递归扫图),队列串行自动检测
- **批量导出**:一键把队列里所有已检测的图导出到指定目录(PNG / JSON 可独立勾选)

## 系统要求

- macOS 13.0+
- Xcode 15.0+(使用 Xcode 26.x 亦可)

## 运行

```bash
open HumanDetect.xcodeproj
```

在 Xcode 中按 ⌘R 运行即可。

### 命令行构建

```bash
xcodebuild -project HumanDetect.xcodeproj \
           -scheme HumanDetect \
           -configuration Release build
```

构建产物位于 `~/Library/Developer/Xcode/DerivedData/HumanDetect-*/Build/Products/Release/HumanDetect.app`。

## 使用

| 操作 | 快捷键 |
|---|---|
| 添加图片 / 文件夹 | ⌘O / 工具栏"添加" / 拖拽到窗口(多选 / 拖文件夹均可) |
| 粘贴图片 | ⌘V |
| 重新检测 | 工具栏"重新检测" |
| 导出当前标注图 | 工具栏"导出图片" / Inspector 面板 |
| 导出当前 JSON | 工具栏"导出 JSON" |
| 批量导出 | 工具栏"批量导出"(选目录 + 勾选 PNG/JSON) |
| 折叠队列 / 右侧面板 | 工具栏"队列" / "面板" |

导入图片后会进入左侧队列,**自动串行检测**。右侧 Inspector 提供:

- 检测信息(尺寸 / 耗时 / 置信度 / 各部位点数)
- 显示开关(身体 / 手 / 脸 / 骨架 / 标签)
- 样式(置信度阈值 / 点大小 / 线宽)
- 操作(重新检测 / 移除当前 / 清空队列 / 导出)

### 批量工作流

1. ⌘O 或"添加"按钮选择多张图 / 文件夹,也可直接把图片或文件夹拖进窗口。
2. 左侧队列显示缩略图与各自状态(等待 / 检测中 / 完成 / 未检到人 / 失败),底部显示整体进度。
3. 点击任一条目即可在中间画布查看该图的检测结果与关键点。
4. 点工具栏"批量导出",勾选需要的输出(标注 PNG / JSON),选目录确认即可一次导出所有已完成条目;可选是否包含"未检到人"的图。

## 测试图

`测试图/` 目录下有几张样例图可以直接拖入 App 使用。

## 工程结构

```
HumanDetect/
├── App/                     # @main 入口
├── Views/                   # SwiftUI 视图
├── ViewModels/              # AppViewModel(编排 + 状态)
├── Services/                # ImageLoader / PoseDetector / ImageExporter
├── Models/                  # JointPoint / PersonPose / DetectionResult / Skeleton
├── Utils/                   # CoordinateMapper / ColorPalette / Orientation
├── Resources/               # Info.plist / Assets.xcassets
└── HumanDetect.entitlements # App Sandbox
```

详见 [`架构设计.md`](./架构设计.md)。

## JSON 导出示例

```json
{
  "sourceFileName": "Image 2.png",
  "imagePixelSize": { "w": 1920, "h": 1080 },
  "orientationRawValue": 1,
  "elapsedMs": 92.3,
  "person": {
    "bodyConfidence": 0.91,
    "body": [
      {
        "name": "nose_joint",
        "category": "body",
        "normalized": { "x": 0.51, "y": 0.82 },
        "confidence": 0.95
      }
    ],
    "leftHand": [ ... ],
    "rightHand": [ ... ],
    "face": [ ... ]
  }
}
```

## 敏感内容检测

### SCA(Apple 官方)

- 基于 `SensitiveContentAnalysis` framework,**全流程本地推理,不联网**。
- 在右侧面板 `内容安全(裸露)` 中可开关,展示系统策略与单张图判定(安全 / 含裸露内容 / 无法判定)。
- 判定结果(`isSensitive` / `policy` / `elapsedMs`)写入导出 JSON `sensitivity` 字段。

### Core ML NSFW 检测(本地模型)

- 基于本地 Core ML 模型推理,**全程离线,不联网**,兼容 macOS 13+,无需 entitlement。
- 右侧面板 `内容安全(Core ML)` 区块提供开关、置信度阈值滑块、NSFW 概率条及各类别分数明细。
- 队列缩略图和底部统计栏同步标记 NSFW 命中的图片。
- 判定结果(`isNSFW` / `nsfwScore` / `classScores` / `elapsedMs`)写入导出 JSON `nsfw` 字段。
- **使用方法**:把 NSFW 分类 `.mlmodel` / `.mlpackage` 拖到 `HumanDetect/Models/CoreML/`,文件名用 `NSFWDetector` / `NSFW` / `OpenNSFW` / `Nudity` 之一,详见 [`Models/CoreML/README.md`](HumanDetect/Models/CoreML/README.md)。

### ⚠️ 使用限制(非常重要)

要让系统**真的**返回判定结果,需要**同时**满足下列条件,缺一不可:

1. **macOS 14+**(本项目 deployment target 为 13.0,旧系统会被自动降级为"不支持")。
2. 用户在 `系统设置 → 隐私与安全 → 敏感内容警告` 中**开启该开关**。
3. App 签名时**持有 `com.apple.developer.sensitivecontentanalysis.client` entitlement**。

> **Apple 官方硬性限制**:该 entitlement 仅对**付费 Apple Developer Program(99 美元/年)帐号**开放;
> **Personal Team(免费 Apple ID)无法申请**。用免费帐号编译出的产物调用该 API 会在 `mediaanalysisd` 层被直接拒绝,错误信息是 `User Safety either not entitled for client or not enabled`,`analysisPolicy` 恒为 `.disabled`。

因此:
- 如果你是**付费开发者**,需要在 Apple Developer 后台为 App ID 勾选 *Sensitive Content Analysis* capability,再把 `HumanDetect/HumanDetect.entitlements` 里加入:
  ```xml
  <key>com.apple.developer.sensitivecontentanalysis.client</key>
  <array><string>analysis</string></array>
  ```
  重新签名即可正常使用。
- 如果你是**免费帐号用户**,这里会始终显示"未启用"。可以用 Console.app 按 subsystem `com.local.HumanDetect` 过滤,看到启动时打印的 `[SCA] policy=raw=0 mapped=disabled` 即代表上述原因,这是 Apple 的平台限制,代码层无法绕过。

## 权限

- App Sandbox + 用户选择的文件读写(`com.apple.security.files.user-selected.read-write`)。
- `NSSensitiveContentAnalysisUsageDescription`:用于说明敏感内容分析的用途,实际开关受系统层控制。
- **不请求网络、相机、麦克风**。
