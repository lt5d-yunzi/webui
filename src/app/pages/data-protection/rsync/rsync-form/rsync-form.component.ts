import { Component, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Option } from 'app/interfaces/option.interface';

import { Subscription } from 'rxjs';
import * as _ from 'lodash';

import { EntityFormComponent } from '../../../common/entity/entity-form';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import { TaskService, UserService } from '../../../../services';
import { ModalService } from '../../../../services/modal.service';
import helptext from '../../../../helptext/data-protection/resync/resync-form';
import { FieldSets } from '../../../common/entity/entity-form/classes/field-sets';

@Component({
  selector: 'app-rsync-task-add',
  template: '<entity-form [conf]="this"></entity-form>',
  providers: [TaskService, UserService],
})
export class RsyncFormComponent implements OnDestroy {
  protected addCall = 'rsynctask.create';
  protected editCall = 'rsynctask.update';
  protected queryCall = 'rsynctask.query';
  protected queryKey = 'id';
  protected entityForm: EntityFormComponent;
  protected pk: number;
  protected isEntity = true;
  protected title: string;
  protected isNew: boolean;

  protected preTaskName = 'rsync';
  fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSets = new FieldSets([
    {
      name: helptext.fieldset_source,
      class: 'source',
      label: true,
      width: '50%',
      config: [
        {
          type: 'explorer',
          initial: '/mnt',
          name: 'path',
          explorerType: 'file',
          placeholder: helptext.rsync_path_placeholder,
          tooltip: helptext.rsync_path_tooltip,
          required: true,
          validation: helptext.rsync_path_validation,
        },
        {
          type: 'combobox',
          name: 'user',
          placeholder: helptext.rsync_user_placeholder,
          tooltip: helptext.rsync_user_tooltip,
          options: [],
          required: true,
          validation: helptext.rsync_user_validation,
          searchOptions: [],
          parent: this,
          updater: this.updateUserSearchOptions,
        },
        {
          type: 'select',
          name: 'direction',
          placeholder: helptext.rsync_direction_placeholder,
          tooltip: helptext.rsync_direction_tooltip,
          options: [
            { label: 'Push', value: 'PUSH' },
            { label: 'Pull', value: 'PULL' },
          ],
          required: true,
          validation: helptext.rsync_direction_validation,
        },
        {
          type: 'input',
          name: 'desc',
          placeholder: helptext.rsync_description_placeholder,
          tooltip: helptext.rsync_description_tooltip,
        },
      ],
    },
    {
      name: helptext.fieldset_remote,
      class: 'remote',
      label: true,
      width: '50%',
      config: [
        {
          type: 'input',
          name: 'remotehost',
          placeholder: helptext.rsync_remotehost_placeholder,
          required: true,
          validation: helptext.rsync_remotehost_validation,
          tooltip: helptext.rsync_remotehost_tooltip,
        },
        {
          type: 'select',
          name: 'mode',
          placeholder: helptext.rsync_mode_placeholder,
          tooltip: helptext.rsync_mode_tooltip,
          options: [
            { label: 'Module', value: 'MODULE' },
            { label: 'SSH', value: 'SSH' },
          ],
          value: 'MODULE',
        },
        {
          type: 'input',
          name: 'remoteport',
          placeholder: helptext.rsync_remoteport_placeholder,
          value: 22,
          required: true,
          tooltip: helptext.rsync_remoteport_tooltip,
          validation: helptext.rsync_remoteport_validation,
        },
        {
          type: 'input',
          name: 'remotemodule',
          placeholder: helptext.rsync_remotemodule_placeholder,
          tooltip: helptext.rsync_remotemodule_tooltip,
          required: true,
          validation: helptext.rsync_remotemodule_validation,
        },
        {
          type: 'explorer',
          initial: '/mnt',
          name: 'remotepath',
          explorerType: 'directory',
          placeholder: helptext.rsync_remotepath_placeholder,
          tooltip: helptext.rsync_remotepath_tooltip,
        },
        {
          type: 'checkbox',
          name: 'validate_rpath',
          placeholder: helptext.rsync_validate_rpath_placeholder,
          tooltip: helptext.rsync_validate_rpath_tooltip,
          value: true,
        },
      ],
    },
    {
      name: helptext.fieldset_schedule,
      class: 'schedule',
      label: true,
      width: '50%',
      config: [
        {
          type: 'scheduler',
          name: 'rsync_picker',
          placeholder: helptext.rsync_picker_placeholder,
          tooltip: helptext.rsync_picker_tooltip,
          required: true,
        },
        {
          type: 'checkbox',
          name: 'recursive',
          placeholder: helptext.rsync_recursive_placeholder,
          tooltip: helptext.rsync_recursive_tooltip,
          value: true,
        },
      ],
    },
    {
      name: helptext.fieldset_options,
      class: 'options',
      label: true,
      width: '50%',
      config: [
        {
          type: 'checkbox',
          name: 'times',
          placeholder: helptext.rsync_times_placeholder,
          tooltip: helptext.rsync_times_tooltip,
          value: true,
        },
        {
          type: 'checkbox',
          name: 'compress',
          placeholder: helptext.rsync_compress_placeholder,
          tooltip: helptext.rsync_compress_tooltip,
          value: true,
        },
        {
          type: 'checkbox',
          name: 'archive',
          placeholder: helptext.rsync_archive_placeholder,
          tooltip: helptext.rsync_archive_tooltip,
        },
        {
          type: 'checkbox',
          name: 'delete',
          placeholder: helptext.rsync_delete_placeholder,
          tooltip: helptext.rsync_delete_tooltip,
        },
        {
          type: 'checkbox',
          name: 'quiet',
          placeholder: helptext.rsync_quiet_placeholder,
          tooltip: helptext.rsync_quiet_tooltip,
        },
        {
          type: 'checkbox',
          name: 'preserveperm',
          placeholder: helptext.rsync_preserveperm_placeholder,
          tooltip: helptext.rsync_preserveperm_tooltip,
        },
        {
          type: 'checkbox',
          name: 'preserveattr',
          placeholder: helptext.rsync_preserveattr_placeholder,
          tooltip: helptext.rsync_preserveattr_tooltip,
        },
        {
          type: 'checkbox',
          name: 'delayupdates',
          placeholder: helptext.rsync_delayupdates_placeholder,
          tooltip: helptext.rsync_delayupdates_tooltip,
          value: true,
        },
        {
          type: 'chip',
          name: 'extra',
          placeholder: helptext.rsync_extra_placeholder,
          tooltip: helptext.rsync_extra_tooltip,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          placeholder: helptext.rsync_enabled_placeholder,
          tooltip: helptext.rsync_enabled_tooltip,
          value: true,
        },
      ],
    },
    { name: 'divider', divider: true },
  ]);

  protected rsync_module_field: string[] = ['remotemodule'];
  protected rsync_ssh_field: string[] = ['remoteport', 'remotepath', 'validate_rpath'];
  protected user_field: any;
  protected mode_subscription: Subscription;

  constructor(
    protected router: Router,
    protected aroute: ActivatedRoute,
    protected taskService: TaskService,
    protected userService: UserService,
    protected modalService: ModalService,
  ) {}

  async afterInit(entityForm: EntityFormComponent) {
    this.entityForm = entityForm;
    this.isNew = entityForm.isNew;
    this.title = entityForm.isNew ? helptext.rsync_task_add : helptext.rsync_task_edit;

    this.user_field = this.fieldSets.config('user');
    this.userService.userQueryDSCache().subscribe((items) => {
      for (let i = 0; i < items.length; i++) {
        this.user_field.options.push({
          label: items[i].username,
          value: items[i].username,
        });
      }
    });

    this.hideFields(entityForm.formGroup.controls['mode'].value);
    this.mode_subscription = entityForm.formGroup.controls['mode'].valueChanges.subscribe((res) => {
      this.hideFields(res);
    });
  }

  beforeSubmit(value: any) {
    const spl = value.rsync_picker.split(' ');
    delete value.rsync_picker;
    const schedule: any = {};
    schedule['minute'] = spl[0];
    schedule['hour'] = spl[1];
    schedule['dom'] = spl[2];
    schedule['month'] = spl[3];
    schedule['dow'] = spl[4];
    value['schedule'] = schedule;
  }

  resourceTransformIncomingRestData(data: any) {
    data[
      'rsync_picker'
    ] = `${data.schedule.minute} ${data.schedule.hour} ${data.schedule.dom} ${data.schedule.month} ${data.schedule.dow}`;
    return data;
  }

  updateUserSearchOptions(value = '', parent: any) {
    parent.userService.userQueryDSCache(value).subscribe((items: any) => {
      const users: Option[] = [];
      for (let i = 0; i < items.length; i++) {
        users.push({ label: items[i].username, value: items[i].username });
      }
      parent.user_field.searchOptions = users;
    });
  }

  hideFields(mode: any) {
    let hide_fields;
    let show_fields;
    if (mode === 'SSH') {
      hide_fields = this.rsync_module_field;
      show_fields = this.rsync_ssh_field;
    } else {
      hide_fields = this.rsync_ssh_field;
      show_fields = this.rsync_module_field;
    }
    for (let i = 0; i < hide_fields.length; i++) {
      this.entityForm.setDisabled(hide_fields[i], true, true);
    }
    for (let i = 0; i < show_fields.length; i++) {
      this.entityForm.setDisabled(show_fields[i], false, false);
    }
  }

  ngOnDestroy() {
    this.mode_subscription.unsubscribe();
  }
}
