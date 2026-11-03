/**
 * 将飞书文档转换为小红书图片。先转html，在转图片
 */
import { templates } from "@/template/xhs-template.js";
import { BaseConverter } from "./base-converter";

export class XiaohongshuConverter extends BaseConverter {
  constructor(templateName = "template1") {
    super(templates[templateName] || templates["template1"]);
  }

  wrapContent(content, globalStyle) {
    return `
        ${content}
    `;
  }
  convertArticle(content, formData) {
    const { coverImage, title } = this.template;
    const coverStyle = this.generateInlineStyle(coverImage.css);
    const titleStyle = this.generateInlineStyle(title.css);
    return `
       ${
         formData?.title
           ? `<p class="card-firstpage-title" style="${titleStyle}">${formData.title.replace(
               /\n/g,
               "<br>"
             )}</p>`
           : ""
       }
      ${content}
    `;
  }

  getCardSize() {
    const { cardMain, coverImage, title, footer, cardContent } = this.template;
    const cardWidth = cardMain.width;
    const cardHeight = cardMain.height;
    const coverHeight = coverImage.height;
    const titleHeight = title.height;
    const footerHeight = footer.height;
    const cardPadding = cardContent.cardPadding;
    const regex = /border:\s*(\d+)px/; // 匹配border: 7px solid #454f5e;
    const firstCardBorder = parseInt(cardMain.firstCard.match(regex)[1]) || 0; // 首张卡片边框
    return {
      cardWidth,
      cardHeight,
      coverHeight,
      titleHeight,
      footerHeight,
      cardPadding,
      firstCardBorder,
      firstCardStyle: cardMain.firstCard,
    };
  }

  splitContentIntoCards(originalContent, formData) {
    if (!originalContent) return "";
    const content = this.convertArticle(originalContent, formData);
    const {
      cardWidth,
      cardHeight,
      footerHeight,
      coverHeight,
      cardPadding,
      firstCardBorder,
    } = this.getCardSize();
    const realCardHeight = cardHeight - footerHeight - 5; // 预留空间：5
    //首张没有页脚有边框7
    const firstCardHeight =
      cardHeight - footerHeight - 5 - firstCardBorder * 2 - coverHeight;
    console.log(
      "目标高度 realCardHeight:",
      realCardHeight,
      "firstCardHeight:",
      firstCardHeight
    );

    // 创建临时容器的公共函数
    const createTempContainer = (isFirstCard = false) => {
      const container = document.createElement("div");
      const containerWidth = isFirstCard
        ? cardWidth - firstCardBorder * 2 // 首张卡片减去border
        : cardWidth;

      container.style.cssText = `
        position: absolute;
        visibility: hidden;
        padding: 0 ${cardPadding}px;
        box-sizing: border-box;
        word-break: break-all;
        width: ${containerWidth}px;
      `;

      document.body.appendChild(container);
      return container;
    };

    // 创建临时容器
    const measureContainer = createTempContainer();
    document.body.appendChild(measureContainer);

    // 修改 getMeasuredHeight 函数中的临时容器创建
    const getMeasuredHeight = (
      element,
      previousElement = null,
      isFirstCard = false
    ) => {
      measureContainer.innerHTML = "";
      measureContainer.style.width = isFirstCard
        ? `${cardWidth - firstCardBorder * 2}px`
        : `${cardWidth}px`;

      // 如果是 image-wrapper 容器，移除编辑按钮后再计算高度
      if (element.className === "image-wrapper") {
        const clonedWrapper = element.cloneNode(true);
        const editBtn = clonedWrapper.querySelector(".image-edit-btn");
        if (editBtn) {
          editBtn.remove();
        }
        measureContainer.appendChild(clonedWrapper);
        return measureContainer.offsetHeight;
      }

      // 其他元素正常计算高度
      const clonedElement = element.cloneNode(true);
      measureContainer.appendChild(clonedElement);
      const totalHeight = measureContainer.offsetHeight;

      // 如果有前一个元素，需要考虑margin合并
      if (previousElement) {
        // 获取当前元素的计算样式
        const currStyle = window.getComputedStyle(clonedElement);

        // 检查是否存在阻止margin合并的属性
        const isMarginCollapsePrevented =
          currStyle.position === "relative" ||
          currStyle.position === "absolute" ||
          currStyle.position === "fixed" ||
          currStyle.float !== "none" ||
          currStyle.display === "inline-block" ||
          currStyle.display === "flex" ||
          currStyle.display === "grid";

        // 如果阻止了margin合并，直接返回完整高度
        if (isMarginCollapsePrevented) {
          return totalHeight;
        }

        // 使用公共函数创建临时容器
        const tempContainer = createTempContainer(isFirstCard);

        const clonedPrev = previousElement.cloneNode(true);
        tempContainer.appendChild(clonedPrev);

        // 获取前一个元素的计算样式
        const prevStyle = window.getComputedStyle(clonedPrev);

        // 检查前一个元素是否阻止margin合并
        const isPrevMarginCollapsePrevented =
          prevStyle.position === "relative" ||
          prevStyle.position === "absolute" ||
          prevStyle.position === "fixed" ||
          prevStyle.float !== "none" ||
          prevStyle.display === "inline-block" ||
          prevStyle.display === "flex" ||
          prevStyle.display === "grid";

        const prevMarginBottom = parseInt(prevStyle.marginBottom) || 0;
        const currMarginTop = parseInt(currStyle.marginTop) || 0;

        // 清理临时容器
        document.body.removeChild(tempContainer);

        // 如果任一元素阻止了margin合并，返回完整高度
        if (isPrevMarginCollapsePrevented) {
          return totalHeight;
        }

        // margin合并取最大值
        const collapsedMargin = Math.max(prevMarginBottom, currMarginTop);
        // 返回考虑margin合并后的高度
        return totalHeight - Math.min(prevMarginBottom, currMarginTop);
      }

      return totalHeight;
    };

    // 创建临时div解析内容
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // 最小化过滤函数，仅移除绝对空白节点
    const isValidNode = (node) => {
      // 文本节点
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim() !== "";
      }

      // 元素节点 - 尽量保留原始结构
      if (node.nodeType === Node.ELEMENT_NODE) {
        return true; // 保留所有元素节点
      }

      return false;
    };

    // 过滤并转换节点 - 尽量保留原始结构
    const nodes = Array.from(tempDiv.childNodes).filter(
      (node) => isValidNode(node) || node.nodeType === Node.ELEMENT_NODE
    );

    // 智能元素拆分函数
    const splitElement = (
      element,
      remainingHeight,
      startIndex = 0,
      isFirstCard = false,
      parentElement = null
    ) => {
      if (!element || remainingHeight <= 20) return null;

      // 处理引用块
      if (element.tagName === "BLOCKQUOTE") {
        const blockquoteStyle = element.getAttribute("style") || "";
        const paddingLeftMatch = blockquoteStyle.match(
          /padding-left:\s*(\d+)px/
        );
        const paddingLeft = paddingLeftMatch
          ? parseInt(paddingLeftMatch[1])
          : 12;

        // 使用公共函数创建临时容器，考虑 padding-left
        const testBlockquote = element.cloneNode(true);
        testBlockquote.style.width = isFirstCard
          ? `${
              cardWidth - firstCardBorder * 2 - cardPadding * 2 - paddingLeft
            }px`
          : `${cardWidth - cardPadding * 2 - paddingLeft}px`;
        testBlockquote.style.visibility = "hidden";
        testBlockquote.style.position = "absolute";
        document.body.appendChild(testBlockquote);

        // 获取引用块的实际高度
        const blockquoteHeight = testBlockquote.offsetHeight;
        document.body.removeChild(testBlockquote);

        // 如果整个引用块能放入剩余空间
        if (blockquoteHeight <= remainingHeight) {
          return {
            first: element,
            remaining: null,
          };
        }

        // 如果引用块需要拆分，则处理其中的段落
        const paragraphs = Array.from(element.children);
        let firstParts = [];
        let remainingParts = [];
        let currentHeight = 0;

        // 创建用于测量高度的临时引用块
        const measureBlockquote = document.createElement("blockquote");
        measureBlockquote.setAttribute("style", blockquoteStyle);
        measureBlockquote.style.width = isFirstCard
          ? `${
              cardWidth - firstCardBorder * 2 - cardPadding * 2 - paddingLeft
            }px`
          : `${cardWidth - cardPadding * 2 - paddingLeft}px`;
        measureBlockquote.style.visibility = "hidden";
        measureBlockquote.style.position = "absolute";
        document.body.appendChild(measureBlockquote);

        for (const p of paragraphs) {
          measureBlockquote.innerHTML = "";
          const clonedP = p.cloneNode(true);
          measureBlockquote.appendChild(clonedP);
          const pHeight = measureBlockquote.offsetHeight;

          if (currentHeight + pHeight <= remainingHeight) {
            firstParts.push(p.cloneNode(true));
            currentHeight += pHeight;
          } else {
            // 递归调用时传入引用块作为父元素
            const splitResult = splitElement(
              p,
              remainingHeight - currentHeight,
              startIndex,
              isFirstCard,
              element // 传入引用块作为父元素
            );
            if (splitResult && splitResult.first) {
              firstParts.push(splitResult.first);
              if (splitResult.remaining) {
                remainingParts.push(splitResult.remaining);
              }
            }
            remainingParts = remainingParts.concat(
              paragraphs
                .slice(paragraphs.indexOf(p) + 1)
                .map((p) => p.cloneNode(true))
            );
            break;
          }
        }

        document.body.removeChild(measureBlockquote);

        // 如果有内容需要拆分
        if (firstParts.length > 0) {
          const firstBlockquote = document.createElement("blockquote");
          firstBlockquote.setAttribute("style", blockquoteStyle);
          firstParts.forEach((p) => firstBlockquote.appendChild(p));

          if (remainingParts.length > 0) {
            const remainingBlockquote = document.createElement("blockquote");
            remainingBlockquote.setAttribute("style", blockquoteStyle);
            remainingParts.forEach((p) => remainingBlockquote.appendChild(p));

            return {
              first: firstBlockquote,
              remaining: remainingBlockquote,
            };
          }

          return {
            first: firstBlockquote,
            remaining: null,
          };
        }
      }

      // 段落元素
      if (element.tagName === "P") {
        const text = element.textContent;

        // 计算实际可用宽度，考虑父元素的 padding-left
        let availableWidth = isFirstCard
          ? cardWidth - firstCardBorder * 2 - cardPadding * 2
          : cardWidth - cardPadding * 2 - 2; // 卡片border 2

        // 如果父元素是引用块，考虑其 padding-left
        if (parentElement && parentElement.tagName === "BLOCKQUOTE") {
          const parentStyle = parentElement.getAttribute("style") || "";
          const parentPaddingLeftMatch = parentStyle.match(
            /padding-left:\s*(\d+)px/
          );
          const parentPaddingLeft = parentPaddingLeftMatch
            ? parseInt(parentPaddingLeftMatch[1])
            : 12;
          availableWidth -= parentPaddingLeft;
        }

        // 创建用于测量的临时容器
        const testP = element.cloneNode(false);
        testP.style.width = `${availableWidth}px`;
        testP.style.visibility = "hidden";
        testP.style.position = "absolute";
        document.body.appendChild(testP);

        // 获取所有子节点（包括文本节点和带样式的span）
        const nodes = Array.from(element.childNodes);
        let currentText = "";
        let nodeMap = new Map(); // 存储文本位置与节点的映射
        let offset = 0;

        // 构建文本和节点的映射关系
        nodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            for (let i = 0; i < text.length; i++) {
              nodeMap.set(offset + i, { node, offset: i });
            }
            currentText += text;
            offset += text.length;
          } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "SPAN"
          ) {
            const text = node.textContent;
            for (let i = 0; i < text.length; i++) {
              nodeMap.set(offset + i, { node, offset: i });
            }
            currentText += text;
            offset += text.length;
          }
        });

        // 使用二分法查找分割点
        let left = 0;
        let right = currentText.length;
        let bestSplit = 0;
        let bestHeight = 0;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          testP.innerHTML = currentText.substring(0, mid);
          const height = testP.offsetHeight;

          if (height <= remainingHeight) {
            bestSplit = mid;
            bestHeight = height;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }

        // 清理测试元素
        document.body.removeChild(testP);

        // 如果找不到合适的分割点
        if (bestSplit <= 0) {
          return null;
        }

        // 创建分割后的两个段落
        const firstP = element.cloneNode(false);
        const remainingP = element.cloneNode(false);

        // 重建带样式的内容
        let currentPos = 0;
        let currentNode = null;
        let currentNodeContent = "";

        for (let i = 0; i < currentText.length; i++) {
          const charInfo = nodeMap.get(i);
          const char = currentText[i];

          if (currentNode !== charInfo.node) {
            // 如果有累积的内容，添加到appropriate段落
            if (currentNodeContent) {
              if (currentNode.nodeType === Node.TEXT_NODE) {
                (i <= bestSplit ? firstP : remainingP).appendChild(
                  document.createTextNode(currentNodeContent)
                );
              } else {
                const span = currentNode.cloneNode(false);
                span.textContent = currentNodeContent;
                (i <= bestSplit ? firstP : remainingP).appendChild(span);
              }
              currentNodeContent = "";
            }
            currentNode = charInfo.node;
          }

          currentNodeContent += char;

          // 如果到达分割点，添加累积的内容到第一个段落
          if (i === bestSplit) {
            if (currentNodeContent) {
              if (currentNode.nodeType === Node.TEXT_NODE) {
                firstP.appendChild(document.createTextNode(currentNodeContent));
              } else {
                const span = currentNode.cloneNode(false);
                span.textContent = currentNodeContent;
                firstP.appendChild(span);
              }
              currentNodeContent = "";
            }
          }
        }

        // 添加最后剩余的内容到第二个段落
        if (currentNodeContent) {
          if (currentNode.nodeType === Node.TEXT_NODE) {
            remainingP.appendChild(document.createTextNode(currentNodeContent));
          } else {
            const span = currentNode.cloneNode(false);
            span.textContent = currentNodeContent;
            remainingP.appendChild(span);
          }
        }

        return {
          first: firstP,
          remaining: remainingP.hasChildNodes() ? remainingP : null,
        };
      }

      // 列表元素处理（包括OL和UL）
      if (element.tagName === "OL" || element.tagName === "UL") {
        const children = Array.from(element.children);
        if (children.length === 0) return { first: element, remaining: null };

        // 创建新的列表元素，保持原始类型
        const clonedList = document.createElement(element.tagName);
        // 为UL添加padding-left样式
        if (element.tagName === "UL") {
          clonedList.style.paddingLeft = "15px";
        }
        let currentHeight = 0;
        const firstChildren = [];
        const remainingChildren = [];
        let firstPartEndIndex = 0; // 记录第一部分的最后序号

        // 添加最大尝试次数限制
        const maxAttempts = children.length;
        let attempts = 0;

        console.log(`\n开始拆分${element.tagName}列表:`);
        console.log(`- 总项目数: ${children.length}`);
        console.log(`- 可用高度: ${remainingHeight}px`);

        for (let i = 0; i < children.length; i++) {
          attempts++;
          if (attempts > maxAttempts) {
            console.warn("超出最大尝试次数");
            break;
          }

          const child = children[i];
          measureContainer.innerHTML = "";
          measureContainer.appendChild(child.cloneNode(true));
          const childHeight = measureContainer.offsetHeight;

          console.log(`- 检查项目 ${i + 1}:`);
          console.log(`  高度: ${childHeight}px`);
          console.log(`  当前累计: ${currentHeight}px`);

          if (currentHeight + childHeight <= remainingHeight) {
            const clonedLi = child.cloneNode(true);
            if (element.tagName === "OL") {
              // 先移除已存在的序号span
              const existingNumbers =
                clonedLi.getElementsByClassName("custom-list-number");
              Array.from(existingNumbers).forEach((span) => span.remove());

              clonedLi.style.listStyleType = "none";
              const numberSpan = document.createElement("span");
              numberSpan.className = "custom-list-number";
              const currentIndex = startIndex + i + 1;
              numberSpan.textContent = `${currentIndex}. `;
              clonedLi.insertBefore(numberSpan, clonedLi.firstChild);
              firstPartEndIndex = currentIndex;
            }
            firstChildren.push(clonedLi);
            currentHeight += childHeight;
            console.log(`  ✓ 添加到第一部分`);
          } else {
            const remainingLi = child.cloneNode(true);
            if (element.tagName === "OL") {
              // 先移除已存在的序号span
              const existingNumbers =
                remainingLi.getElementsByClassName("custom-list-number");
              Array.from(existingNumbers).forEach((span) => span.remove());

              remainingLi.style.listStyleType = "none";
            }
            remainingChildren.push(remainingLi);
            console.log(`  × 添加到剩余部分`);
          }
        }

        firstChildren.forEach((child) => clonedList.appendChild(child));

        if (remainingChildren.length > 0) {
          const remainingList = document.createElement(element.tagName);
          if (element.tagName === "UL") {
            remainingList.style.paddingLeft = "15px";
          }

          // 为剩余部分添加正确的序号
          remainingChildren.forEach((child, index) => {
            if (element.tagName === "OL") {
              const numberSpan = document.createElement("span");
              numberSpan.className = "custom-list-number";
              numberSpan.textContent = `${firstPartEndIndex + index + 1}. `;
              child.insertBefore(numberSpan, child.firstChild);
            }
            remainingList.appendChild(child);
          });

          // 添加一个标记，表示这是分割后的列表
          remainingList.setAttribute("data-split-list", "true");
          remainingList.setAttribute(
            "data-start-index",
            String(firstPartEndIndex + 1)
          );

          return {
            first: clonedList,
            remaining: remainingList,
            firstChildrenCount: firstChildren.length,
          };
        }

        return {
          first: clonedList,
          remaining: null,
          firstChildrenCount: firstChildren.length,
        };
      }

      // 其他元素直接返回
      return { first: null, remaining: element };
    };

    // 智能分页主逻辑
    const createSmartCards = (elements) => {
      let remainingElements = [...elements];
      let globalListIndex = 0;
      let cardIndex = 0;
      const cards = [];
      let totalProcessedElements = 0;

      console.log("开始处理总元素数:", remainingElements.length);

      while (remainingElements.length > 0) {
        let currentCard = "";
        let currentCardHeight = 0;
        let processedIndexes = new Set();
        let lastElement = null;
        let hasSplitElement = false;
        const height = cards.length === 0 ? firstCardHeight : realCardHeight;

        console.log(`\n========== 第 ${cardIndex + 1} 张卡片 ==========`);
        console.log(`目标高度: ${height}px`);
        console.log("待处理元素数:", remainingElements.length);

        for (let i = 0; i < remainingElements.length; i++) {
          const element = remainingElements[i];
          const elementHeight = getMeasuredHeight(
            element,
            lastElement,
            cards.length === 0
          );

          console.log(`\n检查元素 ${i + 1} (${element.tagName}):`);
          console.log(`当前卡片高度: ${currentCardHeight}px`);
          console.log(`当前元素高度: ${elementHeight}px`);
          console.log(`累计高度: ${currentCardHeight + elementHeight}px`);
          console.log(`剩余空间: ${height - currentCardHeight}px`);

          if (currentCardHeight + elementHeight <= height + 2) {
            if (element.tagName === "IMG") {
              const clonedImg = element.cloneNode(true);
              // 确保图片样式正确
              clonedImg.style.cssText = `
                max-width: 100%;
                height: auto;
                display: block;
                border-radius: 5px;
                box-shadow: rgba(0, 0, 0, 0.1) 2px 2px 8px;
                text-align: center;
              `;
              currentCard += clonedImg.outerHTML;
            } else if (element.tagName === "OL" || element.tagName === "UL") {
              const clonedList = element.cloneNode(true);
              if (element.tagName === "UL") {
                clonedList.style.paddingLeft = `${cardPadding}px`;
              }
              if (element.tagName === "OL") {
                const isSplitList = element.hasAttribute("data-split-list");
                let startIndex = isSplitList
                  ? parseInt(element.getAttribute("data-start-index"))
                  : globalListIndex + 1;

                // 处理所有列表项
                Array.from(clonedList.children).forEach((li, index) => {
                  // 先移除已存在的序号span
                  const existingNumbers =
                    li.getElementsByClassName("custom-list-number");
                  Array.from(existingNumbers).forEach((span) => span.remove());

                  li.style.listStyleType = "none";
                  const numberSpan = document.createElement("span");
                  numberSpan.className = "custom-list-number";
                  const listIndex = startIndex + index;
                  numberSpan.textContent = `${listIndex}. `;
                  li.insertBefore(numberSpan, li.firstChild);
                });

                if (!isSplitList) {
                  globalListIndex += clonedList.children.length;
                }
              }
              currentCard += clonedList.outerHTML;
            } else {
              currentCard += element.outerHTML;
            }
            currentCardHeight += elementHeight;
            processedIndexes.add(i);
            totalProcessedElements++;
            lastElement = element;

            console.log(`✓ 元素已添加，新卡片高度: ${currentCardHeight}px`);
            console.log(`剩余空间: ${height - currentCardHeight}px`);
          } else {
            const availableHeight = height - currentCardHeight;
            console.log(`\n× 元素不适合当前卡片:`);
            console.log(`- 剩余空间: ${availableHeight}px`);
            console.log(`- 元素高度: ${elementHeight}px`);
            console.log(`- 超出高度: ${elementHeight - availableHeight}px`);

            if (availableHeight > 20) {
              console.log(`\n尝试拆分元素...`);
              const splitResult = splitElement(
                element,
                availableHeight,
                globalListIndex,
                cards.length === 0
              );

              if (splitResult && splitResult.first) {
                const splitHeight = getMeasuredHeight(
                  splitResult.first,
                  lastElement,
                  cards.length === 0
                );
                console.log(`✓ 拆分成功:`);
                console.log(`- 第一部分高度: ${splitHeight}px`);
                console.log(`- 适合剩余空间: ${availableHeight}px`);

                currentCard += splitResult.first.outerHTML;
                currentCardHeight += splitHeight;
                hasSplitElement = true;

                // 更新remainingElements，保留拆分的剩余部分
                const newRemainingElements = [
                  ...(splitResult.remaining ? [splitResult.remaining] : []),
                  ...remainingElements.slice(i + 1),
                ];
                remainingElements = newRemainingElements;
                totalProcessedElements++; // 计入拆分的元素
                break;
              } else {
                console.log(`× 拆分失败，元素无法拆分`);
              }
            } else {
              console.log(`× 剩余空间不足以尝试拆分 (< 20px)`);
            }
            break;
          }
        }

        if (currentCard) {
          cards.push(currentCard);
          console.log(`\n✓ 卡片 ${cardIndex + 1} 完成:`);
          console.log(`- 最终高度: ${currentCardHeight}px`);
          console.log(`- 目标高度: ${height}px`);
          console.log(
            `- 空间利用率: ${((currentCardHeight / height) * 100).toFixed(1)}%`
          );
          console.log(`- 底部留白: ${height - currentCardHeight}px`);

          if (!hasSplitElement) {
            // 只有在没有拆分元素时才使用filter
            remainingElements = remainingElements.filter(
              (_, index) => !processedIndexes.has(index)
            );
          }
          cardIndex++;
        } else if (remainingElements.length > 0) {
          // 强制处理至少一个元素
          currentCard = remainingElements[0].outerHTML;
          cards.push(currentCard);
          remainingElements = remainingElements.slice(1);
          totalProcessedElements++;
          cardIndex++;
        }

        // 安全检查
        if (cardIndex > 100 || remainingElements.length === 0) {
          break;
        }
      }

      console.log("\n========== 分页总结 ==========");
      console.log("原始元素总数:", elements.length);
      console.log("实际处理元素:", totalProcessedElements);
      console.log("生成卡片数:", cards.length);
      console.log("各卡片空间利用率:");
      cards.forEach((card, index) => {
        const div = document.createElement("div");
        div.innerHTML = card;
        const cardHeight = getMeasuredHeight(div, null, index === 0);
        const targetHeight = index === 0 ? firstCardHeight : realCardHeight;
        console.log(`卡片 ${index + 1}:`);
        console.log(`- 实际高度: ${cardHeight}px`);
        console.log(`- 目标高度: ${targetHeight}px`);
        console.log(
          `- 利用率: ${((cardHeight / targetHeight) * 100).toFixed(1)}%`
        );
        console.log(`- 留白: ${targetHeight - cardHeight}px`);
      });

      return cards;
    };

    // 执行智能分页
    const resultCards = createSmartCards(nodes);

    // 移除临时容器
    document.body.removeChild(measureContainer);

    // 计算字数
    const charCount = originalContent
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, "").length;

    return this.wrapCards(resultCards, charCount, formData);
  }

  wrapCards(cards, charCount, formData) {
    const { cardContent, cardMain, tag, footer, coverImage } = this.template;
    // 计算字数（去除HTML标签后的纯文本）

    const contentStyle = this.generateInlineStyle(cardContent.css);
    const tagStyle = this.generateInlineStyle(tag.css);
    const footerStyle = this.generateInlineStyle(footer.css);
    const coverStyle = this.generateInlineStyle(coverImage.css);
    return cards
      .map((card, index) => {
        const cardStyle = this.generateInlineStyle(
          cardMain.css + (index === 0 ? cardMain.firstCard : "")
        );

        if (index === 0) {
          // 封面卡片不需要页脚要展示标签
          return `
         <div class="card-main card-firstpage" style="${cardStyle}">
          ${
            formData?.coverUrl
              ? `<img src="${formData.coverUrl}" style="${coverStyle}">`
              : `<div style="${coverStyle}">上传封面图</div>`
          }
          <div class="card-content" style="${contentStyle}">${card}</div> 
       
          ${
            formData?.tag
              ? `<p class="card-firstpage-tag" style="${tagStyle}">${formData.tag}</p>`
              : ""
          }
          </div>
      `;
        } else {
          // 内容卡片
          return `
        <div class="card-main" style="${cardStyle}">
          <div class="card-content" style="${contentStyle}">${card}</div>
          <div class="card-pagemain" style="${footerStyle}">
            <span>总字数：${charCount}</span>
            <span>${index}/${cards.length - 1}${
            index === cards.length - 1 ? " | 你看到最后一页了!" : ""
          }</span>
          </div>
        </div>
      `;
        }
      })
      .join("\n");
  }

  /**
   * 下载并压缩图片为base64
   * @param {string} url 图片URL
   * @returns {Promise<string>} base64字符串
   */
  async downloadAndCompressImage(url) {
    try {
      // 下载图片
      const response = await fetch(url);
      const blob = await response.blob();

      // 创建图片对象
      const img = new Image();
      const imageUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // 创建canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // 计算压缩后的尺寸
          let { width, height } = img;
          const maxSize = 1200; // 最大尺寸限制

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          // 设置canvas尺寸
          canvas.width = width;
          canvas.height = height;

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为base64，使用0.8的质量压缩
          const base64 = canvas.toDataURL("image/jpeg", 0.8);

          // 清理资源
          URL.revokeObjectURL(imageUrl);

          resolve(base64);
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error("图片加载失败"));
        };

        img.src = imageUrl;
      });
    } catch (error) {
      console.error("图片处理失败:", error);
      throw error;
    }
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
      // 下载并压缩图片为base64
      const base64Url = await this.downloadAndCompressImage(url);

      // 添加一个可调整大小的包装容器
      const content = `
        <div class="image-wrapper" data-block-id="${block.block_id}">
          <div class="image-edit-btn" data-block-id="${block.block_id}">
            <span class="edit-text" data-edit-state="edit" contenteditable="false">编辑</span>
          </div>
          <img 
            src="${base64Url}" 
            width="${width}px" 
            height="${height}px"
            style="${imageStyle};${alignStyle}; object-fit: fill; touch-action: none; user-select: none;" 
            data-block-id="${block.block_id}"
            class="resizable-image"
            data-editing="false"
          />
        </div>
      `;
      return content;
    } catch (error) {
      console.error("转换图片块失败:", error);
      // 如果转换失败，返回原始URL的图片
      const content = `
        <div class="image-wrapper" data-block-id="${block.block_id}">
          <div class="image-edit-btn" data-block-id="${block.block_id}">
            <span class="edit-text" data-edit-state="edit" contenteditable="false">编辑</span>
          </div>
          <img 
            src="${url}" 
            width="${width}px" 
            height="${height}px"
            style="${imageStyle};${alignStyle}; object-fit: fill; touch-action: none; user-select: none;" 
            data-block-id="${block.block_id}"
            class="resizable-image"
            data-editing="false"
          />
        </div>
      `;
      return content;
    }
  }
}
