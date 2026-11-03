import { defineStore } from "pinia";
import {
  getTenantAccessToken,
  getDocumentId,
  getDocumentBlocks,
  getImageUrl,
} from "@/services/api/feishu";
import { BlockType } from "@/types/feishu-blocks.js";
import { ElMessage, ElMessageBox } from "element-plus";
import pLimit from "p-limit";

// 添加转换图片为 base64 的函数
async function convertImageToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("转换图片为base64失败:", error);
    return ""; // 失败时返回空字符串
  }
}

export const useDocumentStore = defineStore("document", {
  state: () => ({
    loading: false,
    documentUrl:
      "https://example.feishu.cn/wiki/YOUR_DOC_TOKEN?from=from_copylink",
    documentType: "",
    originalContent: null,
    documentTitle: "飞书2ALL | 转换效果",
    tenantAccessToken: null,
    tokenExpireTime: null,
  }),

  actions: {
    /**
     * 处理API错误
     */
    handleApiError(error, customMessage = "接口请求失败") {
      let errorMessage = customMessage;
      let title = "服务发生错误";

      if (error.response?.data) {
        const { code, msg } = error.response.data;
        if (code === 131006) {
          title = "解析失败";
          errorMessage = `
            <div style="text-align: center;">
              <div style="color: #F56C6C; margin: 10px 0;">[错误码：${code}]您所解析的文档未公开分享</div>
              <div>解决方案请查看<a href="https://example.feishu.cn/wiki/YOUR_DOC_TOKEN#share-A7YBda2ypokGZ6xp0wfceaLQnee" target="_blank">说明文档</a></div>
            </div>
          `;
        } else {
          errorMessage = `
            <div style="text-align: center;">
              <div style="color: #F56C6C; margin: 10px 0;">${customMessage}：[${code}] ${
            msg || "未知错误"
          }</div>
              <div>请联系开发者确认</div>

            </div>
          `;
        }
      } else if (error.message) {
        errorMessage = `
          <div style="text-align: center;">
            <div>${customMessage}</div>
            <div style="color: #F56C6C; margin: 10px 0;">${error.message}</div>
            <div style="color: #909399;">请联系开发者确认</div>

          </div>
        `;
      }

      ElMessageBox.alert(errorMessage, title, {
        type: "error",
        confirmButtonText: "确定",
        dangerouslyUseHTMLString: true,
        customClass: "error-message-box",
      });
    },

    async getTenantToken() {
      const now = Date.now();
      if (
        this.tenantAccessToken &&
        this.tokenExpireTime &&
        now < this.tokenExpireTime
      ) {
        return this.tenantAccessToken;
      }

      try {
        // 尝试主要APP ID
        const response = await getTenantAccessToken();
        if (response.code === 0) {
          this.tenantAccessToken = response.tenant_access_token;
          this.tokenExpireTime = now + (2 * 60 - 5) * 60 * 1000;
          return this.tenantAccessToken;
        }

        // 如果有备用APP ID，尝试使用备用
        if (import.meta.env.VITE_FEISHU_APP_ID_BACKUP) {
          const backupResponse = await getTenantAccessToken(true);
          if (backupResponse.code === 0) {
            this.tenantAccessToken = backupResponse.tenant_access_token;
            this.tokenExpireTime = now + (2 * 60 - 5) * 60 * 1000;
            return this.tenantAccessToken;
          }
        }

        throw { response: { data: response } };
      } catch (error) {
        this.handleApiError(error, "获取访问令牌失败");
        throw error;
      }
    },

    async callApi(apiFunc, errorMessage, ...params) {
      const makeRequest = async (token) => {
        try {
          const response = await apiFunc(token, ...params);
          if (response.code === 0) {
            return response;
          }
          // 需要刷新token的错误码
          if ([2200, 4001, 5000, 10013, 99991663].includes(response.code)) {
            const newToken = await this.getTenantToken();
            return apiFunc(newToken, ...params);
          }
          throw { response: { data: response } };
        } catch (error) {
          this.handleApiError(error, errorMessage);
          return false;
        }
      };

      return makeRequest(await this.getTenantToken());
    },

    async parseDocument(url, type) {
      if (!url) {
        ElMessage.error("请输入飞书文档链接");
        return;
      }

      const feishuRegex =
        /^@?https:\/\/([^.]+\.feishu\.cn)\/(docx|wiki)\/([a-zA-Z0-9]+)(\?.*)?$/;
      const match = url.match(feishuRegex);

      if (!match) {
        ElMessage.error("无效的飞书文档链接");
        return;
      }

      const [, domain, urlType, identifier] = match;
      let documentId = "";

      if (!domain.endsWith(".feishu.cn")) {
        ElMessage.error("非法的飞书文档域名");
        return;
      }

      try {
        this.loading = true;

        if (urlType === "docx") {
          documentId = identifier;
        } else if (urlType === "wiki") {
          const response = await this.callApi(
            getDocumentId,
            "获取文档ID失败",
            identifier
          );
          if (!response) return;
          documentId = response.data.node.obj_token;
        }

        const blocksResponse = await this.callApi(
          getDocumentBlocks,
          "获取文档内容失败",
          documentId
        );
        if (!blocksResponse) return;

        this.documentUrl = url;
        this.documentType = type;
        let title = "";

        // 创建限流器，限制并发为3
        const limit = pLimit(3);
        // 创建延迟函数
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // 收集所有需要处理的图片块
        const imageBlocks = blocksResponse.data.items.filter(
          (item) => item.block_type === BlockType.IMAGE
        );

        // 分批处理图片，每批3个
        const batchSize = 3;
        const processedItems = [...blocksResponse.data.items];

        for (let i = 0; i < imageBlocks.length; i += batchSize) {
          const batch = imageBlocks.slice(i, i + batchSize);

          // 并发处理当前批次的图片
          await Promise.all(
            batch.map(async (item) => {
              const imageResponse = await limit(async () => {
                await delay(333); // 每个请求间隔333ms，确保每秒最多3个请求
                return this.callApi(
                  getImageUrl,
                  "获取图片链接失败",
                  item.image.token
                );
              });

              if (imageResponse) {
                const index = processedItems.findIndex(
                  (block) => block.block_id === item.block_id
                );
                if (index !== -1) {
                  const imageUrl =
                    imageResponse.data?.tmp_download_urls?.[0]
                      ?.tmp_download_url || "";

                  // 如果有图片URL，转换为base64
                  if (imageUrl) {
                    const base64Data = await convertImageToBase64(imageUrl);
                    processedItems[index] = {
                      ...item,
                      image: {
                        ...item.image,
                        url: imageUrl,
                        base64Url: base64Data,
                      },
                    };
                  } else {
                    processedItems[index] = {
                      ...item,
                      image: {
                        ...item.image,
                        url: "",
                        base64Url: "",
                      },
                    };
                  }
                }
              }
            })
          );

          // 每批处理完后等待1秒，确保不超过限制
          await delay(1000);
        }

        // 设置标题
        const pageBlock = processedItems.find(
          (item) => item.block_type === BlockType.PAGE
        );
        title = pageBlock?.page?.elements[0]?.text_run?.content || "";

        this.documentTitle = title;
        this.originalContent = processedItems;
      } catch (error) {
        console.error("解析文档失败:", error);
        ElMessage.error("解析文档失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },
  },
});
