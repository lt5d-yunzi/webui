import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  WebSocketService, KeychainCredentialService, AppLoaderService,
  DialogService, ReplicationService, StorageService, CloudCredentialService,
} from 'app/services';
import { ModalService } from '../../../services/modal.service';
import { SshConnectionsFormComponent } from './forms/ssh-connections-form.component';
import { SshKeypairsFormComponent } from './forms/ssh-keypairs-form.component';
import { CloudCredentialsFormComponent } from './forms/cloud-credentials-form.component';
import { Subscription } from 'rxjs';
import { T } from '../../../translate-marker';

@Component({
  selector: 'app-backup-credentials',
  templateUrl: './backup-credentials.component.html',
  providers: [KeychainCredentialService, ReplicationService, CloudCredentialService],
})
export class BackupCredentialsComponent implements OnInit, OnDestroy {
  cards: any;
  refreshTable: Subscription;
  refreshForm: Subscription;
  getProviders: Subscription;

  // Components included in this dashboard
  protected sshConnections: SshConnectionsFormComponent;
  protected sshKeypairs: SshKeypairsFormComponent;
  protected cloudCredentials: CloudCredentialsFormComponent;
  protected providers: any[];

  constructor(private aroute: ActivatedRoute, private keychainCredentialService: KeychainCredentialService,
    private ws: WebSocketService, private loader: AppLoaderService, private dialogService: DialogService,
    private replicationService: ReplicationService, private storage: StorageService,
    private cloudCredentialsService: CloudCredentialService, private router: Router,
    private modalService: ModalService) {}

  ngOnInit(): void {
    this.refreshTable = this.modalService.refreshTable$.subscribe(() => {
      this.getCards();
    });
    this.refreshForms();
    this.refreshForm = this.modalService.refreshForm$.subscribe(() => {
      this.refreshForms();
    });

    this.getProviders = this.cloudCredentialsService.getProviders().subscribe(
      (res) => {
        this.providers = res;
        this.getCards();
      },
    );
  }

  getCards() {
    this.cards = [
      {
        name: 'cloudCredentials',
        flex: 40,
        tableConf: {
          title: 'Cloud Credentials',
          queryCall: 'cloudsync.credentials.query',
          deleteCall: 'cloudsync.credentials.delete',
          name: 'cloudCreds',
          columns: [
            { name: T('Name'), prop: 'name' },
            { name: T('Provider'), prop: 'provider' },
          ],
          hideHeader: false,
          parent: this,
          add() {
            this.parent.modalService.open('slide-in-form', this.parent.cloudCredentials);
          },
          edit(row: any) {
            this.parent.modalService.open('slide-in-form', this.parent.cloudCredentials, row.id);
          },
          dataSourceHelper: this.cloudCredentialsDataSourceHelper.bind(this),
        },
      }, {
        name: 'sshConnections',
        flex: 30,
        tableConf: {
          title: 'SSH Connections',
          queryCall: 'keychaincredential.query',
          deleteCall: 'keychaincredential.delete',
          name: 'sshConnections',
          dataSourceHelper: this.sshConnectionsDataSourceHelper,
          columns: [
            { name: T('Name'), prop: 'name' },
          ],
          hideHeader: true,
          parent: this,
          add() {
            this.parent.modalService.open('slide-in-form', this.parent.sshConnections);
          },
          edit(row: any) {
            this.parent.modalService.open('slide-in-form', this.parent.sshConnections, row.id);
          },
        },
      }, {
        name: 'sshKeypairs',
        flex: 30,
        tableConf: {
          title: 'SSH Keypairs',
          queryCall: 'keychaincredential.query',
          deleteCall: 'keychaincredential.delete',
          name: 'sshKeypairs',
          getActions: this.sshKeyPairActions.bind(this),
          dataSourceHelper: this.sshKeyPairsDataSourceHelper,
          columns: [
            { name: T('Name'), prop: 'name' },
          ],
          hideHeader: true,
          parent: this,
          add() {
            this.parent.modalService.open('slide-in-form', this.parent.sshKeypairs);
          },
          edit(row: any) {
            this.parent.modalService.open('slide-in-form', this.parent.sshKeypairs, row.id);
          },
        },
      },
    ];
  }

  cloudCredentialsDataSourceHelper(res: any[]) {
    return res.map((item) => {
      if (this.providers) {
        const credentialProvider = this.providers.find((provider) => provider.name == item.provider);
        if (credentialProvider) {
          item.provider = credentialProvider.title;
        }
      }
      return item;
    });
  }

  sshConnectionsDataSourceHelper(res: any[]) {
    return res.filter((item) => item.type === 'SSH_CREDENTIALS');
  }

  sshKeyPairsDataSourceHelper(res: any[]) {
    return res.filter((item) => item.type === 'SSH_KEY_PAIR');
  }

  sshKeyPairActions() {
    return [{
      icon: 'save_alt',
      name: 'download',
      onClick: (rowinner: any) => {
        console.log(rowinner);
        const name = rowinner.name;
        for (const key_type in rowinner.attributes) {
          const key = rowinner.attributes[key_type];
          const filename = name + '_' + key_type + '_rsa';
          const blob = new Blob([key], { type: 'text/plain' });
          this.storage.downloadBlob(blob, filename);
        }
        event.stopPropagation();
      },
    }];
  }

  refreshForms() {
    this.sshConnections = new SshConnectionsFormComponent(this.aroute, this.keychainCredentialService,
      this.ws, this.loader, this.dialogService, this.replicationService, this.modalService);
    this.sshKeypairs = new SshKeypairsFormComponent(this.aroute, this.ws, this.loader,
      this.dialogService, this.storage, this.modalService);
    this.cloudCredentials = new CloudCredentialsFormComponent(this.router, this.aroute, this.ws,
      this.cloudCredentialsService, this.dialogService, this.replicationService, this.modalService);
  }

  ngOnDestroy() {
    this.refreshTable.unsubscribe();
    this.refreshForm.unsubscribe();

    if (this.getProviders) {
      this.getProviders.unsubscribe();
    }
  }
}
