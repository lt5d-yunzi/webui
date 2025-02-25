import { HttpClient } from '@angular/common/http';
import {
  OnInit, Component, EventEmitter, Output, Inject,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';

import { WebSocketService, RestService } from 'app/services/';
import { EntityJobState } from 'app/enums/entity-job-state.enum';

@Component({
  selector: 'entity-job',
  templateUrl: 'entity-job.component.html',
  styleUrls: ['./entity-job.component.css'],
})
export class EntityJobComponent implements OnInit {
  job: any = {};
  progressTotalPercent = 0;
  description: string;
  method: string;
  args: any[] = [];

  title = '';
  showCloseButton = true;
  showAbortButton = false; // enable to abort job
  jobId: Number;
  progressNumberType: any;
  hideProgressValue = false;
  altMessage: string;
  showRealtimeLogs = false;
  EntityJobState = EntityJobState;

  private realtimeLogsSubscribed = false;
  realtimeLogs = '';
  @Output() progress = new EventEmitter();
  @Output() success = new EventEmitter();
  @Output() aborted = new EventEmitter();
  @Output() failure = new EventEmitter();
  @Output() prefailure = new EventEmitter();
  constructor(public dialogRef: MatDialogRef < EntityJobComponent >,
    private ws: WebSocketService, public rest: RestService,
    @Inject(MAT_DIALOG_DATA) public data: any, translate: TranslateService, protected http: HttpClient) {}

  ngOnInit() {
    // this.dialogRef.updateSize('35%', '200px');

    if (this.data.title) {
      this.setTitle(this.data.title);
    }

    if (this.dialogRef.disableClose) {
      this.showCloseButton = false;
    }
    if (this.data.CloseOnClickOutside) {
      this.showCloseButton = true;
      this.dialogRef.disableClose = true;
    }
    this.progress.subscribe((progress: any) => {
      if (progress.description) {
        this.description = progress.description;
      }
      if (progress.percent) {
        if (this.progressNumberType === 'nopercent') {
          this.progressTotalPercent = progress.percent * 100;
        } else {
          this.progressTotalPercent = progress.percent;
        }
      }
      this.disableProgressValue(progress.percent == null);
    });

    this.failure.subscribe((job: any) => {
      job.error = _.replace(job.error, '<', '< ');
      job.error = _.replace(job.error, '>', ' >');

      this.description = '<b>Error:</b> ' + job.error;
    });
  }

  setCall(method: string, args?: any[]) {
    this.method = method;
    if (args) {
      this.args = args;
    }
  }

  setDescription(desc: string) {
    this.description = desc;
  }

  setTitle(title: string) {
    this.title = title;
  }

  enableRealtimeLogs(showRealtimeLogs: boolean) {
    this.showRealtimeLogs = showRealtimeLogs;
  }

  changeAltMessage(msg: string) {
    this.altMessage = msg;
  }

  disableProgressValue(hide: boolean) {
    this.hideProgressValue = hide;
  }

  show() {
    this.ws.call('core.get_jobs', [
      [
        ['id', '=', this.jobId],
      ],
    ])
      .subscribe((res) => {
        if (res.length > 0) {
          this.jobUpdate(res[0]);
        }
      });
    this.ws.subscribe('core.get_jobs').subscribe((res) => {
      if (res.id === this.jobId) {
        this.jobUpdate(res);
      }
    });
  }

  jobUpdate(job: any) {
    this.job = job;
    this.showAbortButton = this.job.abortable;
    if (job.progress) {
      this.progress.emit(job.progress);
    }
    if (job.state === EntityJobState.Success) {
      this.success.emit(this.job);
    } else if (job.state === EntityJobState.Failed) {
      this.failure.emit(this.job);
    }
  }

  submit() {
    this.ws.job(this.method, this.args)
      .subscribe(
        (res) => {
          this.job = res;
          this.showAbortButton = this.job.abortable;
          if (this.showRealtimeLogs && this.job.logs_path && !this.realtimeLogsSubscribed) {
            this.getRealtimeLogs();
          }
          if (res.progress && !this.showRealtimeLogs) {
            this.progress.emit(res.progress);
          }
          if (this.job.state === EntityJobState.Aborted) {
            this.aborted.emit(this.job);
          }
        },
        () => {},
        () => {
          if (this.job.state === EntityJobState.Success) {
            this.success.emit(this.job);
          } else if (this.job.state === EntityJobState.Failed) {
            this.failure.emit(this.job);
          }
          if (this.realtimeLogsSubscribed) {
            this.ws.unsubscribe('filesystem.file_tail_follow:' + this.job.logs_path);
          }
        },
      );
  }

  wspost(path: string, options: any) {
    this.http.post(path, options).subscribe(
      (res) => {
        this.job = res;
        if (this.job && this.job.job_id) {
          this.jobId = this.job.job_id;
        }
        this.wsshow();
      },
      (err) => {
        this.prefailure.emit(err);
      },
      () => {
      },
    );
  }
  wsshow() {
    this.ws.call('core.get_jobs', [
      [
        ['id', '=', this.jobId],
      ],
    ])
      .subscribe((res) => {
        if (res.length > 0) {
          this.wsjobUpdate(res[0]);
        }
      });
    this.ws.subscribe('core.get_jobs').subscribe((res) => {
      if (res.id === this.jobId) {
        this.wsjobUpdate(res);
      }
    });
  }

  wsjobUpdate(job: any) {
    this.job = job;
    this.showAbortButton = this.job.abortable;
    if (job.fields) {
      this.job.state = job.fields.state;
    }
    if (job.progress) {
      this.progress.emit(job.progress);
    }
    if (job.fields) {
      if (job.fields.state === EntityJobState.Running) {
        this.progress.emit(this.job.fields.progress);
      } else if (job.fields.state === EntityJobState.Success) {
        this.success.emit(this.job.fields);
      } else if ((job.fields.state === EntityJobState.Failed) || job.fields.error) {
        this.failure.emit(this.job.fields);
      }
    } else if (job.state === EntityJobState.Success) {
      this.success.emit(this.job);
    } else if (job.state === EntityJobState.Failed) {
      this.failure.emit(this.job);
    }
  }

  abortJob() {
    this.ws.call('core.job_abort', [this.job.id]).subscribe();
  }

  getRealtimeLogs() {
    this.realtimeLogsSubscribed = true;
    const subName = 'filesystem.file_tail_follow:' + this.job.logs_path;
    this.ws.sub(subName).subscribe((res) => {
      this.scrollBottom();
      if (res && res.data && typeof res.data === 'string') {
        this.realtimeLogs += res.data;
      }
    });
  }

  scrollBottom() {
    const cardContainer = document.getElementsByClassName('entity-job-dialog')[0];
    cardContainer.scrollTop = cardContainer.scrollHeight;
  }
}
