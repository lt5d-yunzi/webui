import { Container, Texture, Sprite } from 'pixi.js';

export class DriveTray {
  // public container: Sprite; // Alias for background sprite
  container: Container; // Alias for background sprite
  background: Sprite;
  handle: Sprite;
  model: string;
  id: string;
  vertical = false;
  protected loader: any;

  enabled = false;

  private _color: string;
  get color() {
    return this._color;
  }
  set color(value) {
    // this._color = value;
    this.colorize(value);
  }

  constructor(model: string, loader: any) {
    this.model = model;
    this.loader = loader;
    this.container = new PIXI.Container();
  }

  setup(altAssets = false) {
    const alt = altAssets ? '_alt' : '';

    this.background = PIXI.projection.Sprite2d.from(this.loader.resources[this.model + alt + '_drivetray_bg'].texture.baseTexture);
    this.container.addChild(this.background);

    this.handle = PIXI.Sprite.from(this.loader.resources[this.model + alt + '_drivetray_handle'].texture.baseTexture);

    if (this.vertical) {
      this.background.rotation = -90 * (3.14 / 180);
      this.background.y += this.background.width;
      this.background.calculateBounds();
      this.handle.rotation = -90 * (3.14 / 180);
      this.handle.calculateBounds();
      this.handle.y += this.handle.width;
    }

    this.container.addChild(this.handle);
    this.container.calculateBounds();
  }

  private colorize(cssColor: string) {
    if (!this.handle) {
      return;
    }
    this._color = cssColor;
    if (cssColor == 'none') {
      this.handle.tint = 0xFFFFFF;
    } else {
      const color = parseInt('0x' + cssColor.substring(1), 16);
      this.handle.tint = color;
    }
  }
}
