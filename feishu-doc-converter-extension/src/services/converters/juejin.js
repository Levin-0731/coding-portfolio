/**
 * 将飞书文档转换为掘金 HTML，
 */
import { templates } from "@/template/juejin-template.js";
import { BaseConverter } from "./base-converter";

export class JuejinConverter extends BaseConverter {
  constructor(templateName = "template1") {
    super(templates[templateName] || templates["template1"]);
  }

  wrapContent(content, globalStyle) {
    return `
      <div class="juejin-article" style="${globalStyle}">
        ${content}
      </div>
    `;
  }
}
