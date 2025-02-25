import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { T } from 'app/translate-marker';

@Component({
  selector: 'app-iscsi-authorizedaccess-list',
  template: `
    <entity-table [conf]="this" [title]="tableTitle"></entity-table>
  `,
})
export class AuthorizedAccessListComponent {
  tableTitle = 'Authorized Access';
  protected queryCall = 'iscsi.auth.query';
  protected wsDelete = 'iscsi.auth.delete';
  protected route_add: string[] = ['sharing', 'iscsi', 'auth', 'add'];
  protected route_add_tooltip = 'Add Authorized Access';
  protected route_edit: string[] = ['sharing', 'iscsi', 'auth', 'edit'];

  columns: any[] = [
    {
      name: T('Group ID'),
      prop: 'tag',
      always_display: true,
    },
    {
      name: T('User'),
      prop: 'user',
    },
    {
      name: T('Peer User'),
      prop: 'peeruser',
    },
  ];
  rowIdentifier = 'tag';
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: 'Authorized Access',
      key_props: ['tag'],
    },
  };

  constructor(protected router: Router) {}
}
