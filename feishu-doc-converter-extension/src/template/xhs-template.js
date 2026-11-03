/**
 * 小红书样式模板
 */
import { baseTemplate, mergeTemplates } from "./base-template";

const xhsCustomTemplate = {
  // 小红书卡片样式
  coverImage: {
    tag: "img",
    height: 193, // 封面高度
    css: `
      height: 193px;/* 与上面coverImage.height一致 */
      object-fit: cover;   
      width: 100%;
      background: aliceblue;
      text-align: center;
      font-size: 12px;
      line-height: 193px;
    `,
  },
  title: {
    tag: "div",
    height: 22, // 标题高度
    css: `
      font-size: 22px;
      color: #454f5e;
      font-weight: 600;
      margin: 12px 0;
    `,
  },
  tag: {
    tag: "div",
    css: `
      position: absolute;
      bottom: 14px;
      color: rgba(69, 79, 94, 0.3);
      text-align: center;
      font-weight: 600;
      width: 100%;
      font-size: 12px;
    `,
  },
  footer: {
    tag: "div",
    height: 28, // 页脚高度
    css: `
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      color: #aeaeae;
      height: 28px;
      display: flex;
      font-size: 12px;
      justify-content: space-between;
      padding: 0 15px;
      line-height: 28px;
      position: absolute;
      width: 100%;
      bottom: 0;
      background: #fff;
      z-index: 100;
    `,
  },
  //卡片列表预览容器样式，暂时没有做模版，后续考虑
  cardContainer: {
    tag: "div",
    css: `
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 0;
      background: #e6e6e6;
    `,
  },
  // 单个卡片样式
  cardMain: {
    tag: "div",
    width: 400, // 卡片宽度,for计算
    height: 533, // 卡片高度
    css: `
      position: relative;
      width: 400px;/* 修改模版的时候要保证cardMain的width和height和cardMain.css的width和height一致 */
      height: 533px;
      overflow: hidden;
      margin: 0 auto;
      background: white;
    `,
    firstCard: `
      border: 7px solid #454f5e; /* 首张卡片边框,代码里有计算逻辑 */
    `,
  },
  // 卡片内容区域
  cardContent: {
    tag: "div",
    cardPadding: 15, //卡片高度不做padding，只有宽度设置padding，要计算用
    css: `
      padding: 0 15px; /* 卡片内容区域padding,跟上面一致 */
      overflow: hidden;
      /* height由convert动态计算 */
    `,
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
                      margin: 16px 0;
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
};
export const template1 = mergeTemplates(baseTemplate, xhsCustomTemplate);

export const templates = {
  template1,
};
