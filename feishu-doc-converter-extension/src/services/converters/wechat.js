/**
 * 将飞书文档转换为微信公众号HTML，
 */
import { templates } from "@/template/wechat-template.js";
// import { BlockType } from "@/types/feishu-blocks.js";
import { BaseConverter } from "./base-converter";

export class WechatConverter extends BaseConverter {
  constructor(templateName = "template1") {
    super(templates[templateName] || templates["template1"]);
  }

  /**
   * 转换代码块
   * @param {Object} block 代码块
   * @returns {string} HTML字符串
   */
  convertCodeBlock(block) {
    const elements = block.elements || [];
    const content = elements
      .map((element) => this.convertTextElement(element))
      .join("");
    const containerStyle = this.generateInlineStyle(
      this.template.codeBlock.container.css
    );
    const codeStyle = this.generateInlineStyle(
      this.template.codeBlock.code.css
    );

    return `<pre style="${containerStyle}">${
      this.template.codeBlock.insert
        ? `<${this.template.codeBlock.insert.tag} style="${this.template.codeBlock.insert.css}">&nbsp;</${this.template.codeBlock.insert.tag}>`
        : ""
    }<code style="${codeStyle}">${content.replace(
      /\n/g,
      "<br/>"
    )}</code></pre>`;
  }

  /**
   * 转换文本元素
   * @param {Object} element 文本元素
   * @returns {string} HTML字符串
   */
  convertTextElement(element) {
    if (!element) return "";
    if (element.mention_doc) {
      const style = this.generateInlineStyle(this.template.textStyles.link.css);
      // 加span是为了适配微信,微信预览会变异
      return `<a href="${element.mention_doc.url}" target="_blank" style="${style}"><span  style="${style}">《${element.mention_doc.title}》</span></a>`;
    }

    if (element.text_run) {
      const url = element.text_run.text_element_style?.link?.url;

      const style = this.convertTextStyle(element.text_run.text_element_style);
      const content = element.text_run.content;
      content.replace(/\n/g, "<br/>");
      if (url) {
        // 加span是为了适配微信
        return `<span style="${style}"><a href="${decodeURIComponent(
          url
        )}" target="_blank" style="${style}">${content}</a></span>`;
      }

      if (style) {
        return `<span style="${style}">${content}</span>`;
      }
      return content;
    }

    // 处理其他类型的文本元素
    return "";
  }

  /**
   * 转换图片块
   * @param {Object} block 图片块
   * @returns {Promise<string>} HTML字符串
   */
  async convertImageBlock(block) {
    const imageStyle = this.generateInlineStyle(this.template.image.css);
    const { width, height, base64Url, align } = block.image;
    let alignStyle = "";
    if (align) {
      alignStyle = `text-align: ${this.getAlign(align)};`;
    }
    try {
      // 添加一个可调整大小的包装容器,需要调整计算卡片的函数来适应
      const content = `<div width="${width}px" height="${height}px" style="display: inline-block; resize: both; overflow: auto;" class="fs-image-wrapper" data-block-id="${block.block_id}">
              <img 
                src="${base64Url}" 
                width="${width}px" height="${height}px"
                style="${imageStyle};${alignStyle}; width: auto; height: 100%; object-fit: contain;" 
                data-block-id="${block.block_id}"
              /></div>`;
      return content;
    } catch (error) {
      console.error(error);
    }
  }

  wrapContent(content, globalStyle) {
    return `
      <div class="wechat-article" style="${globalStyle}">
        ${content}
      </div>
    `;
  }
}
