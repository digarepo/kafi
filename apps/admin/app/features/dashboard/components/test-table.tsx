import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';

import { DataTable, textColumn } from '../../../shared/data-table';
import {
  booleanColumn,
  dateColumn,
  statusColumn,
} from '../../../shared/data-table/columns';

type User = {
  name: string;
  email: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  verified: boolean;
};

const columns = [
  textColumn<User>({
    accessorKey: 'name',
    header: 'Name',
  }),

  textColumn<User>({
    accessorKey: 'email',
    header: 'Email',
  }),

  dateColumn<User>({
    accessorKey: 'createdAt',
    header: 'Created',
  }),

  booleanColumn<User>({
    accessorKey: 'verified',
    header: 'Active',
  }),

  statusColumn<User>({
    accessorKey: 'status',
    header: 'Status',
  }),
];

const data: User[] = [
  {
    name: 'John Doe',
    email: 'john@test.com',
    status: 'Active',
    createdAt: '2026-07-01',
    verified: true,
  },

  {
    name: 'Jane Smith',
    email: 'jane@test.com',
    status: 'Inactive',
    createdAt: '2026-06-15',
    verified: false,
  },
];

export function TestTable() {
  const [sorting, setSorting] = useState<SortingState>([]);

  return (
    <DataTable
      columns={columns}
      data={data}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  );
}
