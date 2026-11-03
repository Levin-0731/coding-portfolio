<!-- 微信转换tab -->
<template>
  <el-row class="preview-panel">
    <el-col :span="12" class="">
      <div class="preview-panel-left">
        <!-- <div class="preview-header">
          飞书内容（右上角输入分享链接解析后出现，可以直接在这里编辑。编辑后需要重新解析一次链接）
        </div> -->
        <div class="preview-content">
          <iframe :src="originalUrl" frameborder="0"></iframe>
          <!-- <div v-else v-html="originalContent"></div> -->
        </div>
      </div>
    </el-col>
    <el-col :span="12" class="col">
      <div class="preview-panel-right">
        <!-- <div class="preview-header">
          <span>预览</span>
        </div> -->
        <div
          contenteditable="true"
          ref="previewContent"
          class="preview-content"
          v-html="convertedContent"
          :class="format"
        ></div>
        <!-- 隐藏的div，用于知乎复制 -->
        <div
          ref="previewZhihu"
          class="hidden-container"
          v-html="converterStore.convertedZhihu"
        ></div>
        <!-- 隐藏的div，用于juejin复制 -->
        <div
          ref="previewJuejin"
          class="hidden-container"
          v-html="converterStore.convertedJuejin"
        ></div>
      </div>
      <div class="preview-panel-side">
        <div class="right-main">
          <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到公众号"
            placement="left-start"
          >
            <img
              :src="wechatLogo"
              alt="copy"
              @click="copyToWeixin"
              :disabled="!convertedContent"
            />
          </el-tooltip>
          <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到知乎"
            placement="left-start"
          >
            <img
              :src="zhihuLogo"
              alt="copyzhihu"
              @click="copyToZhihu"
              :disabled="!converterStore.convertedZhihu"
            />
          </el-tooltip>
          <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到人人都是产品经理"
            placement="left-start"
          >
            <img
              :src="cpjlLogo"
              alt="copyzhihu"
              @click="copyToCpjl"
              :disabled="!converterStore.convertedZhihu"
            />
          </el-tooltip>
          <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到掘金"
            placement="left-start"
          >
            <img
              :src="juejinLogo"
              alt="copyjuejin"
              @click="copyToJuejin"
              :disabled="!convertedContent"
            />
          </el-tooltip>
          <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到CSDN"
            placement="left-start"
          >
            <img
              :src="csdnLogo"
              alt="copycsdn"
              @click="copyToCsdn"
              :disabled="!convertedContent"
            />
          </el-tooltip>
          <!-- <el-tooltip
            class="box-item"
            effect="dark"
            content="复制到知识星球"
            placement="left-start"
          >
            <img
              :src="zsxqLogo"
              alt="copyzsxq"
              @click="copyToZsxq"
              :disabled="!convertedContent"
            />
          </el-tooltip> -->
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import wechatLogo from "@/assets/wechat.png";
import zhihuLogo from "@/assets/zhihu.png";
import cpjlLogo from "@/assets/cpjl.png";
import juejinLogo from "@/assets/juejin.png";
import csdnLogo from "@/assets/csdn.png";
import zsxqLogo from "@/assets/zsxq.png";
import { useConverterStore } from "@/stores/converter";
import { analytics } from "@/utils/analytics";

// import Descript from "@/components/Descript.vue";
const props = defineProps({
  documentTitle: String,
  // originalContent: String,
  originalUrl: String,
  documentType: String,
  convertedContent: String,
  format: {
    type: String,
    default: "wechat",
  },
});

const converterStore = useConverterStore();
const previewContent = ref(null);
const previewZhihu = ref(null);
const previewJuejin = ref(null);

const handleCopy = async () => {
  try {
    if (!previewContent.value) {
      console.error("预览内容DOM节点未找到");
      throw new Error("DOM节点未找到");
    }
    // 直接从DOM中提取HTML
    const html = previewContent.value.innerHTML;

    // 写入剪贴板
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([html], { type: "text/plain" }),
      }),
    ]);
    await readClipboardContent();
    ElMessage.success("复制成功！");
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败，请手动复制");
  }
};

// 复制到知乎
const handleCopyZhihu = async () => {
  try {
    if (!previewZhihu.value) {
      console.error("预览内容DOM节点未找到");
      throw new Error("DOM节点未找到");
    }

    // 创建选区
    const selection = window.getSelection();
    const range = document.createRange();

    // 选择整个预览内容
    range.selectNodeContents(previewZhihu.value);
    selection.removeAllRanges();
    selection.addRange(range);

    // 执行复制命令
    const successful = document.execCommand("copy");

    // 清除选区
    selection.removeAllRanges();

    if (successful) {
      ElMessage.success("复制成功！");
    } else {
      throw new Error("复制命令执行失败");
    }
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败，请手动复制");
  }
};
// 复制到微信
const handleCopyWeixin = async () => {
  try {
    if (!previewContent.value) {
      console.error("预览内容DOM节点未找到");
      throw new Error("DOM节点未找到");
    }

    // 创建选区
    const selection = window.getSelection();
    const range = document.createRange();

    // 选择整个预览内容
    range.selectNodeContents(previewContent.value);
    selection.removeAllRanges();
    selection.addRange(range);

    // 执行复制命令
    const successful = document.execCommand("copy");

    // 清除选区
    selection.removeAllRanges();

    if (successful) {
      ElMessage.success("复制成功！");
    } else {
      throw new Error("复制命令执行失败");
    }
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败，请手动复制");
  }
};
// 复制到juejin
const handleCopyJuejin = async () => {
  try {
    if (!previewJuejin.value) {
      console.error("预览内容DOM节点未找到");
      throw new Error("DOM节点未找到");
    }

    // 创建选区
    const selection = window.getSelection();
    const range = document.createRange();

    // 选择整个预览内容
    range.selectNodeContents(previewJuejin.value);
    selection.removeAllRanges();
    selection.addRange(range);

    // 执行复制命令
    const successful = document.execCommand("copy");

    // 清除选区
    selection.removeAllRanges();

    if (successful) {
      ElMessage.success("复制成功！");
    } else {
      throw new Error("复制命令执行失败");
    }
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败，请手动复制");
  }
};

// 打开第三方编辑器
const openEditor = async (action, content) => {
  try {
    // 发送消息给 background script
    const response = await chrome.runtime.sendMessage({
      action: action,
      content: content,
      title: props.documentTitle,
    });

    if (response.success) {
      ElMessage.success("已打开编辑器");
    }
  } catch (error) {
    console.error("打开编辑器失败:", error);
    ElMessage.error("打开编辑器失败");
  }
};

const copyToWeixin = async () => {
  await handleCopy(); // 粘贴之后高亮有空格
  // await handleCopyWeixin(); //粘贴之后图片有空格
  await openEditor("openWeixinEditor", previewContent.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_weixin", {
    button_name: "复制到微信",
    timestamp: new Date().toISOString(),
  });
};

const copyToZhihu = async () => {
  await handleCopyZhihu();
  await openEditor("openZhihuEditor", previewZhihu.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_zhihu", {
    button_name: "复制到知乎",
    timestamp: new Date().toISOString(),
  });
};
const copyToCpjl = async () => {
  await handleCopyZhihu();
  await openEditor("openCpjlEditor", previewZhihu.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_cpjl", {
    button_name: "复制到人人都是产品经理",
    timestamp: new Date().toISOString(),
  });
};

const copyToJuejin = async () => {
  await handleCopyJuejin();
  await openEditor("openJuejinEditor", previewJuejin.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_juejin", {
    button_name: "复制到掘金",
    timestamp: new Date().toISOString(),
  });
};

const copyToCsdn = async () => {
  await handleCopy();
  await openEditor("openCsdnEditor", previewContent.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_csdn", {
    button_name: "复制到CSDN",
    timestamp: new Date().toISOString(),
  });
};

const copyToZsxq = async () => {
  await handleCopy();
  await openEditor("openZsxqEditor", previewContent.value.innerHTML);
  // 埋点
  analytics.sendEvent("open_zsxq", {
    button_name: "复制到知识星球",
    timestamp: new Date().toISOString(),
  });
};

const readClipboardContent = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      // 遍历每个 ClipboardItem，读取不同类型的数据
      for (const type of item.types) {
        const blob = await item.getType(type);
        if (type.startsWith("text/")) {
          // 处理文本类型
          const text = await blob.text();
          // console.log(`文本内容 (${type}):`, text);
        } else if (type.startsWith("image/")) {
          // 处理图片类型
          const imgURL = URL.createObjectURL(blob);
          // console.log(`图片内容 (${type}):`, imgURL);

          // 可直接将图片显示在页面上
          const img = document.createElement("img");
          img.src = imgURL;
          document.body.appendChild(img);
        } else {
          // 处理其他类型
          // console.log(`其他内容 (${type}):`, blob);
        }
      }
    }
  } catch (error) {
    console.error("读取剪贴板失败：", error);
  }
};
</script>

<style scoped lang="scss">
.preview-panel {
  .col {
    display: flex;
    gap: 20px;
    justify-content: center;
  }
  // gap: 16px;
  // &-left {
  //   // width: calc(100% - 375px - 30px - 16px * 2);
  // }
  &-right {
    width: 375px;
  }
  &-side {
    width: 30px;
  }
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 48px;
    line-height: 48px;
  }

  .preview-content {
    height: calc(100vh - 70px);
    padding: 16px;
    // max-height: 800px;
    overflow: scroll;
    background: #fff;
    border-radius: 5px;

    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  }
  .right-main {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    img {
      width: 32px;
      height: 32px;
      cursor: pointer;
    }
  }
}
</style>
