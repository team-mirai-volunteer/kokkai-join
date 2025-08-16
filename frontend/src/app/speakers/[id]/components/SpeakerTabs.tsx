'use client';

import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { AffiliationHistoryTab } from './tabs/AffiliationHistoryTab';
import { SpeechHistoryTab } from './tabs/SpeechHistoryTab';
import { StatisticsTab } from './tabs/StatisticsTab';
import { RoleHistoryTab } from './tabs/RoleHistoryTab';
import type { Prisma } from '@prisma/client';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`speaker-tabpanel-${index}`}
      aria-labelledby={`speaker-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Prismaの型を利用して型定義
type SpeakerWithDetails = Prisma.SpeakerGetPayload<{
  include: {
    aliases: true;
    affiliations: {
      include: {
        partyGroup: true;
      };
    };
    speeches: {
      include: {
        meeting: true;
        position: true;
        role: true;
      };
    };
    _count: {
      select: {
        speeches: true;
      };
    };
  };
}>;

interface SpeakerTabsProps {
  speaker: SpeakerWithDetails;
}

const TAB_NAMES = ['basic', 'affiliation', 'role', 'speech', 'statistics'] as const;
type TabName = typeof TAB_NAMES[number];

export function SpeakerTabs({ speaker }: SpeakerTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLからタブを取得、デフォルトは'basic'
  const tabParam = searchParams.get('tab') as TabName | null;
  const initialTab = tabParam && TAB_NAMES.includes(tabParam) 
    ? TAB_NAMES.indexOf(tabParam) 
    : 0;
  
  const [value, setValue] = useState(initialTab);

  // URLパラメーターが変更されたときにタブを更新
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabName | null;
    if (tabParam && TAB_NAMES.includes(tabParam)) {
      setValue(TAB_NAMES.indexOf(tabParam));
    }
  }, [searchParams]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    // URLを更新
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', TAB_NAMES[newValue]);
    router.push(`/speakers/${speaker.id}?${params.toString()}`);
  };

  return (
    <Paper elevation={0}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="speaker details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="基本情報" id="speaker-tab-0" />
          <Tab label="所属履歴" id="speaker-tab-1" />
          <Tab label="役職・役割" id="speaker-tab-2" />
          <Tab label="発言履歴" id="speaker-tab-3" />
          <Tab label="統計・分析" id="speaker-tab-4" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        <TabPanel value={value} index={0}>
          <BasicInfoTab speaker={speaker} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <AffiliationHistoryTab affiliations={speaker.affiliations} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <RoleHistoryTab speakerId={speaker.id} />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <SpeechHistoryTab speakerId={speaker.id} initialSpeeches={speaker.speeches} />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <StatisticsTab speakerId={speaker.id} />
        </TabPanel>
      </Box>
    </Paper>
  );
}