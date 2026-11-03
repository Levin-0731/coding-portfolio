/**
 * 将飞书文档转换为zhihu HTML，
 */
import { templates } from "@/template/zhihu-template.js";
import { BaseConverter } from "./base-converter";

export class ZhihuConverter extends BaseConverter {
  constructor(templateName = "template1") {
    super(templates[templateName] || templates["template1"]);
  }

  /**
   * 转换文本块
   * @param {Object} block 文本块
   * @returns {string} HTML字符串
   */
  convertTextBlock(block, isInline = false) {
    const elements = block.elements || [];
    const blockStyle = block.style || {};
    let textAlign = "left";
    if (blockStyle.align) {
      textAlign = this.getAlign(blockStyle.align);
    }

    const content = elements
      .map((element) => this.convertTextElement(element))
      .join("");
    const style = isInline
      ? this.generateInlineStyle(this.template.paragraph.inlineCss)
      : this.generateInlineStyle(this.template.paragraph.css);
    // 知乎不能有&nbsp;要用<br>）
    return `<p style="${style};text-align:${textAlign};">${
      content === "" ? "<br>" : content
    }</p>`;
  }

  wrapContent(content, globalStyle) {
    return `
      <div class="zhihu-article" style="${globalStyle}">
        ${content}
      </div>
    `;
  }
}
