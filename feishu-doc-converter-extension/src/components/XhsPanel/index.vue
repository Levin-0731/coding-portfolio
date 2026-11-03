<template>
  <el-row class="xhs-panel" ref="xhsPanel">
    <el-col :span="12" class="col-left">
      <div class="xhs-panel-left">
        <!-- <div class="card-header">小红书编辑区</div> -->
        <el-form class="card-body" :model="formData" label-position="top">
          <!-- 封面图上传 -->
          <el-form-item label="封面头图（建议900X383,与公众号一致）">
            <el-upload
              class="cover-uploader"
              :show-file-list="false"
              :auto-upload="false"
              :on-change="handleCoverChange"
              :before-upload="beforeCoverUpload"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">上传封面图</div>
            </el-upload>
          </el-form-item>

          <!-- 标题输入 -->
          <el-form-item label="封面标题">
            <el-input
              v-model="formData.title"
              placeholder="标题可换行"
              type="textarea"
            />
          </el-form-item>
          <!-- 底部标签 -->
          <el-form-item label="封面话题标签">
            <el-input
              v-model="formData.tag"
              placeholder="输入后展示在封面底部"
            />
          </el-form-item>

          <!-- 正文编辑器 -->
          <el-form-item label="正文">
            <div class="editor-toolbar">
              <!-- <el-button
                :icon="Back"
                :disabled="currentHistoryIndex <= 0"
                @click="handleUndo"
              >
                撤销
              </el-button>
              <el-button
                :icon="Right"
                :disabled="currentHistoryIndex >= history.length - 1"
                @click="handleRedo"
              >
                重做
              </el-button> -->
            </div>
            <div
              :contenteditable="contenteditAble"
              ref="previewContent"
              class="preview-content"
              v-html="convertedContentEdit"
              @input="handleContentEdit"
              @compositionend="handleCompositionEnd"
            ></div>
          </el-form-item>
        </el-form>
      </div>
    </el-col>
    <el-col :span="12" class="col-right">
      <div class="xhs-panel-right">
        <!-- <div v-if="exportLoading" class="card-header">
          <span>图片预览</span>
          <div class="preview-controls">
            {{ `正在导出 (${currentExportIndex}/${cardLength})` }}
          </div>
        </div> -->
        <div class="card-right">
          <div
            ref="cardsContainer"
            class="cards-container"
            v-html="convertedCards"
          ></div>
        </div>
        <!-- 隐藏的div，用于daochu -->
        <div
          ref="cardsForHeight"
          class="hidden-container"
          :style="{ width: cardWidth + 'px' }"
          v-html="convertedCards"
        ></div>
      </div>
      <div class="xhs-panel-side">
        <div class="right-main">
          <el-tooltip
            class="box-item"
            effect="dark"
            content="导出图片"
            placement="left-start"
          >
            <img
              :src="xhsLogo"
              alt="copy"
              :disabled="!convertedCards"
              @click="generateImages"
            />
          </el-tooltip>
        </div>
      </div>
    </el-col>

    <!-- 预览区域 -->
  </el-row>
</template>

<script setup>
import {
  ref,
  reactive,
  watch,
  watchEffect,
  onMounted,
  nextTick,
  onBeforeUnmount,
  computed,
} from "vue";
import { ElMessage, ElLoading } from "element-plus";
// import { XiaohongshuConverter } from "@/services/converters/xiaohongshu.js";
import { XiaohongshuConverter } from "@/services/converters/xiaohongshu/index";

import debounce from "lodash.debounce";
import { toPng } from "html-to-image";
import xhsLogo from "@/assets/xiaohongshu.png";
import JSZip from "jszip";
import interact from "interactjs";
import { analytics } from "@/utils/analytics";

const props = defineProps({
  documentTitle: String,
  convertedContent: String,
  // originalContent: String,
  format: {
    type: String,
    default: "xiaohongshu",
  },
});
// form响应式数据
const formData = reactive({
  tag: "",
  coverUrl: "",
  title: "",
  content: "",
});
// 创建一个ref来追踪formData的变化
const formDataRef = computed(() => ({
  tag: formData.tag,
  coverUrl: formData.coverUrl,
  title: formData.title,
  content: formData.content,
}));
// 获取当前小红书转换器
const converter = new XiaohongshuConverter();
const { cardWidth } = converter.getCardSize();
converter.getCardSize();
const cardLength = ref(0);
const convertedContentEdit = ref("");
const previewContent = ref(null); //正文预览效果
// const loading = ref(false);
const cardsContainer = ref(null);
const cardsForHeight = ref(null);
const contenteditAble = ref(true);
// 添加新的ref
const convertedCards = ref("");
// 添加历史记录相关的状态
const MAX_HISTORY = 50;
const history = ref([]);
const currentHistoryIndex = ref(-1);
const isUndoRedo = ref(false);

// 添加输入状态标识
const isTyping = ref(false);

// 监听内容变化
watch(
  () => props.convertedContent,
  () => {
    nextTick(() => {
      convertedContentEdit.value = props.convertedContent;
      history.value = [];
    });
  },
  { immediate: true }
);

// 1. 首先在 data 中添加状态控制
const exportLoading = ref(false);
const currentExportIndex = ref(0);

// 3. 批量导出图片
const generateImages = async () => {
  // 埋点
  analytics.sendEvent("export_image", {
    button_name: "开始导出图片",
    timestamp: new Date().toISOString(),
  });
  const loadingInstance = ElLoading.service({
    lock: true,
    text: "正在导出图片，请勿离开当前页面...",
    background: "rgba(255, 255, 255, 0.7)",
  });

  try {
    exportLoading.value = true;
    const cards = Array.from(cardsContainer.value.children);
    cardLength.value = cards.length;

    const zip = new JSZip();

    for (let i = 0; i < cards.length; i++) {
      currentExportIndex.value = i + 1;
      loadingInstance.setText(
        `正在导出第 ${currentExportIndex.value}/${cardLength.value} 张图片,请勿离开...`
      );

      try {
        // 等待一小段时间确保DOM完全渲染
        await new Promise((resolve) => setTimeout(resolve, 500));

        const dataUrl = await toPng(cards[i], {
          quality: 1,
          backgroundColor: "#ffffff",
          pixelRatio: 5,
          cacheBust: true, // 禁用缓存
          skipAutoScale: true,
          style: {
            transform: "none",
          },
        });

        // 将 dataUrl 转换为 blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        zip.file(`${i + 1}.png`, blob);
      } catch (error) {
        console.error(`导出第 ${i + 1} 张图片失败:`, error);
        throw error;
      }
    }

    // 生成 zip 文件
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 创建下载链接
    const link = document.createElement("a");
    const cleanTitle = formData.title.replace(/[\\/:：*？?"<>|]/g, "").trim();
    console.log("清理后的文件名:", cleanTitle);

    const fileName = cleanTitle ? `${cleanTitle}.zip` : "小红书图片.zip";
    console.log("最终文件名:", fileName);

    link.href = URL.createObjectURL(zipBlob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);

    ElMessage.success(`成功导出 ${cards.length} 张卡片`);
    // 埋点
    analytics.sendEvent("export_image", {
      button_name: "导出图片成功",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败，请重试");
  } finally {
    loadingInstance.close();
    exportLoading.value = false;
    currentExportIndex.value = 0;
  }
};
// 合并后的 handleContentEdit 方法
const handleContentEdit = debounce(async (event) => {
  const element = event.target;
  // 如果正在输入中，不保存和恢复光标位置
  if (isTyping.value) {
    return;
  }
  const caretPosition = saveCaretPosition(element);

  // 添加到历史记录
  if (!isUndoRedo.value) {
    addHistory(element.innerHTML);
  }

  // 更新正文内容
  const newContent = element.innerHTML;
  convertedContentEdit.value = newContent;

  // 更新预览区卡片
  convertedCards.value = converter.splitContentIntoCards(newContent, formData);

  // 等待图片加载完成
  await Promise.all(
    Array.from(element.querySelectorAll("img")).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  await nextTick();
  // 只在输入法完成输入时恢复光标位置
  if (!isTyping.value) {
    try {
      restoreCaretPosition(element, caretPosition);
    } catch (error) {
      console.warn("Failed to restore caret position:", error);
    }
  }
}, 800);
// 保存光标位置
const saveCaretPosition = (element) => {
  const selection = window.getSelection();

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }
  return 0;
};
// 恢复光标位置
const restoreCaretPosition = (element, pos) => {
  const range = document.createRange();
  const selection = window.getSelection();

  let currentPos = 0;
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node = walker.nextNode();
  while (node) {
    const nodeLength = node.length;
    if (currentPos + nodeLength >= pos) {
      range.setStart(node, pos - currentPos);
      range.setEnd(node, pos - currentPos);
      break;
    }
    currentPos += nodeLength;
    node = walker.nextNode();
  }

  selection.removeAllRanges();
  selection.addRange(range);
};
// 添加历史记录
const addHistory = (content) => {
  // 如果是撤销/重做操作，不添加历史记录
  if (isUndoRedo.value) {
    isUndoRedo.value = false;
    return;
  } // 如果在历史记录中间位置进行了编辑，删除当前位置之后的记录
  if (currentHistoryIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, currentHistoryIndex.value + 1);
  }

  // 添加新的历史记录
  history.value.push(content);

  // 如果超出最大记录数，删除最早的记录
  if (history.value.length > MAX_HISTORY) {
    history.value.shift();
  }

  currentHistoryIndex.value = history.value.length - 1;
};

// 撤销操作
const handleUndo = () => {
  if (currentHistoryIndex.value > 0) {
    isUndoRedo.value = true;
    currentHistoryIndex.value--;
    const previousContent = history.value[currentHistoryIndex.value];

    // 更新正文内容
    if (previewContent.value) {
      previewContent.value.innerHTML = previousContent;
    }
    convertedContentEdit.value = previousContent;

    // 更新预览区卡片
    convertedCards.value = converter.splitContentIntoCards(
      previousContent,
      formData
    );

    isUndoRedo.value = false;
  }
};
// 重做操作
const handleRedo = () => {
  if (currentHistoryIndex.value < history.value.length - 1) {
    isUndoRedo.value = true;
    currentHistoryIndex.value++;
    const nextContent = history.value[currentHistoryIndex.value];

    // 更新正文内容
    if (previewContent.value) {
      previewContent.value.innerHTML = nextContent;
    }
    convertedContentEdit.value = nextContent;

    // 更新预览区卡片
    convertedCards.value = converter.splitContentIntoCards(
      nextContent,
      formData
    );

    isUndoRedo.value = false;
  }
};

// 添加键盘快捷键支持
const handleKeydown = (event) => {
  // 只在编辑器获得焦点时处理快捷键
  if (
    previewContent.value.contains(event.target) &&
    (event.ctrlKey || event.metaKey) &&
    event.key === "z"
  ) {
    event.preventDefault();
    if (event.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }
    return;
  }

  // 处理输入法状态
  if (event.isComposing) {
    // 中文输入法编辑状态
    isTyping.value = true;
    return;
  }

  // 检查是否为普通键盘输入（非功能键、非组合键）
  const isNormalKey =
    event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;

  // 如果是普通键盘输入，且输入法不是中文，设置为 false
  if (isNormalKey && !event.isComposing) {
    isTyping.value = false;
    return;
  }

  // 对于特殊键（空格、删除等），设置为 false
  if (
    event.key === " " ||
    event.key === "Backspace" ||
    event.key === "Delete"
  ) {
    isTyping.value = false;
  }
};
// 添加输入法结束的处理函数
const handleCompositionEnd = () => {
  isTyping.value = false;
};

watchEffect(() => {
  if (props.documentTitle) {
    formData.title = props.documentTitle;
  }
});

// 处理图片选择
const handleCoverChange = (file) => {
  if (file && file.raw) {
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.coverUrl = e.target.result; // base64格式的图片数据
    };
    reader.onerror = (e) => {
      console.error("图片读取失败:", e);
      ElMessage.error("图片读取失败");
    };
    reader.readAsDataURL(file.raw);
  }
};

// 上传前校验
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith("image/");
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isImage) {
    ElMessage.error("只能上传图片文件！");
    return false;
  }
  if (!isLt2M) {
    ElMessage.error("图片大小不能超过 2MB！");
    return false;
  }
  return true;
};

// 修改 watchEffect
watchEffect(async () => {
  try {
    // 添加对 formDataRef 的依赖
    const currentFormData = formDataRef.value;

    // 如果没有内容，直接返回
    if (!convertedContentEdit.value) {
      convertedCards.value = "";
      return;
    }

    // 先等待一个渲染周期
    await nextTick();

    // 等待所有现有图片加载完成
    await Promise.all(
      Array.from(document.querySelectorAll("img")).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // 转换内容为卡片
    convertedCards.value = await converter.splitContentIntoCards(
      convertedContentEdit.value,
      currentFormData
    );

    // 等待卡片渲染完成
    await nextTick();

    // 确保新的卡片中的图片加载完成
    await Promise.all(
      Array.from(cardsContainer.value?.querySelectorAll("img") || []).map(
        (img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
      )
    );
  } catch (error) {
    console.error("转换内容失败:", error);
  }
});

// 卡片计算
watch(
  [() => formData.title, () => formData.tag, () => formData.coverUrl],
  async ([newTitle, newTag, newCoverUrl]) => {
    try {
      await nextTick();
      await Promise.all(
        Array.from(document.querySelectorAll("img")).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      convertedCards.value = await converter.splitContentIntoCards(newContent, {
        title: newTitle,
        tag: newTag,
        coverUrl: newCoverUrl,
      });

      await nextTick();
    } catch (error) {
      console.error("转换内容失败:", error);
    }
  },
  {
    deep: true,
  }
);

// 组件挂载时初始化一次
onMounted(() => {
  nextTick(() => {
    // 使用事件委托处理编辑按钮点击
    document.querySelector(".xhs-panel").addEventListener("click", (e) => {
      const editBtn = e.target.closest(".image-edit-btn");
      if (editBtn) {
        const blockId = editBtn.getAttribute("data-block-id");
        if (blockId) {
          handleImageEdit(e, blockId);
        }
      } else {
        // 点击非图片编辑区域时
        const clickedOnImage = e.target.closest(".image-wrapper");
        if (!clickedOnImage && editingImageId.value) {
          // 获取当前正在编辑的图片元素
          const container = document.querySelector(".xhs-panel");
          const img = container.querySelector(
            `img[data-block-id="${editingImageId.value}"]`
          );
          const wrapper = container.querySelector(
            `.image-wrapper[data-block-id="${editingImageId.value}"]`
          );
          const editBtn = wrapper?.querySelector(".edit-text");

          if (img && editBtn) {
            // 退出编辑状态
            editingImageId.value = null;
            contenteditAble.value = true;
            img.setAttribute("data-editing", "false");
            editBtn.textContent = "编辑";
            editBtn.setAttribute("data-edit-state", "edit");
          }
        }
      }
    });
    // 初始化历史记录
    if (convertedContentEdit.value) {
      addHistory(convertedContentEdit.value);
    }
    // 添加键盘事件监听
    document.addEventListener("keydown", handleKeydown);
  });
});

// 添加编辑状态管理
const editingImageId = ref(null);

// 处理编辑按钮点击
const handleImageEdit = (event, blockId) => {
  event.preventDefault();
  event.stopPropagation();

  // 先获取所有相关元素
  const container = document.querySelector(".xhs-panel");
  const img = container.querySelector(`img[data-block-id="${blockId}"]`);
  const wrapper = container.querySelector(
    `.image-wrapper[data-block-id="${blockId}"]`
  );
  const editBtn = wrapper?.querySelector(".edit-text");

  if (!img || !wrapper || !editBtn) {
    console.error("找不到相关元素:", { img, wrapper, editBtn });
    return;
  }

  // 如果当前有其他图片正在编辑，先结束其编辑状态
  if (editingImageId.value && editingImageId.value !== blockId) {
    const prevImg = container.querySelector(
      `img[data-block-id="${editingImageId.value}"]`
    );
    const prevWrapper = container.querySelector(
      `.image-wrapper[data-block-id="${editingImageId.value}"]`
    );
    const prevEditBtn = prevWrapper?.querySelector(".edit-text");

    if (prevImg && prevEditBtn) {
      prevImg.setAttribute("data-editing", "false");
      prevEditBtn.textContent = "编辑";
      prevEditBtn.setAttribute("data-edit-state", "edit");
    }
  }

  if (editingImageId.value === blockId) {
    // 完成编辑
    editingImageId.value = null;
    contenteditAble.value = true;
    // 更新状态
    img.setAttribute("data-editing", "false");
    editBtn.textContent = "编辑";
    editBtn.setAttribute("data-edit-state", "edit");
  } else {
    // 开始编辑
    editingImageId.value = blockId;
    contenteditAble.value = false;
    // 更新状态
    img.setAttribute("data-editing", "true");
    editBtn.textContent = "完成";
    editBtn.setAttribute("data-edit-state", "done");
  }
};

// 在组件卸载时清理编辑状态
onBeforeUnmount(() => {
  editingImageId.value = null;
  document.removeEventListener("keydown", handleKeydown);
});

// 监听编辑状态变化，启用/禁用 interact
// 修改 updateImageStyles 函数
const updateImageStyles = (target, width, height, deltaY = 0) => {
  // 计算居中位置（水平居中）
  const parentWidth = target.parentElement.offsetWidth;
  const x = (parentWidth - width) / 2;

  // 获取当前的 y 值，如果没有则默认为 0
  const currentY = parseFloat(target.getAttribute("data-y")) || 0;
  // 更新 y 值，考虑拖动增量
  const y = currentY + deltaY;

  target.style.width = `${width}px`;
  target.style.height = `${height}px`;
  target.style.transform = `translate(${x}px, ${y}px)`;
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
};

// 修改 watch editingImageId 中的 resizable 配置
watch(editingImageId, (newId) => {
  const images = document.querySelectorAll(".resizable-image");
  images.forEach((img) => {
    const blockId = img.getAttribute("data-block-id");
    const interactable = interact(img);
    if (blockId === newId) {
      interactable.unset();
      interact(img).resizable({
        enabled: true,
        edges: {
          left: true,
          right: true,
          bottom: true,
          top: true,
        },
        margin: 10,
        listeners: {
          move(event) {
            event.preventDefault();
            event.stopPropagation();
            const target = event.target;

            // 更新当前图片尺寸，传入 deltaY
            updateImageStyles(
              target,
              event.rect.width,
              event.rect.height,
              event.deltaRect.top
            );

            // 同步更新预览区域的图片
            const blockId = target.getAttribute("data-block-id");
            const previewImg = cardsContainer.value?.querySelector(
              `img[data-block-id="${blockId}"]`
            );
            if (previewImg) {
              updateImageStyles(
                previewImg,
                event.rect.width,
                event.rect.height,
                event.deltaRect.top
              );
            }
          },
          end() {
            // 调整结束后立即更新一次
            if (previewContent.value) {
              const newContent = previewContent.value.innerHTML;
              // convertedContentEdit.value = newContent;
              convertedCards.value = converter.splitContentIntoCards(
                newContent,
                formData
              );
            }
          },
        },
        modifiers: [
          interact.modifiers.aspectRatio({
            ratio: "preserve",
            equalDelta: true,
          }),
          interact.modifiers.restrictEdges({
            outer: "parent",
            endOnly: true,
          }),
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 },
            max: { width: 800, height: 800 },
          }),
        ],
        inertia: true,
      });
      img.style.cursor = "nw-resize";
    } else {
      interactable.resizable({ enabled: false });
      img.style.cursor = "default";
    }
  });
});
</script>

<style scoped lang="scss">
.xhs-panel {
  :deep(span[style*="background-color"]) {
    display: inline;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    padding: 2px 0; // 可选：添加一些内边距
  }

  .col-left {
    background: #fff;
    display: flex;
    justify-content: center;
    border-radius: 5px;
    :deep(.image-wrapper) {
      .image-edit-btn {
        position: relative;
        // top: 8px;
        // right: 8px;
        width: 40px;
        height: 24px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 2;
        padding: 0 8px;

        .edit-text {
          font-size: 12px;
          font-weight: 500;
          color: #409eff;
          white-space: nowrap;

          &[data-edit-state="done"] {
            color: #67c23a;
          }
        }

        &:hover {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transform: translateY(-1px);
        }
      }

      &:hover .image-edit-btn {
        opacity: 1;
      }

      .resizable-image {
        transition: outline 0.2s;

        &[data-editing="true"] {
          outline: 2px solid #409eff;
          outline-offset: 2px;
          cursor: nw-resize;
          width: auto;
          height: auto;
          min-width: 100px;
          min-height: 50px;
        }

        &[data-editing="false"] {
          outline: none;
          cursor: default;
        }
      }

      &:has(.resizable-image[data-editing="true"]) .image-edit-btn {
        opacity: 1;
      }
    }
  }

  .col-right {
    display: flex;
    gap: 16px;
    justify-content: center;
    border-radius: 5px;
    :deep(.image-edit-btn) {
      display: none;
    }
  }

  &-left {
    width: 400px;

    // width: calc(100% - 400px - 30px - 16px * 2);
  }
  &-right {
    width: 400px;
    background: #fff;
    padding: 0 20px;
    box-sizing: content-box;
    border-radius: 5px;
    // margin-right: 16px;
  }
  &-side {
    width: 30px;
  }
  .right-main {
    display: flex;
    flex-direction: column;
    // justify-content: space-between;
    // align-items: center;
    gap: 16px;
    margin-top: 16px;
    img {
      width: 32px;
      height: 32px;
      cursor: pointer;
    }
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 48px;
    line-height: 48px;
  }
  .card-body {
    position: relative;
    height: calc(100vh - 70px);
    overflow: scroll;
    background: #fff;
    padding-top: 16px;
    border-radius: 5px;
  }
  .card-right {
    padding-top: 0;
    position: relative;
    height: calc(100vh - 70px);
    overflow: scroll;
    border-radius: 5px;
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .preview-content {
    // height: 100%;
    padding: 16px;
    width: 100%;
    // max-height: 550px;
    // overflow-y: scroll;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-input-border-radius, var(--el-border-radius-base));
  }

  .cover-uploader {
    width: 100%;
    :deep(.el-upload) {
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
      width: 100%;
      &:hover {
        border-color: var(--el-color-primary);
      }
    }
  }

  .cover-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-image {
    // width: 178px;
    height: 178px;
    display: block;
    object-fit: cover;
  }

  .cards-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    :deep(.card-main) {
      border: 1px solid var(--el-border-color);
      border-radius: var(
        --el-input-border-radius,
        var(--el-border-radius-base)
      );
    }
    // :deep(.fs-image-wrapper) {
    //   resize: none !important;
    //   max-width: 100%;
    // }
  }
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;

  .el-button {
    padding: 5px 12px;
    font-size: 12px;
  }
}
</style>
