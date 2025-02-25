import { Component } from '@angular/core';
import * as _ from 'lodash';

import { FieldConfig } from '../../common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import helptext from '../../../helptext/directoryservice/kerberosrealms-form-list';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
@Component({
  selector: 'app-group-form',
  template: '<entity-form [conf]="this"></entity-form>',
})
export class KerberosRealmsFormComponent {
  protected title: string;
  protected addCall = 'kerberos.realm.create';
  protected editCall = 'kerberos.realm.update';
  protected queryCall = 'kerberos.realm.query';
  protected pk: any;
  protected queryKey = 'id';
  protected isEntity = true;
  private getRow = new Subscription();
  protected isOneColumnForm = true;
  protected fieldConfig: FieldConfig[] = [];
  fieldSets: FieldSet[] = [
    {
      name: helptext.kerb_form_heading,
      class: 'heading',
      label: false,
      config: [
        {
          type: 'input',
          name: helptext.krbrealm_form_realm_name,
          placeholder: helptext.krbrealm_form_realm_placeholder,
          tooltip: helptext.krbrealm_form_realm_tooltip,
          required: true,
          validation: helptext.krbrealm_form_realm_validation,
        },
        {
          type: 'chip',
          name: helptext.krbrealm_form_kdc_name,
          placeholder: helptext.krbrealm_form_kdc_placeholder,
          tooltip: `${helptext.krbrealm_form_kdc_tooltip} ${helptext.multiple_values}`,
        },
        {
          type: 'chip',
          name: helptext.krbrealm_form_admin_server_name,
          placeholder: helptext.krbrealm_form_admin_server_placeholder,
          tooltip: `${helptext.krbrealm_form_admin_server_tooltip} ${helptext.multiple_values}`,
        },
        {
          type: 'chip',
          name: helptext.krbrealm_form_kpasswd_server_name,
          placeholder: helptext.krbrealm_form_kpasswd_server_placeholder,
          tooltip: `${helptext.krbrealm_form_kpasswd_server_tooltip} ${helptext.multiple_values}`,
        },
      ],
    },
  ];

  constructor(private modalService: ModalService) {
    this.getRow = this.modalService.getRow$.subscribe((rowId) => {
      this.pk = rowId;
      this.getRow.unsubscribe();
    });
  }

  afterInit(entityEdit: any) {
    this.title = entityEdit.isNew ? helptext.title_add : helptext.title_edit;
  }

  afterSubmit() {
    this.modalService.refreshTable();
  }
}
