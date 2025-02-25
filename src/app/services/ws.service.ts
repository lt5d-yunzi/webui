import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UUID } from 'angular2-uuid';
import { LocalStorage } from 'ngx-webstorage';
import { Observable, Observer, Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { filter, map } from 'rxjs/operators';
import { EntityJobState } from 'app/enums/entity-job-state.enum';

@Injectable()
export class WebSocketService {
  private debug = true;
  private _authStatus: Subject<any>;
  onCloseSubject: Subject<any>;
  onOpenSubject: Subject<any>;
  pendingCalls: any;
  pendingSubs: any = {};
  pendingMessages: any[] = [];
  socket: WebSocket;
  connected = false;
  loggedIn = false;
  @LocalStorage() token: string;
  redirectUrl = '';
  shuttingdown = false;

  protocol: any;
  remote: any;
  private consoleSub: Observable<string>;

  subscriptions: Map<string, any[]> = new Map<string, any[]>();

  constructor(private _router: Router) {
    this._authStatus = new Subject();
    this.onOpenSubject = new Subject();
    this.onCloseSubject = new Subject();
    this.pendingCalls = new Map();
    this.protocol = window.location.protocol;
    this.remote = environment.remote;
    this.connect();
  }

  get authStatus() {
    return this._authStatus.asObservable();
  }

  get consoleMessages() {
    if (!this.consoleSub) {
      this.consoleSub = this.sub('filesystem.file_tail_follow:/var/log/messages:499').pipe(
        filter((res) => res && res.data && typeof res.data === 'string'),
        map((res) => res.data),
      );
    }
    return this.consoleSub;
  }

  reconnect(protocol = window.location.protocol, remote = environment.remote) {
    this.protocol = protocol;
    this.remote = remote;
    this.socket.close();
  }

  connect() {
    this.socket = new WebSocket(
      (this.protocol == 'https:' ? 'wss://' : 'ws://')
        + this.remote + '/websocket',
    );
    this.socket.onmessage = this.onmessage.bind(this);
    this.socket.onopen = this.onopen.bind(this);
    this.socket.onclose = this.onclose.bind(this);
  }

  onopen() {
    this.onOpenSubject.next(true);
    this.send({ msg: 'connect', version: '1', support: ['1'] });
  }

  onconnect() {
    this.shuttingdown = false;
    while (this.pendingMessages.length > 0) {
      const payload = this.pendingMessages.pop();
      this.send(payload);
    }
  }

  onclose() {
    this.connected = false;
    this.onCloseSubject.next(true);
    setTimeout(this.connect.bind(this), 5000);
    if (!this.shuttingdown) {
      this._router.navigate(['/sessions/signin']);
    }
  }

  ping() {
    if (this.connected) {
      this.socket.send(JSON.stringify({ msg: 'ping', id: UUID.UUID() }));
      setTimeout(this.ping.bind(this), 20000);
    }
  }

  onmessage(msg: { data: string }) {
    try {
      var data = JSON.parse(msg.data);
    } catch (e) {
      console.warn(`Malformed response: "${msg.data}"`);
      return;
    }

    if (data.msg == 'result') {
      const call = this.pendingCalls.get(data.id);

      this.pendingCalls.delete(data.id);
      if (data.error) {
        console.log('Error: ', data.error);
        call.observer.error(data.error);
      }
      if (call && call.observer) {
        call.observer.next(data.result);
        call.observer.complete();
      }
    } else if (data.msg == 'connected') {
      this.connected = true;
      setTimeout(this.ping.bind(this), 20000);
      this.onconnect();
    } else if (data.msg == 'nosub') {
      console.warn(data);
    } else if (data.msg == 'added') {
      const nom = data.collection.replace('.', '_');
      if (this.pendingSubs[nom] && this.pendingSubs[nom].observers) {
        for (const uuid in this.pendingSubs[nom].observers) {
          const subObserver = this.pendingSubs[nom].observers[uuid];
          if (data.error) {
            console.log('Error: ', data.error);
            subObserver.error(data.error);
          }
          if (subObserver) {
            subObserver.next(data.fields);
          }
        }
      }
    } else if (data.msg == 'changed') {
      this.subscriptions.forEach((v, k) => {
        if (k == '*' || k == data.collection) {
          v.forEach((item) => { item.next(data); });
        }
      });
    } else if (data.msg == 'pong') {
      // pass
    } else if (data.msg == 'sub') {
      // pass
    } else {
      // console.log("Unknown message: ", data);
    }
  }

  send(payload: any) {
    if (this.socket.readyState == WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else {
      this.pendingMessages.push(payload);
    }
  }

  subscribe(name: string): Observable<any> {
    const source = Observable.create((observer: any) => {
      if (this.subscriptions.has(name)) {
        this.subscriptions.get(name).push(observer);
      } else {
        this.subscriptions.set(name, [observer]);
      }
    });
    return source;
  }

  unsubscribe(observer: any) {
    // FIXME: just does not have a good performance :)
    this.subscriptions.forEach((v, k) => {
      v.forEach((item) => {
        if (item === observer) {
          v.splice(v.indexOf(item), 1);
        }
      });
    });
  }

  call<R = any>(method: string, params?: any, debug = false): Observable<R> {
    const uuid = UUID.UUID();
    const payload = {
      id: uuid, msg: 'method', method, params,
    };

    // Create the observable
    const source = Observable.create((observer: any) => {
      this.pendingCalls.set(uuid, {
        method,
        args: params,
        observer,
      });

      this.send(payload);
    });

    return source;
  }

  sub(name: string): Observable<any> {
    const nom = name.replace('.', '_'); // Avoid weird behavior
    if (!this.pendingSubs[nom]) {
      this.pendingSubs[nom] = {
        observers: {},
      };
    }

    const uuid = UUID.UUID();
    const payload = { id: uuid, name, msg: 'sub' };

    const obs = Observable.create((observer: any) => {
      this.pendingSubs[nom].observers[uuid] = observer;
      this.send(payload);

      // cleanup routine
      observer.complete = () => {
        const unsub_payload = { id: uuid, msg: 'unsub' };
        this.send(unsub_payload);
        this.pendingSubs[nom].observers[uuid].unsubscribe();
        delete this.pendingSubs[nom].observers[uuid];
        if (!this.pendingSubs[nom].observers) { delete this.pendingSubs[nom]; }
      };

      return observer;
    });
    return obs;
  }

  job(method: any, params?: any): Observable<any> {
    const source = Observable.create((observer: any) => {
      this.call(method, params).subscribe((job_id) => {
        this.subscribe('core.get_jobs').subscribe((res) => {
          if (res.id == job_id) {
            observer.next(res.fields);
            if (res.fields.state === EntityJobState.Success || res.fields.state == EntityJobState.Failed) {
              observer.complete();
            }
          }
        });
      });
    });
    return source;
  }

  login(username: string, password: string, otp_token?: string): Observable<any> {
    const params = otp_token ? [username, password, otp_token] : [username, password];
    return Observable.create((observer: any) => {
      this.call('auth.login', params).subscribe((result) => {
        this.loginCallback(result, observer);
      });
    });
  }

  loginCallback(result: any, observer: Observer<any>) {
    if (result === true) {
      if (!this.loggedIn) {
        this._authStatus.next(this.loggedIn);
      }

      this.loggedIn = true;

      // Subscribe to all events by default
      this.send({
        id: UUID.UUID(),
        name: '*',
        msg: 'sub',
      });
    } else {
      this.loggedIn = false;
      this._authStatus.next(this.loggedIn);
    }
    observer.next(result);
    observer.complete();
  }

  login_token(token: string): Observable<any> {
    return Observable.create((observer: any) => {
      if (token) {
        this.call('auth.token', [token]).subscribe((result) => {
          this.loginCallback(result, observer);
        });
      }
    });
  }

  clearCredentials() {
    this.loggedIn = false;
    this.token = null;
  }

  prepare_shutdown() {
    this.shuttingdown = true;
    this.clearCredentials();
  }

  logout() {
    this.call('auth.logout').subscribe((res) => {
      this.clearCredentials();
      this.socket.close();
      this._router.navigate(['/sessions/signin']);
      (<any>window).location.reload();
    });
  }
}
