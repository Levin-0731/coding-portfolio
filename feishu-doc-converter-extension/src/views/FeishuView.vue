<template>
  <div class="fs-container">
    <div class="fs-header">
      <span class="custom-tab custom-tab-help">
        <img :src="helpImg" class="custom-tab-icon" alt="" />
        <a
          href="https://example.feishu.cn/wiki/YOUR_DOC_TOKEN"
          target="_blank"
          >帮助</a
        >
      </span>
      <document-input
        v-model="documentUrl"
        :loading="documentStore.loading"
        @parse="parseDocument"
      />
    </div>
    <el-tabs
      v-model="activeTab"
      class="format-tabs"
      type=""
      v-loading="documentStore.loading"
      element-loading-text="解析转换中..."
    >
      <el-tab-pane
        label="长文本转换"
        name="wechat"
        v-loading="converterStore.articleLoading"
        element-loading-text="转换中..."
      >
        <template #label>
          <span class="custom-tab">
            <img :src="articleImg" class="custom-tab-icon" alt="xhsLogo" />
            <span>文章</span>
          </span>
        </template>
        <preview-panel
          :document-title="documentStore.documentTitle"
          :original-content="documentStore.originalContent"
          :original-url="documentStore.documentUrl"
          :document-type="documentStore.documentType"
          :converted-content="converterStore.convertedContent"
        />
      </el-tab-pane>

      <el-tab-pane
        label="图文转换"
        name="xiaohongshu"
        v-loading="converterStore.imageLoading"
        element-loading-text="正在更新卡片..."
      >
        <template #label>
          <span class="custom-tab">
            <img :src="imgImg" class="custom-tab-icon" alt="" />
            <span>图文</span>
          </span>
        </template>
        <xhs-panel
          :original-content="documentStore.originalContent"
          :document-type="documentStore.documentType"
          :document-title="documentStore.documentTitle"
          :converted-content="converterStore.convertedXhs"
        />
      </el-tab-pane>
    </el-tabs>
    <div class="fs-header-right">
      <!-- <login-button /> -->
    </div>
  </div>
</template>

<script setup>
import LoginButton from "@/components/LoginButton.vue";
import { onMounted, ref, watch } from "vue"; // 添加 watch
import { useDocumentStore } from "@/stores/document";
import { useConverterStore } from "@/stores/converter";
import { analytics } from "@/utils/analytics"; // 添加 analytics
import DocumentInput from "@/components/DocumentInput/index.vue";
import PreviewPanel from "@/components/PreviewPanel/index.vue";
import XhsPanel from "@/components/XhsPanel/index.vue";
import articleImg from "@/assets/ic_article.svg";
import imgImg from "@/assets/ic_img.svg";
import helpImg from "@/assets/ic_help.svg";

// const tempUrl = ref(
//   "https://example.feishu.cn/wiki/YOUR_DOC_TOKEN?from=from_copylink"
// );
// 状态
const documentUrl = ref("");
// const documentUrl = ref(
//   "https://example.feishu.cn/wiki/YOUR_DOC_TOKEN?from=from_copylink"
// );
const activeTab = ref("wechat");

// 监听标签页变化
watch(activeTab, (newTab) => {
  const eventName = `tab_switch_${newTab}`;
  analytics.sendEvent(eventName, {
    tab_name: newTab === "wechat" ? "文章" : "图文",
    timestamp: new Date().toISOString(),
  });
});

// store
const documentStore = useDocumentStore();
const converterStore = useConverterStore();

// 方法
const parseDocument = async ({ url, type }) => {
  try {
    // localStorage.setItem("pangdun_hasLoad", true);
    await documentStore.parseDocument(url, type); // 解析文档
    if (documentStore.originalContent) {
      await converterStore.convert(documentStore.originalContent); // 转换格式
    }
  } catch (error) {
    console.error("解析文档失败:", error);
  }
};
</script>

<style scoped lang="scss">
.fs-container {
  position: relative;
}
.fs-header {
  display: flex;
  gap: 40px;
  position: absolute;
  left: 162px;
  top: 10px;
  width: 570px;
  z-index: 11;
  &-right {
    position: absolute;
    right: 10px;
    top: 10px;
  }
}
.custom-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  &-help {
    margin-top: -3px;
    a {
      color: var(--el-text-color-primary);
      text-decoration: none;
      font-weight: 500;
    }
  }
  // gap: 5px;
  &-icon {
    width: 20px;
    height: 20px;
    // margin-right: 5px;
  }
}

.format-tabs {
  flex: 1;
  display: flex;

  // flex-direction: column;
  .logo {
    width: 30px;
    height: 30px;
    margin-top: 5px;
  }
  :deep(.el-tabs__nav-scroll) {
    height: 54px;
    display: flex;
    align-items: center;
    padding-left: 30px;
    background: #fff;
  }
  :deep(.el-tabs__active-bar) {
    height: 3px;
    bottom: -6px;
  }
  :deep(.el-tabs__nav-wrap:after) {
    height: 1px;
  }
  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;

    .el-tab-pane {
      height: 100%;
      // padding: 0 20px;
    }
  }
}
</style>
