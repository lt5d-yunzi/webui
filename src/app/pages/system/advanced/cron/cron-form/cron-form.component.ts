import { Component, ViewChild } from '@angular/core';
import { Option } from 'app/interfaces/option.interface';

import * as _ from 'lodash';

import { EntityFormComponent } from '../../../../common/entity/entity-form';
import { FieldConfig } from '../../../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { UserService } from '../../../../../services';
import helptext from '../../../../../helptext/system/cron-form';
import { ModalService } from '../../../../../services/modal.service';

@Component({
  selector: 'app-cron-job-add',
  templateUrl: './cron-form.component.html',
  styleUrls: ['cron-form.component.css'],
  providers: [UserService],
})
export class CronFormComponent {
  protected title: string;
  protected queryCall = 'cronjob.query';
  protected queryKey = 'id';
  protected editCall = 'cronjob.update';
  protected addCall = 'cronjob.create';
  protected pk: any;
  protected data: any;
  protected user_field: any;
  protected isOneColumnForm = true;
  protected isEntity = true;

  isNew = false;
  entityForm: EntityFormComponent;
  formGroup: any;
  error: string;
  fieldConfig: FieldConfig[] = [];
  fieldSetDisplay = 'no-margins';

  fieldSets: FieldSet[] = [
    {
      name: helptext.cron_fieldsets[0],
      class: 'add-cron',
      label: true,
      config: [
        {
          type: 'input',
          name: 'description',
          placeholder: helptext.cron_description_placeholder,
          tooltip: helptext.cron_description_tooltip,
        },
        {
          type: 'input',
          name: 'command',
          placeholder: helptext.cron_command_placeholder,
          required: true,
          validation: helptext.cron_command_validation,
          tooltip: helptext.cron_command_tooltip,
        },
        {
          type: 'combobox',
          name: 'user',
          placeholder: helptext.cron_user_placeholder,
          tooltip: helptext.cron_user_tooltip,
          options: [],
          required: true,
          validation: helptext.cron_user_validation,
          searchOptions: [],
          parent: this,
          updater: this.updateUserSearchOptions,
        },
        {
          type: 'scheduler',
          name: 'cron_picker',
          placeholder: helptext.cron_picker_placeholder,
          tooltip: helptext.cron_picker_tooltip,
          validation: helptext.cron_picker_validation,
          required: true,
          value: '0 0 * * *',
        },
        {
          type: 'checkbox',
          name: 'stdout',
          placeholder: helptext.cron_stdout_placeholder,
          tooltip: helptext.cron_stdout_tooltip,
          value: true,
        },
        {
          type: 'checkbox',
          name: 'stderr',
          placeholder: helptext.cron_stderr_placeholder,
          tooltip: helptext.cron_stderr_tooltip,
          value: false,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          placeholder: helptext.cron_enabled_placeholder,
          tooltip: helptext.cron_enabled_tooltip,
          value: true,
        },
      ],
    },
    {
      name: 'divider',
      divider: true,
    },
  ];

  @ViewChild('form', { static: true }) form: EntityFormComponent;

  constructor(protected userService: UserService, protected modalService: ModalService) {}

  updateUserSearchOptions(value = '', parent: any) {
    parent.userService.userQueryDSCache(value).subscribe((items: any[]) => {
      const users: Option[] = [];
      for (let i = 0; i < items.length; i++) {
        users.push({ label: items[i].username, value: items[i].username });
      }
      parent.user_field.searchOptions = users;
    });
  }

  async afterInit(entityForm: EntityFormComponent) {
    this.entityForm = entityForm;
    this.pk = entityForm.pk;
    this.isNew = entityForm.isNew;
    this.title = entityForm.isNew ? helptext.cron_job_add : helptext.cron_job_edit;

    // Setup user field options
    this.user_field = _.find(this.fieldSets[0].config, { name: 'user' });
    this.userService.userQueryDSCache().subscribe((items) => {
      for (let i = 0; i < items.length; i++) {
        this.user_field.options.push({
          label: items[i].username,
          value: items[i].username,
        });
      }
    });
  }

  resourceTransformIncomingRestData(data: any) {
    const schedule = data['schedule'];
    data['cron_picker'] = `${schedule.minute} ${schedule.hour} ${schedule.dom} ${schedule.month} ${schedule.dow}`;
    return data;
  }

  beforeSubmit(value: any) {
    const spl = value.cron_picker.split(' ');
    delete value.cron_picker;
    const schedule: any = {};
    schedule['minute'] = spl[0];
    schedule['hour'] = spl[1];
    schedule['dom'] = spl[2];
    schedule['month'] = spl[3];
    schedule['dow'] = spl[4];
    value['schedule'] = schedule;
  }
}
