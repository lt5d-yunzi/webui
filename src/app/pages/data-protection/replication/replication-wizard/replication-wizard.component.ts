import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { EntityDialogComponent } from 'app/pages/common/entity/entity-dialog/entity-dialog.component';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';

import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { CipherType } from 'app/enums/cipher-type.enum';
import { DatasetSource } from 'app/enums/dataset-source.enum';
import { Direction } from 'app/enums/direction.enum';
import { EncryptionKeyFormat } from 'app/enums/encryption-key-format.enum';
import { LifetimeUnit } from 'app/enums/lifetime-unit.enum';
import { NetcatMode } from 'app/enums/netcat-mode.enum';
import { RetentionPolicy } from 'app/enums/retention-policy.enum';
import { ScheduleMethod } from 'app/enums/schedule-method.enum';
import { TransportMode } from 'app/enums/transport-mode.enum';
import helptext from 'app/helptext/data-protection/replication/replication-wizard';
import sshConnectionsHelptex from 'app/helptext/system/ssh-connections';
import { ReplicationTask } from 'app/interfaces/replication-task.interface';
import { DialogFormConfiguration } from 'app/pages/common/entity/entity-dialog/dialog-form-configuration.interface';
import { Wizard } from 'app/pages/common/entity/entity-form/models/wizard.interface';
import { EntityFormService } from 'app/pages/common/entity/entity-form/services/entity-form.service';
import { forbiddenValues } from 'app/pages/common/entity/entity-form/validators/forbidden-values-validation';
import { EntityWizardComponent } from 'app/pages/common/entity/entity-wizard/entity-wizard.component';
import { EntityUtils } from 'app/pages/common/entity/utils';
import {
  AppLoaderService,
  DialogService,
  KeychainCredentialService,
  ReplicationService,
  TaskService,
  WebSocketService,
} from 'app/services';
import { ModalService } from 'app/services/modal.service';
import { T } from 'app/translate-marker';

@Component({
  selector: 'app-replication-wizard',
  template: '<entity-wizard [conf]="this"></entity-wizard>',
  providers: [KeychainCredentialService, ReplicationService, TaskService, DatePipe, EntityFormService],
})
export class ReplicationWizardComponent {
  title = T('Replication Task Wizard');
  isLinear = true;
  summary_title = T('Replication Summary');
  pk: number;
  getRow: Subscription;
  saveSubmitText = T('START REPLICATION');

  protected entityWizard: any;
  protected custActions: any[] = [{
    id: 'advanced_add',
    name: T('Advanced Replication Creation'),
    function: () => {
      this.modalService.close('slide-in-form');
      const message = { action: 'open', component: 'replicationForm', row: this.pk };
      this.modalService.message(message);
    },
  }];
  protected namesInUse: string[] = [];
  protected defaultNamingSchema = 'auto-%Y-%m-%d_%H-%M';
  protected wizardConfig: Wizard[] = [
    {
      label: helptext.step1_label,
      fieldSets: [
        {
          name: 'preload',
          label: false,
          class: 'preload',
          width: '100%',
          config: [
            {
              type: 'select',
              name: 'exist_replication',
              placeholder: helptext.exist_replication_placeholder,
              tooltip: helptext.exist_replication_tooltip,
              options: [{
                label: '---------',
                value: '',
              }],
              value: '',
            },
          ],
        },
        {
          name: 'source',
          label: false,
          class: 'source',
          width: '50%',
          config: [
            {
              type: 'select',
              name: 'source_datasets_from',
              placeholder: helptext.source_datasets_from_placeholder,
              tooltip: helptext.source_datasets_from_tooltip,
              options: [{
                label: T('On this System'),
                value: DatasetSource.Local,
              }, {
                label: T('On a Different System'),
                value: DatasetSource.Remote,
              }],
              required: true,
              validation: [Validators.required],
            },
            {
              type: 'select',
              name: 'ssh_credentials_source',
              placeholder: helptext.ssh_credentials_source_placeholder,
              tooltip: helptext.ssh_credentials_source_tooltip,
              options: [],
              relation: [{
                action: 'SHOW',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }],
              }],
              isHidden: true,
              required: true,
              validation: [Validators.required],
            },
            {
              type: 'explorer',
              name: 'source_datasets',
              placeholder: helptext.source_datasets_placeholder,
              tooltip: helptext.source_datasets_tooltip,
              initial: '',
              explorerType: 'directory',
              multiple: true,
              customTemplateStringOptions: {
                displayField: 'Path',
                isExpandedField: 'expanded',
                idField: 'uuid',
                getChildren: this.getSourceChildren.bind(this),
                nodeHeight: 23,
                allowDrag: false,
                useVirtualScroll: false,
                useCheckbox: true,
                useTriState: false,
              },
              required: true,
              validation: [Validators.required],
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'source_datasets_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'checkbox',
              name: 'recursive',
              placeholder: helptext.recursive_placeholder,
              tooltip: helptext.recursive_tooltip,
              value: false,
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'source_datasets_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'paragraph',
              name: 'snapshots_count',
              paraText: '',
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'source_datasets_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'checkbox',
              name: 'custom_snapshots',
              placeholder: helptext.custom_snapshots_placeholder,
              tooltip: helptext.custom_snapshots_tooltip,
              value: false,
              relation: [{
                action: 'SHOW',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'input',
              name: 'naming_schema',
              placeholder: helptext.naming_schema_placeholder,
              tooltip: helptext.naming_schema_tooltip,
              value: this.defaultNamingSchema,
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'custom_snapshots',
                  value: true,
                }, {
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }],
              }],
              parent: this,
              blurStatus: true,
              blurEvent: (parent: any) => {
                parent.getSnapshots();
              },
            },
          ],
        },
        {
          name: 'target',
          label: false,
          class: 'target',
          width: '50%',
          config: [
            {
              type: 'select',
              name: 'target_dataset_from',
              placeholder: helptext.target_dataset_from_placeholder,
              tooltip: helptext.target_dataset_from_tooltip,
              options: [{
                label: T('On this System'),
                value: DatasetSource.Local,
              }, {
                label: T('On a Different System'),
                value: DatasetSource.Remote,
              }],
              required: true,
              validation: [Validators.required],
            },
            {
              type: 'select',
              name: 'ssh_credentials_target',
              placeholder: helptext.ssh_credentials_target_placeholder,
              tooltip: helptext.ssh_credentials_target_tooltip,
              options: [],
              relation: [{
                action: 'SHOW',
                when: [{
                  name: 'target_dataset_from',
                  value: DatasetSource.Remote,
                }],
              }],
              isHidden: true,
              required: true,
              validation: [Validators.required],
            },
            {
              type: 'explorer',
              name: 'target_dataset',
              placeholder: helptext.target_dataset_placeholder,
              tooltip: helptext.target_dataset_tooltip,
              initial: '',
              explorerType: 'directory',
              customTemplateStringOptions: {
                displayField: 'Path',
                isExpandedField: 'expanded',
                idField: 'uuid',
                getChildren: this.getTargetChildren.bind(this),
                nodeHeight: 23,
                allowDrag: false,
                useVirtualScroll: false,
              },
              required: true,
              validation: [Validators.required],
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'target_dataset_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'target_dataset_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'checkbox',
              name: 'encryption',
              placeholder: helptext.encryption_placeholder,
              tooltip: helptext.encryption_tooltip,
              value: false,
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'target_dataset_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'target_dataset_from',
                  value: DatasetSource.Local,
                }],
              }],
            },
            {
              type: 'select',
              name: 'encryption_key_format',
              placeholder: helptext.encryption_key_format_placeholder,
              tooltip: helptext.encryption_key_format_tooltip,
              options: [{
                label: T('HEX'),
                value: EncryptionKeyFormat.Hex,
              }, {
                label: T('PASSPHRASE'),
                value: EncryptionKeyFormat.Passphrase,
              }],
              relation: [{
                action: 'SHOW',
                when: [{
                  name: 'encryption',
                  value: true,
                }],
              }],
            },
            {
              type: 'checkbox',
              name: 'encryption_key_generate',
              placeholder: helptext.encryption_key_generate_placeholder,
              tooltip: helptext.encryption_key_generate_tooltip,
              value: true,
              relation: [{
                action: 'SHOW',
                connective: 'AND',
                when: [{
                  name: 'encryption',
                  value: true,
                }, {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Hex,
                }],
              }],
            },
            {
              type: 'input',
              name: 'encryption_key_hex',
              placeholder: helptext.encryption_key_hex_placeholder,
              tooltip: helptext.encryption_key_hex_tooltip,
              relation: [{
                action: 'SHOW',
                connective: 'AND',
                when: [{
                  name: 'encryption',
                  value: true,
                }, {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Hex,
                }, {
                  name: 'encryption_key_generate',
                  value: false,
                }],
              }],
            },
            {
              type: 'input',
              inputType: 'password',
              togglePw: true,
              name: 'encryption_key_passphrase',
              placeholder: helptext.encryption_key_passphrase_placeholder,
              tooltip: helptext.encryption_key_passphrase_tooltip,
              relation: [{
                action: 'SHOW',
                connective: 'AND',
                when: [{
                  name: 'encryption',
                  value: true,
                }, {
                  name: 'encryption_key_format',
                  value: EncryptionKeyFormat.Passphrase,
                }],
              }],
            },
            {
              type: 'checkbox',
              name: 'encryption_key_location_truenasdb',
              placeholder: helptext.encryption_key_location_truenasdb_placeholder,
              tooltip: helptext.encryption_key_location_truenasdb_tooltip,
              value: true,
              relation: [{
                action: 'SHOW',
                when: [{
                  name: 'encryption',
                  value: true,
                }],
              }],
            },
            {
              type: 'input',
              name: 'encryption_key_location',
              placeholder: helptext.encryption_key_location_placeholder,
              tooltip: helptext.encryption_key_location_tooltip,
              relation: [{
                action: 'SHOW',
                connective: 'AND',
                when: [{
                  name: 'encryption',
                  value: true,
                }, {
                  name: 'encryption_key_location_truenasdb',
                  value: false,
                }],
              }],
            },
          ],
        },
        {
          name: 'general',
          label: false,
          class: 'general',
          width: '100%',
          config: [
            {
              type: 'radio',
              name: 'transport',
              placeholder: helptext.transport_placeholder,
              tooltip: helptext.transport_tooltip,
              options: [
                {
                  label: T('Encryption (more secure, but slower)'),
                  value: TransportMode.SSH,
                },
                {
                  label: T('No Encryption (less secure, but faster)'),
                  value: TransportMode.Netcat,
                },
              ],
              value: TransportMode.SSH,
              relation: [{
                action: 'SHOW',
                connective: 'OR',
                when: [{
                  name: 'source_datasets_from',
                  value: DatasetSource.Remote,
                }, {
                  name: 'target_dataset_from',
                  value: DatasetSource.Remote,
                }],
              }],
            },
            {
              type: 'input',
              name: 'name',
              placeholder: helptext.name_placeholder,
              tooltip: helptext.name_tooltip,
              required: true,
              validation: [Validators.required, forbiddenValues(this.namesInUse)],
            },
          ],
        },
      ],
      fieldConfig: [],
    },
    {
      label: helptext.step2_label,
      fieldConfig: [
        {
          type: 'radio',
          name: 'schedule_method',
          placeholder: helptext.schedule_method_placeholder,
          tooltip: helptext.schedule_method_tooltip,
          options: [{
            label: T('Run On a Schedule'),
            value: ScheduleMethod.Cron,
          }, {
            label: T('Run Once'),
            value: ScheduleMethod.Once,
          }],
          value: ScheduleMethod.Cron,
          class: 'inline',
          width: '50%',
        },
        {
          type: 'scheduler',
          name: 'schedule_picker',
          placeholder: helptext.schedule_placeholder,
          tooltip: helptext.schedule_tooltip,
          value: '0 0 * * *',
          class: 'inline',
          width: '50%',
          relation: [{
            action: 'SHOW',
            when: [{
              name: 'schedule_method',
              value: ScheduleMethod.Cron,
            }],
          }],
          required: true,
          validation: [Validators.required],
        },
        {
          type: 'checkbox',
          name: 'readonly',
          placeholder: helptext.readonly_placeholder,
          tooltip: helptext.readonly_tooltip,
          relation: [{
            action: 'SHOW',
            when: [{
              name: 'schedule_method',
              value: ScheduleMethod.Once,
            }],
          }],
          value: true,
        },
        {
          type: 'radio',
          name: 'retention_policy',
          placeholder: helptext.retention_policy_placeholder,
          tooltip: helptext.retention_policy_tooltip,
          options: [{
            label: T('Same as Source'),
            value: RetentionPolicy.Source,
          }, {
            label: T('Never Delete'),
            value: RetentionPolicy.None,
          }, {
            label: T('Custom'),
            value: RetentionPolicy.Custom,
          }],
          value: RetentionPolicy.Source,
          class: 'inline',
          width: '50%',
        },
        {
          placeholder: helptext.lifetime_value_placeholder,
          type: 'input',
          name: 'lifetime_value',
          inputType: 'number',
          value: 2,
          required: true,
          validation: [Validators.required, Validators.min(0)],
          class: 'inline',
          width: '25%',
          relation: [{
            action: 'SHOW',
            connective: 'OR',
            when: [{
              name: 'retention_policy',
              value: RetentionPolicy.Custom,
            }],
          }],
        },
        {
          type: 'select',
          name: 'lifetime_unit',
          tooltip: helptext.lifetime_unit_tooltip,
          options: [{
            label: T('Hours'),
            value: LifetimeUnit.Hour,
          }, {
            label: T('Days'),
            value: LifetimeUnit.Day,
          }, {
            label: T('Weeks'),
            value: LifetimeUnit.Week,
          }, {
            label: T('Months'),
            value: LifetimeUnit.Month,
          }, {
            label: T('Years'),
            value: LifetimeUnit.Year,
          }],
          value: LifetimeUnit.Week,
          class: 'inline',
          width: '25%',
          relation: [{
            action: 'SHOW',
            connective: 'OR',
            when: [{
              name: 'retention_policy',
              value: RetentionPolicy.Custom,
            }],
          }],
          required: true,
          validation: [Validators.required],
        },
      ],
    },
  ];

  protected dialogFieldConfig = [
    {
      type: 'input',
      name: 'name',
      placeholder: sshConnectionsHelptex.name_placeholder,
      tooltip: sshConnectionsHelptex.name_tooltip,
      required: true,
      validation: [Validators.required],
    },
    {
      type: 'select',
      name: 'setup_method',
      placeholder: sshConnectionsHelptex.setup_method_placeholder,
      tooltip: sshConnectionsHelptex.setup_method_tooltip,
      options: [
        {
          label: T('Manual'),
          value: 'manual',
        }, {
          label: T('Semi-automatic (TrueNAS CORE only)'),
          value: 'semiautomatic',
        },
      ],
      value: 'semiautomatic',
      isHidden: false,
    },
    {
      type: 'input',
      name: 'host',
      placeholder: sshConnectionsHelptex.host_placeholder,
      tooltip: sshConnectionsHelptex.host_tooltip,
      required: true,
      validation: [Validators.required],
      relation: [{
        action: 'SHOW',
        when: [{
          name: 'setup_method',
          value: 'manual',
        }],
      }],
    }, {
      type: 'input',
      inputType: 'number',
      name: 'port',
      placeholder: sshConnectionsHelptex.port_placeholder,
      tooltip: sshConnectionsHelptex.port_tooltip,
      value: 22,
      relation: [{
        action: 'SHOW',
        when: [{
          name: 'setup_method',
          value: 'manual',
        }],
      }],
    }, {
      type: 'input',
      name: 'url',
      placeholder: sshConnectionsHelptex.url_placeholder,
      tooltip: sshConnectionsHelptex.url_tooltip,
      required: true,
      validation: [Validators.required],
      relation: [{
        action: 'SHOW',
        when: [{
          name: 'setup_method',
          value: 'semiautomatic',
        }],
      }],
    }, {
      type: 'input',
      name: 'username',
      placeholder: sshConnectionsHelptex.username_placeholder,
      tooltip: sshConnectionsHelptex.username_tooltip,
      value: 'root',
      required: true,
      validation: [Validators.required],
    }, {
      type: 'input',
      inputType: 'password',
      name: 'password',
      placeholder: sshConnectionsHelptex.password_placeholder,
      tooltip: sshConnectionsHelptex.password_tooltip,
      togglePw: true,
      required: true,
      validation: [Validators.required],
      relation: [{
        action: 'SHOW',
        when: [{
          name: 'setup_method',
          value: 'semiautomatic',
        }],
      }],
    }, {
      type: 'select',
      name: 'private_key',
      placeholder: sshConnectionsHelptex.private_key_placeholder,
      tooltip: sshConnectionsHelptex.private_key_tooltip,
      options: [
        {
          label: T('Generate New'),
          value: 'NEW',
        },
      ],
      required: true,
      validation: [Validators.required],
    }, {
      type: 'input',
      name: 'remote_host_key',
      isHidden: true,
    }, {
      type: 'select',
      name: 'cipher',
      placeholder: helptext.cipher_placeholder,
      tooltip: helptext.cipher_tooltip,
      options: [
        {
          label: T('Standard (Secure)'),
          value: CipherType.Standard,
        }, {
          label: T('Fast (Less secure)'),
          value: CipherType.Fast,
        }, {
          label: T('Disabled (Not encrypted)'),
          value: CipherType.Disabled,
        },
      ],
      value: CipherType.Standard,
    },
  ];
  protected selectedReplicationTask: ReplicationTask;
  protected semiSSHFieldGroup: string[] = [
    'url',
    'password',
  ];

  protected createCalls = {
    private_key: 'keychaincredential.create',
    ssh_credentials_semiautomatic: 'keychaincredential.remote_ssh_semiautomatic_setup',
    ssh_credentials_manual: 'keychaincredential.create',
    periodic_snapshot_tasks: 'pool.snapshottask.create',
    replication: 'replication.create',
    snapshot: 'zfs.snapshot.create',
  };

  protected deleteCalls = {
    private_key: 'keychaincredential.delete',
    ssh_credentials: 'keychaincredential.delete',
    periodic_snapshot_tasks: 'pool.snapshottask.delete',
    replication: 'replication.delete',
  };

  protected snapshotsCountField: FieldConfig;
  private existSnapshotTasks: any[] = [];
  private eligibleSnapshots = 0;
  protected preload_fieldSet: FieldSet;
  protected source_fieldSet: FieldSet;
  protected target_fieldSet: FieldSet;

  constructor(private keychainCredentialService: KeychainCredentialService,
    private loader: AppLoaderService, private dialogService: DialogService,
    private ws: WebSocketService, private replicationService: ReplicationService,
    private datePipe: DatePipe, private entityFormService: EntityFormService,
    private modalService: ModalService) {
    this.ws.call('replication.query').subscribe(
      (res: any[]) => {
        this.namesInUse.push(...res.map((replication) => replication.name));
      },
    );
    this.getRow = this.modalService.getRow$.pipe(take(1)).subscribe((rowId: number) => {
      this.pk = rowId;
    });
  }

  isCustActionVisible(actionId: string, stepperIndex: number): boolean {
    if (stepperIndex == 0) {
      return true;
    }
    return false;
  }

  afterInit(entityWizard: EntityWizardComponent): void {
    this.entityWizard = entityWizard;
    this.preload_fieldSet = _.find(this.wizardConfig[0].fieldSets, { class: 'preload' });
    this.source_fieldSet = _.find(this.wizardConfig[0].fieldSets, { class: 'source' });
    this.target_fieldSet = _.find(this.wizardConfig[0].fieldSets, { class: 'target' });
    this.snapshotsCountField = _.find(this.source_fieldSet.config, { name: 'snapshots_count' });

    this.step0Init();
    this.step1Init();
  }

  step0Init() {
    const exist_replicationField = _.find(this.preload_fieldSet.config, { name: 'exist_replication' });
    this.replicationService.getReplicationTasks().subscribe(
      (res: ReplicationTask[]) => {
        for (const task of res) {
          if (task.transport !== TransportMode.Legacy) {
            const lable = task.name + ' (' + ((task.state && task.state.datetime) ? 'last run ' + this.datePipe.transform(new Date(task.state.datetime.$date), 'MM/dd/yyyy') : 'never ran') + ')';
            exist_replicationField.options.push({ label: lable, value: task });
            if (this.pk === task.id) {
              this.loadOrClearReplicationTask(task);
            }
          }
        }
      },
    );

    const privateKeyField = _.find(this.dialogFieldConfig, { name: 'private_key' });
    this.keychainCredentialService.getSSHKeys().subscribe(
      (res) => {
        for (const i in res) {
          privateKeyField.options.push({ label: res[i].name, value: res[i].id });
        }
      },
    );

    const ssh_credentials_source_field = _.find(this.source_fieldSet.config, { name: 'ssh_credentials_source' });
    const ssh_credentials_target_field = _.find(this.target_fieldSet.config, { name: 'ssh_credentials_target' });
    this.keychainCredentialService.getSSHConnections().subscribe((res) => {
      for (const i in res) {
        ssh_credentials_source_field.options.push({ label: res[i].name, value: res[i].id });
        ssh_credentials_target_field.options.push({ label: res[i].name, value: res[i].id });
      }
      ssh_credentials_source_field.options.push({ label: T('Create New'), value: 'NEW' });
      ssh_credentials_target_field.options.push({ label: T('Create New'), value: 'NEW' });
    });

    this.entityWizard.formArray.controls[0].controls['exist_replication'].valueChanges.subscribe((value: any) => {
      if (value !== null) {
        this.loadOrClearReplicationTask(value);
      }
    });
    this.entityWizard.formArray.controls[0].controls['source_datasets'].valueChanges.subscribe(() => {
      this.genTaskName();
      this.getSnapshots();
    });
    this.entityWizard.formArray.controls[0].controls['target_dataset'].valueChanges.subscribe(() => {
      this.genTaskName();
    });

    for (const i of ['source', 'target']) {
      const credentialName = 'ssh_credentials_' + i;
      const datasetName = i === 'source' ? 'source_datasets' : 'target_dataset';
      const datasetFrom = datasetName + '_from';
      this.entityWizard.formArray.controls[0].controls[datasetFrom].valueChanges.subscribe((value: any) => {
        if (value === DatasetSource.Remote) {
          if (datasetFrom === 'source_datasets_from') {
            this.entityWizard.formArray.controls[0].controls['target_dataset_from'].setValue(DatasetSource.Local);
            this.setDisable('target_dataset_from', true, false, 0);
          }
          const disabled = !this.entityWizard.formArray.controls[0].controls[credentialName].value;
          this.setDisable(datasetName, disabled, false, 0);
        } else {
          if (datasetFrom === 'source_datasets_from' && this.entityWizard.formArray.controls[0].controls['target_dataset_from'].disabled) {
            this.setDisable('target_dataset_from', false, false, 0);
          }
          this.setDisable(datasetName, false, false, 0);
        }
      });

      this.entityWizard.formArray.controls[0].controls[credentialName].valueChanges.subscribe((value: any) => {
        if (value === 'NEW' && this.entityWizard.formArray.controls[0].controls[datasetFrom].value === DatasetSource.Remote) {
          this.createSSHConnection(credentialName);
          this.setDisable(datasetName, false, false, 0);
        } else {
          const fieldConfig = i === 'source' ? this.source_fieldSet.config : this.target_fieldSet.config;
          const explorerComponent = _.find(fieldConfig, { name: datasetName }).customTemplateStringOptions.explorerComponent;
          if (explorerComponent) {
            explorerComponent.nodes = [{
              mountpoint: explorerComponent.config.initial,
              name: explorerComponent.config.initial,
              hasChildren: true,
            }];
            this.entityWizard.formArray.controls[0].controls[datasetName].setValue('');
          }
          this.setDisable(datasetName, false, false, 0);
        }
      });
    }

    this.entityWizard.formArray.controls[0].controls['recursive'].valueChanges.subscribe((value: any) => {
      const explorerComponent = _.find(this.source_fieldSet.config, { name: 'source_datasets' }).customTemplateStringOptions;
      if (explorerComponent) {
        explorerComponent.useTriState = value;
      }
    });

    this.entityWizard.formArray.controls[0].controls['custom_snapshots'].valueChanges.subscribe((value: any) => {
      this.setDisable('naming_schema', !value, !value, 0);
      if (!value) {
        this.getSnapshots();
      }
    });
  }

  loadOrClearReplicationTask(task: ReplicationTask): void {
    if (task !== undefined) {
      this.loadReplicationTask(task);
    } else if (this.selectedReplicationTask !== undefined) {
      this.clearReplicationTask();
    }
    this.selectedReplicationTask = task;
  }

  step1Init() {
    this.entityWizard.formArray.controls[1].controls['retention_policy'].valueChanges.subscribe((value: any) => {
      const disable = value === RetentionPolicy.Source;
      disable ? this.entityWizard.formArray.controls[1].controls['lifetime_value'].disable() : this.entityWizard.formArray.controls[1].controls['lifetime_value'].enable();
      disable ? this.entityWizard.formArray.controls[1].controls['lifetime_unit'].disable() : this.entityWizard.formArray.controls[1].controls['lifetime_unit'].enable();
    });
  }

  getSourceChildren(node: any) {
    const fromLocal = this.entityWizard.formArray.controls[0].controls['source_datasets_from'].value === DatasetSource.Local;
    const sshCredentials = this.entityWizard.formArray.controls[0].controls['ssh_credentials_source'].value;

    if (fromLocal) {
      return new Promise((resolve, reject) => {
        resolve(this.entityFormService.getPoolDatasets());
      });
    }
    if (sshCredentials === 'NEW') {
      return this.entityWizard.formArray.controls[0].controls['ssh_credentials_source'].setErrors({});
    }
    return new Promise((resolve, reject) => {
      this.replicationService.getRemoteDataset('SSH', sshCredentials, this).then(
        (res) => {
          resolve(res);
        },
        (err) => {
          node.collapse();
        },
      );
    });
  }

  getTargetChildren(node: any) {
    const fromLocal = this.entityWizard.formArray.controls[0].controls['target_dataset_from'].value === DatasetSource.Local;
    const sshCredentials = this.entityWizard.formArray.controls[0].controls['ssh_credentials_target'].value;
    if (fromLocal) {
      return new Promise((resolve, reject) => {
        resolve(this.entityFormService.getPoolDatasets());
      });
    }
    if (sshCredentials === 'NEW') {
      return this.entityWizard.formArray.controls[0].controls['ssh_credentials_target'].setErrors({});
    }
    return new Promise((resolve, reject) => {
      this.replicationService.getRemoteDataset('SSH', sshCredentials, this).then(
        (res) => {
          resolve(res);
        },
        (err) => {
          node.collapse();
        },
      );
    });
  }

  setDisable(field: any, disabled: boolean, isHidden: boolean, stepIndex: number) {
    const control: any = _.find(this.wizardConfig[stepIndex].fieldConfig, { name: field });
    control['isHidden'] = isHidden;
    control.disabled = disabled;
    disabled ? this.entityWizard.formArray.controls[stepIndex].controls[field].disable() : this.entityWizard.formArray.controls[stepIndex].controls[field].enable();
  }

  loadReplicationTask(task: any): void {
    // TODO: Update logic to use ReplicationTask as a type
    // Add something similar to resourceTransformIncomingRestData for EntityWizard
    // 'task.periodic_snapshot_tasks' should be type of number[] currently PeriodicSnapshotTask[]
    // 'task.ssh_credentials' should be type of number[], currently SshCredentials[]
    if (task.direction === Direction.Push) {
      task['source_datasets_from'] = DatasetSource.Local;
      task['target_dataset_from'] = task.ssh_credentials ? DatasetSource.Remote : DatasetSource.Local;
      if (task.ssh_credentials) {
        task['ssh_credentials_target'] = task.ssh_credentials.id;
      }
    } else {
      task['source_datasets_from'] = DatasetSource.Remote;
      task['target_dataset_from'] = DatasetSource.Local;
      task['ssh_credentials_source'] = task.ssh_credentials.id;
    }

    for (const i of ['source_datasets_from', 'target_dataset_from', 'ssh_credentials_source', 'ssh_credentials_target', 'transport', 'source_datasets', 'target_dataset']) {
      const ctrl = this.entityWizard.formArray.controls[0].controls[i];
      if (ctrl && !ctrl.disabled) {
        ctrl.setValue(task[i]);
      }
    }

    if (task.schedule || task.periodic_snapshot_tasks.length > 0) {
      const taskData = task.periodic_snapshot_tasks[0] || task;
      task['schedule_method'] = ScheduleMethod.Cron;
      task['schedule_picker'] = taskData.schedule ? `${taskData.schedule.minute} ${taskData.schedule.hour} ${taskData.schedule.dom} ${taskData.schedule.month} ${taskData.schedule.dow}` : null;

      if (taskData['lifetime_value'] === null && taskData['lifetime_unit'] === null) {
        task['retention_policy'] = RetentionPolicy.None;
      } else {
        task['lifetime_value'] = taskData['lifetime_value'];
        task['lifetime_unit'] = taskData['lifetime_unit'];
        task['retention_policy'] = task.schedule !== null ? RetentionPolicy.Custom : RetentionPolicy.Source;
      }
    } else {
      task['schedule_method'] = ScheduleMethod.Once;
    }
    // periodic_snapshot_tasks
    for (const i of ['schedule_method', 'schedule_picker', 'retention_policy', 'lifetime_value', 'lifetime_unit']) {
      const ctrl = this.entityWizard.formArray.controls[1].controls[i];
      if (ctrl && !ctrl.disabled) {
        ctrl.setValue(task[i]);
      }
    }
  }

  clearReplicationTask() {
    this.entityWizard.formArray.reset();
    for (let i = 0; i < this.entityWizard.formArray.controls.length; i++) {
      for (const item in this.entityWizard.formArray.controls[i].controls) {
        const itemConf = _.find(this.wizardConfig[i].fieldConfig, { name: item });
        if (itemConf.value !== undefined && item !== 'exist_replication') {
          this.entityWizard.formArray.controls[i].controls[item].setValue(itemConf.value);
        }
      }
    }
  }

  parsePickerTime(picker: string) {
    const spl = picker.split(' ');
    return {
      minute: spl[0],
      hour: spl[1],
      dom: spl[2],
      month: spl[3],
      dow: spl[4],
    };
  }

  async doCreate(data: any, item: string) {
    let payload: any;
    if (item === 'private_key') {
      payload = {
        name: data['name'] + ' Key',
        type: 'SSH_KEY_PAIR',
        attributes: data['sshkeypair'],
      };
      return this.ws.call(this.createCalls[item], [payload]).toPromise();
    }

    if (item === 'ssh_credentials') {
      item += '_' + data['setup_method'];
      if (data['setup_method'] == 'manual') {
        payload = {
          name: data['name'],
          type: 'SSH_CREDENTIALS',
          attributes: {
            cipher: data['cipher'],
            host: data['host'],
            port: data['port'],
            private_key: data['private_key'],
            remote_host_key: data['remote_host_key'],
            username: data['username'],
          },
        };
      } else {
        payload = {
          name: data['name'],
          private_key: data['private_key'],
          cipher: data['cipher'],
        };
        for (const i of this.semiSSHFieldGroup) {
          payload[i] = data[i];
        }
      }
      return this.ws.call((this.createCalls as any)[item], [payload]).toPromise();
    }

    if (item === 'periodic_snapshot_tasks') {
      this.existSnapshotTasks = [];
      const snapshotPromises: any[] = [];
      for (const dataset of data['source_datasets']) {
        payload = {
          dataset,
          recursive: data['recursive'],
          schedule: this.parsePickerTime(data['schedule_picker']),
          lifetime_value: 2,
          lifetime_unit: LifetimeUnit.Week,
          naming_schema: data['naming_schema'] ? data['naming_schema'] : this.defaultNamingSchema,
          enabled: true,
        };
        await this.isSnapshotTaskExist(payload).then(
          (res: any[]) => {
            if (res.length === 0) {
              snapshotPromises.push(this.ws.call((this.createCalls as any)[item], [payload]).toPromise());
            } else {
              this.existSnapshotTasks.push(...res.map((task) => task.id));
            }
          },
        );
      }
      return Promise.all(snapshotPromises);
    }

    if (item === 'snapshot') {
      const snapshotPromises = [];
      for (const dataset of data['source_datasets']) {
        payload = {
          dataset,
          naming_schema: data['naming_schema'] ? data['naming_schema'] : this.defaultNamingSchema,
          recursive: data['recursive'] ? data['recursive'] : false,
        };
        snapshotPromises.push(this.ws.call(this.createCalls[item], [payload]).toPromise());
      }
      return Promise.all(snapshotPromises);
    }

    if (item === 'replication') {
      payload = {
        name: data['name'],
        direction: data['source_datasets_from'] === DatasetSource.Remote ? Direction.Pull : Direction.Push,
        source_datasets: data['source_datasets'],
        target_dataset: data['target_dataset'],
        ssh_credentials: data['ssh_credentials_source'] || data['ssh_credentials_target'],
        transport: data['transport'] ? data['transport'] : TransportMode.Local,
        retention_policy: data['retention_policy'],
        recursive: data['recursive'],
        encryption: data['encryption'],
      };
      if (payload.encryption) {
        payload['encryption_key_format'] = data['encryption_key_format'];
        payload['encryption_key'] = data['encryption_key_format'] === EncryptionKeyFormat.Passphrase ? data['encryption_key_passphrase'] : (data['encryption_key_generate'] ? this.replicationService.generateEncryptionHexKey(64) : data['encryption_key_hex']);
        payload['encryption_key_location'] = data['encryption_key_location_truenasdb'] ? '$TrueNAS' : data['encryption_key_location'];
      }

      // schedule option
      if (data['schedule_method'] === ScheduleMethod.Cron) {
        payload['auto'] = true;
        if (payload['direction'] === Direction.Pull) {
          payload['schedule'] = this.parsePickerTime(data['schedule_picker']);
          payload['naming_schema'] = data['naming_schema'] ? [data['naming_schema']] : [this.defaultNamingSchema]; // default?
        } else {
          payload['periodic_snapshot_tasks'] = data['periodic_snapshot_tasks'];
        }
      } else {
        payload['auto'] = false;
        if (payload['direction'] === Direction.Pull) {
          payload['naming_schema'] = data['naming_schema'] ? [data['naming_schema']] : [this.defaultNamingSchema];
        } else {
          payload['also_include_naming_schema'] = data['naming_schema'] ? [data['naming_schema']] : [this.defaultNamingSchema];
        }
      }

      if (data['retention_policy'] === RetentionPolicy.Custom) {
        payload['lifetime_value'] = data['lifetime_value'];
        payload['lifetime_unit'] = data['lifetime_unit'];
      }

      if (payload['transport'] === TransportMode.Netcat) {
        payload['netcat_active_side'] = NetcatMode.Remote; // default?
      }

      payload['readonly'] = data['schedule_method'] === ScheduleMethod.Cron || data['readonly'] ? 'SET' : 'IGNORE';

      return this.ws.call('replication.target_unmatched_snapshots', [
        payload['direction'],
        payload['source_datasets'],
        payload['target_dataset'],
        payload['transport'],
        payload['ssh_credentials'],
      ]).toPromise().then(
        (res) => {
          let hasBadSnapshots = false;
          for (const ds in res) {
            if (res[ds].length > 0) {
              hasBadSnapshots = true;
              break;
            }
          }
          if (hasBadSnapshots) {
            return this.dialogService.confirm(
              helptext.clearSnapshotDialog_title,
              helptext.clearSnapshotDialog_content,
            ).toPromise().then(
              (dialog_res: any) => {
                payload['allow_from_scratch'] = dialog_res;
                return this.ws.call((this.createCalls as any)[item], [payload]).toPromise();
              },
            );
          }
          return this.ws.call((this.createCalls as any)[item], [payload]).toPromise();
        },
        (err) =>
        // show error ?
          this.ws.call((this.createCalls as any)[item], [payload]).toPromise(),

      );
    }
  }

  async customSubmit(value: any) {
    if (typeof (value.source_datasets) === 'string') {
      value.source_datasets = _.filter(value.source_datasets.split(',').map(_.trim));
    }
    this.loader.open();
    let toStop = false;

    const createdItems: any = {
      periodic_snapshot_tasks: null,
      snapshot: null,
      replication: null,
    };

    for (const item in createdItems) {
      if (!toStop) {
        if (!(item === 'periodic_snapshot_tasks' && (value['schedule_method'] !== ScheduleMethod.Cron || value['source_datasets_from'] !== DatasetSource.Local))
                && !(item === 'snapshot' && (this.eligibleSnapshots > 0 || value['source_datasets_from'] !== DatasetSource.Local))) {
          await this.doCreate(value, item).then(
            (res) => {
              if (item === 'snapshot') {
                createdItems[item] = res;
              } else {
                value[item] = res.id || res.map((snapshot: any) => snapshot.id);
                if (item === 'periodic_snapshot_tasks' && this.existSnapshotTasks.length !== 0) {
                  value[item].push(...this.existSnapshotTasks);
                }
                createdItems[item] = res.id || res.map((snapshot: any) => snapshot.id);
              }
            },
            (err) => {
              new EntityUtils().handleWSError(this, err, this.dialogService);
              toStop = true;
              this.rollBack(createdItems);
            },
          );
        }
      }
    }

    if (value['schedule_method'] === ScheduleMethod.Once && createdItems['replication'] != undefined) {
      await this.ws.call('replication.run', [createdItems['replication']]).toPromise().then(
        (res) => {
          this.dialogService.Info(T('Task started'), T('Replication <i>') + value['name'] + T('</i> has started.'), '500px', 'info', true);
        },
      );
    }

    this.loader.close();
    if (!toStop) {
      this.modalService.close('slide-in-form');
    }
  }

  async rollBack(items: any) {
    const keys = Object.keys(items).reverse();
    for (let i = 0; i < keys.length; i++) {
      if (items[keys[i]] != null) {
        await this.ws.call((this.deleteCalls as any)[keys[i]], [items[keys[i]]]).toPromise().then(
          (res) => {
            console.log('rollback ' + keys[i], res);
          },
        );
      }
    }
  }

  createSSHConnection(activedField: any) {
    const self = this;

    const conf: DialogFormConfiguration = {
      title: T('Create SSH Connection'),
      fieldConfig: this.dialogFieldConfig,
      saveButtonText: T('Create SSH Connection'),
      async customSubmit(entityDialog: EntityDialogComponent) {
        const value = entityDialog.formValue;
        let prerequisite = true;
        self.entityWizard.loader.open();

        if (value['private_key'] == 'NEW') {
          await self.replicationService.genSSHKeypair().then(
            (res) => {
              value['sshkeypair'] = res;
            },
            (err) => {
              prerequisite = false;
              new EntityUtils().handleWSError(self, err, self.dialogService);
            },
          );
        }
        if (value['setup_method'] == 'manual') {
          await self.getRemoteHostKey(value).then(
            (res) => {
              value['remote_host_key'] = res;
            },
            (err) => {
              prerequisite = false;
              new EntityUtils().handleWSError(self, err, self.dialogService);
            },
          );
        }

        if (!prerequisite) {
          self.entityWizard.loader.close();
          return;
        }
        const createdItems: any = {
          private_key: null,
          ssh_credentials: null,
        };
        let hasError = false;
        for (const item in createdItems) {
          if (!((item === 'private_key' && value['private_key'] !== 'NEW'))) {
            await self.doCreate(value, item).then(
              (res) => {
                value[item] = res.id;
                createdItems[item] = res.id;
                if (item === 'private_key') {
                  const privateKeyField = _.find(self.dialogFieldConfig, { name: 'private_key' });
                  privateKeyField.options.push({ label: res.name + ' (New Created)', value: res.id });
                }
                if (item === 'ssh_credentials') {
                  const ssh_credentials_source_field = _.find(self.wizardConfig[0].fieldConfig, { name: 'ssh_credentials_source' });
                  const ssh_credentials_target_field = _.find(self.wizardConfig[0].fieldConfig, { name: 'ssh_credentials_target' });
                  ssh_credentials_source_field.options.push({ label: res.name + ' (New Created)', value: res.id });
                  ssh_credentials_target_field.options.push({ label: res.name + ' (New Created)', value: res.id });
                  self.entityWizard.formArray.controls[0].controls[activedField].setValue(res.id);
                }
              },
              (err) => {
                hasError = true;
                self.rollBack(createdItems);
                new EntityUtils().handleWSError(self, err, self.dialogService, self.dialogFieldConfig);
              },
            );
          }
        }
        self.entityWizard.loader.close();
        if (!hasError) {
          entityDialog.dialogRef.close(true);
        }
      },
    };
    this.dialogService.dialogForm(conf, true);
  }

  getRemoteHostKey(value: any) {
    const payload = {
      host: value['host'],
      port: value['port'],
    };
    return this.ws.call('keychaincredential.remote_ssh_host_key_scan', [payload]).toPromise();
  }

  genTaskName() {
    const source = this.entityWizard.formArray.controls[0].controls['source_datasets'].value || [];
    const target = this.entityWizard.formArray.controls[0].controls['target_dataset'].value;
    let suggestName = '';
    if (source.length > 3) {
      suggestName = source[0] + ',...,' + source[source.length - 1] + ' - ' + target;
    } else {
      suggestName = source.join(',') + ' - ' + target;
    }
    this.entityWizard.formArray.controls[0].controls['name'].setValue(suggestName);
  }

  getSnapshots() {
    let transport = this.entityWizard.formArray.controls[0].controls['transport'].enabled ? this.entityWizard.formArray.controls[0].controls['transport'].value : TransportMode.Local;
    // count local snapshots if transport is SSH/SSH-NETCAT, and direction is PUSH
    if (this.entityWizard.formArray.controls[0].controls['ssh_credentials_target'].value) {
      transport = TransportMode.Local;
    }
    const payload = [
      this.entityWizard.formArray.controls[0].controls['source_datasets'].value || [],
      (this.entityWizard.formArray.controls[0].controls['naming_schema'].enabled && this.entityWizard.formArray.controls[0].controls['naming_schema'].value) ? this.entityWizard.formArray.controls[0].controls['naming_schema'].value.split(' ') : [this.defaultNamingSchema],
      transport,
      transport === TransportMode.Local ? null : this.entityWizard.formArray.controls[0].controls['ssh_credentials_source'].value,
    ];

    if (payload[0].length > 0) {
      this.ws.call('replication.count_eligible_manual_snapshots', payload).subscribe(
        (res) => {
          this.eligibleSnapshots = res.eligible;
          const isPush = this.entityWizard.formArray.controls[0].controls['source_datasets_from'].value === DatasetSource.Local;
          let spanClass = 'info-paragraph';
          let snapexpl = '';
          if (res.eligible === 0) {
            if (isPush) {
              snapexpl = 'Snapshots will be created automatically.';
            } else {
              spanClass = 'warning-paragraph';
            }
          }
          this.snapshotsCountField.paraText = `<span class="${spanClass}"><b>${res.eligible}</b> snapshots found. ${snapexpl}</span>`;
        },
        (err) => {
          this.eligibleSnapshots = 0;
          this.snapshotsCountField.paraText = '';
          new EntityUtils().handleWSError(this, err);
        },
      );
    } else {
      this.eligibleSnapshots = 0;
      this.snapshotsCountField.paraText = '';
    }
  }

  async isSnapshotTaskExist(payload: any) {
    return this.ws.call('pool.snapshottask.query', [[
      ['dataset', '=', payload['dataset']],
      ['schedule.minute', '=', payload['schedule']['minute']],
      ['schedule.hour', '=', payload['schedule']['hour']],
      ['schedule.dom', '=', payload['schedule']['dom']],
      ['schedule.month', '=', payload['schedule']['month']],
      ['schedule.dow', '=', payload['schedule']['dow']],
      ['naming_schema', '=', payload['naming_schema'] ? payload['naming_schema'] : this.defaultNamingSchema],
    ]]).toPromise();
  }
}
