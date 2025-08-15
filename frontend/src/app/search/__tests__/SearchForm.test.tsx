import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { SearchForm } from '../SearchForm'

// Mock next/navigation
jest.mock('next/navigation')

describe('SearchForm', () => {
  const mockPush = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('should render all form fields', () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    expect(screen.getByLabelText('キーワード')).toBeInTheDocument()
    expect(screen.getByLabelText('院')).toBeInTheDocument()
    expect(screen.getByLabelText('発言者')).toBeInTheDocument()
    expect(screen.getByLabelText('開始日')).toBeInTheDocument()
    expect(screen.getByLabelText('終了日')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'クリア' })).toBeInTheDocument()
  })

  it('should initialize with provided values', () => {
    render(
      <SearchForm
        initialValues={{
          keyword: 'テスト',
          house: '衆議院',
          speaker: '山田太郎',
          dateFrom: '2024-01-01',
          dateUntil: '2024-12-31',
        }}
      />
    )

    expect(screen.getByDisplayValue('テスト')).toBeInTheDocument()
    expect(screen.getByDisplayValue('衆議院')).toBeInTheDocument()
    expect(screen.getByDisplayValue('山田太郎')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument()
  })

  it('should update keyword field when typing', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const keywordInput = screen.getByLabelText('キーワード')
    await user.type(keywordInput, '予算')

    expect(keywordInput).toHaveValue('予算')
  })

  it('should select house from dropdown', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const houseSelect = screen.getByLabelText('院')
    fireEvent.mouseDown(houseSelect)

    const option = await screen.findByText('参議院')
    fireEvent.click(option)

    await waitFor(() => {
      expect(screen.getByDisplayValue('参議院')).toBeInTheDocument()
    })
  })

  it('should navigate with search parameters on submit', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const keywordInput = screen.getByLabelText('キーワード')
    const speakerInput = screen.getByLabelText('発言者')
    const searchButton = screen.getByRole('button', { name: '検索' })

    await user.type(keywordInput, '予算')
    await user.type(speakerInput, '山田')
    await user.click(searchButton)

    expect(mockPush).toHaveBeenCalledWith('/search?q=予算&speaker=山田')
  })

  it('should include all filled fields in search URL', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const keywordInput = screen.getByLabelText('キーワード')
    const speakerInput = screen.getByLabelText('発言者')
    const dateFromInput = screen.getByLabelText('開始日')
    const dateUntilInput = screen.getByLabelText('終了日')
    const searchButton = screen.getByRole('button', { name: '検索' })

    await user.type(keywordInput, '予算')
    await user.type(speakerInput, '山田')
    await user.type(dateFromInput, '2024-01-01')
    await user.type(dateUntilInput, '2024-12-31')

    // Select house
    const houseSelect = screen.getByLabelText('院')
    fireEvent.mouseDown(houseSelect)
    const option = await screen.findByText('衆議院')
    fireEvent.click(option)

    await user.click(searchButton)

    expect(mockPush).toHaveBeenCalledWith(
      '/search?q=予算&house=衆議院&speaker=山田&from=2024-01-01&until=2024-12-31'
    )
  })

  it('should clear all fields when clear button is clicked', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: 'テスト',
          house: '衆議院',
          speaker: '山田太郎',
          dateFrom: '2024-01-01',
          dateUntil: '2024-12-31',
        }}
      />
    )

    const clearButton = screen.getByRole('button', { name: 'クリア' })
    await user.click(clearButton)

    const keywordInput = screen.getByLabelText('キーワード')
    const speakerInput = screen.getByLabelText('発言者')
    const dateFromInput = screen.getByLabelText('開始日')
    const dateUntilInput = screen.getByLabelText('終了日')

    expect(keywordInput).toHaveValue('')
    expect(speakerInput).toHaveValue('')
    expect(dateFromInput).toHaveValue('')
    expect(dateUntilInput).toHaveValue('')
  })

  it('should handle form submission with empty fields', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const searchButton = screen.getByRole('button', { name: '検索' })
    await user.click(searchButton)

    expect(mockPush).toHaveBeenCalledWith('/search?')
  })

  it('should display all house options in dropdown', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const houseSelect = screen.getByLabelText('院')
    fireEvent.mouseDown(houseSelect)

    await waitFor(() => {
      expect(screen.getByText('すべて')).toBeInTheDocument()
      expect(screen.getByText('衆議院')).toBeInTheDocument()
      expect(screen.getByText('参議院')).toBeInTheDocument()
      expect(screen.getByText('両院')).toBeInTheDocument()
      expect(screen.getByText('両院協議会')).toBeInTheDocument()
    })
  })

  it('should handle date input changes', async () => {
    render(
      <SearchForm
        initialValues={{
          keyword: '',
          house: '',
          speaker: '',
          dateFrom: '',
          dateUntil: '',
        }}
      />
    )

    const dateFromInput = screen.getByLabelText('開始日')
    const dateUntilInput = screen.getByLabelText('終了日')

    fireEvent.change(dateFromInput, { target: { value: '2024-03-01' } })
    fireEvent.change(dateUntilInput, { target: { value: '2024-03-31' } })

    expect(dateFromInput).toHaveValue('2024-03-01')
    expect(dateUntilInput).toHaveValue('2024-03-31')
  })
})