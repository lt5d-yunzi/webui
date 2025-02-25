import { MatCheckboxChange } from '@angular/material/checkbox/checkbox';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  Component, AfterViewChecked, ViewChild, ElementRef, EventEmitter, OnInit,
} from '@angular/core';
import { WebSocketService } from '../../../../services';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'consolepanel-dialog',
  styleUrls: ['./consolepanel-dialog.component.scss'],
  templateUrl: './consolepanel-dialog.component.html',
})
export class ConsolePanelModalDialog implements OnInit {
  refreshMsg: String = 'Check to stop refresh';
  intervalPing: any;
  consoleMsg: String = 'Loading...';
  @ViewChild('footerBarScroll', { static: true }) private footerBarScroll: ElementRef;
  onEventEmitter = new EventEmitter();

  constructor(
    protected translate: TranslateService,
    public dialogRef: MatDialogRef<ConsolePanelModalDialog>,
  ) { }

  ngOnInit(): void {
    this.getLogConsoleMsg();
  }

  scrollToBottomOnFooterBar(): void {
    try {
      this.footerBarScroll.nativeElement.scrollTop = this.footerBarScroll.nativeElement.scrollHeight;
    } catch (err) { }
  }

  getLogConsoleMsg(): void {
    this.intervalPing = setInterval(() => {
      let isScrollBottom = false;
      const delta = 3;

      if (this.footerBarScroll.nativeElement.scrollTop + this.footerBarScroll.nativeElement.offsetHeight + delta >= this.footerBarScroll.nativeElement.scrollHeight) {
        isScrollBottom = true;
      }
      this.onEventEmitter.emit();
      if (isScrollBottom) {
        const timeout = setTimeout(() => {
          this.scrollToBottomOnFooterBar();
          clearTimeout(timeout);
        }, 500);
      }
    }, 1000);

    // First, will load once.
    const timeout = setTimeout(() => {
      this.scrollToBottomOnFooterBar();
      clearTimeout(timeout);
    }, 1500);
  }

  onStopRefresh(data: MatCheckboxChange): void {
    if (data.checked) {
      clearInterval(this.intervalPing);
      this.refreshMsg = 'Uncheck to restart refresh';
    } else {
      this.getLogConsoleMsg();
      this.refreshMsg = 'Check to stop refresh';
    }
  }
}
