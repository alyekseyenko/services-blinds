export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export async function fetchAllGraphqlPages<TNode>(options: {
  pageSize: number;
  maxPages: number;
  fetchPage: (after: string | null) => Promise<{
    nodes: TNode[];
    pageInfo: PageInfo;
  }>;
}): Promise<TNode[]> {
  const merged: TNode[] = [];
  let after: string | null = null;
  let pages = 0;

  while (pages < options.maxPages) {
    pages += 1;
    const { nodes, pageInfo } = await options.fetchPage(after);
    merged.push(...nodes);
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
  }

  return merged;
}
