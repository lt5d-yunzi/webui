import { Component, OnDestroy } from '@angular/core';
import { helptext_system_general as helptext } from 'app/helptext/system/general';
import { Option } from 'app/interfaces/option.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import {
  DialogService, LanguageService, SystemGeneralService, WebSocketService,
} from '../../../../services';
import { ModalService } from '../../../../services/modal.service';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { LocaleService } from 'app/services/locale.service';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';
import { EntityUtils } from '../../../common/entity/utils';

@Component({
  selector: 'app-localization-form',
  template: '<entity-form [conf]="this"></entity-form>',
  providers: [],
})
export class LocalizationFormComponent implements OnDestroy {
  protected queryCall = 'none';
  protected updateCall = 'system.general.update';
  sortLanguagesByName = true;
  languageList: any = [];
  languageKey: string;
  private dateTimeChangeSubscription: Subscription;
  private getDataFromDash: Subscription;
  title = helptext.localeTitle;
  protected isOneColumnForm = true;
  fieldConfig: FieldConfig[] = [];

  fieldSets: FieldSet[] = [
    {
      name: helptext.stg_fieldset_loc,
      label: true,
      config: [
        {
          type: 'combobox',
          name: 'language',
          placeholder: helptext.stg_language.placeholder,
          tooltip: helptext.stg_language.tooltip,
          options: [],
        },
        {
          type: 'select',
          name: 'kbdmap',
          placeholder: helptext.stg_kbdmap.placeholder,
          tooltip: helptext.stg_kbdmap.tooltip,
          options: [{ label: '---', value: null }],
        },
        {
          type: 'combobox',
          name: 'timezone',
          placeholder: helptext.stg_timezone.placeholder,
          tooltip: helptext.stg_timezone.tooltip,
          options: [{ label: '---', value: null }],
        },
        {
          type: 'select',
          name: 'date_format',
          placeholder: helptext.date_format.placeholder,
          tooltip: helptext.date_format.tooltip,
          options: [],
          isLoading: true,
        },
        {
          type: 'select',
          name: 'time_format',
          placeholder: helptext.time_format.placeholder,
          tooltip: helptext.time_format.tooltip,
          options: [],
          isLoading: true,
        },
      ],
    },
  ];

  private entityForm: any;
  private configData: any;

  constructor(
    protected language: LanguageService,
    protected ws: WebSocketService,
    protected dialog: DialogService,
    protected loader: AppLoaderService,
    private sysGeneralService: SystemGeneralService,
    public localeService: LocaleService,
    private modalService: ModalService,
  ) {
    this.getDataFromDash = this.sysGeneralService.sendConfigData$.subscribe((res) => {
      this.configData = res;
    });
  }

  afterInit(entityEdit: any) {
    this.entityForm = entityEdit;
    this.setTimeOptions(this.configData.timezone);
    this.makeLanguageList();

    this.sysGeneralService.kbdMapChoices().subscribe((mapChoices) => {
      this.fieldSets
        .find((set) => set.name === helptext.stg_fieldset_loc)
        .config.find((config) => config.name === 'kbdmap').options = mapChoices;
      this.entityForm.formGroup.controls['kbdmap'].setValue(this.configData.kbdmap);
    });

    this.sysGeneralService.timezoneChoices().subscribe((tzChoices) => {
      tzChoices = _.sortBy(tzChoices, [function (o) { return o.label.toLowerCase(); }]);
      this.fieldSets
        .find((set) => set.name === helptext.stg_fieldset_loc)
        .config.find((config) => config.name === 'timezone').options = tzChoices;
      this.entityForm.formGroup.controls['timezone'].setValue(this.configData.timezone);
    });

    this.getDateTimeFormats();
    this.dateTimeChangeSubscription = this.localeService.dateTimeFormatChange$.subscribe(() => {
      this.getDateTimeFormats();
    });

    entityEdit.formGroup.controls['language'].valueChanges.subscribe((res: any) => {
      this.languageKey = this.getKeyByValue(this.languageList, res);
      if (this.languageList[res]) {
        entityEdit.formGroup.controls['language'].setValue(`${this.languageList[res]}`);
      }
    });
  }

  setTimeOptions(tz: string) {
    const timeOptions = this.localeService.getTimeFormatOptions(tz);
    this.fieldSets
      .find((set) => set.name === helptext.stg_fieldset_loc)
      .config.find((config) => config.name === 'time_format').options = timeOptions;

    const dateOptions = this.localeService.getDateFormatOptions(tz);
    this.fieldSets
      .find((set) => set.name === helptext.stg_fieldset_loc)
      .config.find((config) => config.name === 'date_format').options = dateOptions;
  }

  getDateTimeFormats() {
    this.entityForm.formGroup.controls['date_format'].setValue(this.localeService.getPreferredDateFormat());
    _.find(this.fieldConfig, { name: 'date_format' })['isLoading'] = false;
    this.entityForm.formGroup.controls['time_format'].setValue(this.localeService.getPreferredTimeFormat());
    _.find(this.fieldConfig, { name: 'time_format' })['isLoading'] = false;
  }

  makeLanguageList() {
    this.sysGeneralService.languageChoices().subscribe((res) => {
      this.languageList = res;
      const options: Option[] = Object.keys(this.languageList || {}).map((key) => ({
        label: this.sortLanguagesByName
          ? `${this.languageList[key]} (${key})`
          : `${key} (${this.languageList[key]})`,
        value: key,
      }));
      this.fieldSets
        .find((set) => set.name === helptext.stg_fieldset_loc)
        .config.find((config) => config.name === 'language').options = _.sortBy(
          options,
          this.sortLanguagesByName ? 'label' : 'value',
        );
      this.entityForm.formGroup.controls['language'].setValue(this.configData.language);
    });
  }

  beforeSubmit(value: any) {
    value.language = this.languageKey;
  }

  afterSubmit(value: any) {
    this.setTimeOptions(value.timezone);
    this.language.setLang(value.language);
  }

  customSubmit(body: any) {
    this.localeService.saveDateTimeFormat(body.date_format, body.time_format);
    delete body.date_format;
    delete body.time_format;
    this.loader.open();
    return this.ws.call('system.general.update', [body]).subscribe(() => {
      this.sysGeneralService.refreshSysGeneral();
      this.loader.close();
      this.entityForm.success = true;
      this.entityForm.formGroup.markAsPristine();
      this.modalService.close('slide-in-form');
      this.afterSubmit(body);
    }, (res) => {
      this.loader.close();
      this.modalService.close('slide-in-form');
      new EntityUtils().handleWSError(this.entityForm, res);
    });
  }

  getKeyByValue(object: any, value: any) {
    return Object.keys(object).find((key) => object[key] === value);
  }

  ngOnDestroy() {
    this.dateTimeChangeSubscription.unsubscribe();
    this.getDataFromDash.unsubscribe();
  }
}
