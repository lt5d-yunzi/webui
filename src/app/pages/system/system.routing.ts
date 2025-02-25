import { ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdvancedSettingsComponent } from './advanced';
import { BootEnvironmentCloneComponent } from './bootenv/bootenv-clone';
import { BootEnvironmentRenameComponent } from './bootenv/bootenv-rename';
import { BootEnvironmentCreateComponent } from './bootenv/bootenv-create';
import { BootStatusListComponent } from './bootenv/bootenv-status';
import { BootEnvironmentListComponent } from './bootenv/bootenv-list';
import { BootEnvAttachFormComponent } from './bootenv/bootenv-attach';
import { BootEnvReplaceFormComponent } from './bootenv/bootenv-replace';
import { TunableFormComponent } from './tunable/tunable-form';
import { TunableListComponent } from './tunable/tunable-list';
import { UpdateComponent } from './update';
import { ManualUpdateComponent } from './update/manualupdate';
import { AlertServiceListComponent } from './alertservice/alertservice-list';
import { SupportComponent } from './general-settings/support/support.component';
import { EmailComponent } from './email';
import { AlertServiceComponent } from './alertservice/alert-service/alert-service.component';
import { AlertConfigComponent } from './alert/alert.component';
import { FailoverComponent } from './failover/failover.component';
import { EulaComponent } from './general-settings/support/eula/eula.component';
import { T } from '../../translate-marker';
import { TwoFactorComponent } from './two-factor/two-factor.component';
import { GeneralSettingsComponent } from './general-settings/general-settings.component';
import { Services } from '../services/services.component';
import { ShellComponent } from '../shell/shell.component';
import { CronFormComponent } from './advanced/cron/cron-form/cron-form.component';
import { CronListComponent } from './advanced/cron/cron-list/cron-list.component';
import { InitshutdownFormComponent } from './advanced/initshutdown/initshutdown-form/initshutdown-form.component';
import { InitshutdownListComponent } from './advanced/initshutdown/initshutdown-list/initshutdown-list.component';
import { ViewEnclosureComponent } from './viewenclosure';

export const routes: Routes = [
  {
    path: '',
    data: { title: T('System') },
    children: [{
      path: 'general',
      data: { title: T('General'), breadcrumb: T('General'), icon: 'build' },
      children: [{
        path: '',
        component: GeneralSettingsComponent,
        data: { title: T('General'), breadcrumb: T('General') },
      }],
    }, {
      path: 'advanced',
      component: AdvancedSettingsComponent,
      data: { title: T('Advanced'), breadcrumb: T('Advanced'), icon: 'settings' },
    }, {
      path: 'viewenclosure',
      component: ViewEnclosureComponent,
      data: { title: T('View Enclosure'), breadcrumb: T('View Enclosure'), icon: 'settings' },
    }, {
      path: 'boot',
      data: { title: T('Boot'), breadcrumb: T('Boot'), icon: 'replay' },
      children: [{
        path: '',
        component: BootEnvironmentListComponent,
        data: { title: T('Boot Environments'), breadcrumb: T('Boot Environments') },
      }, {
        path: 'clone/:pk',
        component: BootEnvironmentCloneComponent,
        data: { title: T('Clone'), breadcrumb: T('Clone') },
      },
      {
        path: 'rename/:pk',
        component: BootEnvironmentRenameComponent,
        data: { title: T('Rename'), breadcrumb: T('Rename') },
      },
      {
        path: 'create',
        component: BootEnvironmentCreateComponent,
        data: { title: T('Add'), breadcrumb: T('Add') },
      },
      {
        path: 'status',
        component: BootStatusListComponent,
        data: { title: T('Status'), breadcrumb: T('Status') },
      },
      {
        path: 'attach/:pk',
        component: BootEnvAttachFormComponent,
        data: { title: T('Attach'), breadcrumb: ('Attach') },
      },
      {
        path: 'replace/:pk',
        component: BootEnvReplaceFormComponent,
        data: { title: T('Replace'), breadcrumb: T('Replace') },
      },
      ],
    }, {
      path: 'tunable',
      data: { title: T('Tunables'), breadcrumb: T('Tunables'), icon: 'settings_overscan' },
      children: [{
        path: '',
        component: TunableListComponent,
        data: { title: T('Tunables'), breadcrumb: T('Tunables') },
      }, {
        path: 'add',
        component: TunableFormComponent,
        data: { title: T('Add'), breadcrumb: T('Add') },
      },
      {
        path: 'edit/:pk',
        component: TunableFormComponent,
        data: { title: T('Edit'), breadcrumb: T('Edit') },
      },
      ],
    }, {
      path: 'sysctl',
      data: { title: T('Sysctl'), breadcrumb: T('Sysctl'), icon: 'settings_overscan' },
      children: [{
        path: '',
        component: TunableListComponent,
        data: { title: T('Sysctl'), breadcrumb: T('Sysctl') },
      }, {
        path: 'add',
        component: TunableFormComponent,
        data: { title: T('Add'), breadcrumb: T('Add') },
      },
      {
        path: 'edit/:pk',
        component: TunableFormComponent,
        data: { title: T('Edit'), breadcrumb: T('Edit') },
      },
      ],
    },
    {
      path: 'update',
      data: { title: T('Update'), breadcrumb: T('Update'), icon: 'update' },
      children: [
        {
          path: '',
          component: UpdateComponent,
          data: { title: T('Update'), breadcrumb: T('Update') },
        },
        {
          path: 'manualupdate',
          data: { title: T('Manual Update'), breadcrumb: T('Manual Update') },
          children: [
            {
              path: '',
              component: ManualUpdateComponent,
              data: { title: T('Manual Update'), breadcrumb: T('Manual Update') },
            },
          ],
        },
      ],
    },
    {
      path: 'email',
      component: EmailComponent,
      data: { title: T('Email'), breadcrumb: T('Email'), icon: 'email' },
    },
    {
      path: 'alertsettings',
      component: AlertConfigComponent,
      data: { title: T('Alert Settings'), breadcrumb: T('Alert Settings'), icon: 'notifications_active' },
    },
    {
      path: 'alertservice',
      data: { title: T('Alert Services'), breadcrumb: T('Alert Services'), icon: 'notifications' },
      children: [{
        path: '',
        component: AlertServiceListComponent,
        data: { title: T('Alert Services'), breadcrumb: T('Alert Services') },
      }, {
        path: 'add',
        component: AlertServiceComponent,
        data: { title: T('Add Alert Service'), breadcrumb: T('Add Alert Service') },
      }, {
        path: 'edit/:pk',
        component: AlertServiceComponent,
        data: { title: T('Edit Alert Service'), breadcrumb: T('Edit Alert Service') },
      },
      ],
    }, {
      path: 'failover',
      component: FailoverComponent,
      data: { title: T('Failover'), breadcrumb: T('Failover'), icon: 'device_hub' },
    },
    {
      path: 'support',
      data: { title: T('Support'), breadcrumb: T('Support'), icon: 'perm_phone_msg' },
      children: [
        {
          path: '',
          component: SupportComponent,
          data: { title: T('Support'), breadcrumb: T('Support') },
        },
        {
          path: 'eula',
          component: EulaComponent,
          data: { title: T('EULA'), breadcrumb: T('EULA') },
        },
      ],
    },
    {
      path: 'two-factor',
      component: TwoFactorComponent,
      data: { title: T('Two-Factor Auth'), breadcrumb: T('Two-Factor Auth') },
    },
    {
      path: 'services',
      component: Services,
      data: { title: T('Services'), breadcrumb: T('Services') },
    },
    {
      path: 'shell',
      component: ShellComponent,
      data: { title: T('Shell'), breadcrumb: T('Shell') },
    },
    {
      path: 'cron',
      data: { title: 'Cron Jobs', breadcrumb: 'Cron Jobs', icon: 'event_note' },
      children: [{
        path: '',
        component: CronListComponent,
        data: { title: 'Cron Jobs', breadcrumb: 'Cron Jobs' },
      }, {
        path: 'add',
        component: CronFormComponent,
        data: { title: 'Add', breadcrumb: 'Add' },
      }, {
        path: 'edit/:pk',
        component: CronFormComponent,
        data: { title: 'Edit', breadcrumb: 'Edit' },
      }],
    }, {
      path: 'initshutdown',
      data: { title: 'Init/Shutdown Scripts', breadcrumb: 'Init/Shutdown Scripts', icon: 'event_note' },
      children: [{
        path: '',
        component: InitshutdownListComponent,
        data: { title: 'Init/Shutdown Scripts', breadcrumb: 'Init/Shutdown Scripts' },
      }, {
        path: 'add',
        component: InitshutdownFormComponent,
        data: { title: 'Add', breadcrumb: 'Add' },
      }, {
        path: 'edit/:pk',
        component: InitshutdownFormComponent,
        data: { title: 'Edit', breadcrumb: 'Edit' },
      }],
    },
    ],
  },
];
export const routing: ModuleWithProviders<RouterModule> = RouterModule.forChild(routes);
