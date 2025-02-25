import { Injectable } from '@angular/core';
import { FailoverDisabledReason } from 'app/enums/failover-disabled-reason.enum';
import { BaseService } from './base.service';
import { CoreEvent } from './core.service';
import helptext from '../../helptext/topbar';

interface InfoObject {
  version: string; // "TrueNAS-12.0-MASTER-202003160424"
  buildtime: any; // {$date: 1584373672000}
  hostname: string; // "truenas.local"
  physmem: number; // 8445599744
  model: string; // "Intel(R) Core(TM) i3-2100T CPU @ 2.50GHz"
  cores: number; // 4
  loadavg: number[]; // [0.15380859375, 0.24169921875, 0.22900390625]
  uptime: string; // "4:25PM  up 7 days, 37 mins"
  uptime_seconds: number; // 607039.9912204742
  system_serial: string;
  system_product: string;
  license: any;
  boottime: any; // {$date: 1584373672000}
  datetime: any; // {$date: 1585005911991}
  timezone: string; // "America/Los_Angeles"
  system_manufacturer: string; // null
  ecc_memory: boolean; // false
}

interface HAStatus {
  status: string;
  reasons?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SystemProfileService extends BaseService {
  cache: any;
  private buffer: CoreEvent[] = [];
  private emulateHardware?: InfoObject;
  private mini: InfoObject = {
    version: 'TrueNAS-12.0-MASTER-202003160424',
    buildtime: { $date: 1584373672000 },
    hostname: 'truenas.local',
    physmem: 8445599744,
    model: 'Intel(R) Core(TM) i3-2100T CPU @ 2.50GHz',
    cores: 4,
    loadavg: [0.15380859375, 0.24169921875, 0.22900390625],
    uptime: '4:25PM  up 7 days, 37 mins',
    uptime_seconds: 607039.9912204742,
    system_serial: '123456789',
    system_product: 'FREENAS-MINI-3.0',
    license: { model: 'FREENAS-MINI-3.0' },
    boottime: { $date: 1584373672000 },
    datetime: { $date: 1585005911991 },
    timezone: 'America/Los_Angeles',
    system_manufacturer: 'ixsystems',
    ecc_memory: true,
  };

  private ha_status: HAStatus;

  features = {
    HA: false,
    enclosure: false,
  };

  constructor() {
    super();

    this.core.register({
      observerClass: this,
      eventName: 'SysInfoRequest',
    }).subscribe((evt: CoreEvent) => {
      const ready = this.dataAvailable(evt);
      if (ready) {
        this.respond({ name: 'SysInfoRequest', sender: this });
      }
    });

    this.core.register({
      observerClass: this,
      eventName: 'HAStatusRequest',
    }).subscribe((evt: CoreEvent) => {
      if (this.cache && this.features.HA) {
        // This is a TrueNAS box with HA support
        if (this.ha_status && this.ha_status.status.length > 0) {
          this.core.emit({ name: 'HA_Status', data: this.ha_status, sender: this });
        }
      }
    });

    // HA Status change events
    this.websocket.subscribe('failover.disabled_reasons').subscribe((res) => {
      this.updateHA(res.fields.disabled_reasons);
    });
  }

  protected onAuthenticated(evt: CoreEvent) {
    this.authenticated = true;
  }

  private dataAvailable(evt: CoreEvent) {
    if (this.cache && this.authenticated) {
      return true;
    } if (!this.cache && this.authenticated) {
      if (this.buffer.length == 0) {
        this.fetchProfile();
      }
      this.buffer.push(evt);
      return false;
    } if (!this.authenticated) {
      return false;
    }
  }

  fetchProfile(localOnly?: boolean) {
    this.websocket.call('system.info').subscribe((res) => {
      this.cache = res;
      if (localOnly) {
        this.buffer.push({ name: 'SysInfoRequest', sender: this });
        return;
      }

      if (this.buffer.length > 0) {
        this.clearBuffer();
      }
    });
  }

  clearBuffer() {
    this.buffer.forEach((evt) => {
      this.respond(evt);
    });
  }

  respond(evt: CoreEvent) {
    let data;
    let responseEvent;
    switch (evt.name) {
      case 'SysInfoRequest':
        data = this.cache;
        responseEvent = 'SysInfo';
        break;
    }
    data.features = this.detectFeatures(data);
    this.core.emit({ name: responseEvent, data, sender: this });
  }

  detectFeatures(_profile: any) {
    // ENCLOSURE SUPPORT
    const profile = { ..._profile };

    if (!profile.system_product) {
      // Stick with defaults if value is null
      return this.features;
    }

    if (profile.system_product.includes('FREENAS-MINI-3.0') || profile.system_product.includes('TRUENAS-')) {
      this.features.enclosure = true;
    }

    // HIGH AVAILABILITY SUPPORT
    if ((profile.license && profile.license.system_serial_ha) || profile.system_product == 'BHYVE') {
      this.features.HA = true;

      // HA Status Change Call
      this.websocket.call<FailoverDisabledReason[]>('failover.disabled_reasons').subscribe((res) => {
        this.updateHA(res);
      });
    }

    return this.features;
  }

  updateHA(res: FailoverDisabledReason[]) {
    const ha_enabled = res.length == 0;
    const ha_status_text = res.length == 0 ? helptext.ha_status_text_enabled : helptext.ha_status_text_disabled;

    const enabled_txt = res.length == 0 ? 'HA Enabled' : 'HA Disabled';

    window.sessionStorage.setItem('ha_status', ha_enabled.toString());
    this.ha_status = { status: enabled_txt, reasons: res };
    this.core.emit({ name: 'HA_Status', data: this.ha_status, sender: this });
  }
}
