/**
 * 知乎（人人都是产品经理）样式模板
 */
import { baseTemplate, mergeTemplates } from "./base-template";

// 知乎
export const template1 = mergeTemplates(baseTemplate, {
  // 标题样式设置
  headings: {
    // h1标题样式 - 通常用于文章主标题
    h1: {
      tag: "h2",
      css: ``,
    },
    // h2标题样式 - 用于文章主要分节
    h2: {
      tag: "h3",
      css: ``,
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
  quoteContainer: {
    tag: "blockquote",
    css: ``,
  },
});

export const templates = {
  template1,
};
