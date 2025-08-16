'use client';

import { Box, Button, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel } from '@mui/x-data-grid';
import { jaJP } from '@mui/x-data-grid/locales';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildSearchUrl } from '@/lib/utils/search-params';
import { formatDateShort } from '@/lib/utils/date';
import { useState } from 'react';

interface Meeting {
  issueID: string;
  nameOfMeeting: string;
  nameOfHouse: string;
  date: string;
  session: string;
  issue: string;
  meetingURL: string;
  pdfURL?: string;
  speechCount?: number;
}

interface SearchResultsGridProps {
  meetings: Meeting[];
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
  searchParams: {
    q?: string;
    house?: string;
    speaker?: string;
    from?: string;
    until?: string;
    pageSize?: string;
    sortField?: string;
    sortOrder?: string;
  };
}

export function SearchResultsGrid({
  meetings,
  totalCount,
  currentPage,
  searchParams,
}: SearchResultsGridProps) {
  const router = useRouter();
  const pageSize = parseInt(searchParams.pageSize || '25', 10);
  const [paginationModel, setPaginationModel] = useState({
    page: currentPage - 1,
    pageSize: pageSize,
  });

  // ソートモデルの初期値を設定
  const [sortModel, setSortModel] = useState<GridSortModel>(() => {
    if (searchParams.sortField && searchParams.sortOrder) {
      return [{ field: searchParams.sortField, sort: searchParams.sortOrder as 'asc' | 'desc' }];
    }
    return [{ field: 'date', sort: 'desc' }];
  });

  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: '日付',
      width: 110,
      valueGetter: (value) => formatDateShort(value),
    },
    {
      field: 'nameOfHouse',
      headerName: '院',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="primary" />
      ),
    },
    {
      field: 'session',
      headerName: '会期',
      width: 80,
    },
    {
      field: 'nameOfMeeting',
      headerName: '会議名',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Link
          href={`/meeting/${params.row.issueID}`}
          style={{ 
            color: '#1976d2', 
            textDecoration: 'none',
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'issue',
      headerName: '号',
      width: 80,
      valueGetter: (value) => value || '-',
    },
    {
      field: 'speechCount',
      headerName: '発言数',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value) => value || 0,
      valueFormatter: (value: number | null) => {
        if (value == null) return '';
        return `${value.toLocaleString()}件`;
      },
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          component={Link}
          href={`/meeting/${params.row.issueID}`}
          size="small"
          variant="text"
        >
          詳細
        </Button>
      ),
    },
  ];

  const handlePageChange = (model: { page: number; pageSize: number }) => {
    // ページサイズが変更された場合は1ページ目に戻る
    const newPage = model.pageSize !== paginationModel.pageSize ? 1 : model.page + 1;
    
    const url = buildSearchUrl({
      ...searchParams,
      page: newPage,
      pageSize: model.pageSize,
      // 現在のソート状態も保持
      ...(sortModel.length > 0 && {
        sortField: sortModel[0].field,
        sortOrder: sortModel[0].sort || 'asc',
      }),
    });
    router.push(url);
    setPaginationModel(model);
  };

  const handleSortModelChange = (model: GridSortModel) => {
    const url = buildSearchUrl({
      ...searchParams,
      page: 1, // ソート変更時はページを1にリセット
      pageSize: paginationModel.pageSize,
      ...(model.length > 0 && {
        sortField: model[0].field,
        sortOrder: model[0].sort || 'asc',
      }),
    });
    router.push(url);
    setSortModel(model);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={meetings}
        columns={columns}
        getRowId={(row) => row.issueID}
        pageSizeOptions={[25, 50, 100]}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePageChange}
        rowCount={totalCount}
        paginationMode="server"
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
        disableRowSelectionOnClick
        autoHeight
        localeText={jaJP.components.MuiDataGrid.defaultProps.localeText}
        sx={{
          border: 1,
          borderColor: 'divider',
          '& .MuiDataGrid-cell': {
            borderRight: 1,
            borderColor: 'divider',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: 2,
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          },
        }}
      />
    </Box>
  );
}