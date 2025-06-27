// Notion API 연동 서비스
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

class NotionService {
  constructor() {
    this.token = import.meta.env.VITE_NOTION_TOKEN;
    this.databaseId = import.meta.env.VITE_NOTION_DATABASE_ID;
    this.templatePageId = import.meta.env.VITE_NOTION_TEMPLATE_PAGE_ID;
  }

  // API 요청 헤더 설정
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    };
  }

  // 템플릿 페이지 가져오기
  async getTemplatePage(pageId = this.templatePageId) {
    try {
      const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('템플릿 페이지 가져오기 실패:', error);
      throw error;
    }
  }

  // 템플릿 블록 내용 가져오기
  async getTemplateBlocks(pageId = this.templatePageId) {
    try {
      const response = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('템플릿 블록 가져오기 실패:', error);
      throw error;
    }
  }

  // 데이터베이스에서 템플릿 목록 가져오기
  async getTemplatesFromDatabase(databaseId = this.databaseId) {
    try {
      const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          filter: {
            property: 'Type',
            select: {
              equals: 'Template'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('템플릿 목록 가져오기 실패:', error);
      throw error;
    }
  }

  // 새로운 페이지 생성 (템플릿 기반)
  async createPageFromTemplate(templateId, title, properties = {}) {
    try {
      const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          parent: {
            database_id: this.databaseId
          },
          properties: {
            'Title': {
              title: [
                {
                  text: {
                    content: title
                  }
                }
              ]
            },
            ...properties
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('템플릿 기반 페이지 생성 실패:', error);
      throw error;
    }
  }

  // Notion 블록을 HTML로 변환
  convertBlockToHTML(block) {
    switch (block.type) {
      case 'paragraph':
        return `<p>${this.richTextToHTML(block.paragraph.rich_text)}</p>`;
      
      case 'heading_1':
        return `<h1>${this.richTextToHTML(block.heading_1.rich_text)}</h1>`;
      
      case 'heading_2':
        return `<h2>${this.richTextToHTML(block.heading_2.rich_text)}</h2>`;
      
      case 'heading_3':
        return `<h3>${this.richTextToHTML(block.heading_3.rich_text)}</h3>`;
      
      case 'bulleted_list_item':
        return `<li>${this.richTextToHTML(block.bulleted_list_item.rich_text)}</li>`;
      
      case 'numbered_list_item':
        return `<li>${this.richTextToHTML(block.numbered_list_item.rich_text)}</li>`;
      
      case 'to_do':
        const checked = block.to_do.checked ? 'checked' : '';
        return `<div><input type="checkbox" ${checked} disabled> ${this.richTextToHTML(block.to_do.rich_text)}</div>`;
      
      case 'table_of_contents':
        return `<div class="table-of-contents">목차</div>`;
      
      case 'divider':
        return `<hr>`;
      
      case 'image':
        return `<img src="${block.image.external?.url || block.image.file?.url}" alt="이미지" style="max-width: 100%;">`;
      
      default:
        return `<div>지원하지 않는 블록 타입: ${block.type}</div>`;
    }
  }

  // Rich Text를 HTML로 변환
  richTextToHTML(richText) {
    if (!richText || !Array.isArray(richText)) return '';
    
    return richText.map(text => {
      let content = text.plain_text;
      
      if (text.annotations.bold) content = `<strong>${content}</strong>`;
      if (text.annotations.italic) content = `<em>${content}</em>`;
      if (text.annotations.strikethrough) content = `<del>${content}</del>`;
      if (text.annotations.underline) content = `<u>${content}</u>`;
      if (text.annotations.code) content = `<code>${content}</code>`;
      
      if (text.href) {
        content = `<a href="${text.href}" target="_blank">${content}</a>`;
      }
      
      return content;
    }).join('');
  }

  // 템플릿을 보고서 형식으로 변환
  async convertTemplateToReport(templateId, data = {}) {
    try {
      const blocks = await this.getTemplateBlocks(templateId);
      let html = '<div class="notion-report">';
      
      for (const block of blocks.results) {
        html += this.convertBlockToHTML(block);
      }
      
      // 데이터 치환
      html = this.replaceTemplateData(html, data);
      
      html += '</div>';
      return html;
    } catch (error) {
      console.error('템플릿을 보고서로 변환 실패:', error);
      throw error;
    }
  }

  // 템플릿 데이터 치환
  replaceTemplateData(html, data) {
    let result = html;
    
    // {{변수명}} 형식의 플레이스홀더 치환
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, data[key] || '');
    });
    
    // 날짜 관련 치환
    const now = new Date();
    result = result.replace(/{{현재날짜}}/g, now.toLocaleDateString('ko-KR'));
    result = result.replace(/{{현재시간}}/g, now.toLocaleTimeString('ko-KR'));
    result = result.replace(/{{현재년도}}/g, now.getFullYear().toString());
    result = result.replace(/{{현재월}}/g, (now.getMonth() + 1).toString());
    result = result.replace(/{{현재일}}/g, now.getDate().toString());
    
    return result;
  }
}

export default new NotionService(); 