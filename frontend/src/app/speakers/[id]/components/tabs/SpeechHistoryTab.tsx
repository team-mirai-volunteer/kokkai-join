'use client';

import { useState, useTransition } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { getSpeakerSpeeches } from '@/lib/actions/speaker-actions';

interface Speech {
  id: string;
  speechID: string;
  speechOrder: number;
  speech: string | null;
  meeting: {
    id: string;
    issueID: string;
    date: Date;
    nameOfHouse: string;
    nameOfMeeting: string;
  };
  position: {
    id: string;
    name: string;
  } | null;
  role: {
    id: string;
    name: string;
  } | null;
}

interface SpeechHistoryTabProps {
  speakerId: string;
  initialSpeeches: Speech[];
}

export function SpeechHistoryTab({ speakerId, initialSpeeches }: SpeechHistoryTabProps) {
  const [speeches, setSpeeches] = useState(initialSpeeches);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialSpeeches.length === 20);
  const [filters, setFilters] = useState({
    keyword: '',
    house: '',
    meetingName: '',
  });
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getSpeakerSpeeches(speakerId, nextPage, 20, {
        keyword: filters.keyword || undefined,
        house: filters.house || undefined,
        meetingName: filters.meetingName || undefined,
      });
      
      setSpeeches([...speeches, ...result.speeches]);
      setPage(nextPage);
      setHasMore(result.speeches.length === 20);
    });
  };

  const applyFilters = () => {
    startTransition(async () => {
      const result = await getSpeakerSpeeches(speakerId, 1, 20, {
        keyword: filters.keyword || undefined,
        house: filters.house || undefined,
        meetingName: filters.meetingName || undefined,
      });
      
      setSpeeches(result.speeches);
      setPage(1);
      setHasMore(result.speeches.length === 20);
    });
  };

  const truncateText = (text: string | null, maxLength: number = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Box>
      {/* フィルタセクション */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            検索・フィルタ
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="キーワード検索"
              variant="outlined"
              size="small"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              fullWidth
            />
            
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>院</InputLabel>
                <Select
                  value={filters.house}
                  label="院"
                  onChange={(e) => setFilters({ ...filters, house: e.target.value })}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="衆議院">衆議院</MenuItem>
                  <MenuItem value="参議院">参議院</MenuItem>
                  <MenuItem value="両院">両院</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="会議名"
                variant="outlined"
                size="small"
                value={filters.meetingName}
                onChange={(e) => setFilters({ ...filters, meetingName: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
            </Stack>
            
            <Button
              variant="contained"
              onClick={applyFilters}
              disabled={isPending}
            >
              フィルタを適用
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 発言リスト */}
      <Stack spacing={2}>
        {speeches.map((speech) => (
          <Accordion key={speech.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ width: '100%' }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {formatDate(speech.meeting.date)}
                  </Typography>
                  <Chip label={speech.meeting.nameOfHouse} size="small" />
                  <Chip label={speech.meeting.nameOfMeeting} size="small" variant="outlined" />
                  {speech.position && (
                    <Chip label={speech.position.name} size="small" color="primary" />
                  )}
                  {speech.role && (
                    <Chip label={speech.role.name} size="small" color="secondary" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {truncateText(speech.speech)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                  {speech.speech}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    component={Link}
                    href={`/meeting/${speech.meeting.issueID}`}
                    size="small"
                    variant="outlined"
                  >
                    会議詳細を見る
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    発言順序: {speech.speechOrder}
                  </Typography>
                </Stack>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {/* さらに読み込むボタン */}
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={loadMore}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={20} /> : null}
          >
            {isPending ? '読み込み中...' : 'さらに表示'}
          </Button>
        </Box>
      )}

      {speeches.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            発言が見つかりませんでした
          </Typography>
        </Box>
      )}
    </Box>
  );
}