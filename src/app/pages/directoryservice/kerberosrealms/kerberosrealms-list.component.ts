import { Component, OnDestroy } from '@angular/core';

import { T } from '../../../translate-marker';
import helptext from '../../../helptext/directoryservice/kerberosrealms-form-list';
import { KerberosRealmsFormComponent } from './kerberosrealms-form.component';
import { ModalService } from '../../../services/modal.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-user-list',
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
})
export class KerberosRealmsListComponent implements OnDestroy {
  title = 'Kerberos Realms';
  protected queryCall = 'kerberos.realm.query';
  protected wsDelete = 'kerberos.realm.delete';
  keyList = ['admin_server', 'kdc', 'kpasswd_server'];
  protected entityList: any;
  private refreshTableSubscription: Subscription;

  columns: any[] = [
    { name: T('Realm'), prop: 'realm', always_display: true },
    { name: T('KDC'), prop: 'kdc' },
    { name: T('Admin Server'), prop: 'admin_server' },
    { name: T('Password Server'), prop: 'kpasswd_server' },
  ];
  rowIdentifier = 'realm';
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: helptext.krb_realmlist_deletemessage_title,
      key_props: helptext.krb_realmlist_deletemessage_key_props,
    },
  };

  constructor(private modalService: ModalService) { }

  resourceTransformIncomingRestData(data: any[]) {
    data.forEach((row) => {
      this.keyList.forEach((key) => {
        if (row.hasOwnProperty(key)) {
          row[key] = (row[key].join(' '));
        }
      });
    });
    return data;
  }

  afterInit(entityList: any) {
    this.entityList = entityList;
    this.refreshTableSubscription = this.modalService.refreshTable$.subscribe(() => {
      this.entityList.getData();
    });
  }

  ngOnDestroy() {
    if (this.refreshTableSubscription) {
      this.refreshTableSubscription.unsubscribe();
    }
  }

  getAddActions() {
    return [{
      label: T('Add'),
      onClick: () => {
        this.doAdd();
      },
    }];
  }

  getActions(row: any) {
    const actions = [];
    actions.push({
      id: 'edit',
      label: T('Edit'),
      disabled: row.disableEdit,
      onClick: (row: any) => {
        this.doAdd(row.id);
      },
    }, {
      id: 'delete',
      label: T('Delete'),
      onClick: (row: any) => {
        this.entityList.doDelete(row);
      },
    });

    return actions;
  }

  doAdd(id?: number) {
    const formComponent = new KerberosRealmsFormComponent(this.modalService);
    this.modalService.open('slide-in-form', formComponent, id);
  }
}
