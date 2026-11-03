# NSFW Core ML 模型放置说明

把任意一份 NSFW 分类模型（`.mlmodel` 或 `.mlpackage`）拖到这个目录下即可。
Xcode 16 的 **file-system synchronized group** 会自动将其编译为 `.mlmodelc` 并打包进 App，无需手动修改 `project.pbxproj`。

## 命名要求

文件主名（去掉扩展名后的部分）必须是以下之一，`NSFWDetector` 会按顺序依次查找：

| 优先级 | 文件名 |
|:---:|---|
| 1 | `NSFWModel` |
| 2 | `NSFW` |
| 3 | `OpenNSFW` |
| 4 | `Nudity` |

示例：`NSFWModel.mlmodel` ✓ · `NSFW.mlpackage` ✓

> ⚠️ **不要**用 `NSFWDetector` 作为文件名：Xcode 会自动为 `.mlmodel` 生成一个同名 Swift 类，与工程内的 `enum NSFWDetector` 发生符号冲突，导致编译失败。

## 兼容的模型格式

只要输出层满足以下任一形态，`NSFWDetector` 就能自动解析：

| 输出形态 | 典型模型 |
|---|---|
| `VNClassificationObservation`（5 分类：porn / sexy / hentai / drawings / neutral） | GantMan/nsfw_model、yahoo/open_nsfw 的分类版 |
| `MLMultiArray`（2 维，idx0=SFW，idx1=NSFW） | Yahoo OpenNSFW 原版 sigmoid 输出 |
| `[String: NSNumber]` 字典 | 部分 CreateML 训练模型 |

## 推荐开源模型

### GantMan NSFW（5 分类，最常用）

```bash
# 克隆并用 coremltools 转换
pip install coremltools tensorflow

python3 - <<'EOF'
import coremltools as ct
import tensorflow as tf

model = tf.keras.models.load_model("nsfw_mobilenet2.224x224.h5")
ct_model = ct.convert(
    model,
    inputs=[ct.ImageType(name="input_1", shape=(1, 224, 224, 3),
                         bias=[-1, -1, -1], scale=1/127.5)],
    classifier_config=ct.ClassifierConfig(
        ["drawings", "hentai", "neutral", "porn", "sexy"]
    )
)
ct_model.save("NSFWDetector.mlpackage")
EOF
```

> 原始模型：<https://github.com/GantMan/nsfw_model>

### Yahoo OpenNSFW（二分类，精准）

```bash
pip install coremltools caffe

python3 - <<'EOF'
import coremltools as ct

# 先用 caffe 或 ONNX 导出；这里假设已转为 ONNX
import onnx
onnx_model = onnx.load("open_nsfw.onnx")
ct_model = ct.convert(onnx_model,
    inputs=[ct.ImageType(name="data", shape=(1, 3, 224, 224))])
ct_model.save("OpenNSFW.mlpackage")
EOF
```

> 原始模型：<https://github.com/yahoo/open_nsfw>

## 放置后验证

1. 在 Xcode 中按 ⌘B 确认编译通过，`Models/CoreML/NSFWDetector.mlpackage` 会出现在工程导航器里。
2. 启动 App，右侧面板「内容安全(Core ML)」区块应显示模型名，而非"未找到模型"提示。
3. 也可以在 Console.app 按 subsystem `com.local.HumanDetect` 过滤，看到 `[NSFW] model loaded: NSFWDetector` 即代表加载成功。
