import { AppConfirmService } from './app-confirm.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppComfirmComponent } from './app-confirm.component';

@NgModule({
  imports: [
    MatDialogModule,
    MatButtonModule,
    FlexLayoutModule,
  ],
  exports: [AppComfirmComponent],
  declarations: [AppComfirmComponent],
  providers: [AppConfirmService],
  entryComponents: [AppComfirmComponent],
})
export class AppConfirmModule { }
