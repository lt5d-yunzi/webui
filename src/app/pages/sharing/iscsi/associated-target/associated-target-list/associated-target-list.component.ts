import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { IscsiService } from '../../../../../services';
import * as _ from 'lodash';
import { T } from 'app/translate-marker';
import { EntityUtils } from '../../../../common/entity/utils';

@Component({
  selector: 'app-iscsi-associated-target-list',
  template: `
    <entity-table [conf]="this" [title]="tableTitle"></entity-table>
  `,
  providers: [IscsiService],
})
export class AssociatedTargetListComponent {
  tableTitle = 'Associated Targets';
  protected queryCall = 'iscsi.targetextent.query';
  protected wsDelete = 'iscsi.targetextent.delete';
  protected route_add: string[] = ['sharing', 'iscsi', 'associatedtarget', 'add'];
  protected route_add_tooltip = 'Add Target/Extent';
  protected route_edit: string[] = ['sharing', 'iscsi', 'associatedtarget', 'edit'];

  columns: any[] = [
    {
      name: T('Target'),
      prop: 'target',
      always_display: true,
    },
    {
      name: T('LUN ID'),
      prop: 'lunid',
    },
    {
      name: T('Extent'),
      prop: 'extent',
    },
  ];
  rowIdentifier = 'target';
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: 'Target/Extent',
      key_props: ['target', 'extent'],
    },
  };

  protected entityList: any;
  constructor(protected router: Router, protected iscsiService: IscsiService) {}

  afterInit(entityList: any) {
    this.entityList = entityList;
  }

  dataHandler(entityList: any) {
    this.iscsiService.getTargets().subscribe((targets) => {
      const target_list = targets;
      this.iscsiService.getExtents().subscribe((res) => {
        const extent_list = res;

        for (let i = 0; i < entityList.rows.length; i++) {
          entityList.rows[i].target = _.find(target_list, { id: entityList.rows[i].target })['name'];
          entityList.rows[i].extent = _.find(extent_list, { id: entityList.rows[i].extent })['name'];
        }
      });
    });
  }
  getActions(row: any) {
    return [{
      id: row.target,
      name: 'edit',
      icon: 'edit',
      label: T('Edit'),
      onClick: (rowinner: any) => { this.entityList.doEdit(rowinner.id); },
    }, {
      id: row.target,
      name: 'delete',
      icon: 'delete',
      label: T('Delete'),
      onClick: (rowinner: any) => {
        let deleteMsg = this.entityList.getDeleteMessage(rowinner);
        this.iscsiService.getGlobalSessions().subscribe(
          (res) => {
            let warningMsg = '';
            for (let i = 0; i < res.length; i++) {
              if (res[i].target.split(':')[1] == rowinner.target) {
                warningMsg = '<font color="red">' + T('Warning: iSCSI Target is already in use.</font><br>');
              }
            }
            deleteMsg = warningMsg + deleteMsg;

            this.entityList.dialogService.confirm(T('Delete'), deleteMsg, false, T('Delete')).subscribe((dialres: boolean) => {
              if (dialres) {
                this.entityList.loader.open();
                this.entityList.loaderOpen = true;
                this.entityList.ws.call(this.wsDelete, [rowinner.id, true]).subscribe(
                  () => { this.entityList.getData(); },
                  (resinner: any) => {
                    new EntityUtils().handleError(this, resinner);
                    this.entityList.loader.close();
                  },
                );
              }
            });
          },
        );
      },
    }];
  }
}
