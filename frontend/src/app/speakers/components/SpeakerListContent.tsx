'use client';

import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel } from '@mui/x-data-grid';
import { jaJP } from '@mui/x-data-grid/locales';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Speaker {
  id: string;
  normalizedName: string;
  displayName: string;
  nameYomi: string | null;
  _count: {
    speeches: number;
  };
  affiliations: Array<{
    partyGroup: {
      name: string;
    } | null;
  }>;
}

interface SpeakerListContentProps {
  speakers: Speaker[];
  totalPages: number;
  currentPage: number;
  searchQuery: string;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
}

export function SpeakerListContent({
  speakers,
  totalPages,
  currentPage,
  searchQuery,
  pageSize = 25,
  sortField,
  sortOrder,
}: SpeakerListContentProps) {
  const router = useRouter();
  const [paginationModel, setPaginationModel] = useState({
    page: currentPage - 1,
    pageSize: pageSize,
  });

  // ソートモデルの初期値を設定
  const [sortModel, setSortModel] = useState<GridSortModel>(() => {
    if (sortField && sortOrder) {
      return [{ field: sortField, sort: sortOrder as 'asc' | 'desc' }];
    }
    return [{ field: 'speechCount', sort: 'desc' }];
  });

  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: '名前',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Link
          href={`/speakers/${params.row.id}`}
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
      field: 'nameYomi',
      headerName: 'よみがな',
      width: 180,
      valueGetter: (value) => value || '',
    },
    {
      field: 'partyGroup',
      headerName: '会派・政党',
      flex: 1,
      minWidth: 250,
      valueGetter: (_value, row) => {
        const affiliation = row.affiliations?.[0];
        return affiliation?.partyGroup?.name || '';
      },
    },
    {
      field: 'speechCount',
      headerName: '発言数',
      width: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_value, row) => row._count.speeches,
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
          href={`/speakers/${params.row.id}`}
          size="small"
          variant="text"
        >
          詳細
        </Button>
      ),
    },
  ];

  const handlePageChange = (model: { page: number; pageSize: number }) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    params.set('page', (model.page + 1).toString());
    params.set('pageSize', model.pageSize.toString());
    // 現在のソート状態も保持
    if (sortModel.length > 0) {
      params.set('sortField', sortModel[0].field);
      params.set('sortOrder', sortModel[0].sort || 'asc');
    }
    router.push(`/speakers?${params.toString()}`);
    setPaginationModel(model);
  };

  const handleSortModelChange = (model: GridSortModel) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    params.set('page', '1'); // ソート変更時はページを1にリセット
    params.set('pageSize', paginationModel.pageSize.toString());
    
    if (model.length > 0) {
      params.set('sortField', model[0].field);
      params.set('sortOrder', model[0].sort || 'asc');
    }
    
    router.push(`/speakers?${params.toString()}`);
    setSortModel(model);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={speakers}
        columns={columns}
        pageSizeOptions={[25, 50, 100]}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePageChange}
        rowCount={totalPages * paginationModel.pageSize}
        paginationMode="server"
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
        disableRowSelectionOnClick
        autoHeight // 全ての行を表示するために必要
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
          '& .MuiDataGrid-row': {
            '&:nth-of-type(even)': {
              backgroundColor: 'grey.50',
            },
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: 2,
            borderColor: 'divider',
          },
          '& .MuiDataGrid-main': {
            // autoHeightでの最小高さを確保
            minHeight: '400px',
          },
        }}
      />
    </Box>
  );
}