const { ImapFlow } = require('imapflow');
const cron = require('node-cron');
const { simpleParser } = require('mailparser');
const { pool } = require('./db');
const { summarizeAndClassify } = require('./aiService');

const IMAP_HOST = process.env.IMAP_HOST;
const IMAP_PORT = Number(process.env.IMAP_PORT || 993);
const IMAP_USER = process.env.IMAP_USER;
const IMAP_PASSWORD = process.env.IMAP_PASSWORD;
const IMAP_TLS = String(process.env.IMAP_TLS || 'true') === 'true';
const IMAP_MAILBOX = process.env.IMAP_MAILBOX || 'INBOX';
const IMAP_MAX_MESSAGES = Number(process.env.IMAP_MAX_MESSAGES || 50);
const IMAP_POLL_CRON = process.env.IMAP_POLL_CRON || '*/5 * * * *';

const canUseImap = () => IMAP_HOST && IMAP_USER && IMAP_PASSWORD;

const normalizeText = (value) => (value || '').toString().trim();

const extractAttachments = (parsed) => {
  if (!parsed?.attachments?.length) return [];
  return parsed.attachments.map((file) => ({
    name: file.filename || '첨부파일',
    type: file.contentType || ''
  }));
};

const upsertMailSummary = async (payload) => {
  const query = `
    INSERT INTO mail_summaries (
      message_id,
      sender_name,
      sender_email,
      company_name,
      subject,
      received_at,
      is_read,
      ai_classification,
      summary,
      importance,
      attachments
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (message_id)
    DO UPDATE SET
      ai_classification = EXCLUDED.ai_classification,
      summary = EXCLUDED.summary,
      importance = EXCLUDED.importance
    WHERE mail_summaries.summary = '' OR mail_summaries.summary IS NULL
  `;

  await pool.query(query, [
    payload.message_id,
    payload.sender_name,
    payload.sender_email,
    payload.company_name,
    payload.subject,
    payload.received_at,
    payload.is_read,
    payload.ai_classification,
    payload.summary,
    payload.importance,
    JSON.stringify(payload.attachments || [])
  ]);
};

// 🟢 [수정됨] 광고 차단 및 짧은 글 건너뛰기 로직 적용
const processMessage = async (client, uid) => {
  try {
    const message = await client.fetchOne(uid, {
      envelope: true,
      source: true,
      flags: true
    });

    if (!message?.source) return;

    const parsed = await simpleParser(message.source);
    const subject = parsed.subject || '제목 없음';

    // 🚫 [1차 차단] 제목에 '(광고)'가 있으면 DB 저장 안 하고 즉시 종료
    if (subject.includes('(광고)')) {
        console.log(`🗑️ [광고 삭제] 제목 차단: ${subject}`);
        return; 
    }

    const textContent = normalizeText(parsed.text || parsed.html || '');
    
    let summaryResult;

    // ⏩ [최적화] 본문이 50자 미만이면 AI 호출 생략 (비용 절약 & 에러 방지)
    if (textContent.length < 50) {
        summaryResult = { 
            summary: textContent || '이미지 또는 짧은 텍스트 메일입니다.', 
            ai_classification: '기타', 
            importance: 'low' 
        };
        console.log(`⏩ [Skip] 짧은 메일 (AI 생략): ${subject}`);
    } else {
        // 내용이 충분할 때만 AI 분석 실행
        summaryResult = await summarizeAndClassify(textContent);
    }

    // 🚫 [2차 차단] AI가 읽어보고 '광고'라고 판단하면 DB 저장 안 함
    if (summaryResult.ai_classification === '광고') {
        console.log(`🗑️ [광고 삭제] AI 판단 차단: ${subject}`);
        return; 
    }

    const from = message.envelope?.from?.[0];
    const senderEmail = from?.address || '';
    const senderName = from?.name || '';
    const receivedAt = message.envelope?.date || new Date();

    const payload = {
      message_id: parsed.messageId || `${uid}-${receivedAt.getTime()}`,
      sender_name: senderName,
      sender_email: senderEmail,
      company_name: '',
      subject: subject,
      received_at: receivedAt,
      is_read: Boolean(message.flags?.has('\\Seen')),
      ai_classification: summaryResult.ai_classification,
      summary: summaryResult.summary,
      importance: summaryResult.importance,
      attachments: extractAttachments(parsed)
    };

    // 살아남은 메일만 저장
    await upsertMailSummary(payload);
    
    if (summaryResult.summary) {
        console.log(`✅ [저장 완료] ${subject}`);
    } else {
        console.log(`⚠️ [저장됨] 요약 내용 없음: ${subject}`);
    }

  } catch (error) {
    console.error(`❌ 메일(UID: ${uid}) 처리 중 에러:`, error.message);
  }
};

const syncMailbox = async () => {
  if (!canUseImap()) {
    console.warn('IMAP 설정이 비어 있어 동기화를 건너뜁니다.');
    return;
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_TLS,
    auth: {
      user: IMAP_USER,
      pass: IMAP_PASSWORD
    },
    logger: false 
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(IMAP_MAILBOX);

    try {
      const uids = await client.search({ all: true });
      const recentUids = uids.slice(-IMAP_MAX_MESSAGES);
      
      console.log(`📩 총 ${recentUids.length}개의 메일을 검사합니다... (광고 필터링 + 6초 대기)`);

      for (const uid of recentUids) {
        await processMessage(client, uid);
        
        // 🟢 API 속도 제한(429) 방지: 6초 대기
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }

    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('IMAP 동기화 실패:', error);
  } finally {
    await client.logout().catch(() => {});
  }
};

const scheduleMailSync = () => {
  if (!canUseImap()) {
    return;
  }
  cron.schedule(IMAP_POLL_CRON, () => {
    syncMailbox().catch((error) => console.error(error));
  });
  syncMailbox().catch((error) => console.error(error));
};

module.exports = { scheduleMailSync, syncMailbox };