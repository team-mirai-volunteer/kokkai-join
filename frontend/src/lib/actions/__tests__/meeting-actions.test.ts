import {
  getRecentMeetings,
  getMeetingDetail,
  searchMeetings,
  getDatabaseStats,
} from '../meeting-actions';
import * as meetingDb from '@/lib/db/meeting-db';

// Mock the database module
jest.mock('@/lib/db/meeting-db');

describe('meeting-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRecentMeetings', () => {
    it('should return recent meetings from database', async () => {
      const mockMeetings = [
        {
          id: '1',
          title: '予算委員会',
          house: '衆議院',
          date: '2024-03-15',
          session: 213,
          issue: '第1号',
          url: 'https://example.com/meeting1',
          speechCount: 25,
        },
        {
          id: '2',
          title: '本会議',
          house: '参議院',
          date: '2024-03-14',
          session: 213,
          issue: '第2号',
          url: 'https://example.com/meeting2',
          speechCount: 30,
        },
      ];

      jest.spyOn(meetingDb, 'getRecentMeetingsFromDB').mockResolvedValue(mockMeetings);

      const result = await getRecentMeetings(10);

      expect(result).toEqual(mockMeetings);
      expect(meetingDb.getRecentMeetingsFromDB).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not provided', async () => {
      jest.spyOn(meetingDb, 'getRecentMeetingsFromDB').mockResolvedValue([]);

      await getRecentMeetings();

      expect(meetingDb.getRecentMeetingsFromDB).toHaveBeenCalledWith(10);
    });

    it('should return empty array on error', async () => {
      jest
        .spyOn(meetingDb, 'getRecentMeetingsFromDB')
        .mockRejectedValue(new Error('Database error'));

      const result = await getRecentMeetings();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Server Action: getRecentMeetings failed:',
        expect.any(Error)
      );
    });
  });

  describe('getMeetingDetail', () => {
    const mockMeeting = {
      id: '1',
      issueID: 'issue123',
      imageKind: null,
      searchObject: null,
      session: 213,
      nameOfHouse: '衆議院',
      nameOfMeeting: '予算委員会',
      issue: '第1号',
      date: new Date('2024-03-15'),
      closing: null,
      meetingURL: 'https://example.com/meeting1',
      pdfURL: null,
      speeches: [
        {
          id: 's1',
          speechID: 'speech1',
          speechOrder: 1,
          speakerId: 'speaker1',
          speaker: {
            id: 'speaker1',
            normalizedName: '山田太郎',
            displayName: '山田太郎',
            nameYomi: 'ヤマダタロウ',
            speechCount: 10,
          },
          rawSpeaker: '山田太郎君',
          rawSpeakerYomi: 'ヤマダタロウ',
          rawSpeakerGroup: '自民党',
          rawSpeakerPosition: null,
          rawSpeakerRole: null,
          speech: 'これは発言内容です。',
          startPage: 1,
          speechURL: 'https://example.com/speech1',
        },
      ],
    };

    it('should return meeting detail for valid issueId', async () => {
      jest.spyOn(meetingDb, 'getMeetingByIssueID').mockResolvedValue(mockMeeting);

      const result = await getMeetingDetail('issue123');

      expect(result).toEqual(mockMeeting);
      expect(meetingDb.getMeetingByIssueID).toHaveBeenCalledWith('issue123');
    });

    it('should return null for invalid issueId', async () => {
      const result = await getMeetingDetail('');

      expect(result).toBeNull();
      expect(meetingDb.getMeetingByIssueID).not.toHaveBeenCalled();
    });

    it('should return null when issueId is not a string', async () => {
      const result = await getMeetingDetail(123 as unknown as string);

      expect(result).toBeNull();
      expect(meetingDb.getMeetingByIssueID).not.toHaveBeenCalled();
    });

    it('should return null when meeting not found', async () => {
      jest.spyOn(meetingDb, 'getMeetingByIssueID').mockResolvedValue(null);

      const result = await getMeetingDetail('nonexistent');

      expect(result).toBeNull();
      expect(meetingDb.getMeetingByIssueID).toHaveBeenCalledWith('nonexistent');
    });

    it('should return null on database error', async () => {
      jest.spyOn(meetingDb, 'getMeetingByIssueID').mockRejectedValue(new Error('Database error'));

      const result = await getMeetingDetail('issue123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Server Action: getMeetingDetail failed:',
        expect.any(Error)
      );
    });
  });

  describe('searchMeetings', () => {
    const mockSearchResult = {
      meetings: [
        {
          id: '1',
          title: '予算委員会',
          house: '衆議院',
          date: '2024-03-15',
          session: 213,
          issue: '第1号',
          url: 'https://example.com/meeting1',
          speechCount: 25,
        },
      ],
      total: 1,
      hasMore: false,
    };

    it('should search meetings with query', async () => {
      jest.spyOn(meetingDb, 'searchMeetingsInDB').mockResolvedValue(mockSearchResult);

      const result = await searchMeetings('予算');

      expect(result).toEqual({
        meetings: [
          {
            issueID: '1',
            nameOfMeeting: '予算委員会',
            nameOfHouse: '衆議院',
            date: '2024-03-15',
            session: 213,
            issue: '第1号',
            meetingURL: 'https://example.com/meeting1',
            pdfURL: undefined,
            speechCount: 25,
          },
        ],
        totalCount: 1,
        hasMore: false,
        currentPage: 1,
      });

      expect(meetingDb.searchMeetingsInDB).toHaveBeenCalledWith({
        keyword: '予算',
        nameOfHouse: undefined,
        speaker: undefined,
        from: undefined,
        until: undefined,
        skip: 0,
        take: 30,
      });
    });

    it('should search with all parameters', async () => {
      jest.spyOn(meetingDb, 'searchMeetingsInDB').mockResolvedValue(mockSearchResult);

      await searchMeetings('予算', {
        house: '衆議院',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        speaker: '山田',
        limit: 20,
        page: 2,
      });

      expect(meetingDb.searchMeetingsInDB).toHaveBeenCalledWith({
        keyword: '予算',
        nameOfHouse: '衆議院',
        speaker: '山田',
        from: '2024-01-01',
        until: '2024-12-31',
        skip: 20,
        take: 20,
      });
    });

    it('should handle empty query', async () => {
      jest.spyOn(meetingDb, 'searchMeetingsInDB').mockResolvedValue(mockSearchResult);

      await searchMeetings('');

      expect(meetingDb.searchMeetingsInDB).toHaveBeenCalledWith({
        keyword: undefined,
        nameOfHouse: undefined,
        speaker: undefined,
        from: undefined,
        until: undefined,
        skip: 0,
        take: 30,
      });
    });

    it('should throw error on database failure', async () => {
      jest.spyOn(meetingDb, 'searchMeetingsInDB').mockRejectedValue(new Error('Database error'));

      await expect(searchMeetings('予算')).rejects.toThrow('Database error');
      expect(console.error).toHaveBeenCalledWith(
        'Server Action: searchMeetings failed:',
        expect.any(Error)
      );
    });

    it('should use default pagination values', async () => {
      jest.spyOn(meetingDb, 'searchMeetingsInDB').mockResolvedValue(mockSearchResult);

      await searchMeetings('予算', {});

      expect(meetingDb.searchMeetingsInDB).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 30,
        })
      );
    });
  });

  describe('getDatabaseStats', () => {
    const mockStats = {
      totalMeetings: 1000,
      totalSpeeches: 50000,
      totalSpeakers: 500,
      oldestDate: new Date('2020-01-01'),
      newestDate: new Date('2024-03-15'),
    };

    it('should return database statistics', async () => {
      jest.spyOn(meetingDb, 'getDBStats').mockResolvedValue(mockStats);

      const result = await getDatabaseStats();

      expect(result).toEqual(mockStats);
      expect(meetingDb.getDBStats).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      jest.spyOn(meetingDb, 'getDBStats').mockRejectedValue(new Error('Database error'));

      const result = await getDatabaseStats();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Server Action: getDatabaseStats failed:',
        expect.any(Error)
      );
    });
  });
});
