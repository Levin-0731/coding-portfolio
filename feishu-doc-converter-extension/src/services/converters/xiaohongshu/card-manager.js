// 负责卡片相关的管理
export class CardManager {
  constructor(template) {
    this.template = template;
  }

  convertArticle(content, formData) {
    const { coverImage, title } = this.template;
    const coverStyle = this.generateInlineStyle(coverImage.css);
    const titleStyle = this.generateInlineStyle(title.css);
    return `
      ${
        formData?.title
          ? `<p class="card-firstpage-title" style="${titleStyle}">
            ${formData.title.replace(/\n/g, "<br>")}
           </p>`
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

  generateInlineStyle(css) {
    return css.replace(/\n/g, "").replace(/\s+/g, " ").trim();
  }
}
