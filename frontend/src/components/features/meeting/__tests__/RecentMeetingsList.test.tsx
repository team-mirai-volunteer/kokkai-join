import React from 'react'
import { render, screen } from '@testing-library/react'
import { RecentMeetingsList } from '../RecentMeetingsList'
import type { RecentMeeting } from '@/lib/types/api'

describe('RecentMeetingsList', () => {
  const mockMeetings: RecentMeeting[] = [
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
    {
      id: '3',
      title: '外交防衛委員会',
      house: '参議院',
      date: '2024-03-13',
      session: 213,
      issue: '第3号',
      url: 'https://example.com/meeting3',
      speechCount: 15,
    },
  ]

  it('should render meetings when provided', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    expect(screen.getByText('予算委員会')).toBeInTheDocument()
    expect(screen.getByText('本会議')).toBeInTheDocument()
    expect(screen.getByText('外交防衛委員会')).toBeInTheDocument()
  })

  it('should display house and session information', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    expect(screen.getByText('衆議院')).toBeInTheDocument()
    expect(screen.getAllByText('参議院')).toHaveLength(2)
    expect(screen.getAllByText('213')).toHaveLength(3)
  })

  it('should display formatted dates', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    expect(screen.getByText('2024年3月15日')).toBeInTheDocument()
    expect(screen.getByText('2024年3月14日')).toBeInTheDocument()
    expect(screen.getByText('2024年3月13日')).toBeInTheDocument()
  })

  it('should display speech counts', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    expect(screen.getByText('25発言')).toBeInTheDocument()
    expect(screen.getByText('30発言')).toBeInTheDocument()
    expect(screen.getByText('15発言')).toBeInTheDocument()
  })

  it('should display issues when available', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    expect(screen.getByText('第1号')).toBeInTheDocument()
    expect(screen.getByText('第2号')).toBeInTheDocument()
    expect(screen.getByText('第3号')).toBeInTheDocument()
  })

  it('should render empty state when no meetings', () => {
    render(<RecentMeetingsList meetings={[]} />)

    expect(screen.getByText('会議録が見つかりませんでした')).toBeInTheDocument()
  })

  it('should render correct number of meetings', () => {
    render(<RecentMeetingsList meetings={mockMeetings} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
  })

  it('should show meetings with no issue field', () => {
    const meetingsWithoutIssue = [
      {
        ...mockMeetings[0],
        issue: '',
      },
    ]
    render(<RecentMeetingsList meetings={meetingsWithoutIssue} />)

    expect(screen.getByText('予算委員会')).toBeInTheDocument()
    // Issue chip should not be rendered when issue is empty
    expect(screen.queryByText('第1号')).not.toBeInTheDocument()
  })

  it('should handle meetings with zero speech count', () => {
    const meetingsWithZeroSpeeches = [
      {
        ...mockMeetings[0],
        speechCount: 0,
      },
    ]
    render(<RecentMeetingsList meetings={meetingsWithZeroSpeeches} />)

    expect(screen.getByText('0発言')).toBeInTheDocument()
  })

  it('should use loading state when meetings are undefined', () => {
    render(<RecentMeetingsList />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})