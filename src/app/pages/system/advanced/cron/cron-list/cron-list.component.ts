import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { EntityUtils } from 'app/pages/common/entity/utils';
import * as cronParser from 'cron-parser';
import { Moment } from 'moment';
import { filter, switchMap } from 'rxjs/operators';
import { DialogService } from '../../../../../services';
import { TaskService, WebSocketService } from '../../../../../services';
import { T } from '../../../../../translate-marker';
import { TaskScheduleListComponent } from '../../../../data-protection/components/task-schedule-list/task-schedule-list.component';
import { ModalService } from 'app/services/modal.service';
import { CronFormComponent } from '../cron-form/cron-form.component';
import { UserService } from '../../../../../services/user.service';

@Component({
  selector: 'app-cron-list',
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
  providers: [TaskService, UserService],
})
export class CronListComponent {
  title = 'Cron Jobs';
  protected wsDelete = 'cronjob.delete';
  queryCall = 'cronjob.query';
  protected route_add: string[] = ['tasks', 'cron', 'add'];
  protected route_add_tooltip = 'Add Cron Job';
  protected route_edit: string[] = ['tasks', 'cron', 'edit'];
  entityList: any;

  columns: any[] = [
    { name: T('Users'), prop: 'user', always_display: true },
    { name: T('Command'), prop: 'command' },
    { name: T('Description'), prop: 'description' },
    {
      name: T('Schedule'),
      prop: 'cron_schedule',
      widget: { icon: 'calendar-range', component: 'TaskScheduleListComponent' },
    },
    { name: T('Enabled'), prop: 'enabled' },
    { name: T('Next Run'), prop: 'next_run', hidden: true },
    { name: T('Minute'), prop: 'schedule.minute', hidden: true },
    { name: T('Hour'), prop: 'schedule.hour', hidden: true },
    { name: T('Day of Month'), prop: 'schedule.dom', hidden: true },
    { name: T('Month'), prop: 'schedule.month', hidden: true },
    { name: T('Day of Week'), prop: 'schedule.dow', hidden: true },
    { name: T('Hide Stdout'), prop: 'stdout', hidden: true },
    { name: T('Hide Stderr'), prop: 'stderr', hidden: true },
  ];
  rowIdentifier = 'user';
  config: any = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: 'Cron Job',
      key_props: ['user', 'command', 'description'],
    },
  };

  protected month_choice: any;
  constructor(
    public router: Router,
    protected ws: WebSocketService,
    public translate: TranslateService,
    protected taskService: TaskService,
    public dialog: DialogService,
    public modalService: ModalService,
    public userService: UserService,
  ) {}

  afterInit(entityList: any) {
    this.entityList = entityList;

    this.modalService.onClose$.subscribe(() => {
      this.entityList.loaderOpen = true;
      this.entityList.needRefreshTable = true;
      this.entityList.getData();
    });
  }

  doAdd(id?: number) {
    this.modalService.open('slide-in-form', new CronFormComponent(this.userService, this.modalService), id);
  }

  doEdit(id: number) {
    this.doAdd(id);
  }

  getActions(tableRow: any) {
    return [
      {
        name: this.config.name,
        label: T('Run Now'),
        id: 'run',
        icon: 'play_arrow',
        onClick: (row: any) =>
          this.dialog
            .confirm(T('Run Now'), T('Run this job now?'), true)
            .pipe(
              filter((run) => !!run),
              switchMap(() => this.ws.call('cronjob.run', [row.id])),
            )
            .subscribe(
              () => {
                const message = row.enabled == true
                  ? T('This job is scheduled to run again ' + row.next_run + '.')
                  : T('This job will not run again until it is enabled.');
                this.dialog.Info(
                  T('Job ' + row.description + ' Completed Successfully'),
                  message,
                  '500px',
                  'info',
                  true,
                );
              },
              (err: any) => new EntityUtils().handleError(this, err),
            ),
      },
      {
        name: this.config.name,
        label: T('Edit'),
        icon: 'edit',
        id: 'edit',
        onClick: (row: any) => this.doEdit(row.id),
      },
      {
        id: tableRow.id,
        name: this.config.name,
        icon: 'delete',
        label: T('Delete'),
        onClick: (row: any) => {
          // console.log(row);
          this.entityList.doDelete(row);
        },
      },
    ];
  }

  resourceTransformIncomingRestData(data: any): any {
    for (const job of data) {
      job.cron_schedule = `${job.schedule.minute} ${job.schedule.hour} ${job.schedule.dom} ${job.schedule.month} ${job.schedule.dow}`;

      /* Weird type assertions are due to a type definition error in the cron-parser library */
      job.next_run = ((cronParser.parseExpression(job.cron_schedule, { iterator: true }).next() as unknown) as {
        value: { _date: Moment };
      }).value._date.fromNow();
    }
    return data;
  }
}
