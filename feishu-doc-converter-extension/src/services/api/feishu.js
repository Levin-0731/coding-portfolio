import axios from "axios";

const isDevelopment = process.env.NODE_ENV === "development";
const FEISHU_API_BASE = isDevelopment
  ? "/api"
  : "https://open.feishu.cn/open-apis";

/**
 * 获取飞书API访问令牌
 */
async function getTenantAccessToken(isBackup = false) {
  const config = {
    app_id: isBackup
      ? import.meta.env.VITE_FEISHU_APP_ID_BACKUP
      : import.meta.env.VITE_FEISHU_APP_ID,
    app_secret: isBackup
      ? import.meta.env.VITE_FEISHU_APP_SECRET_BACKUP
      : import.meta.env.VITE_FEISHU_APP_SECRET,
  };

  const response = await axios.post(
    `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`,
    config
  );
  return response.data;
}

/**
 * 通过文档标识Token获取文档ID
 */
async function getDocumentId(token, docToken) {
  const response = await axios.get(
    `${FEISHU_API_BASE}/wiki/v2/spaces/get_node?obj_type=wiki&token=${docToken}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * 获取文档的所有内容块
 */
async function getDocumentBlocks(token, documentId) {
  const response = await axios.get(
    `${FEISHU_API_BASE}/docx/v1/documents/${documentId}/blocks?document_revision_id=-1&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * 获取临时下载链接
 */
async function getImageUrl(token, fileToken) {
  const response = await axios.get(
    `${FEISHU_API_BASE}/drive/v1/medias/batch_get_tmp_download_url?file_tokens=${fileToken}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export { getTenantAccessToken, getDocumentId, getDocumentBlocks, getImageUrl };
