import {
  BlockType,
  Align,
  FontColor,
  FontBackgroundColor,
  BlockBackgroundColor,
  BlockBorderColor,
} from "@/types/feishu-blocks.js";
// 公众号编辑器不识别div，所以需要使用section
export class BaseConverter {
  constructor(template) {
    this.template = template;
  }
  /**
   * 生成内联样式
   * @param {string} css CSS样式字符串
   * @returns {string} 内联样式字符串
   */
  generateInlineStyle(css) {
    return css.replace(/\n/g, "").replace(/\s+/g, " ").trim();
  }

  /**
   * 转换文本样式
   * @param {Object} textElementStyle 文本样式对象
   * @returns {string} 样式字符串
   */
  convertTextStyle(textElementStyle) {
    if (!textElementStyle) return "";

    const styles = [];
    if (textElementStyle.bold) styles.push(this.template.textStyles.bold.css);
    if (textElementStyle.italic)
      styles.push(this.template.textStyles.italic.css);
    if (textElementStyle.underline)
      styles.push(this.template.textStyles.underline.css);
    if (textElementStyle.strikethrough)
      styles.push(this.template.textStyles.strikethrough.css);
    if (textElementStyle.inline_code) styles.push(this.template.inlineCode.css);

    // 处理文本颜色
    if (textElementStyle.text_color) {
      styles.push(`color: ${FontColor[textElementStyle.text_color]};`);
    }

    // 处理背景色
    if (textElementStyle.background_color) {
      styles.push(
        `background-color: ${
          FontBackgroundColor[textElementStyle.background_color]
        };`
      );
    }

    // 处理链接
    if (textElementStyle.link) {
      styles.push(this.template.textStyles.link.css);
    }

    return styles.join(" ");
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

  getAlign(align) {
    switch (align) {
      case Align.LEFT:
        return "left";
      case Align.CENTER:
        return "center";
      case Align.RIGHT:
        return "right";
    }
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
    // 加上&nbsp;修复”掘金不显示换行“的问题（知乎不能有&nbsp;要用<br>）
    // </br>
    return `<p style="${style};text-align:${textAlign};">${
      content === "" ? "&nbsp;" : content
    }</p>`;
  }
  /**
   * 转换标题块
   * @param {Object} block 标题块
   * @param {number} level 标题级别(1-9)
   * @returns {string} HTML字符串
   */
  convertHeadingBlock(block, level) {
    const elements = block.elements || [];
    const content = elements
      .map((element) => this.convertTextElement(element))
      .join("");
    const headingStyle = this.template.headings[`h${level}`];
    const style = this.generateInlineStyle(headingStyle.css);

    if (headingStyle.insert) {
      return `<${headingStyle.tag} style="${style}">
            ${content}
            <span style="${headingStyle.insert}"></span>
            </${headingStyle.tag}>`;
    }

    return `<${headingStyle.tag} style="${style}">${content}</${headingStyle.tag}>`;
  }

  /**
   * 转换列表块
   * @param {Array} blocks 所有块
   * @param {number} startIndex 开始位置
   * @param {boolean} ordered 是否为有序列表
   * @returns {{html: string, nextIndex: number}} 返回HTML字符串和下一个要处理的索引
   */
  convertListBlock(blocks, startIndex, ordered) {
    const listType = ordered ? "ordered" : "unordered";
    const containerStyle = this.generateInlineStyle(
      this.template.lists[listType].container.css
    );
    const itemStyle = this.generateInlineStyle(
      this.template.lists[listType].item.css
    );
    const listItems = [];

    let currentIndex = startIndex;
    const targetType = ordered ? BlockType.ORDERED : BlockType.BULLET;

    // 收集连续的列表项
    while (currentIndex < blocks.length) {
      const block = blocks[currentIndex];
      if (block.block_type !== targetType) {
        break;
      }

      const elements = ordered ? block.ordered.elements : block.bullet.elements;
      const content = elements
        .map((element) => this.convertTextElement(element))
        .join("");
      listItems.push(`<li style="${itemStyle}">${content}</li>`);
      currentIndex++;
    }

    const html = `
            <${
              this.template.lists[listType].container.tag
            } style="${containerStyle}">
                ${listItems.join("\n")}
            </${this.template.lists[listType].container.tag}>
        `;

    return {
      html,
      nextIndex: currentIndex,
    };
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
        ? `<${this.template.codeBlock.insert.tag} style="${this.template.codeBlock.insert.css}"></${this.template.codeBlock.insert.tag}>`
        : ""
    }<code style="${codeStyle}">${content}</code></pre>`;
  }

  /**
   * 转换引用块
   * @param {Object} block 引用块
   * @returns {string} HTML字符串
   */
  convertQuoteBlock(block) {
    const elements = block.elements || [];
    const content = elements
      .map((element) => this.convertTextElement(element))
      .join("");
    const style = this.generateInlineStyle(this.template.blockquote.css);

    return `<blockquote style="${style}">${content}</blockquote>`;
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
      // 添加一个可调整大小的包装容器,需要调整计算卡片的函数来适应
      const content = `<div width="${width}px" height="${height}px" style="display: inline-block; resize: both; overflow: auto;" class="fs-image-wrapper" data-block-id="${block.block_id}">
            <img 
              src="${url}" 
              width="${width}px" height="${height}px"
              style="${imageStyle};${alignStyle}; width: auto; height: 100%; object-fit: contain;" 
              data-block-id="${block.block_id}"
            /></div>`;
      return content;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * 转换单个块
   * @param {Array} blocks 所有块
   * @param {number} index 当前块索引
   * @returns {Promise<{html: string, nextIndex: number}>} HTML字符串和下一个要处理的索引
   */
  async convertBlock(blocks, index) {
    try {
      const block = blocks[index];

      switch (block.block_type) {
        case BlockType.BULLET:
          return this.convertListBlock(blocks, index, false);
        case BlockType.ORDERED:
          return this.convertListBlock(blocks, index, true);
        case BlockType.TEXT:
          return {
            html: this.convertTextBlock(block.text),
            nextIndex: index + 1,
          };
        case BlockType.HEADING1: {
          const level = 1;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING2: {
          const level = 2;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING3: {
          const level = 3;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING4: {
          const level = 4;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING5: {
          const level = 5;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING6: {
          const level = 6;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING7: {
          const level = 7;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING8: {
          const level = 8;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.HEADING9: {
          const level = 9;
          return {
            html: this.convertHeadingBlock(block[`heading${level}`], level),
            nextIndex: index + 1,
          };
        }
        case BlockType.CODE:
          return {
            html: this.convertCodeBlock(block.code),
            nextIndex: index + 1,
          };
        case BlockType.QUOTE:
          return {
            html: this.convertQuoteBlock(block.quote),
            nextIndex: index + 1,
          };
        case BlockType.IMAGE:
          return {
            html: await this.convertImageBlock(block),
            nextIndex: index + 1,
          };
        case BlockType.CALLOUT:
          return {
            html: await this.convertCalloutBlock(blocks, block),
            nextIndex: index + 1,
          };
        case BlockType.TODO:
          return {
            html: this.convertTodoBlock(block.todo),
            nextIndex: index + 1,
          };
        case BlockType.DIVIDER:
          return {
            html: this.convertDividerBlock(),
            nextIndex: index + 1,
          };
        case BlockType.TABLE:
          return {
            html: this.convertTableBlock(blocks, block),
            nextIndex: index + 1,
          };
        case BlockType.QUOTE_CONTAINER:
          return {
            html: await this.convertQuoteContainerBlock(blocks, block),
            nextIndex: index + 1,
          };
        default:
          return {
            html: "",
            nextIndex: index + 1,
          };
      }
    } catch (error) {
      console.error("Error in convertBlock:", error);
      return {
        html: "",
        nextIndex: index + 1,
      };
    }
  }
  /**
   * 转换高亮块
   * @param {Object} block 高亮块
   * @returns {string} HTML字符串
   */
  async convertCalloutBlock(blocks, block) {
    try {
      let style = this.generateInlineStyle(this.template.callout?.css || "");
      // const contentStyle = this.generateInlineStyle(
      //   this.template.callout?.contentCss || ""
      // );

      // 添加背景色和边框颜色
      if (block.callout?.background_color) {
        style += ` background-color: ${
          BlockBackgroundColor[block.callout.background_color]
        };`;
      }
      if (block.callout?.border_color) {
        style += ` border: 1px solid ${
          BlockBorderColor[block.callout.border_color]
        };`;
      }

      let content = "";

      // 处理所有子元素
      if (block.children && block.children.length > 0) {
        for (const childId of block.children) {
          const childBlock = blocks.find((b) => b.block_id === childId);
          if (childBlock) {
            const { html } = await this.convertBlock(
              blocks,
              blocks.indexOf(childBlock)
            );
            content += html;
            childBlock.processed = true;
          }
        }
      }

      return `<section style="${style}">${content}</section>`;
    } catch (error) {
      console.error("Error in convertCalloutBlock:", error);
      return "";
    }
  }

  /**
   * 转换待办事项块
   * @param {Object} block 待办事项块
   * @returns {string} HTML字符串
   */
  convertTodoBlock(block) {
    const elements = block.elements || [];
    const todoTemplate = this.template.todo;
    const content = elements
      .map((element) => this.convertTextElement(element))
      .join("");
    const containerStyle = this.generateInlineStyle(todoTemplate.container.css);
    const checkboxStyle = this.generateInlineStyle(
      block.style?.done
        ? todoTemplate.checkbox.css + todoTemplate.checkbox.checked.css
        : todoTemplate.checkbox.css
    );

    return `
            <${todoTemplate.container.tag} style="${containerStyle}">
              <span style="${
                block.style?.done
                  ? todoTemplate.checkbox.checked.boxcss
                  : todoTemplate.checkbox.boxcss
              }">
              </span><span style="${
                block.style?.done
                  ? todoTemplate.checkbox.checked.css
                  : todoTemplate.checkbox.css
              }">${content}</span>
            </${todoTemplate.container.tag}>
        `;
  }

  /**
   * 转换分割线块
   * @returns {string} HTML字符串
   */
  convertDividerBlock() {
    const style = this.generateInlineStyle(this.template.divider.css);
    return `<hr style="${style}" />`;
  }

  async convert(blocks) {
    try {
      const globalStyle = this.generateInlineStyle(this.template.global.css);
      const contents = [];

      let i = 0;
      while (i < blocks.length) {
        // 跳过已处理的blocks
        if (blocks[i].processed) {
          i++;
          continue;
        }

        const { html, nextIndex } = await this.convertBlock(blocks, i);
        if (html) {
          contents.push(html);
        }
        i = nextIndex;
      }

      const content = contents.join("\n");
      return this.wrapContent(content, globalStyle);
    } catch (error) {
      console.error("Error converting document:", error);
      throw error;
    }
  }

  // 子类可以覆盖此方法来自定义包装器
  wrapContent(content, globalStyle) {
    console.log("globalStyle", globalStyle);
    return `
      <div style="${globalStyle}">
        ${content}
      </div>
    `;
  }

  /**
   * 转换表格块
   * @param {Array} blocks 所有块
   * @param {Object} block 表格块
   * @returns {string} HTML字符串
   */
  convertTableBlock(blocks, block) {
    const { cells, property } = block.table;
    const { row_size, column_size, merge_info } = property;
    const tableStyle = this.generateInlineStyle(this.template.table.css);
    const trCss = this.generateInlineStyle(this.template.table.trCss);
    const tdCss = this.generateInlineStyle(this.template.table.tdCss);

    // 创建占用状态数组
    const occupied = Array(row_size)
      .fill(0)
      .map(() => Array(column_size).fill(false));

    let tableContent = "";
    let cellIndex = 0;

    for (let i = 0; i < row_size; i++) {
      let rowContent = "";

      for (let j = 0; j < column_size; j++) {
        // 如果该位置已被占用则跳过
        if (occupied[i][j]) {
          cellIndex++;
          continue;
        }

        // 获取当前单元格的合并信息
        const mergeInfo = merge_info[cellIndex];
        const rowSpan =
          mergeInfo?.row_span > 1 ? ` rowspan="${mergeInfo.row_span}"` : "";
        const colSpan =
          mergeInfo?.col_span > 1 ? ` colspan="${mergeInfo.col_span}"` : "";

        // 标记被合并的单元格位置
        if (mergeInfo) {
          for (let r = 0; r < (mergeInfo.row_span || 1); r++) {
            for (let c = 0; c < (mergeInfo.col_span || 1); c++) {
              if (r === 0 && c === 0) continue; // 跳过当前单元格
              if (i + r < row_size && j + c < column_size) {
                occupied[i + r][j + c] = true;
              }
            }
          }
        }

        // 获取单元格内容
        const cellId = cells[cellIndex];
        const tableCellBlock = blocks.find(
          (b) => b.block_id === cellId && b.block_type === 32
        );

        let cellContent = "";
        if (tableCellBlock && tableCellBlock.children) {
          // 处理所有children
          const contents = tableCellBlock.children.map((contentBlockId) => {
            const contentBlock = blocks.find(
              (b) => b.block_id === contentBlockId
            );
            if (contentBlock) {
              contentBlock.processed = true;
              return this.convertTextBlock(contentBlock.text, true);
            }
            return "";
          });
          cellContent = contents.join("");
        }

        if (tableCellBlock) {
          tableCellBlock.processed = true;
        }

        rowContent += `<td${rowSpan}${colSpan} style="${tdCss}">${cellContent}</td>`;
        cellIndex++;
      }

      tableContent += `<tr style="${trCss}">${rowContent}</tr>`;
    }

    return `
      <table style="${tableStyle}">
        <tbody>
          ${tableContent}
        </tbody>
      </table>
    `;
  }
  /**
   * 转换引用容器块
   * @param {Array} blocks 所有块
   * @param {Object} block 引用容器块
   * @returns {string} HTML字符串
   */
  async convertQuoteContainerBlock(blocks, block) {
    try {
      const style = this.generateInlineStyle(
        this.template.quoteContainer?.css || ""
      );
      let content = "";

      // 处理所有子元素
      if (block.children && block.children.length > 0) {
        for (const childId of block.children) {
          const childBlock = blocks.find((b) => b.block_id === childId);
          if (childBlock) {
            // 转换子元素
            const { html } = await this.convertBlock(
              blocks,
              blocks.indexOf(childBlock)
            );
            content += html;

            // 标记子元素为已处理
            childBlock.processed = true;
          }
        }
      }

      return `<${this.template.quoteContainer?.tag} style="${style}">${content}</${this.template.quoteContainer?.tag}>`;
    } catch (error) {
      console.error("Error in convertQuoteContainerBlock:", error);
      return "";
    }
  }
}
