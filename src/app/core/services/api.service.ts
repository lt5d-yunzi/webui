import { Injectable, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { WebSocketService } from '../../services/ws.service';
import { RestService } from '../../services/rest.service';
import { CoreService, CoreEvent } from './core.service';
import { DialogService } from '../../services';
// import { DataService } from './data.service';

export interface ApiCall {
  namespace: string; // namespace for ws and path for rest
  args?: any;
  operation?: string; // DEPRECATED - Used for REST calls only
  responseEvent?: any;// The event name of the response this service will send
  errorResponseEvent?: any;// The event name of the response this service will send in case it fails
}

interface ApiDefinition {
  apiCall: ApiCall;
  preProcessor?: (def: ApiCall) => ApiCall;
  postProcessor?: (res: ApiCall, callArgs: any) => ApiCall;
}

@Injectable()
export class ApiService {
  debug = false;

  private apiDefinitions = {
    UserAttributesRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'user.query',
        args: [] as any[], // eg. [["id", "=", "foo"]]
        responseEvent: 'UserAttributes',
      },
      preProcessor(def: ApiCall) {
        const clone = { ...def };
        clone.args = [[['id', '=', 1]]];
        return clone;
      },
      postProcessor(res: any) {
        const cloneRes = { ...res };
        return cloneRes[0].attributes;
      },
    },
    UserDataRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'user.query',
        args: [] as any[], // eg. [["id", "=", "foo"]]
        responseEvent: 'UserData',
      },
      preProcessor(def: ApiCall) {
        // console.log("API SERVICE: USER DATA REQUESTED");
        return def;
      },
    },
    UserDataUpdate: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'user.set_attribute',
        args: [] as any[],
      },
      preProcessor(def: ApiCall) {
        const uid = 1;
        const redef = { ...def };
        redef.args = [uid, 'preferences', def.args];
        return redef;
      },
      postProcessor(res: any, callArgs: any, core: any) {
        const cloneRes = { ...res };
        if (res == 1) {
          core.emit({ name: 'UserDataRequest', data: [[['id', '=', 1]]] });
        }
        return cloneRes;
      },
    },
    VolumeDataRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'pool.dataset.query',
        args: [] as any[],
        responseEvent: 'VolumeData',
      },
      preProcessor(def: ApiCall) {
        const queryFilters = [
          ['name', '~', '^[^\/]+$'], // Root datasets only
        ];

        return { args: [queryFilters], ...def };
      },
    },
    DisksRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'disk.query',
        responseEvent: 'DisksData',
      },
    },
    MultipathRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'multipath.query',
        responseEvent: 'MultipathData',
      },
    },
    EnclosureDataRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'enclosure.query',
        responseEvent: 'EnclosureData',
      },
    },
    EnclosureUpdate: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'enclosure.update',
        responseEvent: 'EnclosureChanged',
      },
    },
    SetEnclosureLabel: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'enclosure.update',
        responseEvent: 'EnclosureLabelChanged',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        const args = [def.args.id, { label: def.args.label }];
        redef.args = args;
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        return { label: res.label, index: callArgs.index, id: res.id };
      },
    },
    SetEnclosureSlotStatus: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'enclosure.set_slot_status',
        responseEvent: 'EnclosureSlotStatusChanged',
      },
    },
    PoolDataRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        args: [] as any[],
        namespace: 'pool.query',
        responseEvent: 'PoolData',
      },
    },
    PoolDisksRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'pool.get_disks',
        args: [] as any[],
        responseEvent: 'PoolDisks',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        redef.responseEvent = def.args.length > 0 ? def.responseEvent + def.args.join() : def.responseEvent;
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { callArgs, data: res };
        return cloneRes;
      },
    },
    PrimaryNicInfoRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'interface.websocket_interface',
        args: [] as any[],
        responseEvent: 'PrimaryNicInfo',
      },
    },
    NicInfoRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'interface.query',
        args: [] as any[],
        responseEvent: 'NicInfo',
      },
    },
    NetInfoRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'network.general.summary',
        args: [] as any[],
        responseEvent: 'NetInfo',
      },
    },
    UpdateCheck: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'update.check_available',
        args: [] as any[],
        responseEvent: 'UpdateChecked',
      },
    },
    VmProfilesRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0', // Middleware returns device info but no status
        namespace: 'vm.query',
        args: [] as any[],
        responseEvent: 'VmProfiles',
      },
    },
    VmProfileRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'vm.query',
        args: [] as any[], // eg. [["id", "=", "foo"]]
        responseEvent: 'VmProfile',
      },
    },
    VmProfileUpdate: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'vm.update',
        args: [] as any[], // eg. [25, {"name": "Fedora", "description": "Linux", "vcpus": 1, "memory": 2048, "bootloader": "UEFI", "autostart": true}]
        responseEvent: 'VmProfileRequest',
      },
      postProcessor(res: any) {
        // DEBUG: console.log(res);
        let cloneRes = { ...res };
        cloneRes = [[['id', '=', res]]];// eg. [["id", "=", "foo"]]
        return cloneRes;
      },
    },
    VmStatusRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'vm.query',
        args: [] as any[], // eg. [["id", "=", "foo"]]
        responseEvent: 'VmStatus',
      },
      postProcessor(res: any) {
        const cloneRes = [];
        for (const vmstatus of res) {
          cloneRes.push({ id: vmstatus.id, state: vmstatus.status.state });
        }
        return cloneRes;
      },
    },
    VmStart: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'vm.start',
        args: [] as any,
        responseEvent: 'VmProfiles',
        errorResponseEvent: 'VmStartFailure',
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { id: callArgs[0], state: res }; // res:boolean
        return cloneRes;
      },
    },
    VmRestart: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'vm.restart',
        args: [] as any,
        responseEvent: 'VmProfiles',
        errorResponseEvent: 'VmStartFailure',
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { id: callArgs[0], state: res }; // res:boolean
        return cloneRes;
      },
    },
    VmStop: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'vm.stop',
        args: [] as any,
        responseEvent: 'VmProfiles',
        errorResponseEvent: 'VmStopFailure',
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { id: callArgs[0] }; // res:boolean
        return cloneRes;
      },
    },
    VmPowerOff: {
      apiCall: {
        protocol: 'websocket',
        version: '2',
        namespace: 'vm.stop',
        args: [] as any,
        responseEvent: 'VmProfiles',
        errorResponseEvent: 'VmStopFailure',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        redef.args.push(true);
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { id: callArgs[0] }; // res:boolean
        return cloneRes;
      },
    },
    VmCreate: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'vm.create',
        args: [] as any,
        responseEvent: 'VmProfiles',
      },
    },
    VmClone: {
      apiCall: {
        protocol: 'websocket',
        version: '2',
        namespace: 'vm.clone',
        args: [] as any,
        responseEvent: 'VmProfiles',
        errorResponseEvent: 'VmCloneFailure',
      },
      postProcessor(res: any) {
        let cloneRes = { ...res };
        cloneRes = null;
        return cloneRes;
      },
    },
    VmDelete: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'vm.delete',
        args: [] as any,
        errorResponseEvent: 'VmDeleteFailure',
        responseEvent: 'VmProfiles',
      },
    },
    // Used by stats service!!
    StatsRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2',
        namespace: 'stats.get_data',
        args: {},
        responseEvent: 'StatsData',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        redef.responseEvent = 'Stats' + def.args.responseEvent;
        redef.args = def.args.args;
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        const cloneRes = { ...res };
        const legend = res.meta.legend;
        const l = [];
        for (const i in legend) {
          if (callArgs.legendPrefix) {
            const spl = legend[i].split(callArgs.legendPrefix);
            l.push(spl[1]);
          } else {
            l.push(legend[i]);
          }
        }
        cloneRes.meta.legend = l;
        return cloneRes;
      },
    },
    // Used by stats service!!
    StatsSourcesRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'stats.get_sources',
        args: [] as any,
        responseEvent: 'StatsSources',
      },
    },
    ReportingGraphsRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2',
        namespace: 'reporting.graphs',
        args: [] as any,
        responseEvent: 'ReportingGraphs',
      },
    },
    StatsCpuRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'stats.get_data',
        args: [] as any,
        responseEvent: 'StatsData',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        // Do some stuff here
        const dataList = [];
        const oldDataList = redef.args[0];
        const options = redef.args[1];

        for (const i in oldDataList) {
          dataList.push({
            source: 'aggregation-cpu-sum',
            type: 'cpu-' + oldDataList[i],
            dataset: 'value',
          });
        }

        redef.args = [dataList, options];
        redef.responseEvent = 'StatsCpuData';
        return redef;
      },
      postProcessor(res: any) {
        const cloneRes = { ...res };
        const legend = res.meta.legend;
        const l = [];
        for (const i in legend) {
          const spl = legend[i].split('aggregation-cpu-sum/cpu-');
          l.push(spl[1]);
        }
        cloneRes.meta.legend = l;
        return cloneRes;
      },
    },
    StatsMemoryRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'stats.get_data',
        args: [] as any,
        responseEvent: 'StatsData',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        // Do some stuff here

        const dataList = [];
        const oldDataList = redef.args[0];
        const options = redef.args[1];

        for (const i in oldDataList) {
          dataList.push({
            source: 'memory',
            type: 'memory-' + oldDataList[i],
            dataset: 'value',
          });
        }

        redef.args = [dataList, options];
        redef.responseEvent = 'StatsMemoryData';
        return redef;
      },
      postProcessor(res: any) {
        const cloneRes = { ...res };
        const legend = res.meta.legend;
        const l = [];
        for (const i in legend) {
          const spl = legend[i].split('memory/memory-');
          l.push(spl[1]);
        }
        cloneRes.meta.legend = l;
        return cloneRes;
      },
    },
    StatsDiskTempRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2',
        namespace: 'stats.get_data',
        args: [] as any,
        responseEvent: 'StatsData',
      },
      preProcessor(def: ApiCall) {
        // Clone the object
        const redef = { ...def };
        const dataList = [];
        const oldDataList = redef.args[0];

        for (const i in oldDataList) {
          dataList.push({
            source: 'disktemp-' + oldDataList, // disk name
            type: 'temperature',
            dataset: 'value',
          });
        }

        redef.args = [dataList];
        redef.responseEvent = 'StatsDiskTemp';
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        const cloneRes = { ...res };
        const legend = res.meta.legend;
        const l = [];
        for (const i in legend) {
          const spl = legend[i];
          l.push(spl[1]);
        }
        cloneRes.meta.legend = l;
        return { callArgs, data: cloneRes };
      },
    },
    StatsLoadAvgRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '1',
        namespace: 'stats.get_data',
        args: [] as any,
        responseEvent: 'StatsData',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        // Do some stuff here
        const dataList = [];
        const oldDataList = redef.args[0];
        const options = redef.args[1];

        for (const i in oldDataList) {
          dataList.push({
            source: 'processes',
            type: 'ps_' + oldDataList[i],
            dataset: 'value',
          });
        }

        redef.args = [dataList, options];
        redef.responseEvent = 'StatsLoadAvgData';
        return redef;
      },
      postProcessor(res: any) {
        const cloneRes = { ...res };
        const legend = res.meta.legend;
        const l = [];
        for (const i in legend) {
          const spl = legend[i].split('processes/ps_state-');
          l.push(spl[1]);
        }
        cloneRes.meta.legend = l;
        return cloneRes;
      },
    },
    StatsVmemoryUsageRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'vm.get_vmemory_in_use',
        args: [] as any[], // eg. [["id", "=", "foo"]]
        responseEvent: 'StatsVmemoryUsage',
      },
    },
    DisksInfoRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'disk.query',
        args: [] as any[],
        responseEvent: 'DisksInfo',
      },
    },
    SensorDataRequest: {
      apiCall: {
        protocol: 'websocket',
        version: '2.0',
        namespace: 'sensor.query',
        args: [] as any[],
        responseEvent: 'SensorData',
      },
    },
  };

  constructor(
    protected core: CoreService,
    protected ws: WebSocketService,
    protected rest: RestService,
    private dialog: DialogService,
  ) {
    this.ws.authStatus.subscribe((evt: any) => {
      this.core.emit({ name: 'UserDataRequest', data: [[['id', '=', 1]]] });
      this.core.emit({ name: 'Authenticated', data: evt, sender: this });
    });
    this.registerDefinitions();
  }

  registerDefinitions() {
    // DEBUG: console.log("APISERVICE: Registering API Definitions");
    for (var def in this.apiDefinitions) {
      // DEBUG: console.log("def = " + def);
      this.core.register({ observerClass: this, eventName: def }).subscribe(
        (evt: CoreEvent) => {
          // Process Event if CoreEvent is in the api definitions list
          // TODO: Proper type:
          const name = evt.name as keyof ApiService['apiDefinitions'];
          if (this.apiDefinitions[name]) {
            // DEBUG: console.log(evt);
            const apiDef = this.apiDefinitions[name];
            // DEBUG: console.log(apiDef)
            // let call = this.parseCoreEvent(evt);
            if (apiDef.apiCall.protocol == 'websocket') {
              this.callWebsocket(evt, apiDef);
            } else if (apiDef.apiCall.protocol == 'rest') {
              this.callRest(evt, apiDef);
            }
          }
        },
        (err) => {
          // DEBUG: console.log(err)
        },
      );
    }
  }

  private callRest(evt: any, def: any) {
    const baseUrl = '/api/v' + def.apiCall.version + '/';
    const cloneDef = { ...def };
    if (evt.data) {
      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (def.preProcessor) {
        cloneDef.apiCall = def.preProcessor(def.apiCall);
      }

      const call = cloneDef.apiCall;// this.parseEventRest(evt);
      call.args = evt.data;
      (this.rest as any)[call.operation](baseUrl + call.namespace, evt.data, false).subscribe((res: any) => {
        if (this.debug) {
          console.log('*** API Response:');
          console.log(res);
        }

        // PostProcess
        if (def.postProcessor) {
          res = def.postProcessor(res, evt.data, this.core);
        }

        this.core.emit({ name: call.responseEvent, data: res.data, sender: evt.data });
      });
    } else {
      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (def.preProcessor) {
        cloneDef.apiCall = def.preProcessor(def.apiCall);
      }

      const call = cloneDef.apiCall;// this.parseEventRest(evt);
      call.args = evt.data;
      (this.rest as any)[call.operation](baseUrl + call.namespace, {}, false).subscribe((res: any) => {
        if (this.debug) {
          console.log('*** API Response:');
          console.log(call);
        }

        // PostProcess
        if (def.postProcessor) {
          res = def.postProcessor(res, evt.data, this.core);
        }

        this.core.emit({ name: call.responseEvent, data: res.data, sender: evt.data });
      });
    }
  }

  async callWebsocket(evt: CoreEvent, def: any) {
    const cloneDef = { ...def };
    const async_calls = [
      'vm.start',
      'vm.delete',
    ];

    if (evt.data) {
      cloneDef.apiCall.args = evt.data;

      if (def.preProcessor && !async_calls.includes(def.apiCall.namespace)) {
        cloneDef.apiCall = def.preProcessor(def.apiCall, this);
      }

      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (def.preProcessor && async_calls.includes(def.apiCall.namespace)) {
        cloneDef.apiCall = await def.preProcessor(def.apiCall, this);
        if (!cloneDef.apiCall) {
          this.core.emit({ name: 'VmStopped', data: { id: evt.data[0] } });
          return;
        }
      }

      const call = cloneDef.apiCall;// this.parseEventWs(evt);
      this.ws.call(call.namespace, call.args).subscribe((res) => {
        if (this.debug) {
          console.log('*** API Response:');
          console.log(call);
        }

        // PostProcess
        if (def.postProcessor) {
          res = def.postProcessor(res, evt.data, this.core);
        }
        if (this.debug) {
          console.log(call.responseEvent);
          console.log(res);
        }
        // this.core.emit({name:call.responseEvent, data:res, sender: evt.data}); // OLD WAY
        if (call.responseEvent) {
          this.core.emit({ name: call.responseEvent, data: res, sender: this });
        }
      },
      (error) => {
        error.id = call.args;
        if (call.errorResponseEvent) {
          this.core.emit({ name: call.errorResponseEvent, data: error, sender: this });
        }
        this.core.emit({ name: call.responseEvent, data: error, sender: this });
      });
    } else {
      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (def.preProcessor) {
        cloneDef.apiCall = def.preProcessor(def.apiCall);
      }

      const call = cloneDef.apiCall;// this.parseEventWs(evt);
      this.ws.call(call.namespace, call.args || []).subscribe((res) => {
        if (this.debug) {
          console.log('*** API Response:');
          console.log(call);
        }

        // PostProcess
        if (def.postProcessor) {
          res = def.postProcessor(res, evt.data, this.core);
        }

        // this.core.emit({name:call.responseEvent, data:res, sender:evt.data }); // OLD WAY
        if (call.responseEvent) {
          this.core.emit({ name: call.responseEvent, data: res, sender: this });
        }
      }, (error) => {
        console.log(error);
        if (call.responseFailedEvent) {
          error.id = call.args;
          this.core.emit({ name: call.responseFailedEvent, data: error, sender: this });
        }
      });
    }
  }
}
