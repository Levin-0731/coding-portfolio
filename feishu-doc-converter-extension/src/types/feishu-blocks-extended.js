/**
 * 飞书文档扩展块类型定义
 * 这个文件定义了高亮块、图片等特殊块类型的数据结构
 */

/**
 * 高亮块背景色枚举
 * @enum {number}
 */
export const CalloutBackgroundColor = {
    LIGHT_RED: 1,      // 浅红色
    LIGHT_ORANGE: 2,   // 浅橙色
    LIGHT_YELLOW: 3,   // 浅黄色
    LIGHT_GREEN: 4,    // 浅绿色
    LIGHT_BLUE: 5,     // 浅蓝色
    LIGHT_PURPLE: 6,   // 浅紫色
    MEDIUM_GRAY: 7,    // 中灰色
    MEDIUM_RED: 8,     // 中红色
    MEDIUM_ORANGE: 9,  // 中橙色
    MEDIUM_YELLOW: 10, // 中黄色
    MEDIUM_GREEN: 11,  // 中绿色
    MEDIUM_BLUE: 12,   // 中蓝色
    MEDIUM_PURPLE: 13, // 中紫色
    GRAY: 14,         // 灰色
    LIGHT_GRAY: 15    // 浅灰色
};

/**
 * 高亮块边框色枚举
 * @enum {number}
 */
export const CalloutBorderColor = {
    RED: 1,    // 红色
    ORANGE: 2, // 橙色
    YELLOW: 3, // 黄色
    GREEN: 4,  // 绿色
    BLUE: 5,   // 蓝色
    PURPLE: 6, // 紫色
    GRAY: 7    // 灰色
};

/**
 * 高亮块结构
 * @typedef {Object} Callout
 * @property {CalloutBackgroundColor} [background_color] - 背景色
 * @property {CalloutBorderColor} [border_color] - 边框色
 * @property {string} [emoji] - emoji表情
 * @property {Text} text - 文本内容
 */

/**
 * 图片块结构
 * @typedef {Object} Image
 * @property {string} token - 图片token
 * @property {number} width - 图片宽度
 * @property {number} height - 图片高度
 * @property {string} [caption] - 图片说明
 */

/**
 * 分割线块结构
 * @typedef {Object} Divider
 * 分割线块没有额外的属性
 */

/**
 * 文档引用块结构
 * @typedef {Object} MentionDoc
 * @property {string} token - 文档token
 * @property {string} obj_type - 文档类型
 * @property {string} url - 文档链接
 * @property {TextElementStyle} [text_element_style] - 文本样式
 */

/**
 * 完整的块结构（包含所有可能的块类型）
 * @typedef {Object} CompleteBlock
 * @property {string} block_id - 块的唯一标识
 * @property {number} block_type - 块的类型（参考BlockType枚举）
 * @property {string} parent_id - 父块ID
 * @property {string[]} children - 子块ID列表
 * @property {string[]} comment_ids - 评论ID列表
 * @property {Text} [page] - 页面块内容
 * @property {Text} [text] - 文本块内容
 * @property {Text} [heading1] - 一级标题块内容
 * @property {Text} [heading2] - 二级标题块内容
 * @property {Text} [heading3] - 三级标题块内容
 * @property {Text} [heading4] - 四级标题块内容
 * @property {Text} [heading5] - 五级标题块内容
 * @property {Text} [heading6] - 六级标题块内容
 * @property {Text} [heading7] - 七级标题块内容
 * @property {Text} [heading8] - 八级标题块内容
 * @property {Text} [heading9] - 九级标题块内容
 * @property {Text} [bullet] - 无序列表块内容
 * @property {Text} [ordered] - 有序列表块内容
 * @property {Text} [code] - 代码块内容
 * @property {Text} [quote] - 引用块内容
 * @property {Text} [todo] - 待办事项块内容
 * @property {Callout} [callout] - 高亮块内容
 * @property {Divider} [divider] - 分割线块内容
 * @property {Image} [image] - 图片块内容
 */

// 导出所有类型定义
export const BlockTypes = {
    Callout: 'Callout',
    Image: 'Image',
    Divider: 'Divider',
    MentionDoc: 'MentionDoc'
};
