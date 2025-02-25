import { Component } from '@angular/core';
import { Validators } from '@angular/forms';

import * as _ from 'lodash';
import { take } from 'rxjs/operators';

import { ProductType } from 'app/enums/product-type.enum';
import helptext from 'app/helptext/data-protection/replication/replication';
import repwizardhelptext from 'app/helptext/data-protection/replication/replication-wizard';
import {
  WebSocketService,
  TaskService,
  KeychainCredentialService,
  ReplicationService,
  StorageService,
} from 'app/services';
import { EntityUtils } from 'app/pages/common/entity/utils';
import { T } from 'app/translate-marker';
import { FieldSets } from 'app/pages/common/entity/entity-form/classes/field-sets';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form';
import { ModalService } from 'app/services/modal.service';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { CompressionType } from 'app/enums/compression-type.enum';
import { Direction } from 'app/enums/direction.enum';
import { EncryptionKeyFormat } from 'app/enums/encryption-key-format.enum';
import { LifetimeUnit } from 'app/enums/lifetime-unit.enum';
import { LoggingLevel } from 'app/enums/logging-level.enum';
import { NetcatMode } from 'app/enums/netcat-mode.enum';
import { ReadOnlyMode } from 'app/enums/readonly-mode.enum';
import { RetentionPolicy } from 'app/enums/retention-policy.enum';
import { TransportMode } from 'app/enums/transport-mode.enum';

@Component({
  selector: 'app-replication-form',
  template: '<entity-form [conf]="this"></entity-form>',
  providers: [TaskService, KeychainCredentialService, ReplicationService, StorageService],
})
export class ReplicationFormComponent {
  protected isNew = false;
  form_message = {
    type: 'notice',
    content: '',
  };
  protected queryCall = 'replication.query';
  protected queryCallOption: any[] = [];
  protected addCall = 'replication.create';
  protected editCall = 'replication.update';
  protected isEntity = true;
  protected entityForm: any;
  protected queryRes: any;
  protected title: string;
  protected pk: number;
  protected retentionPolicyChoice = [
    {
      label: T('Same as Source'),
      value: RetentionPolicy.Source,
    },
    {
      label: T('Custom'),
      value: RetentionPolicy.Custom,
    },
    {
      label: T('None'),
      value: RetentionPolicy.None,
    },
  ];
  protected custActions: any[] = [{
    id: 'wizard_add',
    name: T('Switch to Wizard'),
    function: () => {
      this.modalService.close('slide-in-form');
      const message = { action: 'open', component: 'replicationWizard', row: this.pk };
      this.modalService.message(message);
    },
  }];

  fieldSets: FieldSets = new FieldSets([
    {
      name: helptext.fieldset_general,
      label: true,
      class: 'general',
      width: '50%',
      config: [
        {
          type: 'input',
          name: 'name',
          placeholder: helptext.name_placeholder,
          tooltip: helptext.name_tooltip,
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'select',
          name: 'direction',
          placeholder: helptext.direction_placeholder,
          tooltip: helptext.direction_tooltip,
          options: [
            {
              label: T('PUSH'),
              value: Direction.Push,
            },
            {
              label: T('PULL'),
              value: Direction.Pull,
            },
          ],
          value: Direction.Push,
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Local,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          name: 'transport',
          placeholder: helptext.transport_placeholder,
          tooltip: helptext.transport_tooltip,
          options: [
            {
              label: T('SSH'),
              value: TransportMode.SSH,
            },
            {
              label: T('SSH+NETCAT'),
              value: TransportMode.Netcat,
            },
            {
              label: T('LOCAL'),
              value: TransportMode.Local,
            },
          ],
          value: TransportMode.SSH,
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'retries',
          placeholder: helptext.retries_placeholder,
          tooltip: helptext.retries_tooltip,
          value: 5,
        },
        {
          type: 'select',
          name: 'logging_level',
          placeholder: helptext.logging_level_placeholder,
          tooltip: helptext.logging_level_tooltip,
          options: [
            {
              label: T('DEFAULT'),
              value: LoggingLevel.Default,
            },
            {
              label: T('DEBUG'),
              value: LoggingLevel.Debug,
            },
            {
              label: T('INFO'),
              value: LoggingLevel.Info,
            },
            {
              label: T('WARNING'),
              value: LoggingLevel.Warning,
            },
            {
              label: T('ERROR'),
              value: LoggingLevel.Error,
            },
          ],
          value: LoggingLevel.Default,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          placeholder: helptext.enabled_placeholder,
          tooltip: helptext.enabled_tooltip,
          value: true,
        },
      ],
    },
    {
      name: helptext.fieldset_transport,
      label: true,
      class: 'transport',
      width: '50%',
      config: [
        {
          type: 'select',
          name: 'ssh_credentials',
          placeholder: helptext.ssh_credentials_placeholder,
          tooltip: helptext.ssh_credentials_tooltip,
          options: [
            {
              label: '---------',
              value: '',
            },
          ],
          value: '',
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Local,
                },
              ],
            },
          ],
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'select',
          name: 'netcat_active_side',
          placeholder: helptext.netcat_active_side_placeholder,
          tooltip: helptext.netcat_active_side_tooltip,
          options: [
            {
              label: T('LOCAL'),
              value: NetcatMode.Local,
            },
            {
              label: T('REMOTE'),
              value: NetcatMode.Remote,
            },
          ],
          value: NetcatMode.Local,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Netcat,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'netcat_active_side_listen_address',
          placeholder: helptext.netcat_active_side_listen_address_placeholder,
          tooltip: helptext.netcat_active_side_listen_address_tooltip,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Netcat,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'netcat_active_side_port_min',
          placeholder: helptext.netcat_active_side_port_min_placeholder,
          tooltip: helptext.netcat_active_side_port_min_tooltip,
          width: '50%',
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Netcat,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'netcat_active_side_port_max',
          placeholder: helptext.netcat_active_side_port_max_placeholder,
          tooltip: helptext.netcat_active_side_port_max_tooltip,
          width: '50%',
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Netcat,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'netcat_passive_side_connect_address',
          placeholder: helptext.netcat_passive_side_connect_address_placeholder,
          tooltip: helptext.netcat_passive_side_connect_address_tooltip,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.Netcat,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          name: 'compression',
          placeholder: helptext.compression_placeholder,
          tooltip: helptext.compression_tooltip,
          options: [
            {
              label: T('Disabled'),
              value: CompressionType.Disabled, // should set it to be null before submit
            },
            {
              label: T('lz4 (fastest)'),
              value: CompressionType.LZ4,
            },
            {
              label: T('pigz (all rounder)'),
              value: CompressionType.PIGZ,
            },
            {
              label: T('plzip (best compression)'),
              value: CompressionType.PLZIP,
            },
          ],
          value: CompressionType.Disabled,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.SSH,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'speed_limit',
          placeholder: helptext.speed_limit_placeholder,
          tooltip: helptext.speed_limit_tooltip,
          hasErrors: false,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'transport',
                  value: TransportMode.SSH,
                },
              ],
            },
          ],
          blurStatus: true,
          blurEvent: this.blurEvent,
          parent: this,
        },
        {
          type: 'checkbox',
          name: 'large_block',
          placeholder: helptext.large_block_placeholder,
          tooltip: helptext.large_block_tooltip,
          value: true,
        },
        {
          type: 'checkbox',
          name: 'compressed',
          placeholder: helptext.compressed_placeholder,
          tooltip: helptext.compressed_tooltip,
          value: true,
        },
      ],
    },
    {
      name: helptext.fieldset_source,
      label: true,
      class: 'source',
      width: '50%',
      config: [
        {
          type: 'explorer',
          initial: '',
          explorerType: 'dataset',
          multiple: true,
          tristate: false,
          name: 'source_datasets_PUSH',
          placeholder: helptext.source_datasets_placeholder,
          tooltip: helptext.source_datasets_tooltip,
          options: [],
          required: true,
          validation: [Validators.required],
          isHidden: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'direction',
                  value: Direction.Push,
                },
              ],
            },
          ],
        },
        {
          type: 'explorer',
          name: 'source_datasets_PULL',
          multiple: true,
          placeholder: helptext.source_datasets_placeholder,
          tooltip: helptext.source_datasets_placeholder,
          initial: '',
          explorerType: 'directory',
          customTemplateStringOptions: {
            useCheckbox: true,
            useTriState: false,
            displayField: 'Path',
            isExpandedField: 'expanded',
            idField: 'uuid',
            getChildren: this.getChildren.bind(this),
            nodeHeight: 23,
            allowDrag: false,
            useVirtualScroll: false,
          },
          required: true,
          validation: [Validators.required],
          isHidden: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'direction',
                  value: Direction.Pull,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'recursive',
          placeholder: helptext.recursive_placeholder,
          tooltip: helptext.recursive_tooltip,
          value: false,
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'replicate',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'chip',
          name: 'exclude',
          placeholder: helptext.exclude_placeholder,
          tooltip: helptext.exclude_tooltip,
          relation: [
            {
              action: 'HIDE',
              connective: 'OR',
              when: [
                {
                  name: 'recursive',
                  value: false,
                },
                {
                  name: 'replicate',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'properties',
          placeholder: helptext.properties_placeholder,
          tooltip: helptext.properties_tooltip,
          value: true,
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'replicate',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'replicate',
          placeholder: helptext.replicate_placeholder,
          tooltip: helptext.replicate_tooltip,
          value: false,
        },
        {
          type: 'chip',
          name: 'properties_override',
          placeholder: helptext.properties_override_placeholder,
          tooltip: helptext.properties_override_tooltip,
          relation: [
            {
              action: 'HIDE',
              connective: 'AND',
              when: [
                {
                  name: 'replicate',
                  value: false,
                },
                {
                  name: 'properties',
                  value: false,
                },
              ],
            },
          ],
        },
        {
          type: 'chip',
          name: 'properties_exclude',
          placeholder: helptext.properties_exclude_placeholder,
          tooltip: helptext.properties_exclude_tooltip,
          relation: [
            {
              action: 'HIDE',
              connective: 'AND',
              when: [
                {
                  name: 'replicate',
                  value: false,
                },
                {
                  name: 'properties',
                  value: false,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          multiple: true,
          name: 'periodic_snapshot_tasks',
          placeholder: helptext.periodic_snapshot_tasks_placeholder,
          tooltip: helptext.periodic_snapshot_tasks_tooltip,
          options: [],
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'direction',
                  value: Direction.Pull,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'restrict_schedule',
          placeholder: helptext.restrict_schedule_placeholder,
          tooltip: helptext.restrict_schedule_tooltip,
        },
        {
          type: 'scheduler',
          name: 'restrict_schedule_picker',
          tooltip: helptext.restrict_schedule_picker_tooltip,
          options: ['restrict_schedule_begin', 'restrict_schedule_end'],
          value: '0 0 * * *',
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'restrict_schedule',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          name: 'restrict_schedule_begin',
          placeholder: helptext.restrict_schedule_begin_placeholder,
          tooltip: helptext.restrict_schedule_begin_tooltip,
          options: [],
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'restrict_schedule',
                  value: true,
                },
              ],
            },
          ],
          value: '00:00',
        },
        {
          type: 'select',
          name: 'restrict_schedule_end',
          placeholder: helptext.restrict_schedule_end_placeholder,
          tooltip: helptext.restrict_schedule_end_tooltip,
          options: [],
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'restrict_schedule',
                  value: true,
                },
              ],
            },
          ],
          value: '23:59',
        },
        {
          type: 'chip',
          name: 'naming_schema',
          placeholder: helptext.naming_schema_placeholder,
          tooltip: helptext.naming_schema_tooltip,
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'direction',
                  value: Direction.Push,
                },
              ],
            },
          ],
        },
        {
          type: 'chip',
          name: 'also_include_naming_schema',
          placeholder: helptext.also_include_naming_schema_placeholder,
          tooltip: helptext.also_include_naming_schema_tooltip,
          relation: [
            {
              action: 'HIDE',
              when: [
                {
                  name: 'direction',
                  value: Direction.Pull,
                },
              ],
            },
          ],
          blurStatus: true,
          blurEvent: this.blurEventNamingSchema,
          parent: this,
        },
        {
          type: 'checkbox',
          name: 'hold_pending_snapshots',
          placeholder: helptext.hold_pending_snapshots_placeholder,
          tooltip: helptext.hold_pending_snapshots_tooltip,
        },
      ],
    },
    {
      name: helptext.fieldset_destination,
      label: true,
      class: 'destination',
      width: '50%',
      config: [
        {
          type: 'explorer',
          name: 'target_dataset_PUSH',
          placeholder: helptext.target_dataset_placeholder,
          tooltip: helptext.target_dataset_tooltip,
          initial: '',
          explorerType: 'directory',
          customTemplateStringOptions: {
            displayField: 'Path',
            isExpandedField: 'expanded',
            idField: 'uuid',
            getChildren: this.getChildren.bind(this),
            nodeHeight: 23,
            allowDrag: false,
            useVirtualScroll: false,
          },
          required: true,
          validation: [Validators.required],
          isHidden: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'direction',
                  value: Direction.Push,
                },
              ],
            },
          ],
        },
        {
          type: 'explorer',
          initial: '',
          explorerType: 'dataset',
          name: 'target_dataset_PULL',
          placeholder: helptext.target_dataset_placeholder,
          tooltip: helptext.target_dataset_placeholder,
          options: [],
          required: true,
          validation: [Validators.required],
          isHidden: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'direction',
                  value: Direction.Pull,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          name: 'readonly',
          placeholder: helptext.readonly_placeholder,
          tooltip: helptext.readonly_tooltip,
          options: [
            {
              label: T('SET'),
              value: ReadOnlyMode.Set,
            },
            {
              label: T('REQUIRE'),
              value: ReadOnlyMode.Require,
            },
            {
              label: T('IGNORE'),
              value: ReadOnlyMode.Ignore,
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'encryption',
          placeholder: helptext.encryption_placeholder,
          tooltip: repwizardhelptext.encryption_tooltip,
          value: false,
        },
        {
          type: 'select',
          name: 'encryption_key_format',
          placeholder: helptext.encryption_key_format_placeholder,
          tooltip: repwizardhelptext.encryption_key_format_tooltip,
          options: [
            {
              label: T('HEX'),
              value: EncryptionKeyFormat.Hex,
            },
            {
              label: T('PASSPHRASE'),
              value: EncryptionKeyFormat.Passphrase,
            },
          ],
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'encryption_key_generate',
          placeholder: helptext.encryption_key_generate_placeholder,
          tooltip: repwizardhelptext.encryption_key_generate_tooltip,
          value: true,
          relation: [
            {
              action: 'SHOW',
              connective: 'AND',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
                {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Hex,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'encryption_key_hex',
          placeholder: helptext.encryption_key_hex_placeholder,
          tooltip: repwizardhelptext.encryption_key_hex_tooltip,
          relation: [
            {
              action: 'SHOW',
              connective: 'AND',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
                {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Hex,
                },
                {
                  name: 'encryption_key_generate',
                  value: false,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          inputType: 'password',
          togglePw: true,
          name: 'encryption_key_passphrase',
          placeholder: helptext.encryption_key_passphrase_placeholder,
          tooltip: repwizardhelptext.encryption_key_passphrase_tooltip,
          relation: [
            {
              action: 'SHOW',
              connective: 'AND',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
                {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Passphrase,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'encryption_key_location_truenasdb',
          placeholder: helptext.encryption_key_location_truenasdb_placeholder,
          tooltip: repwizardhelptext.encryption_key_location_truenasdb_tooltip,
          value: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          name: 'encryption_key_location',
          placeholder: helptext.encryption_key_location_placeholder,
          tooltip: repwizardhelptext.encryption_key_location_tooltip,
          relation: [
            {
              action: 'SHOW',
              connective: 'AND',
              when: [
                {
                  name: 'encryption',
                  value: true,
                },
                {
                  name: 'encryption_key_location_truenasdb',
                  value: false,
                },
              ],
            },
          ],
        },
        {
          type: 'checkbox',
          name: 'allow_from_scratch',
          placeholder: helptext.allow_from_scratch_placeholder,
          tooltip: helptext.allow_from_scratch_tooltip,
        },
        {
          type: 'select',
          name: 'retention_policy',
          placeholder: helptext.retention_policy_placeholder,
          tooltip: helptext.retention_policy_tooltip,
          options: this.retentionPolicyChoice,
          value: RetentionPolicy.None,
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'lifetime_value',
          placeholder: helptext.lifetime_value_placeholder,
          tooltip: helptext.lifetime_value_tooltip,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'retention_policy',
                  value: RetentionPolicy.Custom,
                },
              ],
            },
          ],
          width: '50%',
        },
        {
          type: 'select',
          name: 'lifetime_unit',
          placeholder: helptext.lifetime_unit_placeholder,
          tooltip: helptext.lifetime_unit_tooltip,
          options: [
            {
              label: T('Hour(s)'),
              value: LifetimeUnit.Hour,
            },
            {
              label: T('Day(s)'),
              value: LifetimeUnit.Day,
            },
            {
              label: T('Week(s)'),
              value: LifetimeUnit.Week,
            },
            {
              label: T('Month(s)'),
              value: LifetimeUnit.Month,
            },
            {
              label: T('Year(s)'),
              value: LifetimeUnit.Year,
            },
          ],
          value: LifetimeUnit.Week,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'retention_policy',
                  value: RetentionPolicy.Custom,
                },
              ],
            },
          ],
          width: '50%',
        },
      ],
    },
    {
      name: helptext.fieldset_schedule,
      label: true,
      class: 'schedule',
      width: '50%',
      config: [
        {
          type: 'checkbox',
          name: 'auto',
          placeholder: helptext.auto_placeholder,
          tooltip: helptext.auto_tooltip,
          value: true,
        },
        {
          type: 'checkbox',
          name: 'schedule',
          placeholder: helptext.schedule_placeholder,
          tooltip: helptext.schedule_tooltip,
        },
        {
          type: 'scheduler',
          name: 'schedule_picker',
          placeholder: helptext.schedule_picker_placeholder,
          tooltip: helptext.schedule_picker_tooltip,
          options: ['schedule_begin', 'schedule_end'],
          value: '0 0 * * *',
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'schedule',
                  value: true,
                },
              ],
            },
          ],
        },
        {
          type: 'select',
          name: 'schedule_begin',
          placeholder: helptext.schedule_begin_placeholder,
          tooltip: helptext.schedule_begin_tooltip,
          options: [],
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'schedule',
                  value: true,
                },
              ],
            },
          ],
          value: '00:00',
        },
        {
          type: 'select',
          name: 'schedule_end',
          placeholder: helptext.schedule_end_placeholder,
          tooltip: helptext.schedule_end_tooltip,
          options: [],
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'schedule',
                  value: true,
                },
              ],
            },
          ],
          value: '23:59',
        },
        {
          type: 'checkbox',
          name: 'only_matching_schedule',
          placeholder: helptext.only_matching_schedule_placeholder,
          tooltip: helptext.only_matching_schedule_tooltip,
          isHidden: true,
          relation: [
            {
              action: 'SHOW',
              when: [
                {
                  name: 'schedule',
                  value: true,
                },
              ],
            },
          ],
        },
      ],
    },
    { name: 'divider', divider: true },
  ]);
  protected fieldConfig: FieldConfig;

  constructor(
    protected ws: WebSocketService,
    protected taskService: TaskService,
    protected storageService: StorageService,
    protected keychainCredentialService: KeychainCredentialService,
    protected replicationService: ReplicationService,
    protected modalService: ModalService,
  ) {
    this.modalService.getRow$.pipe(take(1)).subscribe((id: number) => {
      this.queryCallOption = [['id', '=', id]];
    });
    const sshCredentialsField = this.fieldSets.config('ssh_credentials');
    this.keychainCredentialService.getSSHConnections().subscribe((res) => {
      for (const i in res) {
        sshCredentialsField.options.push({
          label: res[i].name,
          value: res[i].id,
        });
      }
    });
    const periodicSnapshotTasksField = this.fieldSets.config('periodic_snapshot_tasks');
    this.ws.call('pool.snapshottask.query').subscribe((res) => {
      for (const i in res) {
        const label = `${res[i].dataset} - ${res[i].naming_schema} - ${res[i].lifetime_value} ${
          res[i].lifetime_unit
        } (S) - ${res[i].enabled ? 'Enabled' : 'Disabled'}`;
        periodicSnapshotTasksField.options.push({
          label,
          value: res[i].id,
        });
      }
    });

    const scheduleBeginField = this.fieldSets.config('schedule_begin');
    const restrictScheduleBeginField = this.fieldSets.config('restrict_schedule_begin');
    const scheduleEndField = this.fieldSets.config('schedule_end');
    const restrictScheduleEndField = this.fieldSets.config('restrict_schedule_end');
    const time_options = this.taskService.getTimeOptions();

    for (let i = 0; i < time_options.length; i++) {
      const option = {
        label: time_options[i].label,
        value: time_options[i].value,
      };
      scheduleBeginField.options.push(option);
      restrictScheduleBeginField.options.push(option);
      scheduleEndField.options.push(option);
      restrictScheduleEndField.options.push(option);
    }
  }

  countEligibleManualSnapshots() {
    const namingSchema = this.entityForm.formGroup.controls['also_include_naming_schema'].value;
    if (typeof namingSchema !== 'string' && namingSchema.length === 0) {
      return;
    }

    this.ws
      .call('replication.count_eligible_manual_snapshots', [
        this.entityForm.formGroup.controls['target_dataset_PUSH'].value,
        this.entityForm.formGroup.controls['also_include_naming_schema'].value,
        this.entityForm.formGroup.controls['transport'].value,
        this.entityForm.formGroup.controls['ssh_credentials'].value,
      ])
      .subscribe(
        (res) => {
          this.form_message.type = res.eligible === 0 ? 'warning' : 'info';
          this.form_message.content = T(
            `${res.eligible} of ${res.total} existing snapshots of dataset ${this.entityForm.formGroup.controls['target_dataset_PUSH'].value} would be replicated with this task.`,
          );
        },
        (err) => {
          this.form_message.content = '';
          new EntityUtils().handleWSError(this, err);
        },
      );
  }

  async afterInit(entityForm: EntityFormComponent) {
    this.entityForm = entityForm;
    this.pk = entityForm.pk;
    this.isNew = entityForm.isNew;
    this.title = entityForm.isNew ? helptext.replication_task_add : helptext.replication_task_edit;

    const isTruenasCore = window.localStorage.getItem('product_type') === ProductType.Core;
    const readonlyCtrl = this.entityForm.formGroup.controls['readonly'];
    if (this.pk === undefined) {
      readonlyCtrl.setValue(isTruenasCore ? ReadOnlyMode.Set : ReadOnlyMode.Require);
    }

    if (this.entityForm.formGroup.controls['speed_limit'].value) {
      const presetSpeed = this.entityForm.formGroup.controls['speed_limit'].value.toString();
      this.storageService.humanReadable = presetSpeed;
    }
    this.entityForm.formGroup.controls['target_dataset_PUSH'].valueChanges.subscribe(() => {
      if (
        entityForm.formGroup.controls['direction'].value === Direction.Push
        && entityForm.formGroup.controls['transport'].value !== TransportMode.Local
        && entityForm.formGroup.controls['also_include_naming_schema'].value !== undefined
      ) {
        this.countEligibleManualSnapshots();
      } else {
        this.form_message.content = '';
      }
    });
    entityForm.formGroup.controls['direction'].valueChanges.subscribe((res) => {
      if (
        res === Direction.Push
        && entityForm.formGroup.controls['transport'].value !== TransportMode.Local
        && entityForm.formGroup.controls['also_include_naming_schema'].value !== undefined
      ) {
        this.countEligibleManualSnapshots();
      } else {
        this.form_message.content = '';
      }
    });

    const retentionPolicyField = this.fieldSets.config('retention_policy');
    entityForm.formGroup.controls['transport'].valueChanges.subscribe((res) => {
      if (
        res !== TransportMode.Local
        && entityForm.formGroup.controls['direction'].value === Direction.Push
        && entityForm.formGroup.controls['also_include_naming_schema'].value !== undefined
      ) {
        this.countEligibleManualSnapshots();
      } else {
        this.form_message.content = '';
      }

      if (retentionPolicyField.options !== this.retentionPolicyChoice) {
        retentionPolicyField.options = this.retentionPolicyChoice;
      }

      if (res === TransportMode.Local) {
        entityForm.formGroup.controls['direction'].setValue(Direction.Push);
        entityForm.setDisabled('target_dataset_PUSH', true, true);
        entityForm.setDisabled('ssh_credentials', true, true);
        entityForm.setDisabled('target_dataset_PULL', false, false);
      }
    });

    entityForm.formGroup.controls['schedule'].valueChanges.subscribe((res) => {
      entityForm.setDisabled('schedule_picker', !res, !res);
      entityForm.setDisabled('schedule_begin', !res, !res);
      entityForm.setDisabled('schedule_end', !res, !res);
      entityForm.setDisabled('only_matching_schedule', !res, !res);
    });

    entityForm.formGroup.controls['schedule_picker'].valueChanges.subscribe((value) => {
      if (value === '0 0 * * *' || value === '0 0 * * sun' || value === '0 0 1 * *') {
        entityForm.setDisabled('schedule_begin', true, true);
        entityForm.setDisabled('schedule_end', true, true);
      } else {
        entityForm.setDisabled('schedule_begin', false, false);
        entityForm.setDisabled('schedule_end', false, false);
      }
    });

    entityForm.formGroup.controls['restrict_schedule_picker'].valueChanges.subscribe((value) => {
      if (value === '0 0 * * *' || value === '0 0 * * sun' || value === '0 0 1 * *') {
        entityForm.setDisabled('restrict_schedule_begin', true, true);
        entityForm.setDisabled('restrict_schedule_end', true, true);
      } else {
        entityForm.setDisabled('restrict_schedule_begin', false, false);
        entityForm.setDisabled('restrict_schedule_end', false, false);
      }
    });

    entityForm.formGroup.controls['ssh_credentials'].valueChanges.subscribe((res) => {
      for (const item of ['target_dataset_PUSH', 'source_datasets_PULL']) {
        const explorerComponent = this.fieldSets.config(item).customTemplateStringOptions.explorerComponent;
        if (explorerComponent) {
          explorerComponent.nodes = [
            {
              mountpoint: explorerComponent.config.initial,
              name: explorerComponent.config.initial,
              hasChildren: true,
            },
          ];
        }
      }
    });

    entityForm.formGroup.controls['speed_limit'].valueChanges.subscribe((value) => {
      const speedLimitField = this.fieldSets.config('speed_limit');
      const filteredValue = value ? this.storageService.convertHumanStringToNum(value) : undefined;
      speedLimitField['hasErrors'] = false;
      speedLimitField['errors'] = '';
      if (filteredValue !== undefined && isNaN(filteredValue)) {
        speedLimitField['hasErrors'] = true;
        speedLimitField['errors'] = helptext.speed_limit_errors;
      }
    });

    entityForm.formGroup.controls['properties_override'].valueChanges.subscribe((value) => {
      if (value) {
        for (const item of value) {
          if (item && (item.indexOf('=') <= 0 || item.indexOf('=') >= item.length - 1)) {
            entityForm.formGroup.controls['properties_override'].setErrors({
              manualValidateError: true,
              manualValidateErrorMsg: helptext.properties_override_error,
            });
            return;
          }
        }
      }
      entityForm.formGroup.controls['properties_override'].setErrors(null);
    });
    entityForm.formGroup.controls['auto'].setValue(entityForm.formGroup.controls['auto'].value);
  }

  resourceTransformIncomingRestData(wsResponse: any) {
    this.queryRes = _.cloneDeep(wsResponse);
    wsResponse['source_datasets_PUSH'] = wsResponse['source_datasets'];
    wsResponse['target_dataset_PUSH'] = wsResponse['target_dataset'];
    wsResponse['source_datasets_PULL'] = wsResponse['source_datasets'];
    wsResponse['target_dataset_PULL'] = wsResponse['target_dataset'];

    if (wsResponse['ssh_credentials']) {
      wsResponse['ssh_credentials'] = wsResponse['ssh_credentials'].id;
    }

    wsResponse['compression'] = wsResponse['compression'] === null ? CompressionType.Disabled : wsResponse['compression'];
    wsResponse['logging_level'] = wsResponse['logging_level'] === null ? LoggingLevel.Default : wsResponse['logging_level'];
    const snapshotTasks = [];
    for (const item of wsResponse['periodic_snapshot_tasks']) {
      snapshotTasks.push(item.id);
    }
    wsResponse['periodic_snapshot_tasks'] = snapshotTasks;

    if (wsResponse.schedule) {
      wsResponse['schedule_picker'] = `${wsResponse.schedule.minute} ${wsResponse.schedule.hour} ${wsResponse.schedule.dom} ${wsResponse.schedule.month} ${wsResponse.schedule.dow}`;
      wsResponse['schedule_begin'] = wsResponse.schedule.begin;
      wsResponse['schedule_end'] = wsResponse.schedule.end;
      wsResponse['schedule'] = true;
    }

    if (wsResponse.restrict_schedule) {
      wsResponse['restrict_schedule_picker'] = `${wsResponse.restrict_schedule.minute} ${wsResponse.restrict_schedule.hour} ${wsResponse.restrict_schedule.dom} ${wsResponse.restrict_schedule.month} ${wsResponse.restrict_schedule.dow}`;
      wsResponse['restrict_schedule_begin'] = wsResponse.restrict_schedule.begin;
      wsResponse['restrict_schedule_end'] = wsResponse.restrict_schedule.end;
      wsResponse['restrict_schedule'] = true;
    }
    wsResponse['speed_limit'] = wsResponse['speed_limit']
      ? this.storageService.convertBytestoHumanReadable(wsResponse['speed_limit'], 0)
      : undefined;
    // block large_block changes if it is enabled
    if (this.entityForm.wsResponse.large_block) {
      this.entityForm.setDisabled('large_block', true, false);
    }

    if (wsResponse.properties_override) {
      const properties_exclude_list = [];
      for (const [key, value] of Object.entries(wsResponse['properties_override'])) {
        properties_exclude_list.push(`${key}=${value}`);
      }
      wsResponse['properties_override'] = properties_exclude_list;
    }

    wsResponse.encryption_key_location_truenasdb = wsResponse.encryption_key_location === '$TrueNAS';
    if (wsResponse.encryption_key_location_truenasdb) {
      delete wsResponse.encryption_key_location;
    }

    if (wsResponse.encryption_key_format === EncryptionKeyFormat.Hex) {
      wsResponse.encryption_key_generate = false;
      wsResponse.encryption_key_hex = wsResponse.encryption_key;
    } else {
      wsResponse.encryption_key_passphrase = wsResponse.encryption_key;
    }

    return wsResponse;
  }

  parsePickerTime(picker: any, begin: any, end: any) {
    const spl = picker.split(' ');
    return {
      minute: spl[0],
      hour: spl[1],
      dom: spl[2],
      month: spl[3],
      dow: spl[4],
      begin,
      end,
    };
  }

  beforeSubmit(data: any) {
    const targetDatasetPush = _.cloneDeep(data['target_dataset_PUSH']);

    if (data['replicate']) {
      data['recursive'] = true;
      data['properties'] = true;
      data['exclude'] = [];
    }
    if (data['properties_override']) {
      const properties_exclude_obj: any = {};
      for (let item of data['properties_override']) {
        item = item.split('=');
        properties_exclude_obj[item[0]] = item[1];
      }
      data['properties_override'] = properties_exclude_obj;
    }

    if (data['speed_limit'] !== undefined && data['speed_limit'] !== null) {
      data['speed_limit'] = this.storageService.convertHumanStringToNum(data['speed_limit']);
    }
    if (data['transport'] === TransportMode.Local) {
      data['direction'] = Direction.Push;
      data['target_dataset_PUSH'] = _.cloneDeep(data['target_dataset_PULL']);
      delete data['target_dataset_PULL'];
    }
    if (data['direction'] === Direction.Push) {
      for (let i = 0; i < data['source_datasets_PUSH'].length; i++) {
        if (_.startsWith(data['source_datasets_PUSH'][i], '/mnt/')) {
          data['source_datasets_PUSH'][i] = data['source_datasets_PUSH'][i].substring(5);
        }
      }
      data['source_datasets'] = _.filter(
        Array.isArray(data['source_datasets_PUSH'])
          ? _.cloneDeep(data['source_datasets_PUSH'])
          : _.cloneDeep(data['source_datasets_PUSH']).split(',').map(_.trim),
      );

      data['target_dataset'] = typeof targetDatasetPush === 'string' ? targetDatasetPush : targetDatasetPush.toString();

      delete data['source_datasets_PUSH'];
      delete data['target_dataset_PUSH'];
    } else {
      data['source_datasets'] = _.filter(
        Array.isArray(data['source_datasets_PULL'])
          ? _.cloneDeep(data['source_datasets_PULL'])
          : _.cloneDeep(data['source_datasets_PULL']).split(',').map(_.trim),
      );
      data['target_dataset'] = typeof data['target_dataset_PULL'] === 'string'
        ? _.cloneDeep(data['target_dataset_PULL'])
        : _.cloneDeep(data['target_dataset_PULL']).toString();
      if (_.startsWith(data['target_dataset'], '/mnt/')) {
        data['target_dataset'] = data['target_dataset'].substring(5);
      }
      delete data['source_datasets_PULL'];
      delete data['target_dataset_PULL'];
    }

    if (data['schedule']) {
      data['schedule'] = this.parsePickerTime(data['schedule_picker'], data['schedule_begin'], data['schedule_end']);
      delete data['schedule_picker'];
      delete data['schedule_begin'];
      delete data['schedule_end'];
    }
    if (data['restrict_schedule']) {
      data['restrict_schedule'] = this.parsePickerTime(
        data['restrict_schedule_picker'],
        data['restrict_schedule_begin'],
        data['restrict_schedule_end'],
      );
      delete data['restrict_schedule_picker'];
      delete data['restrict_schedule_begin'];
      delete data['restrict_schedule_end'];
    } else {
      delete data['restrict_schedule'];
    }

    if (data['compression'] === CompressionType.Disabled) {
      delete data['compression'];
    }
    if (data['logging_level'] === LoggingLevel.Default) {
      delete data['logging_level'];
    }

    if (data['encryption_key_location_truenasdb']) {
      data['encryption_key_location'] = '$TrueNAS';
    }
    delete data['encryption_key_location_truenasdb'];

    data['encryption_key'] = data['encryption_key_format'] === EncryptionKeyFormat.Passphrase
      ? data['encryption_key_passphrase']
      : data['encryption_key_generate']
        ? this.replicationService.generateEncryptionHexKey(64)
        : data['encryption_key_hex'];
    delete data['encryption_key_passphrase'];
    delete data['encryption_key_generate'];
    delete data['encryption_key_hex'];

    // for edit replication task
    if (!this.entityForm.isNew) {
      if (data['transport'] === TransportMode.Local) {
        data['ssh_credentials'] = null;
      }

      for (const prop in this.queryRes) {
        if (
          prop !== 'id'
          && prop !== 'state'
          && prop !== 'embed'
          && prop !== 'job'
          && prop !== 'dedup'
          && prop !== 'large_block'
          && data[prop] === undefined
        ) {
          if (prop === 'only_matching_schedule' || prop === 'hold_pending_snapshots') {
            data[prop] = false;
          } else {
            data[prop] = Array.isArray(this.queryRes[prop]) ? [] : null;
          }
        }
        if (prop === 'schedule' && data[prop] === false) {
          data[prop] = null;
        }
      }
    }
  }

  getChildren() {
    for (const item of ['target_dataset_PUSH', 'source_datasets_PULL']) {
      this.fieldSets.config(item).hasErrors = false;
    }

    const transport = this.entityForm.formGroup.controls['transport'].value;
    const sshCredentials = this.entityForm.formGroup.controls['ssh_credentials'].value;
    if ((sshCredentials === undefined || sshCredentials === '') && transport !== TransportMode.Local) {
      for (const item of ['target_dataset_PUSH', 'source_datasets_PULL']) {
        const fieldConfig = this.fieldSets.config(item);
        fieldConfig.hasErrors = true;
        fieldConfig.errors = T('Please select a valid SSH Connection');
      }
      return;
    }

    return new Promise((resolve, reject) => {
      resolve(this.replicationService.getRemoteDataset(transport, sshCredentials, this));
    });
  }

  blurEvent(parent: any) {
    if (parent.entityForm) {
      parent.entityForm.formGroup.controls['speed_limit'].setValue(parent.storageService.humanReadable);
    }
  }

  blurEventNamingSchema(parent: any) {
    if (
      parent.entityForm
      && parent.entityForm.formGroup.controls['direction'].value === Direction.Push
      && parent.entityForm.formGroup.controls['transport'].value !== TransportMode.Local
      && parent.entityForm.formGroup.controls['also_include_naming_schema'].value !== undefined
    ) {
      parent.countEligibleManualSnapshots();
    } else {
      parent.form_message.content = '';
    }
  }

  isCustActionVisible(actionId: string): boolean {
    return actionId === 'wizard_add' && this.pk === undefined;
  }
}
