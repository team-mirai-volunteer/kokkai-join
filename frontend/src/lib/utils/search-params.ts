/**
 * 検索パラメータのユーティリティ関数
 */

export interface SearchParams {
  q?: string;
  house?: string;
  speaker?: string;
  session?: string;
  from?: string;
  until?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
}

/**
 * 検索パラメータからURLSearchParamsを構築する
 */
export function buildSearchParams(params: SearchParams): URLSearchParams {
  const urlParams = new URLSearchParams();

  if (params.q) urlParams.append('q', params.q);
  if (params.house) urlParams.append('house', params.house);
  if (params.speaker) urlParams.append('speaker', params.speaker);
  if (params.session) urlParams.append('session', params.session);
  if (params.from) urlParams.append('from', params.from);
  if (params.until) urlParams.append('until', params.until);
  if (params.page && params.page > 1) urlParams.append('page', params.page.toString());
  if (params.pageSize) urlParams.append('pageSize', params.pageSize.toString());
  if (params.sortField) urlParams.append('sortField', params.sortField);
  if (params.sortOrder) urlParams.append('sortOrder', params.sortOrder);

  return urlParams;
}

/**
 * 検索URLを構築する
 */
export function buildSearchUrl(params: SearchParams): string {
  const urlParams = buildSearchParams(params);
  return `/search?${urlParams.toString()}`;
}
