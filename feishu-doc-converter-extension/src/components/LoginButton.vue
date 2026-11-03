<template>
  <div class="login-container">
    <template v-if="isLoggedIn">
      <span class="usage-count"
        >剩余次数：{{ remainingUsage }}/{{ FREE_USAGE_LIMIT }}</span
      >
      <el-dropdown>
        <span class="user-info">
          <el-tag
            v-if="userInfo?.membershipStatus === 'active'"
            size="small"
            type="success"
            class="member-tag"
          >
            会员
          </el-tag>
          <span>{{ userInfo?.name || "用户" }}</span>
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-if="userInfo?.membershipStatus !== 'active'"
              @click="showMembershipDialog"
            >
              开通会员
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
    <template v-else>
      <div class="guest-info">
        <span class="usage-count"
          >剩余次数：{{ remainingUsage }}/{{ FREE_USAGE_LIMIT }}</span
        >
        <el-button type="primary" @click="handleLogin">登录</el-button>
      </div>
    </template>

    <!-- 会员购买弹窗 -->
    <el-dialog v-model="membershipDialogVisible" title="开通会员" width="400px">
      <div class="membership-content">
        <div class="price-info">
          <h3>会员特权</h3>
          <ul>
            <li>无限次数使用</li>
            <li>优先体验新功能</li>
            <li>专属技术支持</li>
          </ul>
          <div class="price"><span class="amount">¥10</span>/月</div>
        </div>
        <div class="payment-info">
          <h3>支付方式</h3>
          <div class="qr-codes">
            <div class="qr-item">
              <img :src="wechatQRCode" alt="微信支付" />
              <p>微信支付</p>
            </div>
            <div class="qr-item">
              <img :src="alipayQRCode" alt="支付宝" />
              <p>支付宝</p>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { eventBus } from "@/utils/eventBus";

import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { authService, FREE_USAGE_LIMIT } from "@/services/auth";
import wechatQRCode from "@/assets/wechat-qr.png";
import alipayQRCode from "@/assets/alipay-qr.png";

const isLoggedIn = ref(false);
const userInfo = ref(null);
const membershipDialogVisible = ref(false);
const currentUsage = ref(0);

// 修改为普通的计算属性
const remainingUsage = computed(() => {
  return FREE_USAGE_LIMIT - currentUsage.value;
});

// 添加获取使用次数的方法
const updateUsageCount = async () => {
  currentUsage.value = await authService.getUsageCount();
};

// 在事件监听中更新使用次数
onMounted(() => {
  updateLoginState();
  updateUsageCount(); // 初始化时获取使用次数

  eventBus.on("usage-updated", async () => {
    await updateUsageCount();
  });
});

const updateLoginState = () => {
  isLoggedIn.value = authService.isLoggedIn();
  userInfo.value = authService.getUserInfo();
};

const showMembershipDialog = () => {
  membershipDialogVisible.value = true;
};

onMounted(async () => {
  // 初始化时尝试恢复登录状态
  const restored = await authService.init();
  if (restored) {
    updateLoginState();
  }
});

const handleLogin = async () => {
  try {
    ElMessage.success("登录中...");

    await authService.login();
    updateLoginState();
    ElMessage.success("登录成功");
  } catch (error) {
    console.error("登录失败:", error);
    ElMessage.error("登录失败，请重试");
  }
};

const handleLogout = async () => {
  try {
    await authService.logout();
    updateLoginState();
    ElMessage.success("已退出登录");
  } catch (error) {
    console.error("退出失败:", error);
    ElMessage.error("退出失败，请重试");
  }
};

// 添加事件监听
onMounted(() => {
  updateLoginState();
  eventBus.on("usage-updated", () => {
    // 强制更新计算属性
    remainingUsage.value =
      FREE_USAGE_LIMIT - (authService.getUsageCount() || 0);
  });
});

// 清理事件监听
onUnmounted(() => {
  eventBus.off("usage-updated");
});
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
}

.guest-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-count {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.member-tag {
  margin-right: 8px;
}

.membership-content {
  padding: 20px;
}

.price-info {
  text-align: center;
  margin-bottom: 30px;
}

.price-info ul {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.price-info .price {
  font-size: 16px;
  color: var(--el-color-danger);
}

.price-info .price .amount {
  font-size: 32px;
  font-weight: bold;
}

.qr-codes {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.qr-item {
  text-align: center;
}

.qr-item img {
  width: 150px;
  height: 150px;
  margin-bottom: 10px;
}
</style>
