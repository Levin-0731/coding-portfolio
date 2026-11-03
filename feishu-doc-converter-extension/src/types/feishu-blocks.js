/**
 * 飞书文档块类型定义
 * 这个文件定义了飞书文档中所有可能的块类型及其数据结构
 */

/**
 * 块类型枚举值
 * @enum {number}
 */
export const BlockType = {
  PAGE: 1, // 页面 Block
  TEXT: 2, // 文本 Block
  HEADING1: 3, // 标题 1 Block
  HEADING2: 4, // 标题 2 Block
  HEADING3: 5, // 标题 3 Block
  HEADING4: 6, // 标题 4 Block
  HEADING5: 7, // 标题 5 Block
  HEADING6: 8, // 标题 6 Block
  HEADING7: 9, // 标题 7 Block
  HEADING8: 10, // 标题 8 Block
  HEADING9: 11, // 标题 9 Block
  BULLET: 12, // 无序列表 Block
  ORDERED: 13, // 有序列表 Block
  CODE: 14, // 代码块 Block
  QUOTE: 15, // 引用 Block
  TODO: 17, // 待办事项 Block
  CALLOUT: 19, // 高亮块 Block
  DIVIDER: 22, // 分割线 Block
  IMAGE: 27, // 图片 Block
  TABLE: 31, // table Block
  QUOTE_CONTAINER: 34, // 引用容器 Block
};

/**
 * 文本对齐方式枚举
 * @enum {number}
 */
export const Align = {
  LEFT: 1, // 居左排版
  CENTER: 2, // 居中排版
  RIGHT: 3, // 居右排版
};

/**
 * 字体颜色枚举，
 * @enum {number}
 */
export const FontColor = {
  1: "#d83931", // 红色
  2: "#de7802", // 橙色
  3: "#dc9b04", // 黄色
  4: "#2ea121", // 绿色
  5: "#245bdb", // 蓝色
  6: "#6425d0", // 紫色
  7: "#8f959e", // 灰色
};
/**
 * 高亮块边框颜色枚举
 * @enum {number}
 */
export const BlockBorderColor = {
  1: "#fbbfbc", // 中红色
  2: "#fed4a4", // 中橙色
  3: "#fffca3", // 中黄色
  4: "#b7edb1", // 中绿色
  5: "#bacefd", // 中蓝色
  6: "#cdb2fa", // 中紫色
  7: "#dee0e3", // 灰色
};
/**
 * 高亮块背景颜色枚举
 * @enum {number}
 */
export const BlockBackgroundColor = {
  1: "#fef1f1", // 浅红色 (从 --ccmtoken-doc-highlightcolor-bg-red-soft)
  2: "#fff5eb", // 浅橙色 (从 --ccmtoken-doc-highlightcolor-bg-orange-soft)
  3: "#fefff0", // 浅黄色 (从 --ccmtoken-doc-highlightcolor-bg-sunflower-soft)
  4: "#f0fbef", // 浅绿色 (从 --ccmtoken-doc-highlightcolor-bg-green-soft)
  5: "#f0f4ff", // 浅蓝色 (从 --ccmtoken-doc-highlightcolor-bg-blue-soft)
  6: "#f6f1fe", // 浅紫色 (从 --ccmtoken-doc-highlightcolor-bg-purple-soft)
  7: "#f5f6f7", // 中灰色 (从 --ccmtoken-doc-highlightcolor-bg-neutral-light)
  8: "#fde2e2", // 中红色 (从 --ccmtoken-doc-highlightcolor-bg-red-solid)
  9: "#feead2", // 中橙色 (从 --ccmtoken-doc-highlightcolor-bg-orange-solid)
  10: "#ffffcc", // 中黄色 (从 --ccmtoken-doc-highlightcolor-bg-sunflower-solid)
  11: "#d9f5d6", // 中绿色 (从 --ccmtoken-doc-highlightcolor-bg-green-solid)
  12: "#e1eaff", // 中蓝色 (从 --ccmtoken-doc-highlightcolor-bg-blue-solid)
  13: "#ece2fe", // 中紫色 (从 --ccmtoken-doc-highlightcolor-bg-purple-solid)
  14: "#8c8c8c", // 灰色 (保持不变)
  15: "#dee0e3", // 浅灰色 (保持不变)
};

export const FontBackgroundColor = {
  1: "#fbbfbc", // 浅红色
  2: "#fed4a4cc", // 浅橙色
  3: "rgba(255, 246, 122, 0.8)", // 浅黄色
  4: "#b7edb1", // 浅绿色
  5: "#bacefb", // 浅蓝色
  6: "#cdb2fa", // 浅紫色
  7: "rgba(222, 224, 227, 0.8)", // 中灰色
  8: "#f76964", // 中红色
  9: "#ffa53d", // 中橙色
  10: "#ffe928", // 中黄色
  11: "#62d256", // 中绿色
  12: "#4e83fd", // 中蓝色
  13: "#935af68c", // 中紫色
  14: "#bbbfc4", // 灰色
  15: "#f2f3f5", // 浅灰色
};

/**
 * 文本块背景色枚举
 * @enum {string}
 */
export const TextBackgroundColor = {
  LIGHT_GRAY: "LightGrayBackground", // 浅灰色
  LIGHT_RED: "LightRedBackground", // 浅红色
  LIGHT_ORANGE: "LightOrangeBackground", // 浅橙色
  LIGHT_YELLOW: "LightYellowBackground", // 浅黄色
  LIGHT_GREEN: "LightGreenBackground", // 浅绿色
  LIGHT_BLUE: "LightBlueBackground", // 浅蓝色
  LIGHT_PURPLE: "LightPurpleBackground", // 浅紫色
  PALE_GRAY: "PaleGrayBackground", // 中灰色
  DARK_GRAY: "DarkGrayBackground", // 灰色
  DARK_RED: "DarkRedBackground", // 中红色
  DARK_ORANGE: "DarkOrangeBackground", // 中橙色
  DARK_YELLOW: "DarkYellowBackground", // 中黄色
  DARK_GREEN: "DarkGreenBackground", // 中绿色
  DARK_BLUE: "DarkBlueBackground", // 中蓝色
  DARK_PURPLE: "DarkPurpleBackground", // 中紫色
};

/**
 * 文本缩进级别枚举
 * @enum {string}
 */
export const TextIndentationLevel = {
  NONE: "NoIndent", // 无缩进
  ONE_LEVEL: "OneLevelIndent", // 一级缩进
};

/**
 * 文本元素类型枚举
 * @enum {string}
 */
export const TextElementType = {
  TEXT_RUN: "text_run", // 文字
  MENTION_USER: "mention_user", // @用户
  MENTION_DOC: "mention_doc", // @文档
  FILE: "file", // @文件
  REMINDER: "reminder", // 日期提醒
  UNDEFINED: "undefined", // 未支持元素
  EQUATION: "equation", // 公式
};

/**
 * 基础块结构
 * @typedef {Object} Block
 * @property {string} block_id - 块的唯一标识
 * @property {BlockType} block_type - 块的类型
 * @property {string} parent_id - 父块ID
 * @property {string[]} children - 子块ID列表
 * @property {string[]} comment_ids - 评论ID列表
 */

/**
 * 文本样式结构
 * @typedef {Object} TextStyle
 * @property {Align} [align] - 对齐方式
 * @property {boolean} [done] - Todo完成状态
 * @property {boolean} [folded] - 折叠状态
 * @property {string} [language] - 代码块语言
 * @property {boolean} [wrap] - 代码块是否自动换行
 * @property {TextBackgroundColor} [background_color] - 块背景色
 * @property {TextIndentationLevel} [indentation_level] - 首行缩进级别
 * @property {string} [sequence] - 有序列表编号
 */

/**
 * 文本元素样式结构
 * @typedef {Object} TextElementStyle
 * @property {boolean} [bold] - 加粗
 * @property {boolean} [italic] - 斜体
 * @property {boolean} [strikethrough] - 删除线
 * @property {boolean} [underline] - 下划线
 * @property {boolean} [inline_code] - 内联代码
 * @property {FontColor} [text_color] - 字体颜色
 * @property {FontBackgroundColor} [background_color] - 字体背景色
 * @property {{url: string}} [link] - 超链接
 * @property {string[]} [comment_ids] - 评论ID列表
 */

/**
 * 文本运行块结构
 * @typedef {Object} TextRun
 * @property {string} content - 文本内容
 * @property {TextElementStyle} [text_element_style] - 文本样式
 */

/**
 * 文本元素结构
 * @typedef {Object} TextElement
 * @property {TextRun} [text_run] - 文字
 * @property {Object} [mention_user] - @用户
 * @property {Object} [mention_doc] - @文档
 * @property {Object} [reminder] - 日期提醒
 * @property {Object} [file] - 文件
 * @property {Object} [inline_block] - 内联块
 * @property {Object} [equation] - 公式
 * @property {Object} [undefined_element] - 未定义元素
 */

/**
 * 文本块结构
 * @typedef {Object} Text
 * @property {TextStyle} [style] - 文本样式
 * @property {TextElement[]} elements - 文本元素数组
 */
