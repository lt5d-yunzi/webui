import { Component } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { DialogFormConfiguration } from '../common/entity/entity-dialog/dialog-form-configuration.interface';
import { DialogService, WebSocketService } from '../../services';
import { LocaleService } from '../../services/locale.service';
import helptext from '../../helptext/api-keys';
import { ConfirmDialog } from '../common/confirm-dialog/confirm-dialog.component';
import { EntityUtils } from '../common/entity/utils';

@Component({
  selector: 'app-api-keys',
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
  providers: [Clipboard],
})
export class ApiKeysComponent {
  title = helptext.title;
  queryCall = 'api_key.query';
  wsDelete = 'api_key.delete';
  protected route_add_tooltip = helptext.route_add_tooltip;
  addCall = 'api_key.create';
  editCall = 'api_key.update';

  currItem: any;
  entityList: any;

  columns: any[] = [
    { name: helptext.col_name, prop: 'name', always_display: true },
    { name: helptext.col_created_at, prop: 'created_time' },
  ];
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: helptext.deleteMsg_title,
      key_props: ['name'],
    },
  };

  apikeysFormConf: DialogFormConfiguration = {
    title: helptext.formDialog.add_title,
    fieldConfig: [
      {
        type: 'input',
        name: 'name',
        placeholder: helptext.name.placeholder,
        tooltip: helptext.name.tooltip,
      },
      {
        type: 'checkbox',
        name: 'reset',
        placeholder: helptext.reset.placeholder,
        tooltip: helptext.reset.tooltip,
      },
    ],
    method_ws: this.addCall,
    saveButtonText: helptext.formDialog.add_button,
    customSubmit: this.doSubmit,
    afterInit(entityFrom: any) {
      const disableCheckbox = !this.parent.currItem;
      entityFrom.setDisabled('reset', disableCheckbox, disableCheckbox);
      if (this.parent.currItem) {
        entityFrom.formGroup.controls['name'].setValue(this.parent.currItem.name);
      }
    },
    parent: this,
  };

  timeZone: string;

  protected custActions = [
    {
      id: 'add',
      name: helptext.action_add,
      function: () => {
        this.apikeysFormConf.title = helptext.formDialog.add_title;
        this.apikeysFormConf.saveButtonText = helptext.formDialog.add_button;
        this.apikeysFormConf.method_ws = this.addCall;
        this.currItem = undefined;
        this.dialogService.dialogForm(this.apikeysFormConf);
      },
    },
    {
      id: 'docs',
      name: helptext.action_docs,
      function: () => {
        window.open(window.location.origin + '/api/docs');
      },
    },
  ];

  constructor(
    private dialogService: DialogService,
    private ws: WebSocketService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private localeService: LocaleService,
  ) { }

  afterInit(entityList: any) {
    this.entityList = entityList;
  }
  resourceTransformIncomingRestData(data: any[]) {
    return data.map((item) => {
      item['created_time'] = this.localeService.formatDateTime(item.created_at.$date);
      return item;
    });
  }

  doSubmit(entityDialogForm: any) {
    const that = entityDialogForm.parent;
    if (that.currItem) {
      that.ws.call(that.editCall, [that.currItem.id, entityDialogForm.formValue]).subscribe(
        (res: any) => {
          entityDialogForm.dialogRef.close(true);
          if (res.key) {
            that.displayKey(res.key);
          }
          that.entityList.getData();
        },
        (err: any) => {
          new EntityUtils().handleWSError(that, err, that.apikeysFormConf.fieldConfig);
        },
      );
    } else {
      that.ws.call(that.addCall, [entityDialogForm.formValue]).subscribe(
        (res: any) => {
          entityDialogForm.dialogRef.close(true);
          that.displayKey(res.key);
          that.entityList.getData();
        },
        (err: any) => {
          new EntityUtils().handleWSError(this, err, that.dialogService, that.apikeysFormConf.fieldConfig);
        },
      );
    }
  }

  displayKey(key: string) {
    const self = this;
    const dialogRef = this.dialog.open(ConfirmDialog, { disableClose: true });
    dialogRef.componentInstance.title = helptext.apikeyCopyDialog.title;
    dialogRef.componentInstance.buttonMsg = helptext.apikeyCopyDialog.save_button;
    dialogRef.componentInstance.cancelMsg = helptext.apikeyCopyDialog.close_button;
    dialogRef.componentInstance.hideCheckBox = true;
    dialogRef.componentInstance.isSubmitEnabled = true;
    dialogRef.componentInstance.message = `
        ${helptext.apikeyCopyDialog.api_key_warning} <br><br>
        ${helptext.apikeyCopyDialog.api_key}:<br> ${key}`;
    dialogRef.componentInstance.customSumbit = function () {
      self.clipboard.copy(key);
    };
  }
  getActions() {
    return [{
      name: helptext.action_edit,
      id: 'edit',
      icon: 'edit',
      label: 'Edit',
      onClick: (rowinner: any) => {
        this.apikeysFormConf.title = helptext.formDialog.edit_title;
        this.apikeysFormConf.saveButtonText = helptext.formDialog.edit_button;
        this.apikeysFormConf.method_ws = this.editCall;
        this.currItem = rowinner;
        this.dialogService.dialogForm(this.apikeysFormConf);
      },
    }, {
      name: helptext.action_delete,
      id: 'delete',
      icon: 'delete',
      label: 'Delete',
      onClick: (rowinner: any) => {
        this.entityList.doDelete(rowinner);
      },
    }];
  }
}
