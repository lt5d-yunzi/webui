import { Component, OnInit } from '@angular/core';
import { LanguageService } from '../../../../services/language.service';
import { Theme, DefaultTheme } from 'app/services/theme/theme.service';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.css'],

})
export class AuthLayoutComponent implements OnInit {
  private theme: Theme = DefaultTheme;

  constructor(public language: LanguageService) {
    // Translator init
    language.getBrowserLanguage();
  }

  ngOnInit(): void {
    this.setCssVars(this.theme);
  }

  setCssVars(theme: Theme): void {
    const palette = Object.keys(theme) as (keyof Theme)[];
    palette.splice(0, 6);

    const admin_layout_el = (<any>document).getElementsByTagName('APP-AUTH-LAYOUT')[0];

    palette.forEach((color) => {
      const swatch = theme[color];
      admin_layout_el.style.setProperty('--' + color, theme[color]);
      (<any>document).documentElement.style.setProperty('--' + color, theme[color]);
    });
    admin_layout_el.style.setProperty('--primary', theme['primary']);
    admin_layout_el.style.setProperty('--accent', theme['accent']);
    (<any>document).documentElement.style.setProperty('--primary', theme['primary']);
    (<any>document).documentElement.style.setProperty('--accent', theme['accent']);
  }
}
