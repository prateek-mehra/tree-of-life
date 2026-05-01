export type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

export type TreeDocument = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  root: TreeNode;
  collapsedNodeIds: string[];
  originalRootNodeId: string;
  currentViewRootNodeId: string;
  ownerId?: string;
};

export type CreateTreeInput = {
  name: string;
  root?: TreeNode;
  is_favorite?: boolean;
  ownerId?: string;
};

export type NodeActionPosition = {
  nodeId: string;
  x: number;
  y: number;
};
