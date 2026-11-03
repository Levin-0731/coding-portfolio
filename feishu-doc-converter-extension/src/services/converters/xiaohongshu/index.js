// 主文件，导出 XiaohongshuConverter 类
import { templates } from "@/template/xhs-template.js";
import { BaseConverter } from "../base-converter";
import { CardManager } from "./card-manager";
import { ElementSplitter } from "./element-splitter";
// import { ImageProcessor } from "./image-processor";

export class XiaohongshuConverter extends BaseConverter {
  constructor(templateName = "template1") {
    super(templates[templateName] || templates["template1"]);
    this.cardManager = new CardManager(this.template);
    this.elementSplitter = new ElementSplitter(this.template);
    // this.imageProcessor = new ImageProcessor(this.template);
  }

  wrapContent(content, globalStyle) {
    return `
        ${content}
    `;
  }
  convertArticle(content, formData) {
    return this.cardManager.convertArticle(content, formData);
  }

  getCardSize() {
    return this.cardManager.getCardSize();
  }

  splitContentIntoCards(originalContent, formData) {
    if (!originalContent) return "";
    const content = this.convertArticle(originalContent, formData);
    const cards = this.elementSplitter.splitContent(content);
    return this.cardManager.wrapCards(
      cards,
      this.getCharCount(originalContent),
      formData
    );
  }

  getCharCount(content) {
    return content.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
  }

  /**
   * 下载并压缩图片为base64
   * @param {string} url 图片URL
   * @returns {Promise<string>} base64字符串
   */
  async downloadAndCompressImage(url) {
    try {
      // 下载图片
      const response = await fetch(url);
      const blob = await response.blob();

      // 创建图片对象
      const img = new Image();
      const imageUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // 创建canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // 计算压缩后的尺寸
          let { width, height } = img;
          const maxSize = 1200; // 最大尺寸限制

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          // 设置canvas尺寸
          canvas.width = width;
          canvas.height = height;

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为base64，使用0.8的质量压缩
          const base64 = canvas.toDataURL("image/jpeg", 0.8);

          // 清理资源
          URL.revokeObjectURL(imageUrl);

          resolve(base64);
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error("图片加载失败"));
        };

        img.src = imageUrl;
      });
    } catch (error) {
      console.error("图片处理失败:", error);
      throw error;
    }
  }

  /**
   * 转换图片块
   * @param {Object} block 图片块
   * @returns {Promise<string>} HTML字符串
   */
  async convertImageBlock(block) {
    const imageStyle = this.generateInlineStyle(this.template.image.css);
    const { width, height, url, align } = block.image;
    let alignStyle = "";
    if (align) {
      alignStyle = `text-align: ${this.getAlign(align)};`;
    }

    try {
      // 下载并压缩图片为base64
      const base64Url = await this.downloadAndCompressImage(url);

      // 添加一个可调整大小的包装容器
      const content = `
        <div class="image-wrapper" data-block-id="${block.block_id}">
          <div class="image-edit-btn" data-block-id="${block.block_id}">
            <span class="edit-text" data-edit-state="edit" contenteditable="false">编辑</span>
          </div>
          <img 
            src="${base64Url}" 
            width="${width}px" 
            height="${height}px"
            style="${imageStyle};${alignStyle}; object-fit: fill; touch-action: none; user-select: none;" 
            data-block-id="${block.block_id}"
            class="resizable-image"
            data-editing="false"
          />
        </div>
      `;
      return content;
    } catch (error) {
      console.error("转换图片块失败:", error);
      // 如果转换失败，返回原始URL的图片
      const content = `
        <div class="image-wrapper" data-block-id="${block.block_id}">
          <div class="image-edit-btn" data-block-id="${block.block_id}">
            <span class="edit-text" data-edit-state="edit" contenteditable="false">编辑</span>
          </div>
          <img 
            src="${url}" 
            width="${width}px" 
            height="${height}px"
            style="${imageStyle};${alignStyle}; object-fit: fill; touch-action: none; user-select: none;" 
            data-block-id="${block.block_id}"
            class="resizable-image"
            data-editing="false"
          />
        </div>
      `;
      return content;
    }
  }
}
