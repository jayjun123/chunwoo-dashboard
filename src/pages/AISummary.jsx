import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { AttachFile as AttachFileIcon, Refresh as RefreshIcon, Star as StarIcon } from '@mui/icons-material';
import MobileSidebar from '../components/MobileSidebar';
import { fetchMailSummaries } from '../api/aiSummary';

const normalizeMailItem = (item = {}) => {
  const attachments = item.attachments || item.files || item.file_list || [];
  const normalizedAttachments = Array.isArray(attachments)
    ? attachments.map((file) => {
      if (typeof file === 'string') {
        return { name: file };
      }
      return {
        name: file.name || file.fileName || file.filename || '첨부파일',
        type: file.type || file.mimeType || file.extension || ''
      };
    })
    : [];

  return {
    id: item.id || item.mailId || item.messageId || null,
    subject: item.subject || item.title || '제목 없음',
    senderName: item.senderName || item.fromName || item.sender || '',
    senderEmail: item.senderEmail || item.fromEmail || item.from || '',
    companyName: item.companyName || item.company || item.vendor || '',
    receivedAt: item.receivedAt || item.received_at || item.createdAt || item.created_at || null,
    summary: item.summary || item.aiSummary || item.ai_summary || '',
    isImportant: Boolean(
      item.isImportant ?? item.important ?? item.is_important ?? item.priority === 'high'
    ),
    attachments: normalizedAttachments
  };
};

const formatDateTime = (value) => {
  if (!value) return '수신 시간 정보 없음';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '수신 시간 정보 없음';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AISummary = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMail, setSelectedMail] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadMails = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchMailSummaries();
      const list = Array.isArray(data) ? data : [];
      setMails(list.map(normalizeMailItem));
    } catch (error) {
      console.error('메일 요약 로드 실패:', error);
      setErrorMessage(error?.message || '메일 요약 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMails();
  }, []);

  const sortedMails = useMemo(() => {
    const copy = [...mails];
    copy.sort((a, b) => {
      if (a.isImportant !== b.isImportant) {
        return a.isImportant ? -1 : 1;
      }
      const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return timeB - timeA;
    });
    return copy;
  }, [mails]);

  const handleOpenSummary = (mail) => {
    setSelectedMail(mail);
    setDialogOpen(true);
  };

  const handleCloseSummary = () => {
    setDialogOpen(false);
    setSelectedMail(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: '30px' }}>
      <MobileSidebar />
      <Container
        maxWidth={false}
        sx={{
          pt: 2,
          pb: 4,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box
          sx={{
            p: isMobile ? 2 : 3,
            borderRadius: 2,
            boxShadow: 3,
            bgcolor: 'background.paper',
            minHeight: '100vh'
          }}
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 2
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                AI 메일 요약
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                수신 메일 {mails.length}건
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadMails}
              disabled={loading}
              sx={{ alignSelf: isMobile ? 'stretch' : 'auto' }}
            >
              새로고침
            </Button>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : sortedMails.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.04)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                표시할 메일이 없습니다.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                NAS API에서 요약 데이터를 확인해주세요.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {sortedMails.map((mail, index) => (
                <Card
                  key={mail.id || mail.messageId || `${mail.senderEmail}-${mail.receivedAt}-${index}`}
                  sx={{
                    border: mail.isImportant ? '1px solid rgba(244,67,54,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: mail.isImportant ? 'rgba(244,67,54,0.08)' : 'transparent'
                  }}
                >
                  <CardActionArea onClick={() => handleOpenSummary(mail)}>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2,
                          flexDirection: isMobile ? 'column' : 'row'
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {mail.subject}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                            {mail.senderName || '보낸 사람 미상'}
                            {mail.senderEmail ? ` · ${mail.senderEmail}` : ''}
                            {mail.companyName ? ` · ${mail.companyName}` : ''}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatDateTime(mail.receivedAt)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {mail.isImportant && (
                            <Chip
                              icon={<StarIcon />}
                              label="중요"
                              color="error"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                          {mail.attachments.length > 0 && (
                            <Chip
                              icon={<AttachFileIcon />}
                              label={`첨부 ${mail.attachments.length}개`}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Container>

      <Dialog open={dialogOpen} onClose={handleCloseSummary} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedMail?.subject || '메일 요약'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedMail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {selectedMail.senderName || '보낸 사람 미상'}
                  {selectedMail.senderEmail ? ` · ${selectedMail.senderEmail}` : ''}
                  {selectedMail.companyName ? ` · ${selectedMail.companyName}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatDateTime(selectedMail.receivedAt)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  AI 요약
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedMail.summary || '요약 데이터가 없습니다.'}
                </Typography>
              </Box>

              {selectedMail.attachments.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      첨부파일
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {selectedMail.attachments.map((file, idx) => (
                        <Chip
                          key={`${file.name}-${idx}`}
                          label={file.type ? `${file.name} (${file.type})` : file.name}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSummary}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AISummary;
