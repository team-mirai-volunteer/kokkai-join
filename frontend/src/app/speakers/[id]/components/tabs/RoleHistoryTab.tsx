'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatDate } from '@/lib/utils/date';
import { getSpeakerRoleHistory } from '@/lib/actions/speaker-actions';
import Link from 'next/link';

interface RoleHistoryTabProps {
  speakerId: string;
}

interface RoleHistoryData {
  positions: Array<{
    position: { id: string; name: string; category: string | null };
    firstDate: Date;
    lastDate: Date;
    count: number;
    meetings: Array<{ id: string; issueID: string; nameOfMeeting: string; date: Date }>;
  }>;
  roles: Array<{
    role: { id: string; name: string };
    firstDate: Date;
    lastDate: Date;
    count: number;
    meetings: Array<{ id: string; issueID: string; nameOfMeeting: string; date: Date }>;
  }>;
  totalPositions: number;
  totalRoles: number;
}

export function RoleHistoryTab({ speakerId }: RoleHistoryTabProps) {
  const [roleHistory, setRoleHistory] = useState<RoleHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoleHistory = async () => {
      try {
        const data = await getSpeakerRoleHistory(speakerId);
        setRoleHistory(data);
      } catch (error) {
        console.error('Failed to load role history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoleHistory();
  }, [speakerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!roleHistory) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          役職・役割履歴を取得できませんでした
        </Typography>
      </Box>
    );
  }

  if (roleHistory.totalPositions === 0 && roleHistory.totalRoles === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          役職・役割の履歴はありません
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* サマリー */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              役職履歴
            </Typography>
            <Typography variant="h3" color="primary">
              {roleHistory.totalPositions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              種類
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              役割履歴
            </Typography>
            <Typography variant="h3" color="primary">
              {roleHistory.totalRoles}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              種類
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* 役職履歴 */}
      {roleHistory.positions.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            役職履歴
          </Typography>
          {roleHistory.positions.map((item, index) => (
            <Accordion key={item.position.id} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>
                    {item.position.name}
                  </Typography>
                  {item.position.category && (
                    <Chip label={item.position.category} size="small" variant="outlined" />
                  )}
                  <Chip label={`${item.count}回`} size="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(item.firstDate)} 〜 {formatDate(item.lastDate)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    最近の会議（最大5件）
                  </Typography>
                  <List dense>
                    {item.meetings.map((meeting) => (
                      <ListItem key={meeting.id}>
                        <ListItemText
                          primary={
                            <Link
                              href={`/meeting/${meeting.issueID}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {meeting.nameOfMeeting}
                              </Typography>
                            </Link>
                          }
                          secondary={formatDate(meeting.date)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      {/* 役割履歴 */}
      {roleHistory.roles.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            役割履歴
          </Typography>
          {roleHistory.roles.map((item, index) => (
            <Accordion key={item.role.id} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>
                    {item.role.name}
                  </Typography>
                  <Chip label={`${item.count}回`} size="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(item.firstDate)} 〜 {formatDate(item.lastDate)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    最近の会議（最大5件）
                  </Typography>
                  <List dense>
                    {item.meetings.map((meeting) => (
                      <ListItem key={meeting.id}>
                        <ListItemText
                          primary={
                            <Link
                              href={`/meeting/${meeting.issueID}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {meeting.nameOfMeeting}
                              </Typography>
                            </Link>
                          }
                          secondary={formatDate(meeting.date)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Box>
  );
}