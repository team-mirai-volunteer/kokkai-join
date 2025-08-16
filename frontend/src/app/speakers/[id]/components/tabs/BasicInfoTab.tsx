'use client';

import { Typography, Box, List, ListItem, ListItemText, Divider, Chip, Stack } from '@mui/material';
import { formatDate } from '@/lib/utils/date';

interface BasicInfoTabProps {
  speaker: {
    normalizedName: string;
    displayName: string;
    nameYomi: string | null;
    firstSpeechDate: Date | null;
    lastSpeechDate: Date | null;
    aliases: Array<{
      id: string;
      aliasName: string;
      aliasYomi: string | null;
    }>;
    _count: {
      speeches: number;
    };
  };
}

export function BasicInfoTab({ speaker }: BasicInfoTabProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        基本情報
      </Typography>
      
      <List>
        <ListItem>
          <ListItemText
            primary="正規化名"
            secondary={speaker.normalizedName}
          />
        </ListItem>
        
        <ListItem>
          <ListItemText
            primary="表示名"
            secondary={speaker.displayName}
          />
        </ListItem>
        
        {speaker.nameYomi && (
          <ListItem>
            <ListItemText
              primary="よみがな"
              secondary={speaker.nameYomi}
            />
          </ListItem>
        )}
        
        <Divider component="li" />
        
        <ListItem>
          <ListItemText
            primary="総発言数"
            secondary={`${speaker._count.speeches.toLocaleString()} 件`}
          />
        </ListItem>
        
        {speaker.firstSpeechDate && (
          <ListItem>
            <ListItemText
              primary="初回発言日"
              secondary={formatDate(speaker.firstSpeechDate)}
            />
          </ListItem>
        )}
        
        {speaker.lastSpeechDate && (
          <ListItem>
            <ListItemText
              primary="最終発言日"
              secondary={formatDate(speaker.lastSpeechDate)}
            />
          </ListItem>
        )}
      </List>

      {speaker.aliases.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            別名・表記ゆれ
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {speaker.aliases.map((alias) => (
              <Chip
                key={alias.id}
                label={
                  alias.aliasYomi
                    ? `${alias.aliasName} (${alias.aliasYomi})`
                    : alias.aliasName
                }
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}