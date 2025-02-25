import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { DialogService } from 'app/services/dialog.service';
import helptext from 'app/helptext/topbar';

@Component({
  selector: 'truecommand-status',
  templateUrl: './truecommand.component.html',
  styleUrls: ['./truecommand.component.css'],
})
export class TruecommandComponent {
  parent = this.data.parent;
  tc = this.data.data;

  constructor(
    public dialogRef: MatDialogRef<TruecommandComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public translate: TranslateService,
    private dialogService: DialogService,
  ) {}

  gotoTC(): void {
    this.dialogService.generalDialog({
      title: helptext.tcDialog.title,
      message: helptext.tcDialog.message,
      is_html: true,
      confirmBtnMsg: helptext.tcDialog.confirmBtnMsg,
    }).subscribe((res) => {
      if (res) {
        window.open(this.tc.remote_url);
      }
    });
  }

  update(data: any): void {
    this.tc = data;
  }
}
