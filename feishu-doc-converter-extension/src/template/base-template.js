export const baseTemplate = {
  // 全局样式设置
  global: {
    css: `letter-spacing: 1.2px;
        font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Arial', sans-serif;`,
  },
  // 标题样式设置
  headings: {
    // h1标题样式 - 通常用于文章主标题
    h1: {
      tag: "h1",
      css: `
                /* 设置字体大小为px，作为最大标题 */
                font-size: 20px;
                /* 设置字体粗细为700，使标题更加醒目 */
                font-weight: 700;
                color: #454F5E;
                /* 设置上下外边距，确保标题与其他内容有适当的间距 */
                /* margin: 28px 0 20px; */
                margin: 15px 0 12px;
                border-left: 4px solid #454F5E;
                height: 20px;
                padding-left: 5px;
                line-height: 20px;
            `,
    },
    // h2标题样式 - 用于文章主要分节
    h2: {
      tag: "h2",
      css: `
          font-size: 16px;
          font-weight: 600;
          color: #454F5E;
          margin: 15px 0 12px;
          position: relative;
          display: inline-block;
         height: 22px;
    border-bottom: 8px solid rgba(69, 79, 94, 0.2);
            `,
    },
    // h3标题样式 - 用于小节标题
    h3: {
      tag: "h3",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                /* margin: 20px 0 14px; */
                margin: 15px 0 12px;

                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h4: {
      tag: "h4",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                /* margin: 20px 0 14px; */margin: 15px 0 12px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h5: {
      tag: "h5",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                /* margin: 20px 0 14px; */margin: 15px 0 12px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h6: {
      tag: "h6",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                margin: 20px 0 14px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h7: {
      tag: "p",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                margin: 20px 0 14px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h8: {
      tag: "p",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                margin: 20px 0 14px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
    h9: {
      tag: "p",
      css: `
                /* 设置字体大小为19px，作为三级标题 */
               font-size: 14px;
                /* 设置字体粗细 */
                font-weight: 600;
                /* 设置标题颜色 */
               color: #454F5E;
                /* 设置上下外边距 */
                margin: 20px 0 14px;
                /* 设置行高 */
                line-height: 1.4;
            `,
    },
  },
  // 段落样式设置
  paragraph: {
    tag: "p",
    css: `
            font-size: 14px;
            color: rgba(69, 79, 94, 0.8);
            margin: 12px 0;
            line-height: 1.75;
            text-align: justify;
        `,
    inlineCss: `
            font-size: 14px;
            color: rgba(69, 79, 94, 0.8);
            line-height: 1.75;
            text-align: justify;
        `,
  },
  // 引用块样式设置
  blockquote: {
    tag: "blockquote",
    css: `
            /* 设置上下外边距 */
            margin: 20px 0;
            /* 设置内边距，让引用内容有呼吸空间 */
            padding: 20px 24px;
            /* 设置浅灰色背景，区分于普通文本 */
            background-color: #f8f9fa;
            /* 左侧添加蓝色边框，是引用块的特征标识 */
            border-left: 4px solid #3498db;
            /* 设置文字颜色为灰色，与正文区分 */
            color: #5f6368;
            /* 设置字体大小 */
            font-size: 12px;
            /* 设置行高 */
            line-height: 1.8;
            /* 设置右侧圆角，增加视觉美感 */
            border-radius: 0 4px 4px 0;
        `,
  },
  // 代码块样式设置
  codeBlock: {
    // 代码块容器样式
    container: {
      tag: "pre",
      css: `
                margin: 0;
                padding: 0;
                background-color:#282c34;
                border-radius: 6px;
                /* 允许横向滚动，防止代码超出容器 */
                overflow-x: auto;
                /* 添加边框 */
                box-shadow: rgba(0, 0, 0, 0.55) 0px 2px 10px;
                font-size: 12px;
            `,
    },
    // 代码文本样式
    code: {
      tag: "code",
      css: `
            display: -webkit-box;
            padding: 10px;
            font-family: 'Courier New', Courier, monospace;
            line-height: 1.5;
            color: #abb2bf;
            `,
    },
    insert: {
      tag: "span",
      css: `display: block;height: 30px;width: 100px;background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NTAiIGhlaWdodD0iMTMwIj48ZWxsaXBzZSBjeD0iNjUiIGN5PSI2NSIgZmlsbD0iI0VENkM2MCIgc3Ryb2tlPSIjREMzQzM2IiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI1MCIgcnk9IjUyIi8+PGVsbGlwc2UgY3g9IjIyNSIgY3k9IjY1IiBmaWxsPSIjRjdDMTUxIiBzdHJva2U9IiNEQTk3MjEiIHN0cm9rZS13aWR0aD0iMiIgcng9IjUwIiByeT0iNTIiLz48ZWxsaXBzZSBjeD0iMzg1IiBjeT0iNjUiIGZpbGw9IiM2NEM4NTYiIHN0cm9rZT0iIzFCQTEyNSIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNTAiIHJ5PSI1MiIvPjwvc3ZnPg==);background-size: 40px;background-repeat: no-repeat;background-color: #282c34;border-radius: 5px;background-position: 10px 10px;`,
    },
  },
  quoteContainer: {
    tag: "blockquote",
    css: `
            padding-left: 12px;
            border-left: 2px solid #bbbdc1;
            padding-top: 0px;
            `,
  },
  // 图片样式设置
  image: {
    tag: "img",
    css: `
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 5px;
            box-shadow: rgba(0, 0, 0, 0.1) 2px 2px 8px;
        `,
    // 图片说明文字样式
    caption: {
      tag: "p",
      css: `
                /* 文字居中 */
                text-align: center;
                /* 设置文字颜色为灰色 */
                color: #666666;
                /* 设置字体大小 */
                font-size: 14px;
                /* 设置外边距 */
                margin: 8px 0 20px;
                /* 设置斜体样式 */
                font-style: italic;
            `,
    },
  },
  // 列表样式设置
  lists: {
    // 无序列表样式
    unordered: {
      // 列表容器样式
      container: {
        tag: "ul",
        css: `
                    /* 设置上下外边距 */
                    margin: 16px 0;
                    /* 设置左侧内边距，为列表符号留出空间 */
                    padding-left: 20px;
                    /* 设置列表项符号为实心圆点 */
                    list-style-type: disc;
                `,
      },
      // 列表项样式
      item: {
        tag: "li",
        css: `
                    /* 设置字体大小 */
                    font-size: 14px;
                    /* 设置文字颜色 */
                    color: rgba(69, 79, 94, 0.8);
                    /* 设置列表项间距 */
                    margin: px 0;
                    /* 设置行高 */
                    line-height: 1.75;
                `,
      },
    },
    // 有序列表样式
    ordered: {
      // 列表容器样式
      container: {
        tag: "ol",
        css: `
                    /* 设置上下外边距 */
                    margin: 16px 0;
                    /* 设置左侧内边距，为数字编号留出空间 */
                    padding-left: 24px;
                    /* 设置列表项编号为数字 */
                    list-style-type: decimal;
                `,
      },
      // 列表项样式
      item: {
        tag: "li",
        css: `
                    /* 设置字体大小 */
                    font-size: 14px;
                    /* 设置文字颜色 */
            color: rgba(69, 79, 94, 0.8);
                    /* 设置列表项间距 */
                    margin: 8px 0;
                    /* 设置行高 */
                    line-height: 1.6;
                `,
      },
    },
  },
  // 文本样式设置
  textStyles: {
    // 粗体文本样式
    bold: {
      tag: "strong",
      css: "font-weight: 600;", // 设置字体粗细
    },
    // 斜体文本样式
    italic: {
      tag: "em",
      css: "font-style: italic;", // 设置斜体样式
    },
    // 下划线文本样式
    underline: {
      tag: "u",
      css: "text-decoration: underline;", // 设置下划线样式
    },
    // 删除线文本样式
    strikethrough: {
      tag: "del",
      css: "text-decoration: line-through;", // 设置删除线样式
    },
    // 链接样式
    link: {
      tag: "a",
      css: `
                /* 设置链接颜色为蓝色 */
                color: #336df4;
                text-decoration: none;
                /* 添加底部边框作为下划线 */
            `,
    },
  },
  // 行内代码样式设置
  inlineCode: {
    tag: "code",
    css: `
            /* 使用等宽字体 */
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            /* 设置字体大小 */
            font-size: 14px;
            /* 设置文字颜色 */
            color: #24292e;
            /* 设置背景色 */
            background-color: #f6f8fa;
            /* 设置内边距 */
            padding: 2px 6px;
            /* 设置圆角 */
            border-radius: 3px;
        `,
  },
  // 分割线样式设置
  divider: {
    tag: "hr",
    css: `
            /* 设置上下外边距 */
            margin: 24px 0;
            /* 移除默认边框 */
            border: none;
            /* 设置顶部边框作为分割线 */
            border-top: 1px solid #e9ecef;
        `,
  },
  // 提示框样式设置
  callout: {
    tag: "div",
    css: `
    margin: 16px 0;
    padding:  0 16px;
    border-radius: 8px;`,
  },
  // 待办事项样式设置
  todo: {
    // 容器样式
    container: {
      tag: "p",
      css: `
                /* 设置上下外边距 */
                margin: 12px 0;
                /* 使用flex布局 */
                display: flex;
                /* 垂直居中对齐 */
                align-items: center;
            `,
    },
    // 复选框样式
    checkbox: {
      tag: "span",
      css: `font-size:14px`,
      boxcss: `
            /* 设置复选框大小 */
            width: 16px;
            height: 16px;
            /* 设置边框 */
            border: 1px solid #1f2329;
            /* 设置圆角 */
            border-radius: 3px;
            /* 设置右侧间距 */
            margin-right: 8px;
            /* 设置为行内块级元素 */
            display: inline-block;
        `,
      // 选中状态样式
      checked: {
        // 微信预览会变异，暂时不搞
        // insert: {
        //   tag: "span",
        //   css: `    position: absolute;
        //     left: 4px;
        //     top: 2px;
        //     width: 5px;
        //     height: 8px;
        //     border: solid #3370ff;
        //     border-width: 0 2px 2px 0;
        //                             transform: rotate(45deg);
        // `,
        // },
        boxcss: `
                /* 设置复选框大小 */
                width: 16px;
                height: 16px;
                /* 设置边框 */
                border: 1px solid #a3a5a9;
                /* 设置圆角 */
                border-radius: 3px;
                /* 设置右侧间距 */
                margin-right: 8px;
                /* 设置为行内块级元素 */
                display: inline-block;
                background-color: #a3a5a9;
            `, // 复选框样式
        css: `font-size:14px;
                color: #a3a5a9;
                text-decoration:line-through;
                `,
      },
    },
  },
  table: {
    tag: "table",
    trCss: `   /* 设置表格行样式 */
     
      `,
    tdCss: `
      padding: 8px;  /* 设置单元格样式 */
      border: 1px solid #e0e0e0;
      font-size: 14px;
      color: rgba(69, 79, 94, 0.8);
      line-height: 1.75;
      text-align: left;
      vertical-align: middle;
      background-color: #ffffff;
    `,
    css: `
      /* 设置表格基本样式 */
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      
      /* 设置表格边框 */
      border: 1px solid #e0e0e0;
      }
    `,
  },
};

// 辅助函数：合并样式
export function mergeTemplates(baseTemplate, customTemplate) {
  const merged = {};

  for (const key in baseTemplate) {
    if (
      typeof baseTemplate[key] === "object" &&
      !Array.isArray(baseTemplate[key])
    ) {
      merged[key] = {
        ...baseTemplate[key],
        ...(customTemplate[key] || {}),
      };
    } else {
      merged[key] = baseTemplate[key];
    }
  }

  // 添加自定义模板中独有的属性
  for (const key in customTemplate) {
    if (!(key in merged)) {
      merged[key] = customTemplate[key];
    }
  }

  return merged;
}
