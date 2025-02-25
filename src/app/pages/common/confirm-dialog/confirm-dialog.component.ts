import { MatCheckboxChange } from '@angular/material/checkbox/checkbox';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../translate-marker';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialog {
  title: string;
  message: string;
  buttonMsg: string = T('Continue');
  cancelMsg: string = T('Cancel');
  hideCheckBox = false;
  isSubmitEnabled = false;
  secondaryCheckBox = false;
  secondaryCheckBoxMsg = '';
  method: string;
  data: string;
  tooltip: string;
  hideCancel = false;
  textToCopy: string;
  keyTextArea: boolean;
  // TODO: Typo
  customSumbit: any;

  @Output() switchSelectionEmitter = new EventEmitter<any>();

  constructor(public dialogRef: MatDialogRef < ConfirmDialog >, protected translate: TranslateService) {
  }

  toggleSubmit(data: MatCheckboxChange) {
    this.isSubmitEnabled = data.checked;
  }
  secondaryCheckBoxEvent() {
    this.switchSelectionEmitter.emit(this.secondaryCheckBox);
  }
  isDisabled() {
    if (!this.hideCheckBox) {
      return !this.isSubmitEnabled && !this.hideCheckBox;
    }
    return this.secondaryCheckBox ? !this.isSubmitEnabled : false;
  }
}
