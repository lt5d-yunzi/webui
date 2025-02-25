import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  AfterContentInit,
  ElementRef,
  Renderer2,
  Inject,
  forwardRef,
  ContentChildren,
  QueryList,
  ContentChild,
  HostBinding,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { MatButton } from '@angular/material/button';

const Z_INDEX_ITEM = 23;

@Component({
  selector: 'smd-fab-trigger',
  template: `
        <ng-content select="[mat-fab], [mat-fab]"></ng-content>
    `,
})
export class SmdFabSpeedDialTrigger {
  /**
     * Whether this trigger should spin (360dg) while opening the speed dial
     */
  @HostBinding('class.smd-spin')
  @Input() spin = false;

  constructor(@Inject(forwardRef(() => SmdFabSpeedDialComponent)) private _parent: SmdFabSpeedDialComponent) {
  }

  @HostListener('click', ['$event'])
  _onClick(event: any) {
    if (!this._parent.fixed) {
      this._parent.toggle();
      event.stopPropagation();
    }
  }
}

@Component({
  selector: 'smd-fab-actions',
  template: `
        <ng-content select="[md-mini-fab], [mat-mini-fab]"></ng-content>
    `,
})
export class SmdFabSpeedDialActions implements AfterContentInit {
  @ContentChildren(MatButton) _buttons: QueryList<MatButton>;

  constructor(@Inject(forwardRef(() => SmdFabSpeedDialComponent)) private _parent: SmdFabSpeedDialComponent, private renderer: Renderer2) {
  }

  ngAfterContentInit(): void {
    this._buttons.changes.subscribe(() => {
      this.initButtonStates();
      this._parent.setActionsVisibility();
    });

    this.initButtonStates();
  }

  private initButtonStates() {
    this._buttons.toArray().forEach((button, i) => {
      this.renderer.addClass(button._getHostElement(), 'smd-fab-action-item');
      this.changeElementStyle(button._getHostElement(), 'z-index', '' + (Z_INDEX_ITEM - i));
    });
  }

  show() {
    if (this._buttons) {
      this._buttons.toArray().forEach((button, i) => {
        let transitionDelay = 0;
        let transform;
        if (this._parent.animationMode == 'scale') {
          // Incremental transition delay of 65ms for each action button
          transitionDelay = 3 + (65 * i);
          transform = 'scale(1)';
        } else {
          transform = this.getTranslateFunction('0');
        }
        this.changeElementStyle(button._getHostElement(), 'transition-delay', transitionDelay + 'ms');
        this.changeElementStyle(button._getHostElement(), 'opacity', '1');
        this.changeElementStyle(button._getHostElement(), 'transform', transform);
      });
    }
  }

  hide() {
    if (this._buttons) {
      this._buttons.toArray().forEach((button, i) => {
        let opacity = '1';
        let transitionDelay = 0;
        let transform;
        if (this._parent.animationMode == 'scale') {
          transitionDelay = 3 - (65 * i);
          transform = 'scale(0)';
          opacity = '0';
        } else {
          transform = this.getTranslateFunction((55 * (i + 1) - (i * 5)) + 'px');
        }
        this.changeElementStyle(button._getHostElement(), 'transition-delay', transitionDelay + 'ms');
        this.changeElementStyle(button._getHostElement(), 'opacity', opacity);
        this.changeElementStyle(button._getHostElement(), 'transform', transform);
      });
    }
  }

  private getTranslateFunction(value: string) {
    const dir = this._parent.direction;
    const translateFn = (dir == 'up' || dir == 'down') ? 'translateY' : 'translateX';
    const sign = (dir == 'down' || dir == 'right') ? '-' : '';
    return translateFn + '(' + sign + value + ')';
  }

  private changeElementStyle(elem: any, style: string, value: string) {
    // FIXME - Find a way to create a "wrapper" around the action button(s) provided by the user, so we don't change it's style tag
    this.renderer.setStyle(elem, style, value);
  }
}

@Component({
  selector: 'smd-fab-speed-dial',
  template: `
        <div class="smd-fab-speed-dial-container">
            <ng-content select="smd-fab-trigger"></ng-content>
            <ng-content select="smd-fab-actions"></ng-content>
        </div>
    `,
  styleUrls: ['fab-speed-dial.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SmdFabSpeedDialComponent implements AfterContentInit {
  private isInitialized = false;
  private _direction = 'up';
  private _open = false;
  private _animationMode = 'fling';

  /**
     * Whether this speed dial is fixed on screen (user cannot change it by clicking)
     */
  @Input() fixed = false;

  /**
     * Whether this speed dial is opened
     */
  @HostBinding('class.smd-opened')
  @Input() get open() {
    return this._open;
  }

  set open(open: boolean) {
    const previousOpen = this._open;
    this._open = open;
    if (previousOpen != this._open) {
      this.openChange.emit(this._open);
      if (this.isInitialized) {
        this.setActionsVisibility();
      }
    }
  }

  /**
     * The direction of the speed dial. Can be 'up', 'down', 'left' or 'right'
     */
  @Input() get direction() {
    return this._direction;
  }

  set direction(direction: string) {
    const previousDir = this._direction;
    this._direction = direction;
    if (previousDir != this.direction) {
      this._setElementClass(previousDir, false);
      this._setElementClass(this.direction, true);

      if (this.isInitialized) {
        this.setActionsVisibility();
      }
    }
  }

  /**
     * The animation mode to open the speed dial. Can be 'fling' or 'scale'
     */
  @Input() get animationMode() {
    return this._animationMode;
  }

  set animationMode(animationMode: string) {
    const previousAnimationMode = this._animationMode;
    this._animationMode = animationMode;
    if (previousAnimationMode != this._animationMode) {
      this._setElementClass(previousAnimationMode, false);
      this._setElementClass(this.animationMode, true);

      if (this.isInitialized) {
        // To start another detect lifecycle and force the "close" on the action buttons
        Promise.resolve(null).then(() => this.open = false);
      }
    }
  }

  @Output() openChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  @ContentChild(SmdFabSpeedDialActions, { static: true }) _childActions: SmdFabSpeedDialActions;

  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
  }

  ngAfterContentInit(): void {
    this.isInitialized = true;
    this.setActionsVisibility();
    this._setElementClass(this.direction, true);
    this._setElementClass(this.animationMode, true);
  }

  /**
     * Toggle the open state of this speed dial
     */
  toggle() {
    this.open = !this.open;
  }

  @HostListener('click')
  _onClick() {
    if (!this.fixed && this.open) {
      this.open = false;
    }
  }

  setActionsVisibility() {
    if (this.open) {
      this._childActions.show();
    } else {
      this._childActions.hide();
    }
  }

  private _setElementClass(elemClass: string, isAdd: boolean) {
    this.renderer.addClass(this.elementRef.nativeElement, `smd-${elemClass}`);
  }
}
