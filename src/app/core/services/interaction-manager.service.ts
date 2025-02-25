import { Injectable } from '@angular/core';
import { DisplayObject } from '../classes/display-object';
import { LayoutObject } from '../classes/layout-object';
import { CoreService, CoreEvent } from './core.service';
import {
  tween,
  styler,
  listen,
  pointer,
  value,
  decay,
  spring,
  physics,
  multicast,
  action,
  transform,
} from 'popmotion';

const transformMap = transform.transformMap;
const { clamp } = transform;

interface DisplayObjectRegistration {
  displayObject: DisplayObject;
  layout?: LayoutObject;
}

export interface DisplayObjectConfig {
  resizeable?: boolean;
  moveable?: boolean;
  anchored?: boolean;
  moveHandle?: string; // CSS Selector
  id: string;
}

@Injectable()
export class InteractionManagerService {
  private displayList: DisplayObjectRegistration[];
  private displayObjectWithFocus: DisplayObject;
  messageBus: CoreService;

  constructor(messageBus: CoreService) {
    this.messageBus = messageBus;

    messageBus.register({ observerClass: this, eventName: 'RegisterLayout' }).subscribe((evt: CoreEvent) => {
      // Expects LayoutObject and array of CSS selectors
      // let collection: DisplayObject[] = [];
      const collection: any = {};
      evt.data.selectors.forEach((item: any) => {
        const displayObject = this.registerElement(item, evt.data.layout);
        // collection.push(displayObject);
        collection[displayObject.id] = displayObject;
      });
      evt.data.layout.collection = collection;
      evt.data.layout.initialize();
    });

    messageBus.register({ observerClass: this, eventName: 'RegisterAsDisplayObject' }).subscribe((evt: CoreEvent) => {
      console.log(evt);
      const config: DisplayObjectConfig = evt.data;
      this.registerElement(config); // Expects CSS id selector for element
    });

    messageBus.register({ observerClass: this, eventName: 'RequestDisplayObjectReference' }).subscribe((evt: CoreEvent) => {
      const element = this.getChildById(evt.data);
      messageBus.emit({ name: element.id, data: element });
    });

    messageBus.register({ observerClass: this, eventName: 'InsertIntoLayout' }).subscribe((evt: CoreEvent) => {
      console.log('Inserting into layout...');
      const layout = this.getLayoutById(evt.data.layout);
      let element;
      const elementIsRegistered = this.displayList.some((reg) => reg.displayObject == evt.sender);
      if (!elementIsRegistered) {
        element = this.registerElement(evt.data.element, layout); // Expects CSS id selector for element
      } else {
        element = this.getChildById(evt.data.element);
      }
      // console.log(element)
      // console.log(layout)
      if (!layout) {
        console.warn('Cannot add element to layout. No layout with that id found. Make sure your layout exists and is registered.');
      } else {
        layout.insert(element);
      }
    });

    messageBus.register({ observerClass: this, eventName: 'DisplayObjectSelected' }).subscribe((evt: CoreEvent) => {
      if (evt.sender != this.displayObjectWithFocus || !this.displayObjectWithFocus) {
        this.releaseAll();
        if (this.displayObjectWithFocus) { this.displayObjectWithFocus.hasFocus = false; }
        this.displayObjectWithFocus = evt.sender;
        this.displayObjectWithFocus.hasFocus = true;
      }
      // Does this object belong to a layout?
      const layout = this.getLayoutParent(evt.sender);
      if (layout) {
        layout.beginInteractiveMovement(evt.sender);
      }
    });

    messageBus.register({ observerClass: this, eventName: 'DisplayObjectReleased' }).subscribe((evt: CoreEvent) => {
      console.log('DisplayObjectReleased');
      const layout = this.getLayoutParent(evt.sender);
      if (layout) {
        // console.log("This belongs to a layout");
        // console.log(this.displayList);
        layout.endInteractiveMovement(evt.sender);
      }
      if (this.displayObjectWithFocus && this.displayObjectWithFocus == evt.sender) {
        // this.displayObjectWithFocus.hasFocus = false;
        // this.displayObjectWithFocus = null;
      }
      // evt.sender.hasFocus = false;
    });

    this.displayList = [];
  }

  private releaseAll() {
    // Trying to avoid glitches with flakey pointer devices
    // unset the focus property for all DisplayObjects
    this.displayList.forEach((item, index) => {
      item.displayObject.hasFocus = false;
    });
  }

  registerElement(config: any, layout?: LayoutObject) {
    const selector = config.id;
    const observable = multicast();
    const el = document.querySelector(selector);
    const resizeHandleTop = document.querySelector(selector + ' .resize-handle-top');
    const resizeHandleRight = document.querySelector(selector + ' .resize-handle-right');
    const resizeHandleBottom = document.querySelector(selector + ' .resize-handle-bottom');
    const resizeHandleLeft = document.querySelector(selector + ' .resize-handle-left');

    let tracker: DisplayObject;
    if (config.moveHandle) {
      const moveHandle = (<any>document).querySelector(config.moveHandle);
      tracker = new DisplayObject(el, observable, this.messageBus, moveHandle);
    } else {
      tracker = new DisplayObject(el, observable, this.messageBus);
    }

    tracker.anchored = config.anchored ? config.anchored : false;
    tracker.moveable = config.moveable ? config.moveable : true;
    tracker.resizeable = config.resizeable ? config.resizeable : true;

    const registration: DisplayObjectRegistration = { displayObject: tracker, layout: layout || null };
    this.displayList.push(registration);

    return registration.displayObject;
  }

  unregisterElement(tracker: any) {
    tracker.interactive = false;
    const index = this.displayList.indexOf(tracker);
    this.displayList.splice(index, 1);
    tracker = null;
  }

  // Find the related Layout object for the displayObject if one exists
  getLayoutParent(displayObject: DisplayObject): LayoutObject {
    // let index = this.displayList.indexOf(displayObject);
    const registration: DisplayObjectRegistration[] = this.displayList.filter((item) => item.displayObject == displayObject);
    if (registration.length == 0) {
      console.warn('DEBUG: The DisplayObject has not been registered');
    } else if (registration.length > 1) {
      throw 'DisplayObject registered multiple times.';
    } else {
      return registration[0].layout;
    }
  }

  getChildById(id: string): DisplayObject {
    const registration = this.displayList.find((item) => item.displayObject.id == id);
    return registration.displayObject;
  }

  getLayoutById(id: string): LayoutObject {
    const registration = this.displayList.find((item) => {
      console.log(item.layout);
      return item.layout.id == id;
    });
    return registration.layout;
  }

  private startCollisionDetection(dragTarget: DisplayObject, targets: any[]) {
    dragTarget.updateStream.subscribe((position) => {
      // console.log(position.y);
      const collisionTarget = targets.forEach((target) => {
        const found = this.detectCollision(target, dragTarget);
        if (found) {
          const index = targets.indexOf(target);
          console.log('item index is ' + index);
        }
      });
      /* if(collisionTarget){
        console.log(collisionTarget)
      } */
    });
  }

  // Collision Detection Goes Here...
  private detectCollision(a: any, b: any) {
    return !(
      ((a.y + a.height) < (b.y))
          || (a.y > (b.y + b.height))
          || ((a.x + a.width) < b.x)
          || (a.x > (b.x + b.width))
    );
  }
}
