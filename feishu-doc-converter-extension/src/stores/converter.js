// src/stores/converter.js
import { defineStore } from "pinia";
import { ref } from "vue";
import { WechatConverter } from "@/services/converters/wechat";
import { ZhihuConverter } from "@/services/converters/zhihu";
import { JuejinConverter } from "@/services/converters/juejin";
// import { XiaohongshuConverter } from "@/services/converters/xiaohongshu";
import { XiaohongshuConverter } from "@/services/converters/xiaohongshu/index";
import { convertedContentExample } from "@/assets/example-wx";
import { convertedXhsExample } from "@/assets/example-xhs";
import { convertedZhihuExample } from "@/assets/example-zhihu";
import { convertedJuejinExample } from "@/assets/example-juejin";
const Converters = {
  wechat: new WechatConverter(),
  xiaohongshu: new XiaohongshuConverter(),
  zhihu: new ZhihuConverter(),
  juejin: new JuejinConverter(),
};

export const useConverterStore = defineStore("converter", () => {
  const currentFormat = ref("wechat");
  const convertedContent = ref(convertedContentExample); // 转换后的格式，公众号
  const convertedXhs = ref(convertedXhsExample); // 转换后的小红书格式，图片
  const convertedZhihu = ref(convertedZhihuExample); // 转换后的知乎格式，html
  const convertedJuejin = ref(convertedJuejinExample); // 转换后的juejin格式，html
  const customStyles = ref({});
  const articleLoading = ref(false);
  const imageLoading = ref(false);

  const convert = async (content, format = currentFormat.value) => {
    articleLoading.value = true;
    imageLoading.value = true;
    // wechat
    const convertedContentVal = await Converters.wechat.convert(
      content,
      customStyles.value
    );
    convertedContent.value = convertedContentVal;
    // console.log("🚀 ~  ~ convertedContentVal:", convertedContentVal);

    // 知乎
    const convertedZhihuVal = await Converters.zhihu.convert(
      content,
      customStyles.value
    );
    convertedZhihu.value = convertedZhihuVal;

    // juejin
    const convertedJuejinVal = await Converters.juejin.convert(
      content,
      customStyles.value
    );
    convertedJuejin.value = convertedJuejinVal;
    // console.log("🚀 ~  ~ convertedJuejinVal:", convertedJuejinVal);

    articleLoading.value = false;

    const convertedXhsVal = await Converters.xiaohongshu.convert(
      content,
      customStyles.value
    );
    convertedXhs.value = convertedXhsVal;
    imageLoading.value = false;
    // console.log("🚀 ~ convert ~ convertedXhsVal:", convertedXhsVal);

    // console.log("🚀 ~ convert ~ convertedZhihuVal:", convertedZhihuVal);
  };

  const updateStyle = (newStyle) => {
    customStyles.value = { ...customStyles.value, ...newStyle };
  };

  return {
    articleLoading,
    imageLoading,
    currentFormat,
    convertedContent,
    convertedXhs,
    customStyles,
    convert,
    updateStyle,
    convertedZhihu,
    convertedJuejin,
  };
});
