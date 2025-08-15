'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@mui/material'
import { Search } from '@mui/icons-material'

export default function SearchButton() {
  const router = useRouter()

  const handleSearchClick = () => {
    router.push('/search')
  }

  return (
    <Button
      onClick={handleSearchClick}
      variant="contained"
      size="large"
      startIcon={<Search />}
      sx={{ minWidth: 200 }}
    >
      会議録を検索
    </Button>
  )
}
