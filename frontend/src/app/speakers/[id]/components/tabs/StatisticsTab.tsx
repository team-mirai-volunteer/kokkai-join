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
  Tooltip,
  LinearProgress,
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
                最多発言会議
              </Typography>
              <Tooltip title={statistics.topMeetingTypes[0] ? `${statistics.topMeetingTypes[0].count}回発言` : ''}>
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: '1.25rem',
                      lineHeight: 1.2,
                      height: '3em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {statistics.topMeetingTypes[0]?.type || '-'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statistics.topMeetingTypes[0] ? `${statistics.topMeetingTypes[0].count}回` : ''}
                  </Typography>
                </Box>
              </Tooltip>
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

        {/* 月別発言数（改善版） */}
        {statistics.monthlySpeechData.length > 0 && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  月別発言数（直近12ヶ月）
                </Typography>
                
                {/* 最大値と平均値の表示 */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    最大: {Math.max(...statistics.monthlySpeechData.slice(-12).map(d => d.count))}回
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均: {Math.round(
                      statistics.monthlySpeechData.slice(-12).reduce((sum, d) => sum + d.count, 0) / 
                      Math.min(12, statistics.monthlySpeechData.length)
                    )}回
                  </Typography>
                </Stack>

                {/* 棒グラフ */}
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 600, py: 2 }}>
                    {statistics.monthlySpeechData.slice(-12).reverse().map((item) => {
                      const maxCount = Math.max(...statistics.monthlySpeechData.slice(-12).map(d => d.count));
                      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      const [year, month] = item.month.split('-');
                      const monthLabel = `${year}年${parseInt(month)}月`;
                      
                      return (
                        <Box key={item.month} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                minWidth: 100,
                                textAlign: 'right',
                                color: 'text.secondary'
                              }}
                            >
                              {year.slice(2)}年{parseInt(month)}月
                            </Typography>
                            
                            <Tooltip title={`${monthLabel}: ${item.count}回`} placement="top">
                              <Box sx={{ flex: 1, position: 'relative' }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  sx={{
                                    height: 24,
                                    borderRadius: 1,
                                    backgroundColor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 1,
                                      background: percentage > 70 
                                        ? 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)'
                                        : percentage > 40
                                        ? 'linear-gradient(90deg, #42a5f5 0%, #66bb6a 100%)'
                                        : 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)',
                                    },
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontWeight: 'medium',
                                    color: percentage > 50 ? 'white' : 'text.primary',
                                  }}
                                >
                                  {item.count}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/* データがない月の説明 */}
                {statistics.monthlySpeechData.slice(-12).some(d => d.count === 0) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ※ 発言がない月も含まれています
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}