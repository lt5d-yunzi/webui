import { Container, Texture, Sprite } from 'pixi.js';
import { DriveTray } from './drivetray';
import { Chassis } from './chassis';
import { ChassisView } from './chassis-view';

export class E24 extends Chassis {
  constructor() {
    super();
    this.model = 'e24';

    this.front = new ChassisView();
    this.front.container = new PIXI.Container();
    this.front.chassisPath = 'assets/images/hardware/e24/e24_960w.png';
    this.front.driveTrayBackgroundPath = 'assets/images/hardware/e24/e24_960w_drivetray_bg.png';
    this.front.driveTrayHandlePath = 'assets/images/hardware/e24/e24_960w_drivetray_handle.png';
    this.front.totalDriveTrays = 24;
  }
}
