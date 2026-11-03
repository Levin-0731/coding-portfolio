<template>
  <!-- <el-row :gutter="2"> -->
  <!-- <el-col :span="14" :offset="6"> -->
  <div class="input-section">
    <el-input
      v-model="inputUrl"
      placeholder="输入飞书分享链接"
      class="input-with-select"
      @keyup.enter="handleParse"
    >
    </el-input>
    <el-button type="primary" :loading="loading" @click="handleParse">
      {{ loading ? "解析中..." : "开始转换" }}
    </el-button>
  </div>
  <!-- </el-col> -->
  <!-- </el-row> -->
</template>

<script setup>
import { ref, watch, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { analytics } from "@/utils/analytics";
import { authService } from "@/services/auth";

const props = defineProps({
  modelValue: String,
  loading: Boolean,
});

const emit = defineEmits(["update:modelValue", "parse", "type-change"]);

const inputUrl = ref(props.modelValue);
const documentType = ref("feishu");
const lastClickTime = ref(0);
const clickCount = ref(0);
const clickResetTimer = ref(null);

watch(inputUrl, (newValue) => {
  emit("update:modelValue", newValue);
});

// const handleParse = () => {
//   emit("parse", {
//     url: inputUrl.value,
//     type: documentType.value,
//   });
// };
const handleParse = async () => {
  // if (!authService.canUseService()) {
  //   ElMessage.warning({
  //     message: "本月免费次数已用完，开通会员享无限次数使用",
  //     duration: 5000,
  //     showClose: true,
  //   });
  //   return;
  // }

  // if (!(await authService.incrementUsage())) {
  //   ElMessage.warning("本月使用次数已达上限");
  //   return;
  // }

  const now = Date.now();

  // 检查点击间隔（1秒限制）
  if (now - lastClickTime.value < 1000) {
    ElMessage.warning("请稍后再试，点击太频繁了");
    return;
  }

  // 检查每分钟点击次数（10次限制）
  if (clickCount.value >= 10) {
    ElMessage.warning("你的操作太频繁了，请稍后再试");
    return;
  }

  // 更新点击时间和次数
  lastClickTime.value = now;
  clickCount.value++;

  // 第一次点击时启动重置计时器
  if (clickCount.value === 1) {
    clickResetTimer.value = setTimeout(() => {
      clickCount.value = 0;
    }, 60000);
  }

  emit("parse", {
    url: inputUrl.value,
    type: documentType.value,
  });
  // 埋点
  analytics.sendEvent("start_convert", {
    button_name: "开始转换",
    document_url: inputUrl.value || "",
    timestamp: new Date().toISOString(),
  });
};

// 组件卸载时清理定时器
onUnmounted(() => {
  if (clickResetTimer.value) {
    clearTimeout(clickResetTimer.value);
  }
});
</script>

<style scoped lang="scss">
.input-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex: 1 1 500px;
  // max-width: 700px;

  .input-with-select {
    flex: 1;
  }
}
</style>
