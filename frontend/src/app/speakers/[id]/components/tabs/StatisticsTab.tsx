'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Grid,
} from '@mui/material';
import { getSpeakerStatistics, getCoSpeakers } from '@/lib/actions/speaker-actions';
import Link from 'next/link';

// 統計データの型定義
interface Statistics {
  totalSpeeches: number;
  totalCharacters: number;
  averageSpeechLength: number;
  firstSpeechDate: Date | null;
  lastSpeechDate: Date | null;
  monthlySpeechData: Array<{ month: string; count: number }>;
  topMeetingTypes: Array<{ type: string; count: number }>;
}

interface CoSpeaker {
  speaker: {
    id: string;
    displayName: string;
  };
  sharedMeetingsCount: number;
}

interface StatisticsTabProps {
  speakerId: string;
}

export function StatisticsTab({ speakerId }: StatisticsTabProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [coSpeakers, setCoSpeakers] = useState<CoSpeaker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stats, coSpeakersData] = await Promise.all([
          getSpeakerStatistics(speakerId),
          getCoSpeakers(speakerId),
        ]);
        setStatistics(stats);
        setCoSpeakers(coSpeakersData);
      } catch (error) {
        console.error('Failed to load statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [speakerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!statistics) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          統計情報を取得できませんでした
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* 基本統計 */}
        <Grid size={12}>
          <Typography variant="h6" gutterBottom>
            基本統計
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                総発言数
              </Typography>
              <Typography variant="h4">
                {statistics.totalSpeeches.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                総文字数
              </Typography>
              <Typography variant="h4">
                {statistics.totalCharacters.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                平均発言長
              </Typography>
              <Typography variant="h4">
                {statistics.averageSpeechLength.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                文字
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                活動期間
              </Typography>
              <Typography variant="h4">
                {statistics.firstSpeechDate && statistics.lastSpeechDate
                  ? Math.ceil(
                      (new Date(statistics.lastSpeechDate).getTime() -
                        new Date(statistics.firstSpeechDate).getTime()) /
                        (1000 * 60 * 60 * 24 * 365)
                    )
                  : 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                年
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* よく発言する会議TOP10 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                よく発言する会議 TOP10
              </Typography>
              <List dense>
                {statistics.topMeetingTypes.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={item.type}
                      secondary={`${item.count}回`}
                    />
                    <Chip label={`${index + 1}位`} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 共演者TOP10 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                よく同じ会議に出席する発言者 TOP10
              </Typography>
              <List dense>
                {coSpeakers.map((item, index) => (
                  <ListItem
                    key={index}
                    component={Link}
                    href={`/speakers/${item.speaker.id}`}
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <ListItemText
                      primary={item.speaker.displayName}
                      secondary={`${item.sharedMeetingsCount}回の会議で同席`}
                    />
                    <Chip label={`${index + 1}位`} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 月別発言数（簡易版） */}
        {statistics.monthlySpeechData.length > 0 && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  月別発言数（直近12ヶ月）
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Stack direction="row" spacing={1} sx={{ minWidth: 600, py: 2 }}>
                    {statistics.monthlySpeechData.slice(-12).map((item) => (
                      <Box
                        key={item.month}
                        sx={{
                          textAlign: 'center',
                          minWidth: 60,
                        }}
                      >
                        <Box
                          sx={{
                            height: 100,
                            width: 40,
                            bgcolor: 'primary.main',
                            opacity: 0.8,
                            mb: 1,
                            mx: 'auto',
                            display: 'flex',
                            alignItems: 'flex-end',
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: `${Math.min(100, (item.count / Math.max(...statistics.monthlySpeechData.map((d) => d.count))) * 100)}%`,
                              bgcolor: 'primary.main',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" display="block">
                          {item.count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.month.substring(5)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}